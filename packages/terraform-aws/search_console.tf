# --- Google Search Console domain verification ----------------------------
#
# Google's OAuth restricted-scope verification requires that the domain
# listed as the "Application home page" on the OAuth consent screen is
# owned by the same Google account that owns the GCP project. Ownership
# is proven via a Google-issued TXT record at the apex of the domain.
#
# Workflow:
#   1. Sign into https://search.google.com/search-console as the SAME
#      Google account that owns the `hirely-495121` GCP project.
#   2. Add property -> Domain -> enter "mindoutreach.com".
#   3. Google generates a token of the form `google-site-verification=XYZ...`
#      Pass JUST the part after the `=` as the `google_site_verification_token`
#      variable (or set it in tfvars).
#   4. `terraform apply`. This creates the TXT record at the apex.
#   5. Wait ~30-60s for Route53 propagation, then click "Verify" in
#      Search Console.
#   6. Back in the GCP OAuth consent screen, re-submit verification.
#
# Why a separate `aws_route53_record` instead of bundling into an apex
# TXT record set with SPF/DMARC? Route53 treats name+type as a single
# record set with multiple values, but Google's verifier and most SPF
# tools tolerate multiple separate record sets just fine at the apex,
# AND keeping each value in its own Terraform resource makes diffs
# obvious during rotations (Google has rotated the token format twice
# in the last five years). If we ever add SPF at the apex we'll merge.

variable "google_site_verification_token" {
  description = <<-EOT
    The token portion of the TXT value Google Search Console gives you
    after adding `mindoutreach.com` as a Domain property. Paste JUST the
    string after `google-site-verification=` -- this resource adds the
    `google-site-verification=` prefix automatically.

    Leave null to skip creating the verification TXT record (default).
  EOT
  type        = string
  default     = null
  nullable    = true
  sensitive   = false
}

locals {
  create_google_site_verification = (
    var.google_site_verification_token != null
    && var.route53_zone_id != null
    && var.ses_mail_domain != null
  )
}

resource "aws_route53_record" "google_site_verification" {
  count = local.create_google_site_verification ? 1 : 0

  zone_id = var.route53_zone_id
  # Apex of the domain. var.ses_mail_domain is already "mindoutreach.com"
  # (it's the verified email-sending domain). Reusing it keeps the source
  # of truth in one place instead of introducing a third "base_domain"
  # variable.
  name = var.ses_mail_domain
  type = "TXT"
  ttl  = 300

  records = [
    "google-site-verification=${var.google_site_verification_token}",
  ]

  # Apex TXT slot is currently free (SES uses _amazonses.<domain> for its
  # verification, _dmarc.<domain> for DMARC). If a future change adds SPF
  # at the apex, merge values into a single resource instead of keeping
  # two -- Route53 will reject a second record set at the same name+type.
  allow_overwrite = true
}
