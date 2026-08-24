import type { Metadata } from 'next';
import MemberRoomContent from '../../components/MemberRoomContent';
import PortalProfileCard from '../../components/PortalProfileCard';
export const metadata: Metadata = { title: 'HMSI Member Room', robots: { index: false, follow: false } };
export default function MemberRoomPage() { return <><PortalProfileCard /><MemberRoomContent /></>; }
