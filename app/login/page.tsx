import type { Metadata } from 'next';
import LoginContent from './LoginContent';

export const metadata: Metadata = {
  title: 'Login | HMSI Portal',
  description: 'Sign in to your Help Meet Shine Initiative portal to manage projects and volunteer activities.',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return <LoginContent />;
}
