variable "project_name" {
  description = "Project name"
  type        = string
  default     = "ai-school"
}

variable "vpc_cidr" {
  description = "VPC CIDR block"
  type        = string
  default     = "10.0.0.0/16"
}

variable "db_name" {
  description = "Database name"
  type        = string
  default     = "aischool"
}

variable "db_username" {
  description = "Database username"
  type        = string
  default     = "postgres"
}

variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}

variable "openai_api_key" {
  description = "OpenAI API key stored in AWS Secrets Manager"
  type        = string
  sensitive   = true
  default     = ""
}

variable "domain_name" {
  type = string
}

variable "route53_zone_id" {
  type = string
}

variable "aws_region" {
  description = "AWS region for regional resources"
  type        = string
  default     = "ap-northeast-1"
}

variable "cloudwatch_log_retention_days" {
  description = "CloudWatch log retention in days"
  type        = number
  default     = 30
}

variable "enable_config_recorder" {
  description = "Whether to enable AWS Config recorder"
  type        = bool
  default     = true
}

variable "enable_rds_schedule" {
  description = "Whether to start and stop RDS on a fixed study schedule"
  type        = bool
  default     = true
}

variable "rds_schedule_timezone" {
  description = "Timezone used by the RDS start and stop schedules"
  type        = string
  default     = "Asia/Tokyo"
}

variable "rds_start_schedule" {
  description = "EventBridge Scheduler cron expression for starting RDS"
  type        = string
  default     = "cron(30 8 ? * MON-FRI *)"
}

variable "rds_stop_schedule" {
  description = "EventBridge Scheduler cron expression for stopping RDS"
  type        = string
  default     = "cron(0 19 ? * MON-FRI *)"
}

variable "s3_log_transition_days" {
  description = "Days before S3 audit logs move to Standard-IA storage"
  type        = number
  default     = 30
}

variable "s3_log_expiration_days" {
  description = "Days before S3 audit logs are deleted"
  type        = number
  default     = 180
}

variable "backup_schedule" {
  description = "AWS Backup cron expression in UTC; the default runs daily at 03:00 JST"
  type        = string
  default     = "cron(0 18 ? * * *)"
}

variable "backup_retention_days" {
  description = "Number of days to retain AWS Backup recovery points"
  type        = number
  default     = 7
}

variable "backup_start_window_minutes" {
  description = "Minutes AWS Backup may wait before starting a scheduled job"
  type        = number
  default     = 60
}

variable "backup_completion_window_minutes" {
  description = "Maximum number of minutes allowed for a backup job"
  type        = number
  default     = 180
}
