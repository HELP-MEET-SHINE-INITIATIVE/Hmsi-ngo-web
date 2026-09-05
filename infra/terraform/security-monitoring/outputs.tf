output "supabase_project_ref" {
  description = "The linked HMSI Supabase project reference."
  value       = var.supabase_project_ref
}

output "github_actions_role_arn" {
  description = "AWS role ARN for the protected GitHub staging environment, when enabled."
  value       = try(aws_iam_role.github_monitoring[0].arn, null)
}

output "amp_workspace_arn" {
  description = "Optional staging AMP workspace ARN."
  value       = try(aws_prometheus_workspace.staging[0].arn, null)
}

output "amp_remote_write_endpoint" {
  description = "Optional staging AMP remote-write endpoint."
  value       = try(aws_prometheus_workspace.staging[0].prometheus_endpoint, null)
}

output "monitoring_log_group_name" {
  description = "Optional aggregate-only monitoring log group name."
  value       = try(aws_cloudwatch_log_group.monitoring[0].name, null)
}
