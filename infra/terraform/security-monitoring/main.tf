terraform {
  required_version = ">= 1.6.0, < 2.0.0"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
    supabase = {
      source  = "supabase/supabase"
      version = "~> 1.0"
    }
  }
}

provider "aws" {
  region = var.aws_region

  default_tags {
    tags = merge(var.tags, {
      ManagedBy = "terraform"
      Workload  = "hmsi-security-monitoring"
      Stage     = "staging"
    })
  }
}

provider "supabase" {
  # Prefer SUPABASE_ACCESS_TOKEN from the CI secret store; do not commit it.
  access_token = var.supabase_access_token
}

locals {
  github_subject = "repo:${var.github_repository}:environment:${var.github_environment}"
  monitoring_on  = var.enable_staging_monitoring
  supabase_on    = var.manage_supabase_project
}

# This resource is intentionally disabled by default. For HMSI's existing
# project, import it into state before enabling settings management:
# terraform import 'supabase_project.hmsi[0]' mutosvokcxkpiqxewcva
resource "supabase_project" "hmsi" {
  count = var.manage_supabase_project ? 1 : 0

  organization_id   = var.supabase_organization_id
  name              = var.supabase_project_name
  database_password = var.supabase_database_password
  region            = var.supabase_region

  lifecycle {
    ignore_changes = [database_password]
  }
}

# Settings management is opt-in and only applies to the explicitly linked
# project. It does not run SQL DDL; use the reviewed SQL migration through the
# approved Supabase migration process.
resource "supabase_settings" "hmsi" {
  count = var.manage_supabase_settings ? 1 : 0

  project_ref = var.supabase_project_ref
  api = jsonencode({
    db_schema            = "public,storage,graphql_public"
    db_extra_search_path = "public,extensions"
    max_rows             = 1000
  })
}

resource "aws_iam_openid_connect_provider" "github" {
  count = var.enable_github_oidc ? 1 : 0

  url = "https://token.actions.githubusercontent.com"

  client_id_list = ["sts.amazonaws.com"]
  # GitHub's documented AWS OIDC root CA thumbprint. Confirm against the
  # current GitHub guidance before applying in a new AWS account.
  thumbprint_list = ["6938fd4d98bab03faadb97b34396831e3780aea1"]
}

data "aws_iam_policy_document" "github_actions_assume" {
  count = var.enable_github_oidc ? 1 : 0

  statement {
    sid     = "GitHubActionsEnvironmentOnly"
    effect  = "Allow"
    actions = ["sts:AssumeRoleWithWebIdentity"]

    principals {
      type        = "Federated"
      identifiers = [aws_iam_openid_connect_provider.github[0].arn]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:aud"
      values   = ["sts.amazonaws.com"]
    }

    condition {
      test     = "StringEquals"
      variable = "token.actions.githubusercontent.com:sub"
      values   = [local.github_subject]
    }
  }
}

resource "aws_iam_role" "github_monitoring" {
  count = var.enable_github_oidc ? 1 : 0

  name                 = var.github_oidc_role_name
  assume_role_policy   = data.aws_iam_policy_document.github_actions_assume[0].json
  max_session_duration = 900

  tags = {
    Purpose = "staging-monitoring-provisioning"
  }
}

data "aws_iam_policy_document" "github_monitoring" {
  count = var.enable_github_oidc && var.enable_staging_monitoring ? 1 : 0

  statement {
    sid       = "AmpRemoteWrite"
    effect    = "Allow"
    actions   = ["aps:RemoteWrite"]
    resources = [aws_prometheus_workspace.staging[0].arn]
  }

  statement {
    sid       = "AmpReadMetrics"
    effect    = "Allow"
    actions   = ["aps:QueryMetrics", "aps:GetSeries", "aps:GetLabels", "aps:GetMetricMetadata"]
    resources = [aws_prometheus_workspace.staging[0].arn]
  }
}

resource "aws_iam_role_policy" "github_monitoring" {
  count = var.enable_github_oidc && var.enable_staging_monitoring ? 1 : 0

  name   = "hmsi-staging-monitoring"
  role   = aws_iam_role.github_monitoring[0].id
  policy = data.aws_iam_policy_document.github_monitoring[0].json
}

resource "aws_prometheus_workspace" "staging" {
  count = var.enable_staging_monitoring ? 1 : 0

  alias = var.amp_workspace_alias

  tags = merge(var.tags, {
    Environment = "staging"
    DataClass   = "aggregate-security-metrics"
  })
}

resource "aws_cloudwatch_log_group" "monitoring" {
  count = var.enable_staging_monitoring ? 1 : 0

  name              = "/hmsi/staging/security-monitoring"
  retention_in_days = 30

  tags = merge(var.tags, {
    Environment = "staging"
    DataClass   = "aggregate-security-metrics"
  })
}

# Terraform state should be stored in an encrypted, versioned, access-limited
# backend configured outside this module. No backend block is included so the
# caller cannot accidentally inherit an unsafe state location.
