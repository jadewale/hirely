# Variables for the career-platform app (career-api + career-web).
# The career app is additive: it reuses the shared VPC, ECS cluster, RDS
# instance, ElastiCache is NOT used, the CodeStar GitHub connection, the
# pipeline-artifacts bucket, and the base/bun ECR mirror. Everything below is
# career-specific.

variable "career_api_service_enabled" {
  description = <<-EOT
    Bootstrap gate for the career-api ECS service. The service reads its task
    definition from a data source, which errors on `plan` until a task-def
    revision exists. So the bootstrap is two-phase:
      1. Keep this false. `terraform apply` creates ECR + pipeline + secrets +
         ALB (everything except the service). Release the pipeline once to
         register the first task-def revision (its Deploy stage will fail at
         update-service because the service doesn't exist yet -- expected).
      2. Set this true and `terraform apply` again to create the service.
    Everything else is decoupled from the service, so the pipeline can be
    created and run while this is false.
  EOT
  type        = bool
  default     = false
}

variable "career_api_container_port" {
  description = "Container port exposed by career-api"
  type        = number
  default     = 4100
}

variable "career_api_cpu" {
  description = "Fargate CPU units for the career-api task"
  type        = number
  default     = 512
}

variable "career_api_memory" {
  description = "Fargate memory in MB for the career-api task"
  type        = number
  default     = 1024
}

variable "career_api_desired_count" {
  description = "Desired number of career-api tasks"
  type        = number
  default     = 1
}

variable "career_api_health_check_path" {
  description = "ALB health check path for career-api"
  type        = string
  default     = "/api/health"
}

variable "career_frontend_url" {
  description = <<-EOT
    Comma-separated allowed frontend origins for career-web. Drives career-api's
    CORS allowlist and Better Auth trustedOrigins. e.g.
    `https://app.careerplatform.com` (prod) or `http://localhost:3100` (dev).
  EOT
  type        = string
  default     = "http://localhost:3100"
}

variable "career_api_domain_name" {
  description = "Optional custom domain for career-api, e.g. api.careerplatform.com"
  type        = string
  default     = null
  nullable    = true
}

variable "career_web_domain_name" {
  description = "Optional custom domain for career-web (Vercel), e.g. app.careerplatform.com"
  type        = string
  default     = null
  nullable    = true
}

variable "career_db_name" {
  description = <<-EOT
    Database name for career-platform on the SHARED RDS instance. This database
    must be created once out-of-band (RDS is not publicly reachable, so
    Terraform can't create it): connect via the bastion and run
    `CREATE DATABASE career;` before career-api needs Postgres (RR-003).
  EOT
  type        = string
  default     = "career"
}

variable "career_better_auth_secret" {
  description = "Better Auth secret for career-api session signing"
  type        = string
  sensitive   = true
}

variable "career_stripe_secret_key" {
  description = "Stripe secret key for career-api (RR-028). Empty until Stripe lands."
  type        = string
  sensitive   = true
  default     = ""
}

variable "career_stripe_webhook_secret" {
  description = "Stripe webhook signing secret for career-api (RR-029)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "career_inngest_signing_key" {
  description = "Inngest Cloud signing key for career-api (RR-025)."
  type        = string
  sensitive   = true
  default     = ""
}

variable "career_inngest_event_key" {
  description = "Inngest Cloud event key for career-api (RR-025)."
  type        = string
  sensitive   = true
  default     = ""
}
