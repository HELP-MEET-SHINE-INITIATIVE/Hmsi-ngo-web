import type { Metadata } from 'next';
import SignupContent from './SignupContent';

export const metadata: Metadata = {
  title: 'Join HMSI | Create Account',
  description: 'Create your Help Meet Shine Initiative account to start volunteering or working with our team.',
  robots: { index: false, follow: false },
};

export default function SignupPage() {
  return <SignupContent />;
}
