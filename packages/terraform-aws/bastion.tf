variable "bastion_enabled" {
  description = "Set to true to create a bastion host for DB access"
  type        = bool
  default     = true
}

variable "bastion_key_name" {
  description = "EC2 key pair name for SSH access to the bastion"
  type        = string
  default     = null
  nullable    = true
}

variable "bastion_allowed_cidrs" {
  description = "CIDRs allowed to SSH into the bastion (your IP)"
  type        = list(string)
  default     = ["0.0.0.0/0"]
}

data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["al2023-ami-*-x86_64"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

resource "aws_security_group" "bastion" {
  count = var.bastion_enabled ? 1 : 0

  name        = "${local.name}-bastion"
  description = "SSH access to bastion host"
  vpc_id      = aws_vpc.main.id

  ingress {
    description = "SSH"
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = var.bastion_allowed_cidrs
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = merge(local.common_tags, {
    Name = "${local.name}-bastion-sg"
  })
}

resource "aws_security_group_rule" "db_from_bastion" {
  count = var.bastion_enabled ? 1 : 0

  type                     = "ingress"
  description              = "Postgres from bastion"
  from_port                = 5432
  to_port                  = 5432
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion[0].id
  security_group_id        = aws_security_group.db.id
}

resource "aws_security_group_rule" "redis_from_bastion" {
  count = var.bastion_enabled ? 1 : 0

  type                     = "ingress"
  description              = "Redis from bastion"
  from_port                = 6379
  to_port                  = 6379
  protocol                 = "tcp"
  source_security_group_id = aws_security_group.bastion[0].id
  security_group_id        = aws_security_group.redis.id
}

resource "aws_instance" "bastion" {
  count = var.bastion_enabled ? 1 : 0

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = "t3.micro"
  subnet_id              = values(aws_subnet.public)[0].id
  vpc_security_group_ids = [aws_security_group.bastion[0].id]
  key_name               = var.bastion_key_name

  user_data = <<-EOF
    #!/bin/bash
    dnf install -y postgresql16
  EOF

  tags = merge(local.common_tags, {
    Name = "${local.name}-bastion"
  })
}

output "bastion_public_ip" {
  description = "Public IP of the bastion host (SSH into this)"
  value       = var.bastion_enabled ? aws_instance.bastion[0].public_ip : null
}

output "db_endpoint" {
  description = "RDS endpoint (use from bastion)"
  value       = aws_db_instance.postgres.address
}

output "db_port" {
  description = "RDS port"
  value       = aws_db_instance.postgres.port
}

output "db_name" {
  description = "Database name"
  value       = var.db_name
}

output "db_username" {
  description = "Database username"
  value       = var.db_username
}
