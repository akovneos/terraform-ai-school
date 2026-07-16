resource "aws_iam_role" "rds_scheduler" {
  count = var.enable_rds_schedule ? 1 : 0
  name  = "${var.project_name}-rds-scheduler-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "scheduler.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Project = var.project_name
  }
}

resource "aws_iam_role_policy" "rds_scheduler" {
  count = var.enable_rds_schedule ? 1 : 0
  name  = "${var.project_name}-rds-scheduler-policy"
  role  = aws_iam_role.rds_scheduler[0].id

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "rds:StartDBInstance",
        "rds:StopDBInstance"
      ]
      Resource = aws_db_instance.this.arn
    }]
  })
}

resource "aws_scheduler_schedule" "rds_start" {
  count = var.enable_rds_schedule ? 1 : 0
  name  = "${var.project_name}-rds-start"

  schedule_expression          = var.rds_start_schedule
  schedule_expression_timezone = var.rds_schedule_timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:startDBInstance"
    role_arn = aws_iam_role.rds_scheduler[0].arn

    input = jsonencode({
      DBInstanceIdentifier = aws_db_instance.this.identifier
    })
  }
}

resource "aws_scheduler_schedule" "rds_stop" {
  count = var.enable_rds_schedule ? 1 : 0
  name  = "${var.project_name}-rds-stop"

  schedule_expression          = var.rds_stop_schedule
  schedule_expression_timezone = var.rds_schedule_timezone

  flexible_time_window {
    mode = "OFF"
  }

  target {
    arn      = "arn:aws:scheduler:::aws-sdk:rds:stopDBInstance"
    role_arn = aws_iam_role.rds_scheduler[0].arn

    input = jsonencode({
      DBInstanceIdentifier = aws_db_instance.this.identifier
    })
  }
}
