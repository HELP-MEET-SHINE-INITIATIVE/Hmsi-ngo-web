export type LaunchTemplate = {
  id: 'welcome_tasks' | 'drive_submission' | 'publisher_call';
  title: string;
  audience: string;
  subject: string;
  body: string;
};

export const launchTemplates: LaunchTemplate[] = [
  {
    id: 'welcome_tasks',
    title: 'Welcome & Task Dashboard Walkthrough',
    audience: 'Approved workers and volunteers',
    subject: 'Welcome to HMSI — your task dashboard is ready',
    body: 'Dear [First name],\n\nWelcome to Help Meet Shine Initiative. Your approved portal pathway is ready. Open your task dashboard to review assigned work, accept a duty when appropriate, and submit approved updates or proof links.\n\nOpen my task dashboard: https://www.hmsi.org.ng/portal/my-tasks\n\nPlease do not forward any personal access link. If you need assistance, contact HMSI through the official website.\n\nHMSI Onboarding',
  },
  {
    id: 'drive_submission',
    title: 'Personal Google Drive Submission Guide',
    audience: 'Approved contributors with media or reports',
    subject: 'How to submit a Google Drive link to HMSI',
    body: 'Dear [First name],\n\nFor large videos or media files, keep the original in your personal Google Drive and paste the approved HTTPS Drive sharing link into your protected HMSI submissions area. Use the file title and a short description, then submit it for administrator review.\n\nOpen my submissions: https://www.hmsi.org.ng/portal/submissions\n\nDo not upload beneficiary identities, private financial data, or unconsented images. Share files only with the authorised HMSI administrative account shown in the portal.\n\nHMSI Administration',
  },
  {
    id: 'publisher_call',
    title: 'Call for Independent Publishers & Activists',
    audience: 'Community journalists and humanitarian advocates',
    subject: 'Help HMSI share responsible community field information',
    body: 'Help Meet Shine Initiative is inviting community-minded independent publishers, humanitarian activists, and field reporters to apply for a moderated contributor pathway. Approved contributors can submit dispatches for editorial review; HMSI administrators remain responsible for publication decisions.\n\nLearn more and apply: https://www.hmsi.org.ng/volunteer?interest=Independent%20Field%20Reporter\n\nPlease do not publish private beneficiary information or unconsented media.\n\nHMSI Editorial Team',
  },
];
