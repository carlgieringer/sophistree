# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "dev_db_password" {
  description = "PostgreSQL database password for dev environment"
  type        = string
  sensitive   = true
}

variable "domain_name" {
  description = "Domain name for the application"
  type        = string
  default     = "sophistree.app"
}
