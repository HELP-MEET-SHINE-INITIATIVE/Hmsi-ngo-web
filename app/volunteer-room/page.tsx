import type { Metadata } from 'next';
import CommunityRoomContent from '../community/CommunityRoomContent';

export const metadata: Metadata = {
  title: 'Volunteer Room | HMSI',
  description: 'Collaborate with HMSI volunteers and workers across Nigeria and Africa.',
  robots: { index: false, follow: false },
};

export default function VolunteerRoomPage() {
  return <CommunityRoomContent room="volunteer" />;
}
