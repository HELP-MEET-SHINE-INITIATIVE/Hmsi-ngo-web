import type { Metadata } from 'next';
import CreateFundraiserContent from './CreateFundraiserContent';

export const metadata: Metadata = {
  title: 'Start a Fundraiser',
  description: 'Submit a help request to the HMSI community. Tell your story and get the support you need.',
};

export default function CreateFundraiserPage() {
  return <CreateFundraiserContent />;
}
