############################################
# NETWORK MODULE
############################################

module "network" {
  source = "./network"

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
# AUTH MODULE (Cognito)
############################################

module "auth" {
  source = "./auth"

  project_name          = var.project_name
  cognito_domain_prefix = "${var.project_name}-auth"

  callback_urls = [
    "http://localhost:3000",
    "https://${var.domain_name}"
  ]

  logout_urls = [
    "http://localhost:3000",
    "https://${var.domain_name}"
  ]
}

############################################
# SECURITY MODULE (Secrets Manager + WAF)
############################################

module "security" {
  source = "./security"

  project_name   = var.project_name
  db_username    = var.db_username
  db_password    = var.db_password
  db_name        = var.db_name
  openai_api_key = var.openai_api_key
}

############################################
# BACKEND MODULE (Lambda + API Gateway)
############################################

module "backend" {
  source = "./backend"

  project_name = var.project_name

  lambda_runtime     = "nodejs20.x"
  lambda_handler     = "index.handler"
  lambda_timeout     = 10
  lambda_memory_size = 128

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids
  lambda_security_group_ids = [
    module.network.lambda_security_group_id
  ]

  db_endpoint = module.database.db_endpoint
  db_port     = module.database.db_port
  db_name     = var.db_name
  db_username = var.db_username

  db_password_secret_arn = module.security.db_secret_arn
  openai_secret_arn      = module.security.openai_secret_arn

  cognito_issuer_url = module.auth.issuer_url
  cognito_audience   = [module.auth.client_id]
}

############################################
# DATABASE MODULE (RDS PostgreSQL)
############################################

module "database" {
  source = "./database"

  project_name = var.project_name

  vpc_id             = module.network.vpc_id
  private_subnet_ids = module.network.private_subnet_ids

  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password

  allowed_security_groups = compact([
    module.network.lambda_security_group_id
  ])
}

############################################
# FRONTEND MODULE
############################################

module "frontend" {
  source = "./frontend"

  project_name    = var.project_name
  domain_name     = var.domain_name
  route53_zone_id = var.route53_zone_id
  web_acl_id      = module.security.waf_web_acl_arn
}

############################################
# MONITORING MODULE (CloudWatch + CloudTrail + Config)
############################################

module "monitoring" {
  source = "./monitoring"

  project_name                  = var.project_name
  cloudwatch_log_retention_days = var.cloudwatch_log_retention_days
  enable_config_recorder        = var.enable_config_recorder
}
