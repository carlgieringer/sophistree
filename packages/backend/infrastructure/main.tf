terraform {
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "local" {
    path = "terraform.tfstate"
  }
}

provider "aws" {
  region = var.aws_region
}

# Route 53 hosted zone
resource "aws_route53_zone" "main" {
  name = var.domain_name
}

# Route 53 A record
resource "aws_route53_record" "main" {
  zone_id = aws_route53_zone.main.zone_id
  name    = var.domain_name
  type    = "A"
  ttl     = "300"
  records = [aws_instance.web.public_ip]
}

# S3 bucket for PostgreSQL backups
resource "aws_s3_bucket" "postgres_backups" {
  bucket = "sophistree-postgres-backups-${var.environment}"
}

resource "aws_s3_bucket_lifecycle_configuration" "backup_retention" {
  bucket = aws_s3_bucket.postgres_backups.id

  rule {
    id     = "cleanup_old_backups"
    status = "Enabled"

    expiration {
      days = 30
    }
  }
}

# Get latest Amazon Linux 2023 AMI
data "aws_ami" "amazon_linux_2023" {
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

# VPC for the EC2 instance
resource "aws_vpc" "main" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "sophistree-vpc-${var.environment}"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "sophistree-igw-${var.environment}"
  }
}

# Route table
resource "aws_route_table" "main" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "sophistree-rt-${var.environment}"
  }
}

# Route table association
resource "aws_route_table_association" "public" {
  subnet_id      = aws_subnet.public.id
  route_table_id = aws_route_table.main.id
}

# Public subnet
resource "aws_subnet" "public" {
  vpc_id                  = aws_vpc.main.id
  cidr_block              = "10.0.1.0/24"
  map_public_ip_on_launch = true
  availability_zone       = "${var.aws_region}a"

  tags = {
    Name = "sophistree-public-subnet-${var.environment}"
  }
}

# Security group
resource "aws_security_group" "web" {
  name        = "sophistree-web-sg-${var.environment}"
  description = "Security group for web server"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTP"
  }

  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "HTTPS"
  }

  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
    description = "SSH access (protected by key authentication)"
  }

  ingress {
    from_port   = 5432
    to_port     = 5432
    protocol    = "tcp"
    self        = true
    description = "PostgreSQL internal access"
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "sophistree-sg-${var.environment}"
  }
}

# IAM role for EC2
resource "aws_iam_role" "web_server" {
  name = "sophistree-web-server-role-${var.environment}"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ec2.amazonaws.com"
        }
      }
    ]
  })
}

# IAM policy for S3 access
resource "aws_iam_role_policy" "s3_access" {
  name = "sophistree-s3-access-${var.environment}"
  role = aws_iam_role.web_server.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.postgres_backups.arn,
          "${aws_s3_bucket.postgres_backups.arn}/*"
        ]
      }
    ]
  })
}

# IAM instance profile
resource "aws_iam_instance_profile" "web_server" {
  name = "sophistree-web-server-profile-${var.environment}"
  role = aws_iam_role.web_server.name
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "web_server" {
  name              = "/sophistree/${var.environment}/web-server"
  retention_in_days = 30
}

# Dedicated EBS volume for PostgreSQL data
resource "aws_ebs_volume" "postgres_data" {
  availability_zone = "${var.aws_region}a"
  size             = 20
  type             = "gp3"
  encrypted        = true

  tags = {
    Name = "sophistree-postgres-data-${var.environment}"
  }
}

# EC2 instance
resource "aws_instance" "web" {
  ami           = data.aws_ami.amazon_linux_2023.id
  instance_type = "t3.small"
  key_name      = var.key_name

  subnet_id                   = aws_subnet.public.id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.web_server.name

  # Root volume for OS
  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "sophistree-web-${var.environment}"
  }

  user_data = <<-EOF
              #!/bin/bash
              # System updates
              dnf update -y
              dnf install -y nodejs npm postgresql15-server postgresql15 awscli yum-utils

              # Install Caddy
              dnf install -y 'dnf-command(copr)'
              dnf copr enable -y @caddy/caddy
              dnf install -y caddy

              # Configure Caddy
              cat > /etc/caddy/Caddyfile <<'CADDYFILE'
              ${var.domain_name} {
                reverse_proxy localhost:3000
              }
              CADDYFILE

              # Start Caddy
              systemctl enable caddy
              systemctl start caddy

              # Wait for the PostgreSQL data volume to be attached
              while [ ! -e /dev/nvme1n1 ]; do
                echo "Waiting for PostgreSQL data volume to be attached..."
                sleep 5
              done

              # Format the PostgreSQL data volume if it's new
              if ! blkid /dev/nvme1n1; then
                mkfs -t xfs /dev/nvme1n1
              fi

              # Create mount point and add to fstab
              mkdir -p /var/lib/pgsql
              echo "/dev/nvme1n1 /var/lib/pgsql xfs defaults,nofail 0 2" >> /etc/fstab
              mount -a

              # Set proper ownership
              chown -R postgres:postgres /var/lib/pgsql

              # Initialize PostgreSQL if data directory is empty
              if [ ! -f /var/lib/pgsql/data/postgresql.conf ]; then
                postgresql-setup --initdb
              fi

              # Start PostgreSQL
              systemctl enable postgresql
              systemctl start postgresql

              # Configure PostgreSQL if it's a fresh installation
              if ! sudo -u postgres psql -tAc "SELECT 1 FROM pg_roles WHERE rolname='sophistree'" | grep -q 1; then
                sudo -u postgres psql -c "CREATE USER sophistree WITH PASSWORD '${var.db_password}';"
                sudo -u postgres psql -c "CREATE DATABASE sophistree OWNER sophistree;"
                sudo -u postgres psql -c "ALTER USER sophistree WITH SUPERUSER;"
              fi

              # Install Node.js dependencies
              npm install -g pm2
              cd /home/ec2-user
              git clone https://github.com/carlgieringer/sophistree-extension.git
              cd sophistree-extension/packages/backend
              npm install

              # Create .env file with database connection
              cat > .env <<'ENVFILE'
              DATABASE_URL="postgresql://sophistree:${var.db_password}@localhost:5432/sophistree"
              ENVFILE

              # Set up backup script
              cat > /usr/local/bin/backup-postgres.sh <<'BACKUP'
              #!/bin/bash
              TIMESTAMP=$(date +%Y%m%d_%H%M%S)
              BACKUP_FILE="/tmp/postgres_backup_$TIMESTAMP.sql"
              pg_dump sophistree > $BACKUP_FILE
              aws s3 cp $BACKUP_FILE s3://${aws_s3_bucket.postgres_backups.id}/postgres_backup_$TIMESTAMP.sql
              rm $BACKUP_FILE
              BACKUP

              chmod +x /usr/local/bin/backup-postgres.sh

              # Set up hourly cron job for backups
              echo "0 * * * * /usr/local/bin/backup-postgres.sh" | crontab -

              # Start NextJS app with PM2
              cd /home/ec2-user/sophistree-extension/packages/backend
              pm2 start npm --name "sophistree-backend" -- start
              pm2 startup
              pm2 save

              # Set up PM2 monitoring
              pm2 install pm2-logrotate
              pm2 set pm2-logrotate:max_size 10M
              pm2 set pm2-logrotate:retain 7

              # Configure CloudWatch agent for monitoring
              dnf install -y amazon-cloudwatch-agent
              cat > /opt/aws/amazon-cloudwatch-agent/bin/config.json <<'CONFIG'
              {
                "agent": {
                  "metrics_collection_interval": 60,
                  "run_as_user": "root"
                },
                "logs": {
                  "logs_collected": {
                    "files": {
                      "collect_list": [
                        {
                          "file_path": "/home/ec2-user/.pm2/logs/sophistree-backend-out.log",
                          "log_group_name": "${aws_cloudwatch_log_group.web_server.name}",
                          "log_stream_name": "nextjs-app"
                        },
                        {
                          "file_path": "/var/log/postgresql/postgresql.log",
                          "log_group_name": "${aws_cloudwatch_log_group.web_server.name}",
                          "log_stream_name": "postgresql"
                        },
                        {
                          "file_path": "/var/log/caddy/access.log",
                          "log_group_name": "${aws_cloudwatch_log_group.web_server.name}",
                          "log_stream_name": "caddy-access"
                        }
                      ]
                    }
                  }
                },
                "metrics": {
                  "metrics_collected": {
                    "mem": {
                      "measurement": ["mem_used_percent"]
                    },
                    "disk": {
                      "measurement": ["disk_used_percent"],
                      "resources": ["/"]
                    }
                  }
                }
              }
              CONFIG

              /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl -a fetch-config -m ec2 -s -c file:/opt/aws/amazon-cloudwatch-agent/bin/config.json
              systemctl enable amazon-cloudwatch-agent
              systemctl start amazon-cloudwatch-agent
              EOF
}

# Attach the PostgreSQL data volume to the EC2 instance
resource "aws_volume_attachment" "postgres_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.postgres_data.id
  instance_id = aws_instance.web.id

  # Force detachment on destroy to prevent terraform from getting stuck
  force_detach = true
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
  default     = "dev"
}

variable "key_name" {
  description = "Name of the AWS key pair to use for SSH access"
  type        = string
  default = "sophistree"
}

variable "db_password" {
  description = "PostgreSQL database password"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "sophistree.app"
}

# Outputs
output "public_ip" {
  value = aws_instance.web.public_ip
}

output "instance_id" {
  value = aws_instance.web.id
}

output "backup_bucket" {
  value = aws_s3_bucket.postgres_backups.id
}

# Output the Route 53 nameservers
output "nameservers" {
  value = aws_route53_zone.main.name_servers
  description = "Nameservers for the Route 53 hosted zone"
}
