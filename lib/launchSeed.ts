export const LAUNCH_CAMPAIGN_ID = '8f37cb58-b1f4-4d4f-9cd2-ae4f0dfe2026';

export const launchCampaignSeed = {
  id: LAUNCH_CAMPAIGN_ID,
  title: 'Emergency Field Response & Community Outreach 2026',
  description: 'HMSI launch campaign for approved emergency field response, community outreach preparation, and practical support coordination. The displayed total changes only when a verified donation is recorded.',
  category: 'emergency',
  targetAmount: 500_000,
  imageUrl: '/images/outreach-1.png',
} as const;

export const launchDispatchSeeds = [
  {
    id: '4c8e8e73-2b83-4f10-9690-47690154a001',
    headline: 'Ground Inspection Report: Local Infrastructure Assessment',
    summary: 'Launch sample dispatch for the HMSI public information feed. It illustrates the review and publication workflow and is not a substitute for a verified field assessment.',
    body: 'HMSI Field Operations prepared this sample launch dispatch to demonstrate how public field information is structured before publication. It outlines a proposed inspection approach for access routes, water points, community facilities, and referral pathways. Any operational decision or public claim must follow documented field verification, safeguarding review, and administrator approval.',
    category: 'Field operations',
    imageUrl: '/images/outreach-8.png',
  },
  {
    id: '4c8e8e73-2b83-4f10-9690-47690154a002',
    headline: 'Community Relief Dispatch',
    summary: 'Launch sample dispatch for the HMSI public information feed. It demonstrates a responsible community-relief update without claiming unverified distribution activity.',
    body: 'HMSI Field Operations prepared this sample launch dispatch to show the public format for a community-relief update. The draft describes safe coordination steps: confirm local needs, protect personal information, check safeguarding requirements, document only approved evidence, and publish only after editorial review. Future operational updates must be tied to verified activity records and authorised publication.',
    category: 'Community relief',
    imageUrl: '/images/outreach-10.png',
  },
] as const;

export const LAUNCH_SEED_AUTHOR = {
  name: 'HMSI Field Operations',
  email: 'field.operations@hmsi.org.ng',
  role: 'worker',
} as const;
