# ─────────────────────────────────────────────────────────────────────────────
# Résumé storage (RR-018)
#
# Private S3 bucket for candidate résumé files. The career-api never proxies
# bytes: the browser uploads/downloads directly using pre-signed URLs that the
# ECS task role signs. File contents never touch Postgres.
#
# Additive/flat like the rest of career_*.tf. The bucket is unconditional (it
# does not depend on career_api_service_enabled) so it can exist before the
# service is turned on.
# ─────────────────────────────────────────────────────────────────────────────

resource "aws_s3_bucket" "career_resumes" {
  bucket = "${local.career_name}-resumes-${data.aws_caller_identity.current.account_id}"
  tags   = merge(local.career_common_tags, { Name = "${local.career_name}-resumes" })
}

resource "aws_s3_bucket_public_access_block" "career_resumes" {
  bucket                  = aws_s3_bucket.career_resumes.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_server_side_encryption_configuration" "career_resumes" {
  bucket = aws_s3_bucket.career_resumes.id

  rule {
    apply_server_side_encryption_by_default {
      sse_algorithm = "AES256"
    }
  }
}

# CORS so the browser can PUT (upload) and GET (download) straight from the web
# origin. A pre-signed PUT carrying a Content-Type triggers a preflight.
resource "aws_s3_bucket_cors_configuration" "career_resumes" {
  bucket = aws_s3_bucket.career_resumes.id

  cors_rule {
    allowed_methods = ["PUT", "GET", "HEAD"]
    allowed_origins = [var.career_frontend_url]
    allowed_headers = ["*"]
    expose_headers  = ["ETag"]
    max_age_seconds = 3000
  }
}

# Sweep abandoned uploads so unconfirmed PENDING objects don't linger.
resource "aws_s3_bucket_lifecycle_configuration" "career_resumes" {
  bucket = aws_s3_bucket.career_resumes.id

  rule {
    id     = "abort-incomplete-multipart"
    status = "Enabled"
    filter {}

    abort_incomplete_multipart_upload {
      days_after_initiation = 7
    }
  }
}

# Grant the ECS task role object-level access to the résumé bucket only. Mirrors
# the aws_iam_role_policy.ecs_task_ses pattern (role = task role, scoped policy).
resource "aws_iam_role_policy" "career_ecs_task_resumes" {
  name = "${local.career_name}-ecs-task-resumes"
  role = aws_iam_role.career_ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid      = "ResumeObjectAccess"
        Effect   = "Allow"
        Action   = ["s3:PutObject", "s3:GetObject", "s3:DeleteObject"]
        Resource = "${aws_s3_bucket.career_resumes.arn}/*"
      },
      {
        Sid      = "ResumeBucketList"
        Effect   = "Allow"
        Action   = ["s3:ListBucket"]
        Resource = aws_s3_bucket.career_resumes.arn
      }
    ]
  })
}

output "career_resume_bucket" {
  description = "S3 bucket holding candidate résumés (RR-018)"
  value       = aws_s3_bucket.career_resumes.bucket
}
