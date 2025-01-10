output "nameservers" {
  value       = aws_route53_zone.main.name_servers
  description = "Nameservers for the Route 53 hosted zone"
}

output "prod_instance_public_ip" {
  description = "Public IP address of the prod EC2 instance"
  value       = module.sophistree_prod.instance_public_ip
}

output "dev_instance_public_ip" {
  description = "Public IP address of the dev EC2 instance"
  value       = length(module.sophistree_dev) > 0 ? module.sophistree_dev[0].instance_public_ip : ""
}

output "dev_instance_id" {
  description = "ID of the dev EC2 instance"
  value       = length(module.sophistree_dev) > 0 ? module.sophistree_dev[0].instance_id : ""
}

output "dev_postgres_backup_bucket" {
  description = "Name of the S3 bucket for dev PostgreSQL backups"
  value       = length(module.sophistree_dev) > 0 ? module.sophistree_dev[0].postgres_backup_bucket : ""
}

output "dev_cloudwatch_log_group" {
  description = "Name of the dev CloudWatch log group"
  value       = length(module.sophistree_dev) > 0 ? module.sophistree_dev[0].cloudwatch_log_group : ""
}
