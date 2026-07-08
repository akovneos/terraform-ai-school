resource "aws_cognito_user_pool" "main" {

  name = "${var.project_name}-user-pool"


  username_attributes = [
    "email"
  ]


  auto_verified_attributes = [
    "email"
  ]


  password_policy {

    minimum_length = 8

    require_lowercase = true

    require_numbers = true

    require_symbols = false

    require_uppercase = true

    temporary_password_validity_days = 7

  }


  schema {

    attribute_data_type = "String"

    name = "email"

    required = true

    mutable = true

  }


  account_recovery_setting {

    recovery_mechanism {

      name = "verified_email"

      priority = 1

    }

  }


  tags = {

    Name = "${var.project_name}-user-pool"

    Project = var.project_name

  }

}



resource "aws_cognito_user_pool_client" "app" {


  name = "${var.project_name}-client"


  user_pool_id = aws_cognito_user_pool.main.id


  generate_secret = false



  explicit_auth_flows = [

    "ALLOW_USER_PASSWORD_AUTH",

    "ALLOW_REFRESH_TOKEN_AUTH"

  ]



  allowed_oauth_flows_user_pool_client = true



  allowed_oauth_flows = [

    "code"

  ]



  allowed_oauth_scopes = [

    "openid",

    "email",

    "profile"

  ]



  supported_identity_providers = [

    "COGNITO"

  ]



  callback_urls = [

    "https://${var.project_name}.example.com"

  ]


  logout_urls = [

    "https://${var.project_name}.example.com"

  ]

}



resource "aws_cognito_user_pool_domain" "main" {


  domain = var.cognito_domain_prefix


  user_pool_id = aws_cognito_user_pool.main.id

}