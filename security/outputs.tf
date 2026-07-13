output "db_secret_arn" {
  value = aws_secretsmanager_secret.db.arn
}

output "openai_secret_arn" {
  value = aws_secretsmanager_secret.openai.arn
}

output "lambda_secrets_policy_arn" {
  value = aws_iam_policy.lambda_secrets_access.arn
}

output "waf_web_acl_arn" {
  value = aws_wafv2_web_acl.frontend.arn
}