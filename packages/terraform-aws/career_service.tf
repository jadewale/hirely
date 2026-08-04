# career-api service. Mirrors api_service.tf but is additive: it reuses the
# shared VPC (network.tf), ECS cluster (aws_ecs_cluster.main), and RDS instance
# (aws_db_instance.postgres). career gets its OWN ALB, security groups, SSM
# secret set, IAM roles, and ECS service. No Redis (career doesn't use it).

locals {
  career_name = "career-platform-${var.environment}"

  career_create_custom_domain = var.route53_zone_id != null && var.career_api_domain_name != null

  career_api_base_url = local.career_create_custom_domain ? "https://${var.career_api_domain_name}" : "http://${aws_lb.career_api.dns_name}"

  career_common_tags = {
    Project     = "career-platform"
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}

# ── ECR ──────────────────────────────────────────────────────────────────────
# The base/bun ECR mirror (aws_ecr_repository.base_bun) is shared with hirely.
resource "aws_ecr_repository" "career_api" {
  name                 = "${local.career_name}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.career_common_tags
}

resource "aws_cloudwatch_log_group" "career_api" {
  name              = "/ecs/${local.career_name}/api"
  retention_in_days = 14

  tags = local.career_common_tags
}

# ── Secrets (SSM Parameter Store) ────────────────────────────────────────────
# career reuses the shared RDS master credentials but a SEPARATE database
# (var.career_db_name). SSM disallows empty SecureString values, so optional
# secrets fall back to "unset" until real values are provided in tfvars.
resource "aws_ssm_parameter" "career_database_url" {
  name      = "/${local.career_name}/api/DATABASE_URL"
  type      = "SecureString"
  overwrite = true
  value     = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.postgres.address}:5432/${var.career_db_name}?sslmode=require"

  tags = local.career_common_tags
}

resource "aws_ssm_parameter" "career_better_auth_secret" {
  name      = "/${local.career_name}/api/BETTER_AUTH_SECRET"
  type      = "SecureString"
  overwrite = true
  value     = var.career_better_auth_secret

  tags = local.career_common_tags
}

resource "aws_ssm_parameter" "career_stripe_secret_key" {
  name      = "/${local.career_name}/api/STRIPE_SECRET_KEY"
  type      = "SecureString"
  overwrite = true
  value     = var.career_stripe_secret_key != "" ? var.career_stripe_secret_key : "unset"

  tags = local.career_common_tags
}

resource "aws_ssm_parameter" "career_stripe_webhook_secret" {
  name      = "/${local.career_name}/api/STRIPE_WEBHOOK_SECRET"
  type      = "SecureString"
  overwrite = true
  value     = var.career_stripe_webhook_secret != "" ? var.career_stripe_webhook_secret : "unset"

  tags = local.career_common_tags
}

resource "aws_ssm_parameter" "career_inngest_signing_key" {
  name      = "/${local.career_name}/api/INNGEST_SIGNING_KEY"
  type      = "SecureString"
  overwrite = true
  value     = var.career_inngest_signing_key != "" ? var.career_inngest_signing_key : "unset"

  tags = local.career_common_tags
}

resource "aws_ssm_parameter" "career_inngest_event_key" {
  name      = "/${local.career_name}/api/INNGEST_EVENT_KEY"
  type      = "SecureString"
  overwrite = true
  value     = var.career_inngest_event_key != "" ? var.career_inngest_event_key : "unset"

  tags = local.career_common_tags
}

# ── IAM roles ────────────────────────────────────────────────────────────────
resource "aws_iam_role" "career_ecs_execution" {
  name = "${local.career_name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = local.career_common_tags
}

resource "aws_iam_role_policy_attachment" "career_ecs_execution_managed" {
  role       = aws_iam_role.career_ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "career_ecs_execution_ssm" {
  name = "${local.career_name}-ecs-execution-ssm"
  role = aws_iam_role.career_ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath",
        ]
        Resource = [
          aws_ssm_parameter.career_database_url.arn,
          aws_ssm_parameter.career_better_auth_secret.arn,
          aws_ssm_parameter.career_stripe_secret_key.arn,
          aws_ssm_parameter.career_stripe_webhook_secret.arn,
          aws_ssm_parameter.career_inngest_signing_key.arn,
          aws_ssm_parameter.career_inngest_event_key.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "arn:aws:kms:*:*:alias/aws/ssm"
      },
    ]
  })
}

resource "aws_iam_role" "career_ecs_task" {
  name = "${local.career_name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "ecs-tasks.amazonaws.com" }
    }]
  })

  tags = local.career_common_tags
}

# ── Security groups ──────────────────────────────────────────────────────────
resource "aws_security_group" "career_alb" {
  name        = "${local.career_name}-alb"
  description = "Public ingress to the career-api ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "HTTP"
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = var.allowed_ingress_cidrs
  }

  dynamic "ingress" {
    for_each = local.career_create_custom_domain ? [1] : []
    content {
      description = "HTTPS"
      from_port   = 443
      to_port     = 443
      protocol    = "tcp"
      cidr_blocks = var.allowed_ingress_cidrs
    }
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.career_common_tags, { Name = "${local.career_name}-alb-sg" })
}

resource "aws_security_group" "career_ecs_service" {
  name        = "${local.career_name}-ecs-service"
  description = "Allow career-api traffic from its ALB"
  vpc_id      = aws_vpc.main.id

  ingress {
    description     = "career-api from ALB"
    from_port       = var.career_api_container_port
    to_port         = var.career_api_container_port
    protocol        = "tcp"
    security_groups = [aws_security_group.career_alb.id]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.career_common_tags, { Name = "${local.career_name}-ecs-sg" })
}

# career-api tasks reach the SHARED Postgres. Rather than widen the existing
# db security group's inline rules (owned by data_stores/security.tf), attach a
# standalone ingress rule so the shared SG stays untouched by career.
resource "aws_security_group_rule" "db_from_career_ecs" {
  type                     = "ingress"
  description              = "Postgres from career-api ECS"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  security_group_id        = aws_security_group.db.id
  source_security_group_id = aws_security_group.career_ecs_service.id
}

# ── Load balancer ────────────────────────────────────────────────────────────
resource "aws_lb" "career_api" {
  name               = substr("${local.career_name}-api", 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.career_alb.id]
  subnets            = [for subnet in values(aws_subnet.public) : subnet.id]

  tags = local.career_common_tags
}

resource "aws_lb_target_group" "career_api" {
  name        = substr("${local.career_name}-api-tg", 0, 32)
  port        = var.career_api_container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = var.career_api_health_check_path
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    interval            = 30
    timeout             = 5
  }

  tags = local.career_common_tags
}

resource "aws_acm_certificate" "career_api" {
  count             = local.career_create_custom_domain ? 1 : 0
  domain_name       = var.career_api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.career_common_tags
}

resource "aws_route53_record" "career_api_cert_validation" {
  for_each = local.career_create_custom_domain ? {
    for dvo in aws_acm_certificate.career_api[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  zone_id = var.route53_zone_id
  name    = each.value.name
  type    = each.value.type
  ttl     = 60
  records = [each.value.record]
}

resource "aws_acm_certificate_validation" "career_api" {
  count                   = local.career_create_custom_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.career_api[0].arn
  validation_record_fqdns = [for record in aws_route53_record.career_api_cert_validation : record.fqdn]
}

resource "aws_lb_listener" "career_http_forward" {
  count             = local.career_create_custom_domain ? 0 : 1
  load_balancer_arn = aws_lb.career_api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.career_api.arn
  }
}

resource "aws_lb_listener" "career_http_redirect" {
  count             = local.career_create_custom_domain ? 1 : 0
  load_balancer_arn = aws_lb.career_api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type = "redirect"

    redirect {
      port        = "443"
      protocol    = "HTTPS"
      status_code = "HTTP_301"
    }
  }
}

resource "aws_lb_listener" "career_https" {
  count             = local.career_create_custom_domain ? 1 : 0
  load_balancer_arn = aws_lb.career_api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.career_api[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.career_api.arn
  }
}

resource "aws_route53_record" "career_api_alias" {
  count   = local.career_create_custom_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.career_api_domain_name
  type    = "A"

  alias {
    name                   = aws_lb.career_api.dns_name
    zone_id                = aws_lb.career_api.zone_id
    evaluate_target_health = true
  }
}

# ── ECS service ──────────────────────────────────────────────────────────────
# Task definition is CI/CD-owned (apps/career-api/taskdef.template.json). The
# service + its data source are gated on var.career_api_service_enabled so a
# fresh `terraform plan/apply` works before any task-def revision exists — see
# that variable's docs for the two-phase bootstrap. Everything else (pipeline,
# roles, ALB) is decoupled from this resource, so it can be created and run
# while the service is still disabled.
data "aws_ecs_task_definition" "career_api" {
  count           = var.career_api_service_enabled ? 1 : 0
  task_definition = "${local.career_name}-api"
}

resource "aws_ecs_service" "career_api" {
  count                             = var.career_api_service_enabled ? 1 : 0
  name                              = "${local.career_name}-api"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = data.aws_ecs_task_definition.career_api[0].arn
  desired_count                     = var.career_api_desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60
  enable_execute_command            = true

  network_configuration {
    subnets          = [for subnet in values(aws_subnet.private) : subnet.id]
    security_groups  = [aws_security_group.career_ecs_service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.career_api.arn
    container_name   = "career-api"
    container_port   = var.career_api_container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [
    aws_lb_listener.career_http_forward,
    aws_lb_listener.career_http_redirect,
    aws_db_instance.postgres,
  ]

  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = local.career_common_tags
}
