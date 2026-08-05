# career-web DNS. Mirrors web_dns.tf: career-web is hosted on Vercel, not in
# this AWS account. Vercel owns the TLS cert and HTTP serving; AWS only owns a
# Route53 CNAME pointing at Vercel's edge. No-op until both var.route53_zone_id
# and var.career_web_domain_name are set.
#
# After Terraform applies this, add the same domain in the Vercel dashboard
# (Project -> Settings -> Domains). Vercel verifies the CNAME, then auto-issues
# a Let's Encrypt cert (typically 1-3 min after DNS propagates).

locals {
  career_create_web_domain = (
    var.career_web_domain_name != null
    && var.route53_zone_id != null
  )
}

resource "aws_route53_record" "career_web_cname" {
  count   = local.career_create_web_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.career_web_domain_name
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_dns_target]
}

output "career_web_domain" {
  value       = local.career_create_web_domain ? var.career_web_domain_name : null
  description = "Custom domain CNAME'd at Vercel for career-web"
}
