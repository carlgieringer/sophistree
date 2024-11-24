module "sophistree_dev" {
  source = "./modules/sophistree_env"
  count  = 1 # Set to 0 to prevent resource creation while keeping the module

  aws_region                = var.aws_region
  environment               = "dev"
  domain_name               = var.domain_name
  caddy_email               = "sophistree.app@gmail.com"
  key_name                  = "sophistree-dev"
  db_password_parameter_arn = data.aws_ssm_parameter.db_password.arn
  subnet_id                 = aws_subnet.public.id
  vpc_id                    = aws_vpc.main.id
  zone_id                   = aws_route53_zone.main.zone_id
  availability_zone         = aws_subnet.public.availability_zone
}

data "aws_ssm_parameter" "db_password" {
  name = "/sophistree/dev/db_password"
}
