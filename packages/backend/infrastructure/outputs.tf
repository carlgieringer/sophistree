output "nameservers" {
  value = aws_route53_zone.main.name_servers
  description = "Nameservers for the Route 53 hosted zone"
}

output "dev_instance_public_ip" {
  description = "Public IP address of the dev EC2 instance"
  value       = module.sophistree_dev.instance_public_ip
}

output "dev_instance_id" {
  description = "ID of the dev EC2 instance"
  value       = module.sophistree_dev.instance_id
}

output "dev_postgres_backup_bucket" {
  description = "Name of the S3 bucket for dev PostgreSQL backups"
  value       = module.sophistree_dev.postgres_backup_bucket
}

output "dev_cloudwatch_log_group" {
  description = "Name of the dev CloudWatch log group"
  value       = module.sophistree_dev.cloudwatch_log_group
}
