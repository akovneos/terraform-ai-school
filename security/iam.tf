resource "aws_iam_policy" "lambda_secrets_access" {
  name = "${var.project_name}-lambda-secrets-access"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "secretsmanager:GetSecretValue"
        ]
        Resource = [
          aws_secretsmanager_secret.db.arn,
          aws_secretsmanager_secret.openai.arn
        ]
      }
    ]
  })

  tags = {
    Project = var.project_name
  }
}