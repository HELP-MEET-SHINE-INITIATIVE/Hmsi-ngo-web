import type { Metadata } from 'next';
import OnboardingContent from './OnboardingContent';

export const metadata: Metadata = {
  title: 'HMSI Onboarding | Approved Applicant Workspace',
  description: 'Complete your HMSI onboarding tasks through a secure invitation link.',
  robots: { index: false, follow: false },
};

export default async function OnboardingPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const params = await searchParams;
  return <OnboardingContent token={params.token || ''} />;
}
