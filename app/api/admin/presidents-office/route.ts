import { NextResponse } from 'next/server';
import { getAdminEmailFromCookie } from '../../../../lib/adminSession';
import { getSupabaseAdmin } from '../../../../lib/supabaseAdmin';

export const runtime = 'nodejs';

type Person = { id: string; name: string; email: string; phone: string | null; location?: string | null; interest?: string | null; status?: string; account_status?: string; onboarding_status?: string | null; auth_user_id?: string | null; publisher_role?: string | null; reviewed_at?: string | null; created_at: string };

function key(role: string, id: string) { return `${role}:${id}`; }

export async function GET(request: Request) {
  const president = getAdminEmailFromCookie(request.headers.get('cookie'));
  if (!president) return NextResponse.json({ error: 'Administrator authentication required.' }, { status: 401 });

  const admin = getSupabaseAdmin();
  if (!admin) return NextResponse.json({ error: 'The President’s Office data service is temporarily unavailable.' }, { status: 503 });

  const [volunteers, workers, members, contacts, volunteerAssignments, workerAssignments, memberTasks, pendingVolunteerApplications, pendingMemberApplications] = await Promise.all([
    admin.from('volunteer_applications').select('id,name,email,phone,location,interest,status,account_status,auth_user_id,publisher_role,reviewed_at,created_at').eq('applicant_role', 'volunteer').eq('status', 'approved').eq('account_status', 'active').is('removal_requested_at', null).order('name').limit(500),
    admin.from('workers').select('id,name,email,phone,location,role,status,onboarding_status,auth_user_id,created_at').eq('status', 'active').is('removal_requested_at', null).order('name').limit(500),
    admin.from('hmsi_members').select('id,name,email,phone,location,status,auth_user_id,created_at').eq('status', 'active').is('removal_requested_at', null).order('name').limit(500),
    admin.from('approved_contact_directory').select('role,source_id,notification_status,last_notification_at,last_notification_status,approved_at,disabled_at').order('approved_at', { ascending: false }).limit(1500),
    admin.from('volunteer_assignments').select('id,assigned_volunteer_id,title,status,due_at,updated_at,completed_at').eq('is_deleted', false).order('updated_at', { ascending: false }).limit(1000),
    admin.from('work_assignments').select('id,assigned_worker_id,title,status,due_at,updated_at,submitted_at,completed_at').eq('is_deleted', false).order('updated_at', { ascending: false }).limit(1000),
    admin.from('hmsi_member_tasks').select('id,assigned_member_id,title,status,due_at,updated_at,completed_at').order('updated_at', { ascending: false }).limit(1000),
    admin.from('volunteer_applications').select('id').eq('status', 'pending').limit(500),
    admin.from('hmsi_member_applications').select('id').eq('status', 'pending').limit(500),
  ]);

  const failures = [volunteers, workers, members, contacts, volunteerAssignments, workerAssignments, memberTasks].find((result) => result.error);
  if (failures?.error) {
    console.error('[President Office] Data request failed:', failures.error.message);
    return NextResponse.json({ error: 'President’s Office records are not ready. Confirm the people-operations migration and required role tables.' }, { status: 503 });
  }

  const contactBySource = new Map((contacts.data || []).map((item) => [key(item.role, item.source_id), item]));
  const tasksByPerson = new Map<string, Array<{ id: string; title: string; status: string; due_at: string | null; updated_at: string }>>();
  const addTasks = (role: string, rows: Array<any>, ownerKey: string) => {
    for (const row of rows) {
      const personKey = key(role, row[ownerKey]);
      const list = tasksByPerson.get(personKey) || [];
      list.push({ id: row.id, title: row.title, status: row.status, due_at: row.due_at || null, updated_at: row.updated_at });
      tasksByPerson.set(personKey, list);
    }
  };
  addTasks('volunteer', volunteerAssignments.data || [], 'assigned_volunteer_id');
  addTasks('worker', workerAssignments.data || [], 'assigned_worker_id');
  addTasks('member', memberTasks.data || [], 'assigned_member_id');

  const makeDirectory = (role: 'volunteer' | 'worker' | 'member', rows: Person[]) => rows.map((person) => {
    const tasks = tasksByPerson.get(key(role, person.id)) || [];
    const contact = contactBySource.get(key(role, person.id));
    const reviewCount = tasks.filter((task) => task.status === 'submitted').length;
    return {
      id: person.id,
      name: person.name,
      email: person.email,
      phone: person.phone,
      location: person.location || null,
      role,
      position: role === 'volunteer' ? person.publisher_role || person.interest || 'Community volunteer' : role === 'worker' ? person.onboarding_status === 'completed' ? 'Active field worker' : 'Onboarding in progress' : 'Active HMSI member',
      portal_ready: role === 'worker' ? person.onboarding_status === 'completed' : Boolean(person.auth_user_id),
      notification_status: contact?.notification_status || 'unverified',
      last_notification_status: contact?.last_notification_status || null,
      last_notification_at: contact?.last_notification_at || null,
      total_tasks: tasks.length,
      active_tasks: tasks.filter((task) => ['assigned', 'in_progress', 'revisions_requested'].includes(task.status)).length,
      awaiting_review: reviewCount,
      completed_tasks: tasks.filter((task) => task.status === 'completed').length,
      tasks,
    };
  });

  const directory = [
    ...makeDirectory('volunteer', (volunteers.data || []) as Person[]),
    ...makeDirectory('worker', (workers.data || []) as Person[]),
    ...makeDirectory('member', (members.data || []) as Person[]),
  ];
  const reviewQueue = directory.flatMap((person) => person.tasks.filter((task) => task.status === 'submitted').map((task) => ({ ...task, person_id: person.id, person_name: person.name, role: person.role })));
  const notificationReady = directory.filter((person) => person.notification_status === 'ready').length;

  return NextResponse.json({
    president: { email: president },
    summary: {
      approved_volunteers: volunteers.data?.length || 0,
      active_workers: workers.data?.length || 0,
      active_members: members.data?.length || 0,
      notification_ready: notificationReady,
      notification_attention: directory.length - notificationReady,
      awaiting_admin_review: reviewQueue.length,
      pending_applications: (pendingVolunteerApplications.data?.length || 0) + (pendingMemberApplications.data?.length || 0),
    },
    directory,
    reviewQueue,
  }, { headers: { 'Cache-Control': 'no-store' } });
}
