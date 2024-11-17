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

resource "aws_cloudwatch_log_group" "web_app" {
  name              = "/sophistree/${var.environment}/web-app"
  retention_in_days = 30
}

resource "aws_iam_role" "web_app" {
  name = "sophistree-web-app-${var.environment}"

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

resource "aws_iam_instance_profile" "web_app" {
  name = "sophistree-web-app-${var.environment}"
  role = aws_iam_role.web_app.name
}

resource "aws_iam_role_policy" "s3_access" {
  name = "s3-access-${var.environment}"
  role = aws_iam_role.web_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "s3:PutObject",
          "s3:GetObject",
          "s3:ListBucket"
        ]
        Resource = [
          aws_s3_bucket.postgres_backups.arn,
          "${aws_s3_bucket.postgres_backups.arn}/*"
        ]
      }
    ]
  })
}

resource "aws_iam_role_policy" "cloudwatch" {
  name = "cloudwatch-${var.environment}"
  role = aws_iam_role.web_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "cloudwatch:PutMetricData",
          "logs:CreateLogStream",
          "logs:PutLogEvents",
          "logs:CreateLogGroup"
        ]
        Resource = "*"
      }
    ]
  })
}

data "template_file" "user_data" {
  template = file("${path.module}/user-data.sh")
  vars = {
    domain_name                 = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
    db_password                 = var.db_password
    backup_bucket               = aws_s3_bucket.postgres_backups.id
    cloudwatch_log_group        = aws_cloudwatch_log_group.web_app.name
    aws_region                  = var.aws_region
    device_name                 = "/dev/sdf"
    docker_compose_content      = file("${path.root}/../docker/docker-compose.yml")
    docker_compose_prod_content = file("${path.root}/../docker/docker-compose.prod.yml")
  }
}

resource "aws_ebs_volume" "postgres_data" {
  availability_zone = var.availability_zone
  size              = 20
  type              = "gp3"
  encrypted         = true

  tags = {
    Name = "sophistree-postgres-${var.environment}"
  }
}

resource "aws_instance" "web_app" {
  ami               = data.aws_ami.amazon_linux_2023.id
  instance_type     = "t3.small"
  key_name          = var.key_name
  availability_zone = var.availability_zone

  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.web_app.name

  root_block_device {
    volume_size = 20
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "sophistree-web-${var.environment}"
  }

  user_data                   = sensitive(data.template_file.user_data.rendered)
  user_data_replace_on_change = true
}

resource "aws_volume_attachment" "postgres_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.postgres_data.id
  instance_id = aws_instance.web_app.id

  force_detach = true
}
