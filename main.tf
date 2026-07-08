############################################
# NETWORK MODULE
############################################

module "network" {
  source = "./modules/network"

  project_name = var.project_name
  vpc_cidr     = var.vpc_cidr

  azs = [
    "ap-northeast-1a",
    "ap-northeast-1c"
  ]

  public_subnets = [
    "10.0.1.0/24",
    "10.0.2.0/24"
  ]

  private_subnets = [
    "10.0.11.0/24",
    "10.0.12.0/24"
  ]
}

############################################
# DATABASE MODULE (RDS PostgreSQL)
############################################

module "database" {
  source = "./modules/database"

  project_name = var.project_name

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids

  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password

  allowed_security_groups = []
}

############################################
# BACKEND MODULE (Lambda + API Gateway)
############################################

module "backend" {
  source = "./modules/backend"

  project_name = var.project_name

  lambda_runtime     = "nodejs20.x"
  lambda_handler     = "index.handler"
  lambda_timeout     = 10
  lambda_memory_size = 128

  # DBアクセス必要になれば:
  # vpc_id = module.network.vpc_id
  # db_endpoint = module.database.db_endpoint
}

############################################
# FRONTEND MODULE 
############################################

module "frontend" {
  source = "./modules/frontend"

  project_name    = var.project_name
  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
}
############################################
# AUTH MODULE (Cognito)
############################################
module "auth" {

  source = "./modules/auth"

  project_name = var.project_name

  cognito_domain_prefix = "${var.project_name}-auth"

  callback_urls = [
    "http://localhost:3000"
  ]

  logout_urls = [
    "http://localhost:3000"
  ]

}
