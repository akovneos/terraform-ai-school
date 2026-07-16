variable "project_name" {
  description = "Project name used in AWS Backup resource names"
  type        = string
}

variable "resource_arns" {
  description = "ARNs of resources protected by this backup plan"
  type        = list(string)
}

variable "backup_schedule" {
  description = "AWS Backup cron expression in UTC; the default runs daily at 03:00 JST"
  type        = string
  default     = "cron(0 18 ? * * *)"
}

variable "backup_retention_days" {
  description = "Number of days to retain recovery points"
  type        = number
  default     = 7

  validation {
    condition     = var.backup_retention_days >= 1
    error_message = "backup_retention_days must be at least 1."
  }
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
