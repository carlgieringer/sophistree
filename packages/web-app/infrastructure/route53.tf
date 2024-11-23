# Route 53 hosted zone
resource "aws_route53_zone" "main" {
  name = var.domain_name
}
