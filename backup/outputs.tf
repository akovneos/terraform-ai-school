output "backup_vault_arn" {
  description = "ARN of the AWS Backup vault"
  value       = aws_backup_vault.main.arn
}

output "backup_vault_name" {
  description = "Name of the AWS Backup vault"
  value       = aws_backup_vault.main.name
}

output "backup_plan_id" {
  description = "ID of the daily backup plan"
  value       = aws_backup_plan.main.id
}

output "backup_role_arn" {
  description = "IAM role used by AWS Backup"
  value       = aws_iam_role.backup.arn
}
