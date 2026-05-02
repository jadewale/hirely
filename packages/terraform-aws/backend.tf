# Uncomment the block below after creating the S3 bucket and DynamoDB table.
#
# To create them (one-time, via AWS CLI):
#
#   aws s3api create-bucket --bucket outreach-terraform-state --region us-east-1
#   aws s3api put-bucket-versioning --bucket outreach-terraform-state --versioning-configuration Status=Enabled
#   aws dynamodb create-table \
#     --table-name outreach-terraform-locks \
#     --attribute-definitions AttributeName=LockID,AttributeType=S \
#     --key-schema AttributeName=LockID,KeyType=HASH \
#     --billing-mode PAY_PER_REQUEST \
#     --region us-east-1
#
# Then uncomment, run `terraform init -migrate-state` to move local state to S3.

# terraform {
#   backend "s3" {
#     bucket         = "outreach-terraform-state"
#     key            = "prod/terraform.tfstate"
#     region         = "us-east-1"
#     dynamodb_table = "outreach-terraform-locks"
#     encrypt        = true
#   }
# }
