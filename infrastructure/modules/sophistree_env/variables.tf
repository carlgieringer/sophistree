variable "environment" {
  description = "Environment name (e.g., dev, prod)"
  type        = string
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
}

variable "key_name" {
  description = "Name of the AWS key pair to use for SSH access"
  type        = string
}

variable "subnet_id" {
  description = "ID of the subnet to launch the instance in"
  type        = string
}

variable "vpc_id" {
  description = "ID of the VPC"
  type        = string
}

variable "zone_id" {
  description = "Route53 zone ID"
  type        = string
}

variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "availability_zone" {
  description = "Availability zone for the EC2 instance and EBS volume"
  type        = string
}

variable instance_type {
  description = "The EC2 instance type"
  type        = string
  default     = "t4g.nano"
}

variable instance_ami {
  description = "The AMI of the EC2 instance"
  type = string
}

variable "web_app_image_version" {
  description = "Version tag for the web app Docker image"
  type        = string
  default     = "latest"
}

variable "sync_service_image_version" {
  description = "Version tag for the sync service Docker image"
  type        = string
  default     = "latest"
}

variable "caddy_image_version" {
  description = "Version tag for the Caddy Docker image"
  type        = string
  default     = "latest"
}

variable "caddy_email" {
  description = "Email address for Let's Encrypt certificate generation"
  type        = string
}

variable "db_password_parameter_arn" {
  description = "ARN of the SSM parameter containing the database password"
  type        = string
}

variable "argument_maps_automerge_storage_table_name" {
  description = "The Postgres table name for storing ArgumentMap automerge data."
  type        = string
}
