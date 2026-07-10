resource "aws_secretsmanager_secret" "db" {
  name = "${var.project_name}/database"

  tags = {
    Project = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "db" {
  secret_id = aws_secretsmanager_secret.db.id

  secret_string = jsonencode({
    username = var.db_username
    password = var.db_password
    database = var.db_name
  })
}

resource "aws_secretsmanager_secret" "openai" {
  name = "${var.project_name}/openai"

  tags = {
    Project = var.project_name
  }
}

resource "aws_secretsmanager_secret_version" "openai" {
  secret_id = aws_secretsmanager_secret.openai.id

  secret_string = jsonencode({
    api_key = var.openai_api_key
  })
}