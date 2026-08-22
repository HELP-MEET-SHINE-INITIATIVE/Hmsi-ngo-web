import { getSupabaseAdmin } from './supabaseAdmin';

export interface PublicImpactMetrics {
  successfulDonations: number;
  recordedDonationAmountNgn: number;
  activeFundraisers: number;
  activeWorkers: number;
  approvedVolunteerApplications: number;
  reportingBasis: string;
  dataAvailable: boolean;
}

export async function getPublicImpactMetrics(): Promise<PublicImpactMetrics> {
  const fallback: PublicImpactMetrics = {
    successfulDonations: 0,
    recordedDonationAmountNgn: 0,
    activeFundraisers: 0,
    activeWorkers: 0,
    approvedVolunteerApplications: 0,
    reportingBasis: 'No live ledger metrics are available at this time.',
    dataAvailable: false,
  };

  const admin = getSupabaseAdmin();
  if (!admin) return fallback;

  const [donations, fundraisers, workers, volunteers] = await Promise.all([
    admin.from('donations').select('amount_ngn').eq('status', 'success').limit(10000),
    admin.from('fundraisers').select('id').eq('status', 'active').limit(1000),
    admin.from('workers').select('id').eq('status', 'active').limit(1000),
    admin.from('volunteer_applications').select('id').eq('status', 'approved').limit(10000),
  ]);

  const hasError = donations.error || fundraisers.error || workers.error || volunteers.error;
  if (hasError) {
    console.error('[Public Impact] Failed to load one or more public metrics:', hasError);
    return fallback;
  }

  const recordedDonationAmountNgn = (donations.data || []).reduce((sum, row) => sum + Number(row.amount_ngn || 0), 0);
  return {
    successfulDonations: donations.data?.length || 0,
    recordedDonationAmountNgn,
    activeFundraisers: fundraisers.data?.length || 0,
    activeWorkers: workers.data?.length || 0,
    approvedVolunteerApplications: volunteers.data?.length || 0,
    reportingBasis: 'Counts reflect successful donations and approved/active records currently held in HMSI operational systems; they are not an independent impact evaluation.',
    dataAvailable: true,
  };
}
