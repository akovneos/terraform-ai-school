locals {
  s3_origin_id      = "${var.project_name}-s3-origin"
  use_custom_domain = var.domain_name != "" && var.route53_zone_id != ""
}

resource "aws_cloudfront_origin_access_control" "oac" {
  name                              = "${var.project_name}-oac"
  description                       = "OAC for S3 frontend"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "frontend" {
  enabled             = true
  price_class         = var.price_class
  wait_for_deployment = false
  web_acl_id          = var.web_acl_id

  origin {
    domain_name              = aws_s3_bucket.frontend.bucket_regional_domain_name
    origin_id                = local.s3_origin_id
    origin_access_control_id = aws_cloudfront_origin_access_control.oac.id
  }

  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods = ["GET", "HEAD"]
    cached_methods  = ["GET", "HEAD"]

    target_origin_id = local.s3_origin_id

    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    acm_certificate_arn            = local.use_custom_domain ? aws_acm_certificate_validation.frontend[0].certificate_arn : null
    cloudfront_default_certificate = local.use_custom_domain ? null : true
    ssl_support_method             = local.use_custom_domain ? "sni-only" : null
  }

  aliases = local.use_custom_domain ? [var.domain_name] : []

  tags = {
    Project = var.project_name
  }
}
