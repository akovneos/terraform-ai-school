variable "project_name" {
  type = string
}

variable "domain_name" {
  type    = string
  default = ""
}

variable "route53_zone_id" {
  type    = string
  default = ""
}

variable "price_class" {
  type    = string
  default = "PriceClass_200"
}

variable "web_acl_id" {
  type    = string
  default = null
}
