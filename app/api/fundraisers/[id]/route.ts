import { NextResponse } from 'next/server';
import { getFundraiserById } from '../../../../lib/fundraisers';

export const runtime = 'nodejs';

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const fundraiser = await getFundraiserById(id);

    if (!fundraiser) {
      return NextResponse.json({ error: 'Fundraiser not found.' }, { status: 404 });
    }

    return NextResponse.json({ fundraiser });
  } catch (error) {
    console.error('[Fundraisers] Failed to load fundraiser:', error);
    return NextResponse.json({ error: 'Fundraiser is temporarily unavailable.' }, { status: 503 });
  }
}
