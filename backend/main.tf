# =========================
# IAM ROLE for Lambda
# =========================

locals {
  enable_vpc       = var.vpc_id != null && length(var.private_subnet_ids) > 0
  create_lambda_sg = local.enable_vpc && length(var.lambda_security_group_ids) == 0
  lambda_security_group_ids = local.create_lambda_sg ? [
    aws_security_group.lambda[0].id
  ] : var.lambda_security_group_ids
  secret_arns = compact([
    var.db_password_secret_arn,
    var.openai_secret_arn
  ])
  enable_secret_access  = length(local.secret_arns) > 0
  enable_jwt_authorizer = var.cognito_issuer_url != "" && length(var.cognito_audience) > 0
}

resource "aws_iam_role" "lambda_role" {
  name = "${var.project_name}-lambda-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Principal = {
        Service = "lambda.amazonaws.com"
      }
      Action = "sts:AssumeRole"
    }]
  })

  tags = {
    Project = var.project_name
  }
}

resource "aws_iam_role_policy_attachment" "lambda_basic" {
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "lambda_vpc_access" {
  count      = local.enable_vpc ? 1 : 0
  role       = aws_iam_role.lambda_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaVPCAccessExecutionRole"
}

resource "aws_iam_policy" "lambda_secrets" {
  count = local.enable_secret_access ? 1 : 0
  name  = "${var.project_name}-lambda-secrets-policy"

  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Effect = "Allow"
      Action = [
        "secretsmanager:GetSecretValue"
      ]
      Resource = local.secret_arns
    }]
  })
}

resource "aws_iam_role_policy_attachment" "lambda_secrets" {
  count      = local.enable_secret_access ? 1 : 0
  role       = aws_iam_role.lambda_role.name
  policy_arn = aws_iam_policy.lambda_secrets[0].arn
}

resource "aws_security_group" "lambda" {
  count       = local.create_lambda_sg ? 1 : 0
  name        = "${var.project_name}-lambda-sg"
  description = "Security group for backend Lambda"
  vpc_id      = var.vpc_id

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name    = "${var.project_name}-lambda-sg"
    Project = var.project_name
  }
}

# =========================
# ZIP PACKAGE
# =========================

data "archive_file" "lambda_zip" {
  type        = "zip"
  source_dir  = "${path.module}/lambda"
  output_path = "${path.module}/.terraform/lambda.zip"
}

# =========================
# LAMBDA FUNCTION
# =========================

resource "aws_lambda_function" "api" {
  function_name = "${var.project_name}-api"
  role          = aws_iam_role.lambda_role.arn

  runtime = var.lambda_runtime
  handler = var.lambda_handler

  filename         = data.archive_file.lambda_zip.output_path
  source_code_hash = data.archive_file.lambda_zip.output_base64sha256

  timeout     = var.lambda_timeout
  memory_size = var.lambda_memory_size

  architectures = ["arm64"]

  description = "AI School Backend API"

  environment {
    variables = {
      PROJECT                = var.project_name
      DB_ENDPOINT            = var.db_endpoint
      DB_PORT                = tostring(var.db_port)
      DB_NAME                = var.db_name
      DB_USERNAME            = var.db_username
      DB_PASSWORD_SECRET_ARN = var.db_password_secret_arn
      OPENAI_SECRET_ARN      = var.openai_secret_arn
    }
  }

  dynamic "vpc_config" {
    for_each = local.enable_vpc ? [1] : []

    content {
      subnet_ids         = var.private_subnet_ids
      security_group_ids = local.lambda_security_group_ids
    }
  }

  tags = {
    Project = var.project_name
  }
}

# =========================
# API GATEWAY (HTTP API)
# =========================
resource "aws_apigatewayv2_api" "http_api" {
  name          = "${var.project_name}-http-api"
  protocol_type = "HTTP"

  cors_configuration {
    allow_headers = ["Authorization", "Content-Type"]
    allow_methods = ["GET", "POST", "OPTIONS"]
    allow_origins = var.cors_allow_origins
    max_age       = 300
  }

  tags = {
    Project = var.project_name
  }
}

resource "aws_apigatewayv2_integration" "lambda_integration" {
  api_id                 = aws_apigatewayv2_api.http_api.id
  integration_type       = "AWS_PROXY"
  integration_uri        = aws_lambda_function.api.invoke_arn
  payload_format_version = "2.0"
}

resource "aws_apigatewayv2_authorizer" "cognito" {
  count            = local.enable_jwt_authorizer ? 1 : 0
  api_id           = aws_apigatewayv2_api.http_api.id
  authorizer_type  = "JWT"
  identity_sources = ["$request.header.Authorization"]
  name             = "${var.project_name}-cognito-authorizer"

  jwt_configuration {
    audience = var.cognito_audience
    issuer   = var.cognito_issuer_url
  }
}

resource "aws_apigatewayv2_route" "default" {
  api_id             = aws_apigatewayv2_api.http_api.id
  route_key          = "ANY /{proxy+}"
  authorization_type = local.enable_jwt_authorizer ? "JWT" : "NONE"
  authorizer_id      = local.enable_jwt_authorizer ? aws_apigatewayv2_authorizer.cognito[0].id : null

  target = "integrations/${aws_apigatewayv2_integration.lambda_integration.id}"
}

resource "aws_apigatewayv2_stage" "default" {
  api_id      = aws_apigatewayv2_api.http_api.id
  name        = "$default"
  auto_deploy = true

  tags = {
    Project = var.project_name
  }
}

# =========================
# LAMBDA PERMISSION
# =========================
resource "aws_lambda_permission" "apigw" {
  statement_id  = "AllowAPIGatewayInvoke"
  action        = "lambda:InvokeFunction"
  function_name = aws_lambda_function.api.function_name
  principal     = "apigateway.amazonaws.com"

  source_arn = "${aws_apigatewayv2_api.http_api.execution_arn}/*/*"
}
