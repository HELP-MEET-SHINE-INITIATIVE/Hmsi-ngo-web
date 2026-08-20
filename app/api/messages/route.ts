import { NextResponse } from 'next/server';
import { getSupabaseAdmin } from '../../../lib/supabaseAdmin';
import { getMessageViewer, getViewerPayloadFromUrl } from '../../../lib/messageAccess';

export const runtime = 'nodejs';

function jsonError(error: string, status = 400) {
  return NextResponse.json({ error }, { status });
}

async function loadThreads(admin: ReturnType<typeof getSupabaseAdmin>, viewer: NonNullable<Awaited<ReturnType<typeof getMessageViewer>>>) {
  if (!admin) return { messages: [], unreadCount: 0 };

  let notificationsQuery = admin
    .from('contact_message_notifications')
    .select('message_id,is_read,recipient_email')
    .eq('recipient_email', viewer.email);

  if (viewer.role === 'worker') notificationsQuery = notificationsQuery.eq('recipient_role', 'worker');

  const [messagesResult, notificationsResult] = await Promise.all([
    viewer.role === 'admin'
      ? admin.from('contact_messages').select('id,name,email,message,status,created_at').order('created_at', { ascending: false }).limit(200)
      : notificationsQuery.then(async (notifications) => {
          if (notifications.error) return { data: null, error: notifications.error };
          const ids = (notifications.data || []).map((item) => item.message_id);
          if (ids.length === 0) return { data: [], error: null };
          return admin.from('contact_messages').select('id,name,email,message,status,created_at').in('id', ids).order('created_at', { ascending: false });
        }),
    notificationsQuery,
  ]);

  if (messagesResult.error) throw new Error(messagesResult.error.message || 'Contact messages are unavailable. Run supabase/messaging_patch.sql.');
  if (notificationsResult.error && viewer.role === 'worker') throw new Error(notificationsResult.error.message || 'Message notifications are unavailable. Run supabase/messaging_patch.sql.');

  const messages = messagesResult.data || [];
  const messageIds = messages.map((message) => message.id);
  const repliesResult = messageIds.length > 0
    ? await admin.from('contact_message_replies').select('id,message_id,author_name,author_email,author_role,body,created_at').in('message_id', messageIds).order('created_at', { ascending: true })
    : { data: [], error: null };
  if (repliesResult.error) throw new Error(repliesResult.error.message || 'Message replies are unavailable. Run supabase/messaging_patch.sql.');

  const notificationRows = notificationsResult.data || [];
  const unreadCount = notificationRows.filter((notification) => !notification.is_read).length;
  const repliesByMessage = new Map<string, Array<any>>();
  for (const reply of repliesResult.data || []) {
    const current = repliesByMessage.get(reply.message_id) || [];
    current.push(reply);
    repliesByMessage.set(reply.message_id, current);
  }

  return {
    messages: messages.map((message) => ({
      ...message,
      is_read: viewer.role === 'admin'
        ? notificationRows.find((notification) => notification.message_id === message.id)?.is_read ?? false
        : notificationRows.find((notification) => notification.message_id === message.id)?.is_read ?? false,
      replies: repliesByMessage.get(message.id) || [],
    })),
    unreadCount,
  };
}

export async function GET(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Supabase is not configured on the server.', 503);

  const viewer = await getMessageViewer(request, admin, getViewerPayloadFromUrl(request));
  if (!viewer) return jsonError('Admin authentication or approved worker access is required.', 401);

  try {
    return NextResponse.json(await loadThreads(admin, viewer));
  } catch (error) {
    console.error('[Messages] Failed to load message threads:', error);
    return jsonError(error instanceof Error ? error.message : 'Messages are temporarily unavailable.', 503);
  }
}

export async function POST(request: Request) {
  const admin = getSupabaseAdmin();
  if (!admin) return jsonError('Supabase is not configured on the server.', 503);

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return jsonError('A valid JSON payload is required.');
  }

  const viewer = await getMessageViewer(request, admin, body);
  if (!viewer) return jsonError('Admin authentication or approved worker access is required.', 401);

  const action = typeof body.action === 'string' ? body.action : '';
  const messageId = typeof body.message_id === 'string' ? body.message_id : '';

  if (!messageId) return jsonError('A message id is required.');

  if (action === 'read') {
    const update = await admin.from('contact_message_notifications').update({ is_read: true, read_at: new Date().toISOString() }).eq('message_id', messageId).eq('recipient_email', viewer.email);
    if (update.error) return jsonError(update.error.message || 'The message could not be marked as read.', 503);
    return NextResponse.json({ ok: true });
  }

  if (action === 'reply') {
    const bodyText = typeof body.body === 'string' ? body.body.trim() : '';
    if (!bodyText || bodyText.length > 10000) return jsonError('Reply must contain between 1 and 10,000 characters.');

    const message = await admin.from('contact_messages').select('id').eq('id', messageId).maybeSingle();
    if (message.error || !message.data) return jsonError('Contact message not found.', 404);

    const insertedReply = await admin.from('contact_message_replies').insert({
      message_id: messageId,
      author_name: viewer.name,
      author_email: viewer.email || null,
      author_role: viewer.role,
      body: bodyText,
    }).select('id,message_id,author_name,author_email,author_role,body,created_at').single();
    if (insertedReply.error) return jsonError(insertedReply.error.message || 'The reply could not be saved. Run supabase/messaging_patch.sql.', 503);

    const recipients = new Set<string>();
    if (viewer.role === 'admin') {
      const activeWorkers = await admin.from('workers').select('email').eq('status', 'active');
      for (const worker of activeWorkers.data || []) recipients.add(worker.email.toLowerCase());
    } else if (process.env.HMSI_ADMIN_EMAIL) {
      recipients.add(process.env.HMSI_ADMIN_EMAIL.toLowerCase());
    }
    recipients.delete(viewer.email.toLowerCase());

    if (recipients.size > 0) {
      const notifications = await admin.from('contact_message_notifications').upsert(
        Array.from(recipients).map((recipientEmail) => ({
          message_id: messageId,
          recipient_email: recipientEmail,
          recipient_role: recipientEmail === process.env.HMSI_ADMIN_EMAIL?.toLowerCase() ? 'admin' : 'worker',
          is_read: false,
          read_at: null,
        })),
        { onConflict: 'message_id,recipient_email' },
      );
      if (notifications.error) console.error('[Messages] Reply saved but notifications could not be sent:', notifications.error);
    }

    return NextResponse.json({ ok: true, reply: insertedReply.data }, { status: 201 });
  }

  return jsonError('Unsupported message action.');
}
