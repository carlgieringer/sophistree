resource "aws_s3_bucket" "caddy_certs" {
  bucket = "sophistree-caddy-certs-${var.environment}"
}

# Output the bucket name so it can be referenced by environments
output "caddy_certs_bucket" {
  value = aws_s3_bucket.caddy_certs.id
}
