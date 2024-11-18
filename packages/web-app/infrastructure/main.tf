module "sophistree_dev" {
  source = "./modules/sophistree_env"

  aws_region        = var.aws_region
  environment       = "test"
  domain_name       = var.domain_name
  key_name          = "sophistree-dev"
  db_password       = var.dev_db_password
  subnet_id         = aws_subnet.public.id
  vpc_id            = aws_vpc.main.id
  zone_id           = aws_route53_zone.main.zone_id
  availability_zone = aws_subnet.public.availability_zone
}
