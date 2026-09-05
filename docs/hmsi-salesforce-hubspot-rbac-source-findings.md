# Salesforce and HubSpot RBAC Source Findings

## Salesforce

The official Salesforce data-access documentation explains that profiles, permission sets, and permission-set groups provide object-level and field-level security, while record-level sharing settings control which records users can access. Source: https://help.salesforce.com/s/articleView?language=en_US&id=platform.security_data_access.htm&type=5

Salesforce’s official field-level-security resource is available at https://help.salesforce.com/s/articleView?id=platform.users_set_fls_permsets.htm&type=5. The relevant implementation anchor is to configure retention and suppression fields with field-level security through permission sets, rather than relying on page layouts alone.

## HubSpot

HubSpot’s official user permissions guide, last updated August 7, 2026, states that permissions define how users work within tools available through their seat, and that Super Admins or users with user-management privileges can set whether users can view, create, edit, or delete CRM objects. It also states that property edit access and content access can be limited for specific users. Source: https://knowledge.hubspot.com/user-management/hubspot-user-permissions-guide

The guide lists customizable permissions for contacts, companies, deals, tickets, tasks, notes, custom objects, and other CRM activities. It also links to HubSpot controls for assigned teams, record edit access, exports, workflows, approvals, and file access. The HMSI mapping must therefore use HubSpot object permissions, team/record scope, property restrictions, export permissions, and workflow access together.

## Implementation caution

Neither platform should be treated as having identical authorization semantics. Salesforce offers a more granular native model through profiles, permission sets/groups, field-level security, record-sharing rules, and approval mechanisms. HubSpot configuration must be validated against the subscribed tier and available object/property/workflow/export permissions; sensitive retention overrides and deletion should be brokered through a server-side service if native controls cannot provide the required separation of duties.
