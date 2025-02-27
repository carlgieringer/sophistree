resource "aws_route53_record" "env" {
  zone_id = var.zone_id
  name    = local.hostname
  type    = "A"
  ttl     = "300"
  records = [aws_instance.web_app.public_ip]
}
