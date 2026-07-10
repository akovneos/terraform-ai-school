output "lambda_function_name" {
  value = aws_lambda_function.api.function_name
}

output "lambda_arn" {
  value = aws_lambda_function.api.arn
}

output "api_endpoint" {
  value = aws_apigatewayv2_api.http_api.api_endpoint
}

output "api_id" {
  value = aws_apigatewayv2_api.http_api.id
}

output "invoke_arn" {
  value = aws_lambda_function.api.invoke_arn
}

output "lambda_security_group_id" {
  value = try(local.lambda_security_group_ids[0], null)
}
