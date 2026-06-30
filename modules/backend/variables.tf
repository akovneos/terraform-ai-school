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