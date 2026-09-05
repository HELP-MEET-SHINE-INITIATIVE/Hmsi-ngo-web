# HMSI Terraform CI runbook

## Purpose

`.github/workflows/terraform-security-monitoring-ci.yml` provides a non-destructive quality gate for `infra/terraform/security-monitoring`. It runs formatting, provider-aware validation, TFLint, Checkov, and an OIDC identity check followed by a read-only Terraform plan. It contains no `terraform apply` command.

## Workflow stages

| Stage | Credentials | What it proves | Mutation risk |
|---|---|---|---|
| `static` | None | Terraform formatting, provider initialization, configuration validation, TFLint rules, and Checkov findings | None; backend is disabled |
| `oidc-plan` | Short-lived AWS credentials from GitHub OIDC | The protected GitHub Environment can obtain the expected AWS identity and the disabled-by-default graph can be planned | No state lock, no refresh, no backend, all provisioning flags set to `false` |

The OIDC job is skipped for pull requests originating from forks. This avoids exposing protected environment secrets or cloud identity to untrusted workflow code. Same-repository pull requests and protected branch runs may enter the `staging-monitoring` Environment and are subject to its reviewer rules.

## GitHub Environment setup

Create an environment named `staging-monitoring` in the repository settings. Require reviewers for this environment, prevent administrator bypass where organizational policy permits, and restrict deployment branches to the protected default branch plus approved same-repository pull requests.

Configure the following environment-scoped values:

| Name | Kind | Required value |
|---|---|---|
| `AWS_REGION` | Variable | The approved staging AWS region. |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | Secret | ARN of a pre-existing read-only AWS role used only for CI plan identity verification. |

The secret must not be stored in repository variables, a committed `.tfvars` file, workflow text, or a pull-request comment. Do not add `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, or a static session token.

## AWS trust policy requirements

The pre-existing plan role should trust GitHub's OIDC provider only for the expected audience and repository subject. If the plan job is protected by the GitHub Environment `staging-monitoring`, use the environment subject rather than a branch-only subject:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Federated": "arn:aws:iam::<ACCOUNT_ID>:oidc-provider/token.actions.githubusercontent.com"
      },
      "Action": "sts:AssumeRoleWithWebIdentity",
      "Condition": {
        "StringEquals": {
          "token.actions.githubusercontent.com:aud": "sts.amazonaws.com",
          "token.actions.githubusercontent.com:sub": "repo:HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web:environment:staging-monitoring"
        }
      }
    }
  ]
}
```

Use the smallest policy needed for the selected plan. Because the workflow explicitly disables all optional resources, a read-only identity check is normally sufficient for this dry run. If an approved future workflow plans existing AMP resources, grant only the required read actions and scope resource ARNs where the AWS action supports resource-level conditions.

The optional GitHub OIDC role created by this Terraform module is a separate resource. It cannot be used to bootstrap its own creation. Provision the CI plan role through an independently controlled bootstrap process, then pass its ARN as `AWS_TERRAFORM_PLAN_ROLE_ARN`.

## Local reproduction

Run the following commands from the module directory:

```bash
terraform fmt -check -diff
terraform init -backend=false -input=false -lockfile=readonly
terraform validate -no-color
tflint --init --config=.tflint.hcl
tflint --config=.tflint.hcl --format compact
terraform plan -refresh=false -lock=false -input=false \\
  -var='enable_github_oidc=false' \\
  -var='enable_staging_monitoring=false' \\
  -var='manage_supabase_project=false' \\
  -var='manage_supabase_settings=false'
```

The workflow uses the same flags. The plan is deliberately not a substitute for an enabled-resource plan review. It confirms that the default graph remains closed and that CI can authenticate to AWS through OIDC without using long-lived credentials.

## Review and failure handling

A pull request should be blocked if formatting, validation, TFLint, Checkov, or the OIDC plan fails. Review the workflow log for the failing stage without printing environment values. If the OIDC job fails, verify the Environment name, role ARN, OIDC audience, exact repository subject, and reviewer approval. Do not weaken the trust policy to make a run pass.

If `terraform plan` proposes a resource despite all four switches being disabled, stop and inspect variable defaults, conditional expressions, module counts, and provider configuration. Do not merge until the unexpected graph is explained.

The workflow does not upload a plan artifact. This avoids exposing provider metadata, resource names, or sensitive planned values through public or broadly visible artifacts. If a restricted artifact becomes necessary, encrypt it, limit retention, require authenticated access, and review the redaction boundary before enabling it.

## Activation boundary

To activate AWS monitoring or GitHub OIDC resources, create a separate reviewed workflow or manually run an approved plan with the relevant enable flags set to `true`. Use a protected Environment with at least two reviewers for the first activation. Review the complete plan, including creates, updates, and destroys, and apply only the reviewed saved plan through a separate, explicitly authorized job. Keep outbound notification integrations disabled until their recipients, templates, secrets, and escalation policy have been approved.
