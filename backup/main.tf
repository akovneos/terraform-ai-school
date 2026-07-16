resource "aws_backup_vault" "main" {
  name = "${var.project_name}-backup-vault"

  tags = {
    Name    = "${var.project_name}-backup-vault"
    Project = var.project_name
  }
}

resource "aws_iam_role" "backup" {
  name = "${var.project_name}-backup-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "backup.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Project = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "backup" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForBackup"
}

resource "aws_iam_role_policy_attachment" "restore" {
  role       = aws_iam_role.backup.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSBackupServiceRolePolicyForRestores"
}

resource "aws_backup_plan" "main" {
  name = "${var.project_name}-daily-backup"

  rule {
    rule_name         = "daily-rds-backup"
    target_vault_name = aws_backup_vault.main.name
    schedule          = var.backup_schedule
    start_window      = var.backup_start_window_minutes
    completion_window = var.backup_completion_window_minutes

    lifecycle {
      delete_after = var.backup_retention_days
    }
  }

  tags = {
    Project = var.project_name
  }
}

resource "aws_backup_selection" "rds" {
  iam_role_arn = aws_iam_role.backup.arn
  name         = "${var.project_name}-rds-selection"
  plan_id      = aws_backup_plan.main.id
  resources    = var.resource_arns
}
