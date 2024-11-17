output "instance_public_ip" {
  description = "Public IP address of the EC2 instance"
  value       = aws_instance.web.public_ip
}

output "instance_id" {
  description = "ID of the EC2 instance"
  value       = aws_instance.web.id
}

output "postgres_backup_bucket" {
  description = "Name of the S3 bucket for PostgreSQL backups"
  value       = aws_s3_bucket.postgres_backups.id
}

output "cloudwatch_log_group" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.web_server.name
}
