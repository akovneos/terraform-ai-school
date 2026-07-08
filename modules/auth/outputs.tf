output "user_pool_id" {

  description = "Cognito User Pool ID"

  value = aws_cognito_user_pool.main.id

}



output "user_pool_arn" {

  description = "Cognito User Pool ARN"

  value = aws_cognito_user_pool.main.arn

}




output "client_id" {

  description = "Cognito App Client ID"

  value = aws_cognito_user_pool_client.app.id

}




output "cognito_domain" {

  description = "Cognito hosted UI domain"

  value = aws_cognito_user_pool_domain.main.domain

}