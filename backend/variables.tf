variable "project_name" {
  type = string
}

variable "lambda_runtime" {
  type    = string
  default = "nodejs20.x"
}

variable "lambda_handler" {
  type    = string
  default = "index.handler"
}

variable "lambda_timeout" {
  type    = number
  default = 10
}

variable "lambda_memory_size" {
  type    = number
  default = 128
}

variable "vpc_id" {
  type    = string
  default = null
}

variable "private_subnet_ids" {
  type    = list(string)
  default = []
}

variable "lambda_security_group_ids" {
  type    = list(string)
  default = []
}

variable "db_endpoint" {
  type    = string
  default = ""
}

variable "db_port" {
  type    = number
  default = 5432
}

variable "db_name" {
  type    = string
  default = ""
}

variable "db_username" {
  type    = string
  default = ""
}

variable "db_password_secret_arn" {
  type    = string
  default = ""
}

variable "openai_secret_arn" {
  type    = string
  default = ""
}

variable "cognito_issuer_url" {
  type    = string
  default = ""
}

variable "cognito_audience" {
  type    = list(string)
  default = []
}

variable "cors_allow_origins" {
  description = "Origins allowed to call the HTTP API from a browser"
  type        = list(string)
  default     = ["http://localhost:3000"]
}
