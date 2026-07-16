variable "project_name" {
  type = string
}

variable "vpc_id" {
  type = string
}

variable "private_subnet_ids" {
  type = list(string)
}

variable "db_name" {
  type = string
}

variable "db_username" {
  type = string
}

variable "db_password" {
  type      = string
  sensitive = true
}

variable "allowed_security_groups" {
  type    = list(string)
  default = []
}

variable "enable_rds_schedule" {
  description = "Whether to start and stop the RDS instance on a fixed schedule"
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
