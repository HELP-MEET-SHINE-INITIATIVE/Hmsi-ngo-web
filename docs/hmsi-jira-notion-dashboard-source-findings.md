# Jira and Notion Dashboard Source Findings

## Jira

Atlassian describes Jira as a workflow-management system where work can be assigned and progressed through customizable workflows with statuses, priorities, comments, and attachments. Source: https://confluence.atlassian.com/jira

Atlassian’s custom-field documentation confirms that Jira issues can use custom fields for organization-specific information, that fields are managed under Administration → Issues → Custom fields, and that fields must be associated with the relevant screens to be visible on create, edit, or transition forms. It also describes field contexts that can scope fields to projects or issue types. Source: https://confluence.atlassian.com/adminjiraserver/managing-custom-fields-1047552711.html

## Notion

Notion database properties include text, number, select, status, multi-select, date, formula, relation, rollup, person, file, checkbox, URL, created/edited metadata, button, and ID properties. These properties support filtering, sorting, searching, relations, deadlines, owners, links, and reporting views. Source: https://www.notion.com/help/database-properties

Notion database automations support triggers such as page added, property edited, and recurring schedules, with actions including editing properties/pages, adding pages to another database, sending notifications, email, Slack notifications, and webhooks. Automations require appropriate database/page access, and Notion notes that automations cannot act on restricted pages. Database automations are available on paid plans; free-plan users have more limited automation capabilities. Source: https://www.notion.com/help/database-automations

## Application note

These sources support a platform mapping, not a live configuration. HMSI must confirm its Jira edition, project permissions, workflow and automation licenses, Notion plan, page-access model, audit requirements, and whether sensitive governance evidence belongs in either platform. Raw safeguarding content, personal data, credentials, and confidential incident narratives should remain outside ordinary dashboard records.
