# --- Web client DNS ------------------------------------------------------
#
# The web client (`apps/web`) is hosted on Vercel, not in this AWS account.
# Vercel owns the TLS certificate and the actual HTTP serving; AWS only
# owns the Route53 record that points at Vercel's edge.
#
# Why CNAME at the subdomain instead of `aws_route53_record` ALIAS?
#   - Vercel is not an AWS service, so there's no ALIAS target for it.
#   - For an apex (e.g. `hirely.com` -> Vercel) you'd need an A record at
#     `76.76.21.21`. We're using a subdomain (`app.mindoutreach.com`), so a
#     plain CNAME at `cname.vercel-dns.com` is correct.
#
# After Terraform applies this, you still need to add the same domain in
# the Vercel dashboard (Project -> Settings -> Domains). Vercel verifies
# the CNAME, then auto-issues a Let's Encrypt cert. Typical lag: 1-3
# minutes once the DNS record propagates.

locals {
  create_web_domain = (
    var.web_domain_name != null
    && var.route53_zone_id != null
  )
}

resource "aws_route53_record" "web_cname" {
  count   = local.create_web_domain ? 1 : 0
  zone_id = var.route53_zone_id
  name    = var.web_domain_name
  type    = "CNAME"
  ttl     = 300
  records = [var.vercel_dns_target]
}

output "web_domain" {
  value       = local.create_web_domain ? var.web_domain_name : null
  description = "Custom domain CNAME'd at Vercel for the web client"
}
