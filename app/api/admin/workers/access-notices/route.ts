import { getAdminEmailFromCookie } from '../../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../../lib/supabaseAdmin';
import { createCredentialCode, createMemberNumber, hashCredentialCode } from '../../../../../lib/hmsiCredentials';
import { accessNoticeEmail, sendPortalEmail } from '../../../../../lib/portalEmail';
import { handleBulkWorkerAccessNotices } from '../../../../../lib/bulkWorkerAccessNotices.mjs';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  return handleBulkWorkerAccessNotices(request, {
    getAdminEmailFromCookie,
    getSupabaseAdmin,
    createCredentialCode,
    createMemberNumber,
    hashCredentialCode,
    accessNoticeEmail,
    sendPortalEmail,
    logError: console.error,
  });
}
