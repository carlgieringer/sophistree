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
          "s3:ListBucket",
          "s3:DeleteObject"
        ]
        Resource = [
          aws_s3_bucket.postgres_backups.arn,
          "${aws_s3_bucket.postgres_backups.arn}/*",
          aws_s3_bucket.caddy_certs.arn,
          "${aws_s3_bucket.caddy_certs.arn}/*"
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

resource "aws_iam_role_policy" "ssm_access" {
  name = "ssm-access-${var.environment}"
  role = aws_iam_role.web_app.id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "ssm:GetParameter"
        ]
        Resource = [
          var.db_password_parameter_arn
        ]
      }
    ]
  })
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
  ami               = var.instance_ami
  instance_type     = var.instance_type
  key_name          = var.key_name
  availability_zone = var.availability_zone

  subnet_id                   = var.subnet_id
  vpc_security_group_ids      = [aws_security_group.web.id]
  associate_public_ip_address = true
  iam_instance_profile        = aws_iam_instance_profile.web_app.name

  root_block_device {
    volume_size = 30
    volume_type = "gp3"
    encrypted   = true
  }

  tags = {
    Name = "sophistree-web-${var.environment}"
  }

  user_data                   = sensitive(templatefile(
    "${path.module}/user-data.sh.tftpl",
    {
      hostname                                   = local.hostname
      backup_bucket                              = aws_s3_bucket.postgres_backups.id
      cloudwatch_log_group                       = aws_cloudwatch_log_group.web_app.name
      aws_region                                 = var.aws_region
      device_name                                = "/dev/sdf"
      docker_compose_content                     = file("${path.root}/../docker/docker-compose.yml")
      docker_compose_prod_content                = file("${path.root}/../docker/docker-compose.prod.yml")
      web_app_image_version                      = var.web_app_image_version
      sync_service_image_version                 = var.sync_service_image_version
      argument_maps_automerge_storage_table_name = var.argument_maps_automerge_storage_table_name
      caddy_image_version                        = var.caddy_image_version
      caddy_certs_bucket                         = aws_s3_bucket.caddy_certs.bucket
      caddy_certs_bucket_host                    = aws_s3_bucket.caddy_certs.bucket_regional_domain_name
      caddy_email                                = var.caddy_email
      db_password_parameter_arn                  = var.db_password_parameter_arn
    }
  ))
  user_data_replace_on_change = true
}

resource "aws_volume_attachment" "postgres_data" {
  device_name = "/dev/sdf"
  volume_id   = aws_ebs_volume.postgres_data.id
  instance_id = aws_instance.web_app.id

  force_detach = true
}
