locals {
  name = "${var.project_name}-${var.environment}"

  azs = slice(data.aws_availability_zones.available.names, 0, var.availability_zones_count)

  public_subnet_cidrs = [
    for idx in range(length(local.azs)) : cidrsubnet(var.vpc_cidr, 8, idx)
  ]

  private_subnet_cidrs = [
    for idx in range(length(local.azs)) : cidrsubnet(var.vpc_cidr, 8, idx + 10)
  ]

  create_custom_domain = var.route53_zone_id != null && var.api_domain_name != null

  api_base_url = local.create_custom_domain ? "https://${var.api_domain_name}" : "http://${aws_lb.api.dns_name}"

  google_redirect_uri = "${local.api_base_url}/api/auth/callback/google"

  common_tags = {
    Project     = var.project_name
    Environment = var.environment
    ManagedBy   = "terraform"
  }
}
