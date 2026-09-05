# Datadog-to-Jira Synchronization Source Findings

## Datadog Webhooks

Datadog’s official webhook documentation states that webhooks connect Datadog to external services and send POST requests when a metric alert triggers. The Webhooks integration supports custom headers and custom JSON payloads with variables including alert ID, title, status, transition, priority, scope, metric, query, date, event link, and alert cycle key. Datadog documents retries for internal errors and HTTP 5xx responses, with a 15-second timeout and five retries for missed connections. Source: https://docs.datadoghq.com/integrations/webhooks/

For HMSI, the receiver should treat Datadog input as untrusted, enforce an allowlisted source mechanism or gateway signature, scrub payloads before logging, and use only bounded operational fields. Raw alert messages, log samples, incident attributes, email addresses, security attributes, and arbitrary alert scope should not be copied into Jira without explicit sanitization.

## Jira Cloud Issues API

Atlassian’s Jira Cloud REST API documentation states that the issue resource supports creating and editing issues, retrieving create metadata, assigning users, retrieving changelogs, and transitioning issues. The Create issue endpoint is `POST /rest/api/3/issue`; the request uses a JSON `fields` object and requires Browse projects and Create issues permissions, with appropriate OAuth scopes such as `write:issue:jira` for granular access. Atlassian notes that descriptions and multiline text fields use Atlassian Document Format, while single-line text fields accept strings. Source: https://developer.atlassian.com/cloud/jira/platform/rest/v3/api-group-issues/

For HMSI, the integration should use a dedicated Jira service identity restricted to the governance project and issue type. It should create or update corrective-action issues using a stable external alert key, never transition issues to Closed automatically, and retain Datadog/Jira references in bounded fields. Jira field IDs must be discovered through create metadata rather than guessed.

## Implementation boundary

The sources support a reference implementation and API payload template, not live configuration. HMSI must confirm the Datadog site, webhook features and source-authentication method, Jira Cloud project key, issue type, custom-field IDs, service identity, OAuth/token strategy, issue security scheme, and approved notification policy before activation.
