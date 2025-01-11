locals {
  hostname = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
}
