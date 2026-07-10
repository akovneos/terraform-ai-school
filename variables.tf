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
