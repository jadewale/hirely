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
      Action = "sts:AssumeRole"
      Effect = "Allow"
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
    ]
  })
}

# ── CodeBuild Project ────────────────────────────────────────────────────────

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

# ── CodePipeline IAM Role ────────────────────────────────────────────────────

resource "aws_iam_role" "codepipeline" {
  count = var.codepipeline_enabled ? 1 : 0
  name  = "${local.name}-codepipeline"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Action = "sts:AssumeRole"
      Effect = "Allow"
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
        Resource = aws_codebuild_project.api[0].arn
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
  count    = var.codepipeline_enabled ? 1 : 0
  name     = "${local.name}-api"
  role_arn = aws_iam_role.codepipeline[0].arn

  artifact_store {
    location = aws_s3_bucket.pipeline_artifacts[0].bucket
    type     = "S3"
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
        ProjectName = aws_codebuild_project.api[0].name
      }
    }
  }

  stage {
    name = "Deploy"

    action {
      name            = "DeployToECS"
      category        = "Deploy"
      owner           = "AWS"
      provider        = "ECS"
      version         = "1"
      input_artifacts = ["build_output"]

      configuration = {
        ClusterName = aws_ecs_cluster.main.name
        ServiceName = aws_ecs_service.api.name
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
