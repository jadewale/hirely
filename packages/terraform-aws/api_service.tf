resource "aws_ecr_repository" "api" {
  name                 = "${local.name}-api"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = local.common_tags
}

# Mirror of the Bun base images we FROM in apps/api/Dockerfile.
# CodeBuild's shared egress IP gets rate-limited by Docker Hub on
# anonymous pulls of oven/bun. Pulling through our own ECR repo
# avoids that entirely.
resource "aws_ecr_repository" "base_bun" {
  name                 = "${local.name}-base/bun"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = false
  }

  tags = local.common_tags
}

resource "aws_cloudwatch_log_group" "api" {
  name              = "/ecs/${local.name}/api"
  retention_in_days = 14

  tags = local.common_tags
}

resource "aws_ssm_parameter" "database_url" {
  name      = "/${local.name}/api/DATABASE_URL"
  type      = "SecureString"
  overwrite = true
  value     = "postgresql://${var.db_username}:${random_password.db_password.result}@${aws_db_instance.postgres.address}:5432/${var.db_name}?sslmode=require"

  tags = local.common_tags
}

resource "aws_ssm_parameter" "better_auth_secret" {
  name      = "/${local.name}/api/BETTER_AUTH_SECRET"
  type      = "SecureString"
  overwrite = true
  value     = var.better_auth_secret

  tags = local.common_tags
}

resource "aws_ssm_parameter" "google_client_id" {
  name      = "/${local.name}/api/GOOGLE_CLIENT_ID"
  type      = "SecureString"
  overwrite = true
  value     = var.google_client_id

  tags = local.common_tags
}

resource "aws_ssm_parameter" "google_client_secret" {
  name      = "/${local.name}/api/GOOGLE_CLIENT_SECRET"
  type      = "SecureString"
  overwrite = true
  value     = var.google_client_secret

  tags = local.common_tags
}

resource "aws_ssm_parameter" "openai_api_key" {
  name      = "/${local.name}/api/OPENAI_API_KEY"
  type      = "SecureString"
  overwrite = true
  value     = var.openai_api_key

  tags = local.common_tags
}

resource "aws_ssm_parameter" "inngest_signing_key" {
  name      = "/${local.name}/api/INNGEST_SIGNING_KEY"
  type      = "SecureString"
  overwrite = true
  # SSM disallows empty SecureString values; fall back to a placeholder until
  # a real key is provided in terraform.tfvars.
  value = var.inngest_signing_key != "" ? var.inngest_signing_key : "unset"

  tags = local.common_tags
}

resource "aws_ssm_parameter" "inngest_event_key" {
  name      = "/${local.name}/api/INNGEST_EVENT_KEY"
  type      = "SecureString"
  overwrite = true
  value     = var.inngest_event_key != "" ? var.inngest_event_key : "unset"

  tags = local.common_tags
}

resource "aws_iam_role" "ecs_execution" {
  name = "${local.name}-ecs-execution"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy_attachment" "ecs_execution_managed" {
  role       = aws_iam_role.ecs_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

resource "aws_iam_role_policy" "ecs_execution_ssm" {
  name = "${local.name}-ecs-execution-ssm"
  role = aws_iam_role.ecs_execution.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter",
          "ssm:GetParameters",
          "ssm:GetParametersByPath"
        ]
        Resource = [
          aws_ssm_parameter.database_url.arn,
          aws_ssm_parameter.better_auth_secret.arn,
          aws_ssm_parameter.google_client_id.arn,
          aws_ssm_parameter.google_client_secret.arn,
          aws_ssm_parameter.openai_api_key.arn,
          aws_ssm_parameter.inngest_signing_key.arn,
          aws_ssm_parameter.inngest_event_key.arn,
        ]
      },
      {
        Effect   = "Allow"
        Action   = ["kms:Decrypt"]
        Resource = "arn:aws:kms:*:*:alias/aws/ssm"
      }
    ]
  })
}

resource "aws_iam_role" "ecs_task" {
  name = "${local.name}-ecs-task"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = local.common_tags
}

resource "aws_ecs_cluster" "main" {
  name = "${local.name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = local.common_tags
}

resource "aws_lb" "api" {
  name               = substr("${local.name}-api", 0, 32)
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = [for subnet in values(aws_subnet.public) : subnet.id]

  tags = local.common_tags
}

resource "aws_lb_target_group" "api" {
  name        = substr("${local.name}-api-tg", 0, 32)
  port        = var.api_container_port
  protocol    = "HTTP"
  target_type = "ip"
  vpc_id      = aws_vpc.main.id

  health_check {
    path                = var.api_health_check_path
    matcher             = "200-399"
    healthy_threshold   = 2
    unhealthy_threshold = 5
    interval            = 30
    timeout             = 5
  }

  tags = local.common_tags
}

resource "aws_acm_certificate" "api" {
  count             = local.create_custom_domain ? 1 : 0
  domain_name       = var.api_domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = local.common_tags
}

resource "aws_route53_record" "api_cert_validation" {
  for_each = local.create_custom_domain ? {
    for dvo in aws_acm_certificate.api[0].domain_validation_options : dvo.domain_name => {
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

resource "aws_acm_certificate_validation" "api" {
  count                   = local.create_custom_domain ? 1 : 0
  certificate_arn         = aws_acm_certificate.api[0].arn
  validation_record_fqdns = [for record in aws_route53_record.api_cert_validation : record.fqdn]
}

resource "aws_lb_listener" "http_forward" {
  count             = local.create_custom_domain ? 0 : 1
  load_balancer_arn = aws_lb.api.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_lb_listener" "http_redirect" {
  count             = local.create_custom_domain ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
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

resource "aws_lb_listener" "https" {
  count             = local.create_custom_domain ? 1 : 0
  load_balancer_arn = aws_lb.api.arn
  port              = 443
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS13-1-2-2021-06"
  certificate_arn   = aws_acm_certificate_validation.api[0].certificate_arn

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.api.arn
  }
}

resource "aws_route53_record" "api_alias" {
  count   = local.create_custom_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.api_domain_name
  type    = "A"

  alias {
    name                   = aws_lb.api.dns_name
    zone_id                = aws_lb.api.zone_id
    evaluate_target_health = true
  }
}

# The task definition is owned by CI/CD (apps/api/taskdef.template.json is
# the source of truth; deployspec.yml renders it and registers each revision).
# Terraform just reads the latest ACTIVE revision so the service can be
# created on a fresh apply if a revision already exists. After that, the
# service's `ignore_changes = [task_definition]` lets CodeBuild keep rolling
# new revisions without Terraform fighting them.
#
# Fresh-deploy bootstrap: on a brand-new account, run one CI/CD build first
# (it'll fail at the UpdateService step because the service doesn't exist
# yet, but it WILL register a task-def revision). Then `terraform apply` —
# the service is created pointing at that revision. From then on, the
# pipeline runs cleanly.
data "aws_ecs_task_definition" "api" {
  task_definition = "${local.name}-api"
}

resource "aws_ecs_service" "api" {
  name                              = "${local.name}-api"
  cluster                           = aws_ecs_cluster.main.id
  task_definition                   = data.aws_ecs_task_definition.api.arn
  desired_count                     = var.api_desired_count
  launch_type                       = "FARGATE"
  health_check_grace_period_seconds = 60
  enable_execute_command            = true

  network_configuration {
    subnets          = [for subnet in values(aws_subnet.private) : subnet.id]
    security_groups  = [aws_security_group.ecs_service.id]
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.api.arn
    container_name   = "api"
    container_port   = var.api_container_port
  }

  deployment_minimum_healthy_percent = 50
  deployment_maximum_percent         = 200

  depends_on = [
    aws_lb_listener.http_forward,
    aws_lb_listener.http_redirect,
    aws_db_instance.postgres,
    aws_elasticache_replication_group.redis
  ]

  # CodePipeline's ECS Deploy stage registers new task-definition revisions
  # and updates the service to point at them. Terraform must not try to
  # revert that, or every `terraform apply` would roll the live app back to
  # whatever image tag was deployed manually before CI took over.
  lifecycle {
    ignore_changes = [task_definition]
  }

  tags = local.common_tags
}
