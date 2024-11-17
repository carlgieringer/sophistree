# Route 53 A record for the environment
resource "aws_route53_record" "env" {
  zone_id = var.zone_id
  name    = var.environment == "prod" ? var.domain_name : "${var.environment}.${var.domain_name}"
  type    = "A"
  ttl     = "300"
  records = [aws_instance.web.public_ip]
}
