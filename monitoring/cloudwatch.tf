resource "aws_cloudwatch_log_group" "application" {
  name              = "/aws/${var.project_name}/application"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = {
    Project = var.project_name
  }
}

resource "aws_cloudwatch_log_group" "cloudtrail" {
  name              = "/aws/${var.project_name}/cloudtrail"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = {
    Project = var.project_name
  }
}

