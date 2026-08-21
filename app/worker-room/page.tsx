import type { Metadata } from 'next';
import CommunityRoomContent from '../community/CommunityRoomContent';

export const metadata: Metadata = {
  title: 'Worker Room | HMSI',
  description: 'Coordinate HMSI worker updates, tasks, comments, and likes.',
  robots: { index: false, follow: false },
};

export default function WorkerRoomPage() {
  return <CommunityRoomContent room="worker" />;
}
