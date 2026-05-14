################################################################################
# CI/CD — CodePipeline + CodeBuild -> ECS
################################################################################

# ── Artifact bucket ──────────────────────────────────────────────────────────

resource "aws_s3_bucket" "pipeline_artifacts" {
  count  = var.codepipeline_enabled ? 1 : 0
  bucket = "${local.name}-pipeline-artifacts"

  tags = local.common_tags
}

resource "aws_s3_bucket_lifecycle_configuration" "pipeline_artifacts" {
  count  = var.codepipeline_enabled ? 1 : 0
  bucket = aws_s3_bucket.pipeline_artifacts[0].id

  rule {
    id     = "expire-old-artifacts"
    status = "Enabled"
    filter {}
    expiration {
      days = 30
    }
  }
}

# ── CodeStar Connection to GitHub ────────────────────────────────────────────

resource "aws_codestarconnections_connection" "github" {
  count         = var.codepipeline_enabled ? 1 : 0
  name          = "${local.name}-github"
  provider_type = "GitHub"

  tags = local.common_tags
}

# ── CodeBuild IAM Role ──────────────────────────────────────────────────────

resource "aws_iam_role" "codebuild" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.name}-codebuild"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "codebuild" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.name}-codebuild"
  role  = aws_iam_role.codebuild[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
        ]
        Resource = "arn:aws:logs:${var.aws_region}:*:*"
      },
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetBucketAcl",
          "s3:GetBucketLocation",
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts[0].arn,
          "${aws_s3_bucket.pipeline_artifacts[0].arn}/*",
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecr:BatchCheckLayerAvailability",
          "ecr:CompleteLayerUpload",
          "ecr:GetAuthorizationToken",
          "ecr:InitiateLayerUpload",
          "ecr:PutImage",
          "ecr:UploadLayerPart",
          "ecr:BatchGetImage",
          "ecr:GetDownloadUrlForLayer",
        ]
        Resource = "*"
      },
      # CodeBuild now owns deploy: it renders the task definition from the
      # versioned template, registers a new revision, rolls the service, and
      # waits for stability.
      {
        Effect = "Allow"
        Action = [
          "ecs:RegisterTaskDefinition",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeServices",
        ]
        Resource = "*"
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:UpdateService",
        ]
        Resource = aws_ecs_service.api.id
      },
      # Required so register-task-definition can attach the execution + task roles.
      {
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          aws_iam_role.ecs_execution.arn,
          aws_iam_role.ecs_task.arn,
        ]
        Condition = {
          StringEquals = {
            "iam:PassedToService" = "ecs-tasks.amazonaws.com"
          }
        }
      },
    ]
  })
}

# ── CodeBuild: Build ─────────────────────────────────────────────────────────
# Build the Docker image, push to ECR (SHA-tagged), and hand the image URI
# off to the Deploy stage via the image_uri.txt artifact.

resource "aws_codebuild_project" "api" {
  count        = var.codepipeline_enabled ? 1 : 0
  name         = "${local.name}-api-build"
  description  = "Build and push API Docker image to ECR"
  service_role = aws_iam_role.codebuild[0].arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    privileged_mode             = true
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "ECR_REPO_URI"
      value = aws_ecr_repository.api.repository_url
    }

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "BASE_BUN_REPO"
      value = aws_ecr_repository.base_bun.repository_url
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${local.name}-api"
      stream_name = "build"
    }
  }

  tags = local.common_tags
}

# ── CodeBuild: Deploy ────────────────────────────────────────────────────────
# Render apps/api/taskdef.template.json with the image URI from Build, register
# a new ECS task-def revision, roll the service, and wait for stability.

resource "aws_codebuild_project" "api_deploy" {
  count        = var.codepipeline_enabled ? 1 : 0
  name         = "${local.name}-api-deploy"
  description  = "Render task definition, register revision, roll ECS service"
  service_role = aws_iam_role.codebuild[0].arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"
    # privileged_mode is intentionally not set — Deploy doesn't touch Docker.

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    # ── Task-definition template inputs ─────────────────────────────────────
    # deployspec.yml runs envsubst on apps/api/taskdef.template.json with these.

    environment_variable {
      name  = "TASK_FAMILY"
      value = "${local.name}-api"
    }

    environment_variable {
      name  = "API_CPU"
      value = tostring(var.api_cpu)
    }

    environment_variable {
      name  = "API_MEMORY"
      value = tostring(var.api_memory)
    }

    environment_variable {
      name  = "API_PORT"
      value = tostring(var.api_container_port)
    }

    environment_variable {
      name  = "EXECUTION_ROLE_ARN"
      value = aws_iam_role.ecs_execution.arn
    }

    environment_variable {
      name  = "TASK_ROLE_ARN"
      value = aws_iam_role.ecs_task.arn
    }

    environment_variable {
      name  = "LOG_GROUP"
      value = aws_cloudwatch_log_group.api.name
    }

    environment_variable {
      name  = "ECS_CLUSTER"
      value = aws_ecs_cluster.main.name
    }

    environment_variable {
      name  = "ECS_SERVICE"
      value = aws_ecs_service.api.name
    }

    # Non-secret container env vars

    environment_variable {
      name  = "REDIS_HOST"
      value = aws_elasticache_replication_group.redis.primary_endpoint_address
    }

    environment_variable {
      name  = "FRONTEND_URL"
      value = var.frontend_url
    }

    environment_variable {
      name  = "BETTER_AUTH_URL"
      value = local.api_base_url
    }

    environment_variable {
      name  = "GOOGLE_REDIRECT_URI"
      value = local.google_redirect_uri
    }

    # SSM parameter ARNs for secrets (values stay in SSM, never in env vars)

    environment_variable {
      name  = "DATABASE_URL_ARN"
      value = aws_ssm_parameter.database_url.arn
    }

    environment_variable {
      name  = "BETTER_AUTH_SECRET_ARN"
      value = aws_ssm_parameter.better_auth_secret.arn
    }

    environment_variable {
      name  = "GOOGLE_CLIENT_ID_ARN"
      value = aws_ssm_parameter.google_client_id.arn
    }

    environment_variable {
      name  = "GOOGLE_CLIENT_SECRET_ARN"
      value = aws_ssm_parameter.google_client_secret.arn
    }

    environment_variable {
      name  = "OPENAI_API_KEY_ARN"
      value = aws_ssm_parameter.openai_api_key.arn
    }

    environment_variable {
      name  = "INNGEST_SIGNING_KEY_ARN"
      value = aws_ssm_parameter.inngest_signing_key.arn
    }

    environment_variable {
      name  = "INNGEST_EVENT_KEY_ARN"
      value = aws_ssm_parameter.inngest_event_key.arn
    }

    environment_variable {
      name  = "RESEND_API_KEY_ARN"
      value = aws_ssm_parameter.resend_api_key.arn
    }

    environment_variable {
      name  = "EMAIL_PROVIDER"
      value = var.email_provider
    }

    environment_variable {
      name  = "EMAIL_FROM"
      value = var.email_from
    }

    environment_variable {
      name  = "SES_CONFIGURATION_SET"
      value = var.ses_mail_domain != null ? aws_sesv2_configuration_set.email[0].configuration_set_name : ""
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "deployspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${local.name}-api"
      stream_name = "deploy"
    }
  }

  tags = local.common_tags
}

# ── CodePipeline IAM Role ────────────────────────────────────────────────────

resource "aws_iam_role" "codepipeline" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.name}-codepipeline"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
    }]
  })

  tags = local.common_tags
}

resource "aws_iam_role_policy" "codepipeline" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.name}-codepipeline"
  role  = aws_iam_role.codepipeline[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:GetObject",
          "s3:PutObject",
          "s3:GetBucketVersioning",
        ]
        Resource = [
          aws_s3_bucket.pipeline_artifacts[0].arn,
          "${aws_s3_bucket.pipeline_artifacts[0].arn}/*",
        ]
      },
      {
        Effect   = "Allow"
        Action   = "codestar-connections:UseConnection"
        Resource = aws_codestarconnections_connection.github[0].arn
      },
      {
        Effect = "Allow"
        Action = [
          "codebuild:BatchGetBuilds",
          "codebuild:StartBuild",
        ]
        Resource = [
          aws_codebuild_project.api[0].arn,
          aws_codebuild_project.api_deploy[0].arn,
        ]
      },
      {
        Effect = "Allow"
        Action = [
          "ecs:DescribeServices",
          "ecs:DescribeTaskDefinition",
          "ecs:DescribeTasks",
          "ecs:ListTasks",
          "ecs:RegisterTaskDefinition",
          "ecs:UpdateService",
          "ecs:TagResource",
        ]
        Resource = "*"
      },
      {
        Effect   = "Allow"
        Action   = "iam:PassRole"
        Resource = "*"
        Condition = {
          StringEqualsIfExists = {
            "iam:PassedToService" = [
              "ecs-tasks.amazonaws.com",
            ]
          }
        }
      },
    ]
  })
}

# ── CodePipeline ─────────────────────────────────────────────────────────────

resource "aws_codepipeline" "api" {
  count         = var.codepipeline_enabled ? 1 : 0
  name          = "${local.name}-api"
  role_arn      = aws_iam_role.codepipeline[0].arn
  pipeline_type = "V2"

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts[0].bucket
    type     = "S3"
  }

  # V2 trigger block — registers an explicit GitHub-App event filter via
  # the CodeStar connection. Avoids the V1 race where the source action's
  # implicit subscription silently fails to register if the connection is
  # PENDING at pipeline-create time.
  trigger {
    provider_type = "CodeStarSourceConnection"

    git_configuration {
      source_action_name = "GitHub"

      push {
        branches {
          includes = [var.github_branch]
        }
      }
    }
  }

  stage {
    name = "Source"

    action {
      name             = "GitHub"
      category         = "Source"
      owner            = "AWS"
      provider         = "CodeStarSourceConnection"
      version          = "1"
      output_artifacts = ["source_output"]

      configuration = {
        ConnectionArn    = aws_codestarconnections_connection.github[0].arn
        FullRepositoryId = var.github_repo
        BranchName       = var.github_branch
        DetectChanges    = "false"
      }
    }
  }

  # Build: docker build + push, hand image_uri.txt to Deploy via build_output.
  stage {
    name = "Build"

    action {
      name             = "BuildAndPush"
      category         = "Build"
      owner            = "AWS"
      provider         = "CodeBuild"
      version          = "1"
      input_artifacts  = ["source_output"]
      output_artifacts = ["build_output"]

      configuration = {
        ProjectName = aws_codebuild_project.api[0].name
      }
    }
  }

  # Deploy: render task-def template (source_output) using the image URI
  # produced by Build (build_output), register a new ECS revision, roll the
  # service, and wait for stability.
  stage {
    name = "Deploy"

    action {
      name            = "DeployToECS"
      category        = "Build"
      owner           = "AWS"
      provider        = "CodeBuild"
      version         = "1"
      input_artifacts = ["source_output", "build_output"]

      configuration = {
        ProjectName   = aws_codebuild_project.api_deploy[0].name
        PrimarySource = "source_output"
      }
    }
  }

  tags = local.common_tags
}

# ── Outputs ──────────────────────────────────────────────────────────────────

output "codepipeline_name" {
  description = "Name of the CI/CD pipeline"
  value       = var.codepipeline_enabled ? aws_codepipeline.api[0].name : null
}

output "codestar_connection_status" {
  description = "Status of the GitHub connection (must be AVAILABLE after manual approval)"
  value       = var.codepipeline_enabled ? aws_codestarconnections_connection.github[0].connection_status : null
}
