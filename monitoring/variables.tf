variable "project_name" {
  type = string
}

variable "cloudwatch_log_retention_days" {
  type    = number
  default = 30
}

variable "enable_config_recorder" {
  type    = bool
  default = true
}

variable "lambda_function_name" {
  description = "Lambda function name whose logs are retained by this module"
  type        = string
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
