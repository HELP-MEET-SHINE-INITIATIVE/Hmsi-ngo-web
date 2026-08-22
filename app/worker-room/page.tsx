import { Metadata } from 'next';
import WorkerAssistantPanel from '../../components/WorkerAssistantPanel';

export const metadata: Metadata = {
  title: 'HMSI Worker Assistance | HMSI',
  description: 'Restricted HMSI worker assistance for assigned workflow guidance.',
  robots: { index: false, follow: false },
};

export default function WorkerRoomPage() {
  return <WorkerAssistantPanel />;
}
