import type { Metadata } from 'next';
import VolunteerForm from '../volunteer/VolunteerForm';

export const metadata: Metadata = {
  title: 'Worker Application | HMSI',
  description: 'Apply to work with Help Meet Shine Initiative. Worker applications are reviewed and approved by HMSI administrators.',
};

export default function WorkerApplyPage() {
  return <VolunteerForm applicationRole="worker" />;
}
