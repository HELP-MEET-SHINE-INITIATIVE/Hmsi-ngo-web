-- Core volunteer opportunities requested for HMSI operations.
-- These are volunteer roles, not promises of employment, payment, or guaranteed placement.
insert into public.opportunities (title, description, audience, location, starts_at, status, created_by)
select title, description, 'volunteer', 'Nigeria and Africa', timezone('utc', now()), 'open', 'HMSI operations'
from (values
  ('Community Outreach and Mobilisation Volunteer', 'Support respectful community listening, outreach preparation, event coordination, and referral information. Follow HMSI safeguarding, consent, and do-no-harm guidance.', 'volunteer'),
  ('Safeguarding and Referral Support Volunteer', 'Help organise safe referral information, escalate safeguarding concerns through approved channels, and protect confidential community information. This role does not diagnose, investigate, or provide legal advice.', 'volunteer'),
  ('Digital Communications and Content Volunteer', 'Help prepare accurate HMSI programme updates, social copy, and accessible digital information using approved sources and administrator review.', 'volunteer'),
  ('Fundraising and Grant Research Volunteer', 'Support research into suitable funding opportunities, donor information, and campaign preparation without making unverified claims or promises.', 'volunteer'),
  ('Member Room Support and Moderation Volunteer', 'Help welcome approved members, identify spam or harmful content, and escalate moderation issues under HMSI room rules. No private-data disclosure.', 'volunteer'),
  ('Monitoring, Evaluation and Learning Volunteer', 'Help organise non-sensitive activity information, feedback themes, and evidence summaries for administrator review. Do not collect beneficiary identities or unnecessary personal data.', 'volunteer'),
  ('Administration and Records Support Volunteer', 'Support orderly filing, meeting preparation, task follow-up, and approved records while respecting role-based access and confidentiality.', 'volunteer'),
  ('Partnerships and Donor Communications Volunteer', 'Help prepare factual partnership research and draft outreach materials for administrator approval. No independent fundraising solicitation or financial commitments.', 'volunteer')
) as roles(title, description, audience)
where not exists (select 1 from public.opportunities existing where existing.title = roles.title and existing.audience = 'volunteer' and existing.status = 'open' limit 1);
