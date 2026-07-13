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

