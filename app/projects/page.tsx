import type { Metadata } from 'next';
import ProjectsContent from './ProjectsContent';

export const metadata: Metadata = {
  title: 'Collaboration Space | HMSI Projects',
  description: 'Interact with workers and volunteers, track project progress, and manage tasks.',
};

export default function ProjectsPage() {
  return <ProjectsContent />;
}
