import { Metadata } from 'next';
import WorkerAssistantPanel from '../../components/WorkerAssistantPanel';
import WorkerRoomContributorStudio from '../../components/WorkerRoomContributorStudio';
import HmsiRoomFlashPlacements from '../../components/HmsiRoomFlashPlacements';

export const metadata: Metadata = {
  title: 'HMSI Worker Assistance | HMSI',
  description: 'Restricted HMSI worker assistance for assigned workflow guidance.',
  robots: { index: false, follow: false },
};

export default function WorkerRoomPage() {
  return <><HmsiRoomFlashPlacements /><WorkerAssistantPanel /><WorkerRoomContributorStudio /></>;
}
