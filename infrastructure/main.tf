

module "sophistree_prod" {
  source = "./modules/sophistree_env"

  aws_region                                 = var.aws_region
  environment                                = "prod"
  domain_name                                = var.domain_name
  caddy_email                                = "sophistree.app@gmail.com"
  key_name                                   = "sophistree-prod"
  db_password_parameter_arn                  = data.aws_ssm_parameter.prod_db_password.arn
  subnet_id                                  = aws_subnet.public.id
  vpc_id                                     = aws_vpc.main.id
  zone_id                                    = aws_route53_zone.main.zone_id
  availability_zone                          = aws_subnet.public.availability_zone
  instance_type                              = "t4g.nano"
  instance_ami                               = data.aws_ami.amazon_linux_2023_arm.id
  web_app_image_version                      = "0.1.1"
  sync_service_image_version                 = "0.1.0"
  caddy_image_version                        = "0.1.1"
  argument_maps_automerge_storage_table_name = "argument_maps_automerge_storage"
}

module "sophistree_dev" {
  source = "./modules/sophistree_env"
  count  = 1 # Set to 0 to prevent resource creation while keeping the module

  aws_region                                 = var.aws_region
  environment                                = "dev"
  domain_name                                = var.domain_name
  caddy_email                                = "sophistree.app@gmail.com"
  key_name                                   = "sophistree-dev"
  db_password_parameter_arn                  = data.aws_ssm_parameter.dev_db_password.arn
  subnet_id                                  = aws_subnet.public.id
  vpc_id                                     = aws_vpc.main.id
  zone_id                                    = aws_route53_zone.main.zone_id
  availability_zone                          = aws_subnet.public.availability_zone
  instance_type                              = "t4g.nano"
  instance_ami                               = data.aws_ami.amazon_linux_2023_arm.id
  web_app_image_version                      = "0.1.1"
  sync_service_image_version                 = "0.1.0"
  caddy_image_version                        = "0.1.1"
  argument_maps_automerge_storage_table_name = "argument_maps_automerge_storage"
}


data "aws_ssm_parameter" "prod_db_password" {
  name = "/sophistree/prod/db_password"
}

data "aws_ssm_parameter" "dev_db_password" {
  name = "/sophistree/dev/db_password"
}
