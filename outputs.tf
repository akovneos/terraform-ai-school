output "api_endpoint" {
  value = module.backend.api_endpoint
}

output "website_url" {
  value = module.frontend.website_url
}

output "cognito_user_pool_id" {
  value = module.auth.user_pool_id
}

output "cognito_client_id" {
  value = module.auth.client_id
}

output "db_endpoint" {
  value = module.database.db_endpoint
}

output "db_secret_arn" {
  value = module.security.db_secret_arn
}

output "openai_secret_arn" {
  value = module.security.openai_secret_arn
}

output "waf_web_acl_arn" {
  value = module.security.waf_web_acl_arn
}

output "cloudtrail_bucket_name" {
  value = module.monitoring.cloudtrail_bucket_name
}

output "cloudtrail_arn" {
  value = module.monitoring.cloudtrail_arn
}

output "config_bucket_name" {
  value = module.monitoring.config_bucket_name
}

output "backup_vault_arn" {
  value = module.backup.backup_vault_arn
}

output "backup_plan_id" {
  value = module.backup.backup_plan_id
}
