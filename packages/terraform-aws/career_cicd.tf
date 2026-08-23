# CI/CD for career-api. Mirrors cicd.tf but reuses the SHARED CodeStar GitHub
# connection (aws_codestarconnections_connection.github), pipeline-artifacts
# bucket (aws_s3_bucket.pipeline_artifacts), and base/bun ECR mirror
# (aws_ecr_repository.base_bun). Gated on the same var.codepipeline_enabled.
#
# The trigger is PATH-FILTERED so a push that only touches career code doesn't
# rebuild hirely, and vice versa (hirely's trigger gets the mirror filter in
# cicd.tf).

# ── CodeBuild IAM role ───────────────────────────────────────────────────────
resource "aws_iam_role" "career_codebuild" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.career_name}-codebuild"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "codebuild.amazonaws.com" }
    }]
  })

  tags = local.career_common_tags
}

resource "aws_iam_role_policy" "career_codebuild" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.career_name}-codebuild"
  role  = aws_iam_role.career_codebuild[0].id

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
        Action = ["ecs:UpdateService"]
        # Constructed ARN rather than aws_ecs_service.career_api.id so the
        # pipeline doesn't depend on the (bootstrap-gated) service resource.
        Resource = "arn:aws:ecs:${var.aws_region}:${data.aws_caller_identity.current.account_id}:service/${aws_ecs_cluster.main.name}/${local.career_name}-api"
      },
      {
        Effect = "Allow"
        Action = "iam:PassRole"
        Resource = [
          aws_iam_role.career_ecs_execution.arn,
          aws_iam_role.career_ecs_task.arn,
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
resource "aws_codebuild_project" "career_api" {
  count        = var.codepipeline_enabled ? 1 : 0
  name         = "${local.career_name}-api-build"
  description  = "Build and push career-api Docker image to ECR"
  service_role = aws_iam_role.career_codebuild[0].arn

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
      value = aws_ecr_repository.career_api.repository_url
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
    buildspec = "apps/career-api/buildspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${local.career_name}-api"
      stream_name = "build"
    }
  }

  tags = local.career_common_tags
}

# ── CodeBuild: Deploy ────────────────────────────────────────────────────────
resource "aws_codebuild_project" "career_api_deploy" {
  count        = var.codepipeline_enabled ? 1 : 0
  name         = "${local.career_name}-api-deploy"
  description  = "Render career-api task definition, register revision, roll ECS service"
  service_role = aws_iam_role.career_codebuild[0].arn

  artifacts {
    type = "CODEPIPELINE"
  }

  environment {
    compute_type                = "BUILD_GENERAL1_SMALL"
    image                       = "aws/codebuild/standard:7.0"
    type                        = "LINUX_CONTAINER"
    image_pull_credentials_type = "CODEBUILD"

    environment_variable {
      name  = "AWS_DEFAULT_REGION"
      value = var.aws_region
    }

    environment_variable {
      name  = "TASK_FAMILY"
      value = "${local.career_name}-api"
    }

    environment_variable {
      name  = "API_CPU"
      value = tostring(var.career_api_cpu)
    }

    environment_variable {
      name  = "API_MEMORY"
      value = tostring(var.career_api_memory)
    }

    environment_variable {
      name  = "API_PORT"
      value = tostring(var.career_api_container_port)
    }

    environment_variable {
      name  = "EXECUTION_ROLE_ARN"
      value = aws_iam_role.career_ecs_execution.arn
    }

    environment_variable {
      name  = "TASK_ROLE_ARN"
      value = aws_iam_role.career_ecs_task.arn
    }

    environment_variable {
      name  = "LOG_GROUP"
      value = aws_cloudwatch_log_group.career_api.name
    }

    environment_variable {
      name  = "ECS_CLUSTER"
      value = aws_ecs_cluster.main.name
    }

    environment_variable {
      name = "ECS_SERVICE"
      # Literal name (deterministic) so the deploy project doesn't depend on
      # the bootstrap-gated service resource.
      value = "${local.career_name}-api"
    }

    environment_variable {
      name  = "FRONTEND_URL"
      value = var.career_frontend_url
    }

    environment_variable {
      name  = "BETTER_AUTH_URL"
      value = local.career_api_base_url
    }

    environment_variable {
      name  = "CAREER_RESUME_BUCKET"
      value = aws_s3_bucket.career_resumes.bucket
    }

    environment_variable {
      name  = "DATABASE_URL_ARN"
      value = aws_ssm_parameter.career_database_url.arn
    }

    environment_variable {
      name  = "BETTER_AUTH_SECRET_ARN"
      value = aws_ssm_parameter.career_better_auth_secret.arn
    }

    environment_variable {
      name  = "STRIPE_SECRET_KEY_ARN"
      value = aws_ssm_parameter.career_stripe_secret_key.arn
    }

    environment_variable {
      name  = "STRIPE_WEBHOOK_SECRET_ARN"
      value = aws_ssm_parameter.career_stripe_webhook_secret.arn
    }

    environment_variable {
      name  = "INNGEST_SIGNING_KEY_ARN"
      value = aws_ssm_parameter.career_inngest_signing_key.arn
    }

    environment_variable {
      name  = "INNGEST_EVENT_KEY_ARN"
      value = aws_ssm_parameter.career_inngest_event_key.arn
    }
  }

  source {
    type      = "CODEPIPELINE"
    buildspec = "apps/career-api/deployspec.yml"
  }

  logs_config {
    cloudwatch_logs {
      group_name  = "/codebuild/${local.career_name}-api"
      stream_name = "deploy"
    }
  }

  tags = local.career_common_tags
}

# ── CodePipeline IAM role ────────────────────────────────────────────────────
resource "aws_iam_role" "career_codepipeline" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.career_name}-codepipeline"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action    = "sts:AssumeRole"
      Effect    = "Allow"
      Principal = { Service = "codepipeline.amazonaws.com" }
    }]
  })

  tags = local.career_common_tags
}

resource "aws_iam_role_policy" "career_codepipeline" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.career_name}-codepipeline"
  role  = aws_iam_role.career_codepipeline[0].id

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
          aws_codebuild_project.career_api[0].arn,
          aws_codebuild_project.career_api_deploy[0].arn,
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
            "iam:PassedToService" = ["ecs-tasks.amazonaws.com"]
          }
        }
      },
    ]
  })
}

# ── CodePipeline ─────────────────────────────────────────────────────────────
resource "aws_codepipeline" "career_api" {
  count         = var.codepipeline_enabled ? 1 : 0
  name          = "${local.career_name}-api"
  role_arn      = aws_iam_role.career_codepipeline[0].arn
  pipeline_type = "V2"

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts[0].bucket
    type     = "S3"
  }

  # Path-filtered so only career changes trigger this pipeline. hirely's
  # pipeline carries the complementary filter (see cicd.tf).
  trigger {
    provider_type = "CodeStarSourceConnection"

    git_configuration {
      source_action_name = "GitHub"

      push {
        branches {
          includes = [var.github_branch]
        }
        file_paths {
          includes = ["apps/career-api/**", "packages/career-**"]
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
        ProjectName = aws_codebuild_project.career_api[0].name
      }
    }
  }

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
        ProjectName   = aws_codebuild_project.career_api_deploy[0].name
        PrimarySource = "source_output"
      }
    }
  }

  tags = local.career_common_tags
}
