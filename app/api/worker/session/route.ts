import { NextResponse } from 'next/server';
import { clearWorkerSession } from '../../../../lib/workerSession';

export const runtime = 'nodejs';

export async function DELETE() {
  return clearWorkerSession(NextResponse.json({ ok: true }));
}
