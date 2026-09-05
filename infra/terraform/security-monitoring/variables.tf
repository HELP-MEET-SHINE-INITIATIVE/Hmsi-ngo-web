variable "aws_region" {
  type        = string
  description = "AWS region for optional staging monitoring resources."
  default     = "us-east-1"

  validation {
    condition     = can(regex("^[a-z]{2}(-gov)?-[a-z0-9-]+-[0-9]$", var.aws_region))
    error_message = "aws_region must be a valid AWS region identifier."
  }
}

variable "tags" {
  type        = map(string)
  description = "Additional non-sensitive resource tags."
  default     = {}
}

variable "supabase_access_token" {
  type        = string
  description = "Supabase personal access token supplied through a secure CI secret or environment variable."
  sensitive   = true
  default     = null
}

variable "supabase_project_ref" {
  type        = string
  description = "Existing HMSI Supabase project reference."
  default     = "mutosvokcxkpiqxewcva"

  validation {
    condition     = can(regex("^[a-z0-9]{20}$", var.supabase_project_ref))
    error_message = "supabase_project_ref must be a 20-character lowercase project reference."
  }
}

variable "manage_supabase_project" {
  type        = bool
  description = "When true, manage the supabase_project resource. Leave false for HMSI's existing project until it is imported."
  default     = false
}

variable "manage_supabase_settings" {
  type        = bool
  description = "When true, manage the explicitly declared Supabase API settings."
  default     = false
}

variable "supabase_organization_id" {
  type        = string
  description = "Supabase organization slug, required only when managing a project resource."
  default     = null
}

variable "supabase_project_name" {
  type        = string
  description = "Supabase project name, required only when managing a project resource."
  default     = "hmsi-security-monitoring"
}

variable "supabase_database_password" {
  type        = string
  description = "Supabase database password, required only when creating a new project; never commit this value."
  sensitive   = true
  default     = null
}

variable "supabase_region" {
  type        = string
  description = "Supabase region, required only when creating a new project."
  default     = "eu-west-1"
}

variable "enable_github_oidc" {
  type        = bool
  description = "Create the AWS GitHub Actions OIDC provider and role."
  default     = false
}

variable "github_repository" {
  type        = string
  description = "Exact GitHub owner/repository allowed to assume the role."
  default     = "HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web"

  validation {
    condition     = can(regex("^[A-Za-z0-9_.-]+/[A-Za-z0-9_.-]+$", var.github_repository))
    error_message = "github_repository must be owner/repository."
  }
}

variable "github_environment" {
  type        = string
  description = "Exact protected GitHub Environment allowed by the OIDC trust policy; production is opt-in and must be protected in GitHub."
  default     = "staging-monitoring"

  validation {
    condition     = contains(["staging-monitoring", "production"], var.github_environment)
    error_message = "github_environment must be staging-monitoring or production."
  }
}

variable "github_oidc_role_name" {
  type        = string
  description = "AWS role name assumed by the protected GitHub Actions environment."
  default     = "hmsi-staging-monitoring-github"
}

variable "enable_staging_monitoring" {
  type        = bool
  description = "Create the optional AWS Managed Prometheus workspace and aggregate-only log group."
  default     = false
}

variable "amp_workspace_alias" {
  type        = string
  description = "Alias for the optional staging Amazon Managed Service for Prometheus workspace."
  default     = "hmsi-staging-security-events"

  validation {
    condition     = can(regex("^[a-z0-9-]{3,63}$", var.amp_workspace_alias))
    error_message = "amp_workspace_alias must be 3-63 lowercase letters, digits, or hyphens."
  }
}
