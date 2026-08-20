import seedFundraisers from '../data/fundraisers/fundraisers.json';
import { getSupabaseAdmin } from './supabaseAdmin';

export type Fundraiser = {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  raisedAmount: number;
  image: string;
  imagePath?: string | null;
  donorCount: number;
  status: string;
  createdAt: string;
};

type FundraiserRow = {
  id: string;
  title: string;
  description: string;
  category: string;
  target_amount: number | string;
  raised_amount: number | string;
  image_url: string;
  image_path?: string | null;
  status: string;
  created_at: string;
};

async function getDonorCounts(admin: NonNullable<ReturnType<typeof getSupabaseAdmin>>, fundraiserIds: string[]) {
  const donorEmails = new Map<string, Set<string>>();
  if (fundraiserIds.length === 0) return new Map<string, number>();
  const { data, error } = await admin.from('donations').select('fundraiser_id,donor_email').eq('status', 'success').in('fundraiser_id', fundraiserIds);
  if (error) {
    console.warn('[Fundraisers] Donor counts unavailable:', error.message);
    return new Map<string, number>();
  }
  for (const donation of data || []) {
    if (!donation.fundraiser_id) continue;
    const email = String(donation.donor_email || '').trim().toLowerCase();
    if (!donorEmails.has(donation.fundraiser_id)) donorEmails.set(donation.fundraiser_id, new Set());
    if (email) donorEmails.get(donation.fundraiser_id)?.add(email);
  }
  return new Map(Array.from(donorEmails.entries()).map(([id, emails]) => [id, emails.size]));
}

function normalizeFundraiser(row: FundraiserRow, donorCount = 0): Fundraiser {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetAmount: Number(row.target_amount),
    raisedAmount: Number(row.raised_amount),
    image: row.image_url,
    imagePath: row.image_path ?? null,
    donorCount,
    status: row.status,
    createdAt: row.created_at,
  };
}

function seedFallback(): Fundraiser[] {
  return (seedFundraisers as Array<Record<string, unknown>>).map((row) => ({
    id: String(row.id),
    title: String(row.title),
    description: String(row.description),
    category: String(row.category),
    targetAmount: Number(row.targetAmount),
    raisedAmount: Number(row.raisedAmount),
    image: String(row.image),
    imagePath: null,
    donorCount: 0,
    status: String(row.status || 'active'),
    createdAt: String(row.createdAt),
  }));
}

export async function getFundraisers() {
  const admin = getSupabaseAdmin();
  if (!admin) return seedFallback();

  const { data, error } = await admin
    .from('fundraisers')
    .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at')
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) throw error;
  const rows = (data || []) as FundraiserRow[];
  const donorCounts = await getDonorCounts(admin, rows.map((row) => row.id));
  return rows.map((row) => normalizeFundraiser(row, donorCounts.get(row.id) || 0));
}

export function getTopRaisedFundraisers(fundraisers: Fundraiser[], limit = 3) {
  return [...fundraisers]
    .sort((first, second) => second.raisedAmount - first.raisedAmount || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, limit);
}

export function getNewestFundraisers(fundraisers: Fundraiser[], limit = 6) {
  return [...fundraisers]
    .sort((first, second) => new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime())
    .slice(0, limit);
}

export async function getFundraiserById(id: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return seedFallback().find((fundraiser) => fundraiser.id === id) ?? null;

  const { data, error } = await admin
    .from('fundraisers')
    .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at')
    .eq('id', id)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;
  const donorCounts = await getDonorCounts(admin, [id]);
  return normalizeFundraiser(data as FundraiserRow, donorCounts.get(id) || 0);
}

export async function createFundraiser(input: {
  id: string;
  title: string;
  description: string;
  category: string;
  targetAmount: number;
  imageUrl: string;
  imagePath: string;
}) {
  const admin = getSupabaseAdmin();
  if (!admin) throw new Error('Supabase is not configured on the server.');

  const { data, error } = await admin
    .from('fundraisers')
    .insert({
      id: input.id,
      title: input.title,
      description: input.description,
      category: input.category,
      target_amount: input.targetAmount,
      raised_amount: 0,
      image_url: input.imageUrl,
      image_path: input.imagePath,
      status: 'pending',
    })
    .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at')
    .single();

  if (error) throw error;
  return normalizeFundraiser(data as FundraiserRow);
}
