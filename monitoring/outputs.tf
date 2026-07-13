output "application_log_group_name" {
  value = aws_cloudwatch_log_group.application.name
}

output "cloudtrail_log_group_name" {
  value = aws_cloudwatch_log_group.cloudtrail.name
}

output "cloudtrail_bucket_name" {
  value = aws_s3_bucket.cloudtrail.bucket
}

output "cloudtrail_arn" {
  value = aws_cloudtrail.main.arn
}

output "config_bucket_name" {
  value = try(aws_s3_bucket.config[0].bucket, null)
}

output "config_recorder_name" {
  value = try(aws_config_configuration_recorder.main[0].name, null)
}

