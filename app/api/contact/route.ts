import { NextResponse } from 'next/server';
import { getSupabaseAdmin, hasSupabaseConfig } from '../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  if (!hasSupabaseConfig()) {
    return NextResponse.json(
      { error: 'Contact submissions are not configured yet. Please email support@hmsi.org.ng for support or contact@hmsi.org.ng for general enquiries.' },
      { status: 503 },
    );
  }

  try {
    const body = await request.json();
    const name = String(body.name || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const message = String(body.message || '').trim();

    if (!name || name.length > 160 || !email || !message || message.length > 10000) {
      return NextResponse.json({ error: 'Please provide a valid name, email, and message.' }, { status: 400 });
    }

    const admin = getSupabaseAdmin();
    if (!admin) throw new Error('Supabase is not configured.');

    const { data: insertedMessage, error } = await admin.from('contact_messages').insert({
      name,
      email,
      message,
      status: 'new',
    }).select('id').single();

    if (error || !insertedMessage) throw error || new Error('Contact message was not created.');

    const recipients = new Set<string>();
    if (process.env.HMSI_ADMIN_EMAIL) recipients.add(process.env.HMSI_ADMIN_EMAIL.trim().toLowerCase());
    const activeWorkers = await admin.from('workers').select('email').eq('status', 'active');
    if (activeWorkers.error) {
      console.warn('[Contact] Message saved, but active workers could not be loaded for notifications:', activeWorkers.error);
    } else {
      for (const worker of activeWorkers.data || []) recipients.add(worker.email.toLowerCase());
    }

    if (recipients.size > 0) {
      const notifications = await admin.from('contact_message_notifications').upsert(
        Array.from(recipients).map((recipientEmail) => ({
          message_id: insertedMessage.id,
          recipient_email: recipientEmail,
          recipient_role: recipientEmail === process.env.HMSI_ADMIN_EMAIL?.trim().toLowerCase() ? 'admin' : 'worker',
          is_read: false,
          read_at: null,
        })),
        { onConflict: 'message_id,recipient_email' },
      );
      if (notifications.error) console.warn('[Contact] Message saved, but dashboard notifications could not be created. Run supabase/messaging_patch.sql:', notifications.error);
    }

    return NextResponse.json({ ok: true, messageId: insertedMessage.id }, { status: 201 });
  } catch (error) {
    console.error('[Contact] Failed to save contact message:', error);
    return NextResponse.json({ error: 'We could not send your message. Please try again.' }, { status: 500 });
  }
}
