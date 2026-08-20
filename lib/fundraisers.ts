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

function normalizeFundraiser(row: FundraiserRow): Fundraiser {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    targetAmount: Number(row.target_amount),
    raisedAmount: Number(row.raised_amount),
    image: row.image_url,
    imagePath: row.image_path ?? null,
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
    .neq('status', 'archived')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data as FundraiserRow[]).map(normalizeFundraiser);
}

export async function getFundraiserById(id: string) {
  const admin = getSupabaseAdmin();
  if (!admin) return seedFallback().find((fundraiser) => fundraiser.id === id) ?? null;

  const { data, error } = await admin
    .from('fundraisers')
    .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data ? normalizeFundraiser(data as FundraiserRow) : null;
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
      status: 'active',
    })
    .select('id,title,description,category,target_amount,raised_amount,image_url,image_path,status,created_at')
    .single();

  if (error) throw error;
  return normalizeFundraiser(data as FundraiserRow);
}
