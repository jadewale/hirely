################################################################################
# Amazon SES — transactional email for Better Auth (verify / reset / welcome)
#
# Why SES instead of Resend:
#  - No long-lived API key. The ECS task role signs SES requests directly via
#    SigV4 (see `aws_iam_role_policy.ecs_task_ses` below). One less SSM
#    parameter to rotate.
#  - Native bounce/complaint pipeline. The configuration set + SNS topic in
#    this file captures every delivery event from day one. Wire your bounce
#    handler (Lambda / SQS consumer) to `aws_sns_topic.ses_events` later.
#  - Same DNS-verification ceremony you'd do for any sender (DKIM CNAMEs in
#    Route53). With SES it's fully Terraform-driven instead of a Resend UI
#    paste-loop.
#
# SES SANDBOX: a fresh AWS account lands in the SES sandbox which only allows
# sending to verified addresses with a 200/day limit. After a successful
# `terraform apply` of this file, click "Request production access" in the SES
# console (https://console.aws.amazon.com/ses/) so real users can receive mail.
# This step is unavoidable per-account and is not Terraformable.
################################################################################

# ── Sender identity ──────────────────────────────────────────────────────────
# Creates the domain identity AND enables Easy DKIM in one go. The provider
# fills in `dkim_signing_attributes.tokens` (3 entries) which we hang
# CNAME records off of below.

resource "aws_sesv2_email_identity" "mail_domain" {
  count          = var.ses_mail_domain != null ? 1 : 0
  email_identity = var.ses_mail_domain

  dkim_signing_attributes {
    next_signing_key_length = "RSA_2048_BIT"
  }

  tags = local.common_tags
}

# ── DKIM CNAMEs in Route53 ───────────────────────────────────────────────────
# Three CNAMEs at `<token>._domainkey.<domain>` → `<token>.dkim.amazonses.com`.
# Required for the identity to reach the "Verified" state — until these
# propagate SES will keep `SendEmail` returning MessageRejected.
#
# We use `count = 3` instead of `for_each` because SES always returns exactly
# three DKIM tokens but they're only known after apply (so `for_each` over
# the token set fails at plan time with "Invalid for_each argument").

resource "aws_route53_record" "ses_dkim" {
  count = (
    var.ses_mail_domain != null && var.route53_zone_id != null
  ) ? 3 : 0

  zone_id = var.route53_zone_id
  name    = "${aws_sesv2_email_identity.mail_domain[0].dkim_signing_attributes[0].tokens[count.index]}._domainkey.${var.ses_mail_domain}"
  type    = "CNAME"
  ttl     = 1800
  records = [
    "${aws_sesv2_email_identity.mail_domain[0].dkim_signing_attributes[0].tokens[count.index]}.dkim.amazonses.com",
  ]
  allow_overwrite = true
}

# ── DMARC TXT record ─────────────────────────────────────────────────────────
# Lightweight policy: ask receivers to honor DKIM/SPF alignment, but only
# "none" — i.e. report failures, don't reject — so we don't lock ourselves
# out before deliverability is dialed in. Tighten to `p=quarantine` or
# `p=reject` after we've watched the reports for a few weeks.

resource "aws_route53_record" "ses_dmarc" {
  count = (
    var.ses_mail_domain != null
    && var.route53_zone_id != null
    && var.ses_create_dmarc_record
  ) ? 1 : 0

  zone_id         = var.route53_zone_id
  name            = "_dmarc.${var.ses_mail_domain}"
  type            = "TXT"
  ttl             = 1800
  records         = ["v=DMARC1; p=none; rua=mailto:postmaster@${var.ses_mail_domain}"]
  allow_overwrite = true
}

# ── Configuration set + bounce/complaint SNS topic ───────────────────────────
# Best-practice envelope around every send. Two payoffs:
#   1. CloudWatch metrics per-config-set (Send/Bounce/Complaint/Delivery rates)
#   2. SES → SNS event firehose for bounce + complaint handling. Subscribe a
#      Lambda or SQS queue to the topic when you build the bounce processor.

resource "aws_sesv2_configuration_set" "email" {
  count                  = var.ses_mail_domain != null ? 1 : 0
  configuration_set_name = "${local.name}-email"

  reputation_options {
    reputation_metrics_enabled = true
  }

  sending_options {
    sending_enabled = true
  }

  tags = local.common_tags
}

resource "aws_sns_topic" "ses_events" {
  count = var.ses_mail_domain != null ? 1 : 0
  name  = "${local.name}-ses-events"

  tags = local.common_tags
}

# SES needs to be allowed to publish into the topic; the auto-generated topic
# policy doesn't cover service principals, so we set one explicitly.
resource "aws_sns_topic_policy" "ses_events" {
  count = var.ses_mail_domain != null ? 1 : 0
  arn   = aws_sns_topic.ses_events[0].arn

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid       = "AllowSESPublish"
        Effect    = "Allow"
        Principal = { Service = "ses.amazonaws.com" }
        Action    = "sns:Publish"
        Resource  = aws_sns_topic.ses_events[0].arn
        Condition = {
          StringEquals = {
            "aws:SourceAccount" = data.aws_caller_identity.current.account_id
          }
        }
      }
    ]
  })
}

resource "aws_sesv2_configuration_set_event_destination" "events_to_sns" {
  count                  = var.ses_mail_domain != null ? 1 : 0
  configuration_set_name = aws_sesv2_configuration_set.email[0].configuration_set_name
  event_destination_name = "sns"

  event_destination {
    enabled = true
    sns_destination {
      topic_arn = aws_sns_topic.ses_events[0].arn
    }
    matching_event_types = [
      "BOUNCE",
      "COMPLAINT",
      "REJECT",
      "DELIVERY_DELAY",
    ]
  }
}

data "aws_caller_identity" "current" {}

# ── ECS task-role permission to call SES ─────────────────────────────────────
# Attached to the TASK role (not the execution role). The execution role
# only needs SSM/ECR/logs; the running container's own AWS calls go through
# the task role.

resource "aws_iam_role_policy" "ecs_task_ses" {
  count = var.ses_mail_domain != null ? 1 : 0
  name  = "${local.name}-ecs-task-ses"
  role  = aws_iam_role.ecs_task.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        # SendEmail is the v2 verb; SendRawEmail is kept for any future
        # path that needs MIME (attachments, calendar invites).
        Action = [
          "ses:SendEmail",
          "ses:SendRawEmail",
        ]
        # Restrict to our verified identity AND to traffic going through
        # our configuration set so a leaked task role can't be used to
        # send from arbitrary identities or bypass bounce capture.
        Resource = [
          aws_sesv2_email_identity.mail_domain[0].arn,
          "arn:aws:ses:${var.aws_region}:${data.aws_caller_identity.current.account_id}:configuration-set/${aws_sesv2_configuration_set.email[0].configuration_set_name}",
        ]
      },
    ]
  })
}
