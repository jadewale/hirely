output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "api_ecr_repository_url" {
  description = "ECR repository URL for the API image"
  value       = aws_ecr_repository.api.repository_url
}

output "base_bun_ecr_repository_url" {
  description = "ECR mirror for oven/bun base images (avoids Docker Hub rate limits in CodeBuild)"
  value       = aws_ecr_repository.base_bun.repository_url
}

output "api_load_balancer_dns_name" {
  description = "Public ALB DNS name for the API"
  value       = aws_lb.api.dns_name
}

output "api_base_url" {
  description = "Base URL for the deployed API"
  value       = local.api_base_url
}

output "api_domain_name" {
  description = "Custom API domain if configured"
  value       = var.api_domain_name
}

output "ecs_cluster_name" {
  description = "ECS cluster name"
  value       = aws_ecs_cluster.main.name
}

output "ecs_service_name" {
  description = "API ECS service name"
  value       = aws_ecs_service.api.name
}

output "database_address" {
  description = "RDS Postgres address"
  value       = aws_db_instance.postgres.address
}

output "database_name" {
  description = "RDS Postgres database name"
  value       = aws_db_instance.postgres.db_name
}

output "redis_primary_endpoint" {
  description = "Redis primary endpoint"
  value       = aws_elasticache_replication_group.redis.primary_endpoint_address
}

output "google_redirect_uri" {
  description = "Google OAuth redirect URI to configure in GCP"
  value       = local.google_redirect_uri
}

# ── career-platform ──────────────────────────────────────────────────────────

output "career_api_ecr_repository_url" {
  description = "ECR repository URL for the career-api image"
  value       = aws_ecr_repository.career_api.repository_url
}

output "career_api_load_balancer_dns_name" {
  description = "Public ALB DNS name for career-api"
  value       = aws_lb.career_api.dns_name
}

output "career_api_base_url" {
  description = "Base URL for the deployed career-api"
  value       = local.career_api_base_url
}

output "career_api_ecs_service_name" {
  description = "career-api ECS service name (null until career_api_service_enabled = true)"
  value       = var.career_api_service_enabled ? aws_ecs_service.career_api[0].name : null
}

output "career_codepipeline_name" {
  description = "Name of the career-api CI/CD pipeline"
  value       = var.codepipeline_enabled ? aws_codepipeline.career_api[0].name : null
}
