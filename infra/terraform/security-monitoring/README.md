# HMSI security monitoring Terraform module

This module is a **reviewable, disabled-by-default** foundation for the existing HMSI Supabase project, a protected GitHub Actions AWS OIDC role, and optional staging Amazon Managed Service for Prometheus resources. It does not configure Slack or PagerDuty delivery, does not create application records, and does not run the governance SQL migration automatically.

## Why the defaults are disabled

The existing Supabase project should be imported and reviewed before Terraform manages settings. Database DDL remains a separate reviewed SQL migration because this provider manages Supabase platform resources and settings rather than serving as the HMSI migration executor. The monitoring and OIDC resources are opt-in so a plan cannot create cloud resources or a federated trust relationship accidentally.

## Required variables and secret inputs

Use a remote encrypted and versioned Terraform state backend outside this module. Supply `SUPABASE_ACCESS_TOKEN` or `TF_VAR_supabase_access_token` from a protected secret store. For a new Supabase project only, supply `TF_VAR_supabase_organization_id` and `TF_VAR_supabase_database_password`; never put the password in a `.tfvars` file committed to Git.

The AWS credentials used to run Terraform must be separate from the GitHub Actions role being created. The GitHub Actions role itself is assumed later through OIDC and has only AMP read/write actions against the optional staging workspace.

## Safe initialization

```bash
cd infra/terraform/security-monitoring
export SUPABASE_ACCESS_TOKEN="$(security-tool read hmsi/supabase/terraform-token)"
terraform init
terraform fmt -check
terraform validate
```

The `security-tool` command is illustrative; use HMSI’s approved secret manager. Do not echo secrets or put them in command-line arguments.

## Import the existing Supabase project

The existing project reference is `mutosvokcxkpiqxewcva`. Keep `manage_supabase_project=false` while importing and reviewing state. Because the resource is count-indexed, import it as:

```bash
terraform import 'supabase_project.hmsi[0]' mutosvokcxkpiqxewcva
```

Only set `manage_supabase_project=true` for an explicitly approved project-management change. Keep `manage_supabase_settings=false` until the settings plan has been reviewed. Apply the governance SQL migration separately through the approved Supabase migration workflow and verify RLS/grants afterward.

## Review the disabled plan

```bash
terraform plan \
  -var='enable_github_oidc=false' \
  -var='enable_staging_monitoring=false' \
  -var='manage_supabase_project=false' \
  -var='manage_supabase_settings=false'
```

The default plan should contain no AWS resources and no Supabase project mutation. Review for unexpected destroys before every apply. Use a protected CI Environment for applies, require two reviewers for the first OIDC or monitoring activation, and store the plan artifact in a restricted location.

## Enable the staging monitoring foundation

After approval, create a plan with:

```bash
terraform plan -out=staging-monitoring.tfplan \
  -var='enable_github_oidc=true' \
  -var='enable_staging_monitoring=true' \
  -var='manage_supabase_project=false' \
  -var='manage_supabase_settings=false'
terraform show -no-color staging-monitoring.tfplan
terraform apply staging-monitoring.tfplan
```

The trust policy accepts only the exact repository `HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web`, audience `sts.amazonaws.com`, and protected GitHub Environment `staging-monitoring`. The role session is limited to 15 minutes. The permissions policy is scoped to the created AMP workspace and contains only remote-write and metric-query actions.

The template also creates a 30-day CloudWatch log group tagged as aggregate security metrics. Do not send raw origins, headers, request bodies, cookies, tokens, personal data, or provider responses to it.

## GitHub Actions wiring

The repository workflow is `.github/workflows/terraform-security-monitoring-ci.yml`. It runs only when the module or workflow changes and performs `terraform fmt -check`, backend-free initialization, `terraform validate`, TFLint, and Checkov. It has no `terraform apply` step.

Create a protected GitHub Environment named `staging-monitoring`. Add the following environment-scoped values:

| Name | Type | Purpose |
|---|---|---|
| `AWS_REGION` | Variable | Approved staging AWS region, for example `eu-west-1`. |
| `AWS_TERRAFORM_PLAN_ROLE_ARN` | Secret | ARN of a pre-existing, read-only plan role. This role must be provisioned separately from the optional role this module can create. |

The workflow requests `id-token: write` only in the OIDC plan job and uses `aws-actions/configure-aws-credentials`. It verifies the federated identity with `aws sts get-caller-identity` without printing credentials, then runs a read-only `terraform plan` with all provisioning switches explicitly disabled. The plan uses `-backend=false`, `-refresh=false`, and `-lock=false`, so it cannot mutate remote state or create resources.

Do not run the OIDC plan job for untrusted fork pull requests. The workflow intentionally skips that job for forks while still running static validation, because GitHub does not expose protected secrets to fork workflows and an untrusted pull request must never receive a cloud identity. For same-repository pull requests, require the protected Environment reviewers before OIDC access is granted.

Keep the workflow permission set to `contents: read` plus `id-token: write` in the OIDC job; do not add long-lived AWS keys. The trust policy for the role created by this module accepts only the exact repository `HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web`, audience `sts.amazonaws.com`, and the `staging-monitoring` Environment subject.

Before enabling a real resource plan, replace the disabled variables only in an explicitly approved workflow and use a protected environment with two reviewers. Never upload `tfplan` or `terraform show` output to a public artifact. The supplied workflow removes its local plan file at the end and does not publish plan output as an artifact.

## Local dry-run equivalent

Run the same no-backend, no-refresh checks locally before opening a pull request:

```bash
cd infra/terraform/security-monitoring
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

A successful dry run proves syntax, provider initialization, and the disabled default graph. It does not prove that a future enabled plan is safe; any activation must use a separate reviewed plan and protected apply process.

## Monitoring SQL migration boundary

The Terraform module does not apply `supabase/security_exception_alert_state_migration.sql`. Run that migration only through the approved Supabase migration tool after a separate review. Then verify table RLS, absence of browser policies, fixed function search paths, and revoked public/anon/authenticated grants.

## Rollback

For a failed plan or apply, stop before applying further resources. Restore the previous Terraform state through the protected backend rather than deleting resources manually. To disable the optional monitoring foundation, set both enable flags to false and review the destroy plan carefully. To revoke GitHub federation, disable the protected workflow first, then remove the role after confirming no approved run is active. Rotate any affected secret through the secret manager; do not paste values into issues or logs.

## References

- [Supabase Terraform provider tutorial](https://supabase.com/docs/guides/deployment/terraform/tutorial)
- [Supabase Terraform provider reference](https://supabase.com/docs/guides/deployment/terraform/reference)
- [GitHub: Configuring OpenID Connect in AWS](https://docs.github.com/actions/deployment/security-hardening-your-deployments/configuring-openid-connect-in-amazon-web-services)
- [AWS `aws_prometheus_workspace` resource](https://registry.terraform.io/providers/hashicorp/aws/latest/docs/resources/prometheus_workspace)

## Merge-only continuous deployment

The separate workflow `.github/workflows/terraform-security-monitoring-cd.yml` is intentionally triggered by `pull_request` events of type `closed` on the `main` branch. Its job-level condition additionally requires `github.event.pull_request.merged == true`, so closing or abandoning a pull request cannot apply Terraform. The workflow has no `workflow_dispatch` trigger.

Use the protected GitHub Environment named `production`. Its wait timer is configured to **1,440 minutes (24 hours)**, so a pending deployment that is not approved before the timer expires fails. Add the required production reviewers, restrict deployments to the protected `main` branch, and do not permit unreviewed administrator bypass. Configure the following values:

| Name | Kind | Purpose |
|---|---|---|
| `AWS_REGION` | Variable | Approved production AWS region. |
| `AWS_TERRAFORM_APPLY_ROLE_ARN` | Secret | Short-lived OIDC-assumed AWS role for the approved apply job. It must be separate from the plan role and scoped only to the resources this module is approved to manage. |
| `SUPABASE_ACCESS_TOKEN` | Secret | Protected Supabase provider token, only if the merged change manages approved Supabase settings. |
| `TF_STATE_BUCKET` | Variable | Encrypted, versioned S3 state bucket. |
| `TF_STATE_KEY` | Variable | Non-secret state object key for this module. |
| `TF_STATE_REGION` | Variable | AWS region containing the state bucket. |
| `TF_STATE_DDB_TABLE` | Variable | Optional DynamoDB lock table name. Leave empty only when the approved backend policy does not require it. |
| `TF_ENABLE_GITHUB_OIDC` | Variable | `false` by default; set to `true` only in an approved activation change. |
| `TF_ENABLE_STAGING_MONITORING` | Variable | `false` by default; set to `true` only in an approved activation change. |
| `TF_MANAGE_SUPABASE_PROJECT` | Variable | `false` by default; existing HMSI project management requires a reviewed import and plan. |
| `TF_MANAGE_SUPABASE_SETTINGS` | Variable | `false` by default; enable only for explicitly approved settings changes. |

The workflow checks out the exact merge commit, assumes AWS credentials through GitHub OIDC, verifies the federated identity without printing credentials, initializes the encrypted remote backend, creates a fresh saved plan, and applies exactly that saved plan. It does not run a separate second plan between review and apply; the protected Environment approval is the deployment gate for the generated plan. The `production` Environment’s 1,440-minute wait timer is enforced by GitHub outside the YAML job definition. State locking is enabled during the plan and apply, and the workflow serializes runs for the module to prevent concurrent mutation.

A production-safe operating sequence is: merge a reviewed pull request into `main`; GitHub pauses at the protected `production` Environment; the 24-hour wait timer begins; authorized reviewers inspect the changed files, OIDC role, backend variables, and Terraform plan output; the job proceeds only after the required approvals and timer; and the apply step consumes `merged-change.tfplan`. If approval is not completed within 24 hours, GitHub fails the pending deployment. If the plan contains an unexpected destroy, trust-policy change, notification resource, or provider setting change, reject the Environment approval and investigate rather than editing the workflow to bypass the guard.

The apply role must not use long-lived access keys. Its trust relationship should be limited to GitHub's OIDC provider, audience `sts.amazonaws.com`, the exact HMSI repository, and the protected production deployment Environment subject. The production wait timer is a GitHub Environment setting rather than a Terraform variable. Keep notification integrations and recurring outbound messages disabled unless an independent authorization explicitly changes that boundary.

## Controlled Terraform state rollback

The separate workflow `.github/workflows/terraform-security-monitoring-rollback.yml` is an explicitly invoked recovery tool. It requires an operator to provide an exact S3 `VersionId`, type `RESTORE_PREVIOUS_STATE`, and provide a short incident reference. It is paused behind the protected `staging-monitoring-rollback` Environment and has no automatic trigger. The rollback role is assumed through GitHub OIDC using the environment-scoped secret `AWS_TERRAFORM_ROLLBACK_ROLE_ARN`; long-lived AWS keys are not supported.

Configure the rollback Environment with the same non-secret backend variables used by CD: `TF_STATE_BUCKET`, `TF_STATE_KEY`, `TF_STATE_REGION`, and optional `TF_STATE_DDB_TABLE`. Require at least two authorized reviewers, restrict the Environment to the protected `main` branch, and use an AWS trust policy whose OIDC subject is exactly:

```text
repo:HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web:environment:staging-monitoring-rollback
```

The state bucket must have versioning enabled, encryption enabled, and a restrictive bucket policy. The rollback role needs only the S3 versioned-object read/write operations required for this one state key, Terraform lock-table access if DynamoDB locking is used, and `sts:GetCallerIdentity`. Prefer a dedicated recovery role rather than reusing the apply role.

### Operator procedure

First, stop the failed deployment and prevent concurrent Terraform runs. Identify the exact last-known-good S3 object version from the protected state backend or its audit records; never guess a version. Confirm that the selected object belongs to the exact configured bucket and key. Start the rollback workflow, enter the version ID, type the confirmation phrase, and provide an incident reference that contains no secrets or personal data. The workflow verifies the version with `head-object`, records the current version ID in the private GitHub job summary, downloads the selected version only into the ephemeral runner, validates its Terraform state structure, and restores it with `terraform state push -force` while the backend lock is held.

After the state restore, do not assume that AWS resources have been reverted. State rollback changes Terraform’s recorded view; it does not undo an already-applied IAM, AMP, Supabase, or logging change. Run a fresh, protected `terraform plan` against the restored state and current configuration. If the plan shows drift or required destroys/updates, conduct a separate reviewed reconciliation apply. For an interrupted apply, inspect the provider resources and Terraform state before any further mutation. If state recovery itself fails, stop and preserve the current backend versions for incident review rather than repeatedly forcing pushes.

The workflow intentionally does not post state contents or plan output as artifacts. State files can contain sensitive provider data. The local copy is removed in an always-run cleanup step, but backend version history remains the authoritative recovery record. Keep notification integrations disabled during recovery unless a separate authorization explicitly permits them.

## Read-only state-version helper

Use `.github/workflows/terraform-security-monitoring-state-versions.yml` to display the five newest S3 object versions for the exact Terraform state key. It is manually invoked, pauses at the protected `staging-monitoring-rollback` Environment, assumes a dedicated read-only OIDC role from `AWS_TERRAFORM_STATE_READ_ROLE_ARN`, and retrieves only S3 metadata. It never downloads state contents, invokes Terraform, changes state, or applies infrastructure.

The helper requires the existing `AWS_REGION`, `TF_STATE_BUCKET`, `TF_STATE_KEY`, and `TF_STATE_REGION` Environment variables. The read role should be separate from both the apply and rollback roles and should be limited to `s3:ListBucketVersions` on the state bucket and `s3:HeadObject` for the exact state object. It also needs `sts:GetCallerIdentity` for the non-secret identity check. Use an OIDC trust subject restricted to `repo:HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web:environment:staging-monitoring-rollback` and audience `sts.amazonaws.com`.

After running the helper, review the private GitHub job summary and select a specific `VersionId` for the rollback workflow. Confirm the timestamp, `IsLatest` flag, size, and ETag against the incident timeline; do not infer correctness from recency alone. Then copy only the exact VersionId into the rollback workflow and complete its independent confirmation and reviewer approval steps. The helper deletes its temporary metadata response from the runner and does not create an artifact.

## Apply-failure rollback context

The CD workflow now contains a failure-only `rollback-context` job. When the merged-PR apply job fails, this job runs automatically and uses the dedicated read-only `AWS_TERRAFORM_STATE_READ_ROLE_ARN` through GitHub OIDC to list the five newest S3 VersionIds for the exact state key. It writes only safe metadata—VersionId, timestamp, latest flag, size, and ETag—to the private GitHub job summary.

Create the `staging-monitoring-diagnostics` GitHub Environment with the same non-secret backend variables used by CD and the read-only `AWS_TERRAFORM_STATE_READ_ROLE_ARN` secret. Its OIDC trust subject should be exactly:

```text
repo:HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web:environment:staging-monitoring-diagnostics
```

This failure path does not download state contents, run Terraform, acquire a state lock, push state, or invoke the rollback workflow. It is intentionally a diagnostic handoff: operators must review the failed run, select a last-known-good VersionId, and invoke the separately protected rollback workflow with its independent confirmation and reviewer approvals. If the version-listing diagnostic itself fails, preserve the original apply failure and inspect the S3 version history through the approved administrative channel.

## Sanitized GitHub issue on apply failure

The CD `rollback-context` job now creates or reuses a GitHub issue labeled `terraform-apply-failure` after a merged-PR apply failure. The issue contains the merged commit, a link to the restricted workflow run, the exact state bucket/key, and the safe five-version metadata table when the S3 lookup succeeds. It uses a merge-commit marker for idempotency, so reruns of the same failed merge reuse the existing open issue instead of creating duplicates.

Raw workflow logs are intentionally not copied into the issue. The issue states this boundary and links authorized operators to the restricted run, because Terraform, provider, and AWS logs can contain sensitive resource metadata or secret-bearing output. The job requests `issues: write` only for this failure-reporting path; the apply and rollback jobs do not receive issue-write permission. If issue creation is unavailable, the apply failure remains the primary incident signal and the private workflow summary remains the diagnostic record.

## Comment-authorized rollback

The workflow `.github/workflows/terraform-security-monitoring-comment-rollback.yml` accepts one exact command on an open issue labeled `terraform-apply-failure`:

```text
/hmsi-terraform-rollback <S3-VersionId>
```

The job runs only for newly created issue comments, validates the VersionId character set and length, checks the commenter against the comma-separated protected Environment variable `TF_ROLLBACK_ALLOWED_ACTORS`, and requires the issue to remain open and carry the failure label. Configure that allowlist with exact GitHub login names only; do not use display names, email addresses, wildcards, or unreviewed repository variables. The workflow is paused by the `staging-monitoring-rollback` Environment and requires the dedicated OIDC rollback role `AWS_TERRAFORM_ROLLBACK_ROLE_ARN`.

Before any state mutation, it checks for a prior result marker for the same issue and VersionId, verifies that the VersionId belongs to the exact configured state key, and skips the push if that version is already current. Otherwise it downloads the selected state version only to the ephemeral runner, validates its Terraform structure, and pushes it under backend locking. The workflow never trusts the comment as authorization by itself, and it does not accept edited comments or comments on arbitrary issues.

On completion, the workflow posts a sanitized result comment containing the selected VersionId, authorized commenter, workflow result, restricted run link, and whether the requested version was already current. It does not copy Terraform state or raw logs into the issue. The operator must run a fresh protected reconciliation plan after any successful state restore because state rollback does not itself revert cloud resources.

## Post-rollback plan verification

Both rollback entry points now run a verification-only `terraform plan` after the selected state is restored, or after confirming that the requested VersionId is already current. The plan checks the restored state against the configuration checked out from `main` with refresh disabled and backend locking enabled. It does not apply changes, push state, download a plan artifact, or publish plan output. All optional provisioning variables are explicitly set to `false` in the rollback jobs.

The plan uses Terraform’s detailed exit semantics: exit code `0` is recorded as `match`, exit code `2` as `drift-detected`, and any other code as `plan-error`. A non-zero result fails the rollback workflow and requires operator review. Plan output is redirected to an ephemeral runner file and removed during cleanup rather than copied to the issue or job artifact. A `match` result means the restored state has no configuration changes under the chosen no-refresh evaluation; it does not prove that remote resources are healthy. A drift or plan error requires a fresh protected reconciliation plan and explicit review before any infrastructure apply.

## Automatic closure after verified rollback

The comment-authorized rollback workflow now closes the linked `terraform-apply-failure` issue only after all of the following are true: the requested VersionId was already current or the state push succeeded; the restored state was successfully read back; and the post-rollback verification plan completed with exit code `0` (`match`). The workflow first posts a sanitized result comment and then closes the issue with GitHub’s `completed` state reason.

The issue remains open when the command is unauthorized, the issue is not a valid labeled failure issue, the state lookup or restore fails, the state cannot be confirmed, the plan returns drift (`2`), the plan errors, or verification is skipped. A failed or uncertain recovery therefore cannot silently close the incident. Closing the issue also does not replace a separate review of remote resources; if the plan was run with refresh disabled, operators must still perform the approved reconciliation checks before any infrastructure apply.

## Production Environment approval gate

The merge-only CD workflow now targets the GitHub Environment named `production`. GitHub pauses the apply job at that Environment before OIDC credentials are issued and before Terraform can apply the saved plan. No GitHub team slug is hardcoded; required reviewers must be configured manually in repository settings.

Configure the gate in **Repository Settings → Environments → production**. Add the approved individual reviewers or team, enable **Required reviewers**, and restrict deployment branches to `main` or the repository’s protected branch rule. Do not allow self-review where the repository policy supports that control. Add only the production-scoped variables and secrets to this Environment, including the production-compatible `AWS_TERRAFORM_APPLY_ROLE_ARN`, `AWS_REGION`, backend settings, and any explicitly approved Terraform activation flags. Keep notification and unrelated integration secrets out of the Environment.

The Terraform variable `github_environment` accepts `production` as an explicit opt-in so an OIDC trust policy managed by this module can use the subject `repo:HELP-MEET-SHINE-INITIATIVE/Hmsi-ngo-web:environment:production`. The role used to start the workflow must already trust this exact GitHub OIDC subject, or it must be provisioned through a separately reviewed bootstrap path; the workflow cannot safely create its own initial trust relationship. Verify the Environment reviewer rule and OIDC trust policy together before the first production run.

## Slack notification for pending production approval

The merge-only CD workflow now starts a separate `approval-notification` job for a merged pull request targeting `main`. It sends a sanitized Slack message using the protected secret `SLACK_PRODUCTION_APPROVAL_WEBHOOK_URL`, then the Terraform apply job proceeds to the protected `production` Environment and waits for its manually configured reviewers. The notification job has no OIDC permission and cannot approve, apply, or bypass the Environment gate.

Create an incoming webhook for the approved private deployment channel and store it as a repository or `production` Environment secret named `SLACK_PRODUCTION_APPROVAL_WEBHOOK_URL`. Do not place the webhook in YAML, variables, issue bodies, job summaries, or logs. The message contains only the repository, pull-request number, merge commit, production Environment name, and a link to the restricted GitHub Actions run. Terraform output, state contents, credentials, provider responses, donor/member information, and user-entered pull-request text are excluded.

The notification step is marked non-blocking so a Slack outage or an intentionally absent webhook cannot prevent the production Environment from enforcing its reviewer gate or cause an unsafe bypass. GitHub Settings → Environments → production remains the authoritative place to configure required reviewers and branch restrictions. Slack delivery should be tested with a non-production or approved dry-run event before enabling production use.

The Slack link labeled **Open the approval request** targets the exact GitHub Actions run URL. Reviewers should open that run and select **Review deployments** to approve or reject the `production` job. GitHub’s documented reviewer flow is run-based, so the workflow does not construct or claim a separate environment-approval URL.

The CD workflow also posts an idempotent comment to the merged pull request before the production approval gate. The comment uses an internal workflow-run marker to avoid duplicates on reruns, links to the exact Actions run, identifies the `production` Environment and merge commit, and instructs reviewers to select **Review deployments**. The notification job receives only `contents: read` and `issues: write`; it cannot access OIDC credentials, Terraform state, or production Environment secrets. The comment does not approve, reject, or bypass the deployment, and it contains no Terraform output, state data, credentials, or user-entered pull-request text.

After a successful production apply, the CD workflow runs `cleanup-approval-comment`. It searches only the merged pull request associated with the current workflow run and deletes only GitHub Actions comments containing that run’s exact `hmsi-production-approval` marker. Failed, cancelled, rejected, timed-out, or otherwise incomplete deployments retain the pending-approval comment for incident context. The cleanup job has only `contents: read` and `issues: write`; it does not access Terraform credentials or state, and the Actions run remains the authoritative deployment audit record.

After the production apply job finishes, the CD workflow runs `final-deployment-status` with `always()`. It sends a final Slack notification through `SLACK_PRODUCTION_APPROVAL_WEBHOOK_URL` containing only the GitHub job result (`success`, `failure`, or another terminal GitHub result), repository, pull-request number, merge commit, production Environment, and restricted workflow URL. Terraform output, plan contents, state data, credentials, and personal information are excluded. Delivery is non-blocking: a Slack outage cannot change the Terraform result or trigger rollback. The existing failure diagnostics and success-only approval-comment cleanup retain their independent guards.

After a successful production apply, the CD workflow runs `mark-production-deployed`. It creates the `deployed-to-prod` label if it does not already exist and applies it to the merged pull request. Label assignment is idempotent, runs only when `needs.apply.result == 'success'`, and uses only `contents: read` plus `issues: write`. Failed, cancelled, rejected, timed-out, or incomplete deployments are never labeled as deployed. This job has no Terraform, AWS OIDC, state, or production-secret access.

The final Slack status now includes the merged pull request number, the author’s GitHub login, a direct link to the merged pull request, the merge commit, production Environment, result, and restricted Actions run link. It intentionally excludes the pull-request title and body, review comments, Terraform output, state contents, credentials, and other user-entered content.
