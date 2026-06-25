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

  project_name = "ai-school"

  vpc_id              = module.network.vpc_id
  private_subnet_ids  = module.network.private_subnet_ids

  db_name     = var.db_name
  db_username = var.db_username
  db_password = var.db_password

  allowed_security_groups = [] # или placeholder пока
}
