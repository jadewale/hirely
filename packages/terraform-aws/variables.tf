variable "aws_region" {
  description = "AWS region to deploy into"
  type        = string
  default     = "us-east-1"
}

variable "project_name" {
  description = "Project name prefix for resources"
  type        = string
  default     = "hirely"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "prod"
}

variable "vpc_cidr" {
  description = "CIDR block for the VPC"
  type        = string
  default     = "10.20.0.0/16"
}

variable "availability_zones_count" {
  description = "Number of availability zones to use"
  type        = number
  default     = 2
}

variable "allowed_ingress_cidrs" {
  description = "Public CIDRs allowed to reach the load balancer"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

variable "api_image_tag" {
  description = "Docker image tag to deploy for the API container"
  type        = string
  default     = "latest"
}

variable "api_container_port" {
  description = "Container port exposed by the API"
  type        = number
  default     = 4000
}

variable "api_cpu" {
  description = "Fargate CPU units for the API task"
  type        = number
  default     = 512
}

variable "api_memory" {
  description = "Fargate memory in MB for the API task"
  type        = number
  default     = 1024
}

variable "api_desired_count" {
  description = "Desired number of API tasks"
  type        = number
  default     = 1
}

variable "api_health_check_path" {
  description = "ALB health check path for the API"
  type        = string
  default     = "/api/health"
}

variable "frontend_url" {
  description = "Allowed frontend origin for API CORS"
  type        = string
  default     = "http://localhost:3000"
}

variable "route53_zone_id" {
  description = "Optional Route53 hosted zone ID for the API domain"
  type        = string
  default     = null
  nullable    = true
}

variable "api_domain_name" {
  description = "Optional custom domain for the API, e.g. api.hirely.com"
  type        = string
  default     = null
  nullable    = true
}

variable "db_name" {
  description = "Postgres database name"
  type        = string
  default     = "hirely"
}

variable "db_username" {
  description = "Postgres master username"
  type        = string
  default     = "hirely"
}

variable "db_instance_class" {
  description = "RDS instance class"
  type        = string
  default     = "db.t3.micro"
}

variable "db_allocated_storage" {
  description = "Initial RDS allocated storage in GB"
  type        = number
  default     = 20
}

variable "db_max_allocated_storage" {
  description = "Maximum RDS autoscaled storage in GB"
  type        = number
  default     = 100
}

variable "redis_node_type" {
  description = "ElastiCache node type"
  type        = string
  default     = "cache.t4g.micro"
}

variable "better_auth_secret" {
  description = "Better Auth secret for session signing"
  type        = string
  sensitive   = true
}

variable "google_client_id" {
  description = "Google OAuth client ID (Gmail access)"
  type        = string
  sensitive   = true
}

variable "google_client_secret" {
  description = "Google OAuth client secret"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key for email classification"
  type        = string
  sensitive   = true
}

variable "github_repo" {
  description = "GitHub repository in owner/repo format"
  type        = string
  default     = "jadewale/hirely"
}

variable "github_branch" {
  description = "Branch that triggers the CI/CD pipeline"
  type        = string
  default     = "main"
}

variable "codepipeline_enabled" {
  description = "Set to true to create CodePipeline CI/CD resources"
  type        = bool
  default     = true
}
