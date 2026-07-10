variable "project_name" {
  description = "Project name"
  type        = string
}

variable "callback_urls" {
  description = "OAuth callback URLs"
  type        = list(string)

  default = [
    "http://localhost:3000"
  ]
}

variable "logout_urls" {
  description = "OAuth logout URLs"
  type        = list(string)

  default = [
    "http://localhost:3000"
  ]
}
variable "cognito_domain_prefix" {

  description = "Cognito hosted UI domain prefix"

  type = string

}