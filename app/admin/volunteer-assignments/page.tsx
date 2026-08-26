import VolunteerAssignmentsManager from './VolunteerAssignmentsManager';

export const dynamic = 'force-dynamic';

export default function AdminVolunteerAssignmentsPage() {
  return <main className="min-h-screen bg-[#f6f4ef] px-5 py-8 text-[#17221e] sm:px-8"><div className="mx-auto max-w-7xl"><VolunteerAssignmentsManager /></div></main>;
}
