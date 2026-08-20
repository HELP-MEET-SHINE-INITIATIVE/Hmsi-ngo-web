"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "../../lib/auth";
import { loadData, saveData } from "../../lib/data";
import Link from "next/link";
import Image from "next/image";
import MessageInbox from '../../components/MessageInbox';
import { 
  LayoutDashboard, 
  Briefcase, 
  Users, 
  MessageSquare, 
  Bell, 
  Search, 
  Plus, 
  MoreHorizontal, 
  ThumbsUp, 
  Share2,
  Calendar,
  CheckCircle2,
  Clock,
  LogOut,
  X
} from "lucide-react";

export default function DashboardContent() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activePanel, setActivePanel] = useState<'notifications' | 'messages' | null>(null);
  const [selectedProfile, setSelectedProfile] = useState<any>(null);
  const [composerOpen, setComposerOpen] = useState(false);
  const [postDraft, setPostDraft] = useState('');
  const [commentDraft, setCommentDraft] = useState<Record<string, string>>({});
  const [likedActivities, setLikedActivities] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [mediaFileName, setMediaFileName] = useState('');
  const [notice, setNotice] = useState('');
  const [messageUnreadCount, setMessageUnreadCount] = useState(0);
  const mediaInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    if (user) {
      setData(loadData());
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (!user || user.role !== 'worker') return;
    fetch(`/api/messages?email=${encodeURIComponent(user.email)}&role=worker`, { cache: 'no-store' })
      .then((response) => response.json())
      .then((result) => setMessageUnreadCount(Number(result.unreadCount || 0)))
      .catch(() => setMessageUnreadCount(0));
  }, [user]);

  if (authLoading || isLoading || !user) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e5b49]"></div>
      </div>
    );
  }

  const userActivities = data.activities.sort((a: any, b: any) => 
    new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

  const userProjects = data.projects.filter((p: any) =>
    p.lead === user.name || p.volunteers.includes(user.id)
  );

  const upcomingEvents = [
    { id: 'event-youth-skills', title: 'Youth Skills Workshop', date: '2026-08-26T10:00:00Z', location: 'Lagos, Nigeria', description: 'Mentoring and practical skills for young people in the community.' },
    { id: 'event-clean-water', title: 'Lagos Clean Water Mobilization', date: '2026-09-03T08:00:00Z', location: 'Makoko, Lagos', description: 'Field support and community outreach for the clean-water project.' },
  ];

  const openProfile = (profileId: string, profileName: string) => {
    const profile = data.users.find((candidate: any) => candidate.id === profileId) || { id: profileId, name: profileName, role: 'volunteer', email: 'Registration details pending', bio: 'HMSI community volunteer.' };
    const latestRegistration = data.activities.find((activity: any) => activity.userId === profileId);
    setSelectedProfile({ ...profile, latestRegistration });
  };

  const handleCreatePost = (event: React.FormEvent) => {
    event.preventDefault();
    const content = postDraft.trim();
    if (!content) return;
    const nextData = {
      ...data,
      activities: [{ id: `post-${Date.now()}`, userId: user.id, userName: user.name, type: 'update', content, timestamp: new Date().toISOString(), comments: [], likes: 0 }, ...data.activities],
    };
    saveData(nextData);
    setData(nextData);
    setPostDraft('');
    setMediaFileName('');
    setComposerOpen(false);
    setNotice('Your update was posted to the community feed.');
  };

  const handleLike = (activityId: string) => {
    const hasLiked = likedActivities.includes(activityId);
    const nextData = { ...data, activities: data.activities.map((activity: any) => activity.id === activityId ? { ...activity, likes: Math.max(0, (activity.likes || 0) + (hasLiked ? -1 : 1)) } : activity) };
    saveData(nextData);
    setData(nextData);
    setLikedActivities(hasLiked ? likedActivities.filter((id) => id !== activityId) : [...likedActivities, activityId]);
  };

  const handleComment = (event: React.FormEvent, activityId: string) => {
    event.preventDefault();
    const text = (commentDraft[activityId] || '').trim();
    if (!text) return;
    const nextData = { ...data, activities: data.activities.map((activity: any) => activity.id === activityId ? { ...activity, comments: [...(activity.comments || []), { id: `comment-${Date.now()}`, userName: user.name, text }] } : activity) };
    saveData(nextData);
    setData(nextData);
    setCommentDraft({ ...commentDraft, [activityId]: '' });
  };

  const handleShare = async (activity: any) => {
    const shareText = `${activity.userName}: ${activity.content}`;
    try {
      if (navigator.share) await navigator.share({ title: 'HMSI community update', text: shareText, url: window.location.href });
      else await navigator.clipboard.writeText(shareText);
      setNotice('Update shared successfully.');
    } catch {
      setNotice('Sharing was cancelled.');
    }
  };

  const handleSearch = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter' && searchQuery.trim()) router.push(`/projects?search=${encodeURIComponent(searchQuery.trim())}`);
  };

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      {/* Top Navigation */}
      <header className="sticky top-0 z-40 bg-white border-b border-[#d9d6ce] px-6 py-3">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-8">
            <Link href="/" className="flex h-10 w-10 items-center justify-center rounded-full bg-[#e1ad45] text-lg font-black">
              H
            </Link>
            <div className="hidden md:flex relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-[#66716a]" size={18} />
              <input 
                type="text" 
                                placeholder="Search projects, people..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                onKeyDown={handleSearch}
                className="pl-10 pr-4 py-2 rounded-full bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none w-64 text-sm"

              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button onClick={() => setActivePanel('notifications')} className="p-2 rounded-full hover:bg-[#f6f4ef] text-[#66716a] relative" aria-label="Open notifications">
              <Bell size={20} />
              {user.role === 'worker' && messageUnreadCount > 0 && <span className="absolute -right-1 -top-1 min-w-4 rounded-full bg-red-500 px-1 text-center text-[9px] font-black leading-4 text-white">{messageUnreadCount}</span>}
            </button>
            <button onClick={() => user.role === 'worker' ? setActivePanel('messages') : router.push('/volunteer-room')} className="p-2 rounded-full hover:bg-[#f6f4ef] text-[#66716a]" aria-label={user.role === 'worker' ? 'Open messages' : 'Open volunteer room'}>
              <MessageSquare size={20} />
            </button>
            <div className="h-8 w-px bg-[#d9d6ce] mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black uppercase tracking-wider">{user.name}</p>
                <p className="text-[10px] font-bold text-[#66716a] uppercase">{user.role}</p>
              </div>
              <button onClick={() => openProfile(user.id, user.name)} className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-[#e1ad45]" aria-label={`Open ${user.name} profile`}>
                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
              </button>
              <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 text-red-600" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      {activePanel && <div className="fixed inset-0 z-50 flex items-start justify-end bg-[#17221e]/30 p-4 pt-20" onClick={() => setActivePanel(null)}><section onClick={(event) => event.stopPropagation()} className={`w-full rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-2xl ${activePanel === 'messages' ? 'max-w-4xl' : 'max-w-sm'}`}><div className="flex items-center justify-between"><h2 className="text-lg font-black">{activePanel === 'notifications' ? 'Notifications' : 'Messages'}</h2><button onClick={() => setActivePanel(null)} className="rounded-full p-2 text-[#66716a] hover:bg-[#f6f4ef]" aria-label="Close panel"><X size={18} /></button></div>{activePanel === 'notifications' ? <div className="mt-5 space-y-3">{user.role === 'worker' && messageUnreadCount > 0 ? <button onClick={() => setActivePanel('messages')} className="w-full rounded-2xl border border-[#e1ad45]/40 bg-[#fff8e8] p-4 text-left text-sm font-bold text-[#7a5b16] hover:bg-[#fff2cf]">You have {messageUnreadCount} unread contact message{messageUnreadCount === 1 ? '' : 's'}. Tap to read and reply.</button> : <button onClick={() => { setActivePanel(null); setNotice('You are up to date with the HMSI community feed.'); }} className="w-full rounded-2xl bg-[#f6f4ef] p-4 text-left text-sm hover:bg-[#e9f0e9]">You are up to date with the HMSI community feed.</button>}<Link href="/opportunities" onClick={() => setActivePanel(null)} className="block rounded-2xl bg-[#f6f4ef] p-4 text-sm hover:bg-[#e9f0e9]">View volunteer opportunities</Link></div> : user.role === 'worker' ? <MessageInbox viewer={{ email: user.email, role: 'worker' }} compact onUnreadChange={setMessageUnreadCount} /> : <p className="mt-5 text-sm text-[#66716a]">Messages are available to approved workers and administrators.</p>}</section></div>}

      {selectedProfile && <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#17221e]/40 p-4" onClick={() => setSelectedProfile(null)}><section onClick={(event) => event.stopPropagation()} className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-[#d9d6ce] bg-white p-6 shadow-2xl"><div className="flex items-start justify-between"><div className="flex items-center gap-4"><div className="relative h-16 w-16 overflow-hidden rounded-full border-2 border-[#e1ad45]"><Image src={selectedProfile.avatar || '/images/outreach-4.png'} alt={selectedProfile.name} fill className="object-cover" /></div><div><h2 className="text-xl font-black">{selectedProfile.name}</h2><p className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">{selectedProfile.role}</p></div></div><button onClick={() => setSelectedProfile(null)} className="rounded-full p-2 text-[#66716a] hover:bg-[#f6f4ef]" aria-label="Close profile"><X size={18} /></button></div><div className="mt-6 rounded-2xl bg-[#f6f4ef] p-4"><h3 className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Registration details</h3><dl className="mt-3 space-y-2 text-sm"><div className="flex justify-between gap-4"><dt className="font-bold text-[#66716a]">Email</dt><dd className="text-right">{selectedProfile.email}</dd></div><div className="flex justify-between gap-4"><dt className="font-bold text-[#66716a]">Role</dt><dd className="capitalize">{selectedProfile.role}</dd></div><div><dt className="font-bold text-[#66716a]">About</dt><dd className="mt-1">{selectedProfile.bio}</dd></div>{selectedProfile.latestRegistration && <div><dt className="font-bold text-[#66716a]">Latest registration/update</dt><dd className="mt-1">{new Date(selectedProfile.latestRegistration.timestamp).toLocaleDateString()} — {selectedProfile.latestRegistration.content}</dd></div>}</dl></div><div className="mt-6"><h3 className="text-xs font-black uppercase tracking-widest text-[#b56b3b]">Upcoming events</h3><div className="mt-3 space-y-3">{upcomingEvents.map((event) => <button key={event.id} onClick={() => setNotice(`${event.title} selected — ${event.location}.`)} className="w-full rounded-2xl border border-[#d9d6ce] p-4 text-left hover:border-[#1e5b49] hover:bg-[#e9f0e9]"><div className="flex items-center justify-between gap-3"><span className="font-black">{event.title}</span><Calendar size={16} className="shrink-0 text-[#1e5b49]" /></div><p className="mt-1 text-xs font-bold text-[#b56b3b]">{new Date(event.date).toLocaleString()} · {event.location}</p><p className="mt-2 text-sm text-[#66716a]">{event.description}</p></button>)}</div></div><Link href="/opportunities" onClick={() => setSelectedProfile(null)} className="mt-6 block rounded-full bg-[#1e5b49] px-4 py-3 text-center text-xs font-black uppercase tracking-widest text-white">Volunteer opportunities</Link></section></div>}

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-8">
        <div className="lg:col-span-3 rounded-3xl border border-[#d9d6ce] bg-white p-5"><p className="text-xs font-black uppercase tracking-[0.18em] text-[#b56b3b]">{user.role === 'worker' ? 'Worker coordination workspace' : 'Volunteer community workspace'}</p><h2 className="mt-2 text-2xl font-black">{user.role === 'worker' ? 'Assignments, worker posts, and field coordination' : 'Volunteer opportunities, community posts, and collaboration'}</h2><p className="mt-2 text-sm text-[#66716a]">Use the message icon to open the {user.role === 'worker' ? 'worker room' : 'volunteer room'}, or choose an opportunity to apply.</p></div>
        {notice && <div className="lg:col-span-3 rounded-2xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-700" role="status">{notice}</div>}
        {/* Left Sidebar */}
        <aside className="hidden lg:block space-y-6">
          <nav className="bg-white rounded-3xl p-4 border border-[#d9d6ce] shadow-sm">
            <ul className="space-y-1">
              <li>
                <Link href="/dashboard" className="flex items-center gap-3 px-4 py-3 rounded-2xl bg-[#e9f0e9] text-[#1e5b49] font-black text-sm">
                  <LayoutDashboard size={20} /> Dashboard
                </Link>
              </li>
              <li>
                <Link href="/projects" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f6f4ef] text-[#66716a] font-bold text-sm transition-colors">
                  <Briefcase size={20} /> Projects
                </Link>
              </li>
              <li>
                <Link href="/fundraise" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f6f4ef] text-[#66716a] font-bold text-sm transition-colors">
                  <Users size={20} /> Fundraising
                </Link>
                <Link href="/opportunities" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f6f4ef] text-[#66716a] font-bold text-sm transition-colors">
                  <Users size={20} /> Opportunities
                </Link>
                <Link href="/volunteer-room" className="flex items-center gap-3 px-4 py-3 rounded-2xl hover:bg-[#f6f4ef] text-[#66716a] font-bold text-sm transition-colors">
                  <MessageSquare size={20} /> Volunteer room
                </Link>
                {user.role === 'worker' && <Link href="/worker-room" className="flex items-center gap-3 rounded-2xl px-4 py-3 text-sm font-bold text-[#66716a] transition-colors hover:bg-[#f6f4ef]"><MessageSquare size={20} /> Worker room</Link>}
              </li>
            </ul>
          </nav>

          <div className="bg-white rounded-3xl p-6 border border-[#d9d6ce] shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#b56b3b] mb-4">My Projects</h3>
            <div className="space-y-4">
              {userProjects.length > 0 ? userProjects.map((p: any) => (
                <Link key={p.id} href={`/projects?id=${p.id}`} className="block group">
                  <p className="text-sm font-black group-hover:text-[#1e5b49] transition-colors">{p.title}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`w-2 h-2 rounded-full ${p.status === 'ongoing' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                    <span className="text-[10px] font-bold uppercase text-[#66716a]">{p.status}</span>
                  </div>
                </Link>
              )) : (
                <p className="text-xs text-[#66716a] italic">No active projects yet.</p>
              )}
            </div>
          </div>
        </aside>

        {/* Center Feed */}
        <section className="space-y-6">
          {/* Create Post */}
          <div className="bg-white rounded-3xl p-6 border border-[#d9d6ce] shadow-sm">
            <div className="flex gap-4">
              <div className="relative h-12 w-12 rounded-full overflow-hidden flex-shrink-0">
                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
              </div>
              <button onClick={() => setComposerOpen(true)} className="flex-1 text-left px-6 py-3 rounded-full bg-[#f6f4ef] text-[#66716a] text-sm hover:bg-[#e9f0e9] transition-colors">
                Share an update or progress photo...
              </button>
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#f6f4ef]">
              <div className="flex gap-4">
                <button type="button" onClick={() => { setComposerOpen(true); mediaInputRef.current?.click(); }} className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                  <Plus size={16} className="text-[#e1ad45]" /> Photo/Video
                </button>
                <button type="button" onClick={() => { setPostDraft('Event: '); setComposerOpen(true); }} className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                  <Calendar size={16} className="text-[#e1ad45]" /> Event
                </button>
              </div>
              <button type="button" onClick={() => setComposerOpen(true)} className="px-6 py-2 rounded-full bg-[#17221e] text-white text-xs font-black uppercase tracking-widest">Post</button>
            </div>
            <input ref={mediaInputRef} type="file" accept="image/*,video/*" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setMediaFileName(file.name); setComposerOpen(true); } }} />
            {composerOpen && <form onSubmit={handleCreatePost} className="mt-5 rounded-2xl border border-[#d9d6ce] bg-[#f6f4ef]/60 p-4"><textarea autoFocus required value={postDraft} onChange={(event) => setPostDraft(event.target.value)} placeholder="Write an update for the HMSI community..." rows={4} className="w-full resize-none rounded-2xl border border-[#d9d6ce] bg-white p-4 text-sm outline-none focus:border-[#1e5b49]" /><div className="mt-3 flex items-center justify-between gap-3"><span className="truncate text-xs text-[#66716a]">{mediaFileName || 'Text update'}</span><div className="flex gap-2"><button type="button" onClick={() => { setComposerOpen(false); setPostDraft(''); setMediaFileName(''); }} className="rounded-full border border-[#d9d6ce] px-4 py-2 text-xs font-black uppercase tracking-widest text-[#66716a]">Cancel</button><button type="submit" className="rounded-full bg-[#1e5b49] px-4 py-2 text-xs font-black uppercase tracking-widest text-white">Publish</button></div></div></form>}
          </div>

          {/* Activity Feed */}
          <div className="space-y-6">
            {userActivities.map((activity: any) => (
              <article key={activity.id} className="bg-white rounded-3xl border border-[#d9d6ce] shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <button onClick={() => openProfile(activity.userId, activity.userName)} className="relative h-10 w-10 rounded-full overflow-hidden" aria-label={`Open ${activity.userName} profile`}>
                        <Image src={activity.userId === user.id ? user.avatar : "/images/outreach-4.png"} alt={activity.userName} fill className="object-cover" />
                      </button>
                      <div>
                        <p className="text-sm font-black">{activity.userName}</p>
                        <p className="text-[10px] font-bold text-[#66716a] uppercase flex items-center gap-1">
                          <Clock size={10} /> {new Date(activity.timestamp).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    <button className="text-[#66716a] hover:text-[#17221e]">
                      <MoreHorizontal size={20} />
                    </button>
                  </div>
                  <p className="text-sm leading-relaxed text-[#17221e]">{activity.content}</p>
                </div>
                
                <div className="px-6 py-3 bg-[#f6f4ef]/30 border-t border-[#f6f4ef] flex items-center gap-6">
                  <button onClick={() => handleLike(activity.id)} className={`flex items-center gap-2 text-xs font-bold ${likedActivities.includes(activity.id) ? 'text-[#1e5b49]' : 'text-[#66716a]'} hover:text-[#1e5b49]`}>
                    <ThumbsUp size={16} /> Like ({activity.likes || 0})
                  </button>
                  <button onClick={() => setCommentDraft({ ...commentDraft, [activity.id]: commentDraft[activity.id] ?? '' })} className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                    <MessageSquare size={16} /> Comment ({activity.comments.length})
                  </button>
                  <button onClick={() => handleShare(activity)} className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                    <Share2 size={16} /> Share
                  </button>
                </div>

                {commentDraft[activity.id] !== undefined && <form onSubmit={(event) => handleComment(event, activity.id)} className="flex gap-2 border-t border-[#f6f4ef] bg-white px-6 py-3"><input autoFocus value={commentDraft[activity.id]} onChange={(event) => setCommentDraft({ ...commentDraft, [activity.id]: event.target.value })} placeholder="Write a comment..." className="min-w-0 flex-1 rounded-full bg-[#f6f4ef] px-4 py-2 text-xs outline-none" /><button type="submit" className="rounded-full bg-[#17221e] px-4 py-2 text-[10px] font-black uppercase tracking-widest text-white">Send</button></form>}

                {activity.comments.length > 0 && (
                  <div className="px-6 py-4 bg-[#f6f4ef]/20 space-y-4">
                    {activity.comments.map((comment: any) => (
                      <div key={comment.id} className="flex gap-3">
                        <div className="relative h-8 w-8 rounded-full overflow-hidden flex-shrink-0">
                          <Image src="/images/outreach-4.png" alt={comment.userName} fill className="object-cover" />
                        </div>
                        <div className="bg-[#f6f4ef] rounded-2xl px-4 py-2 flex-1">
                          <p className="text-xs font-black">{comment.userName}</p>
                          <p className="text-xs text-[#17221e] mt-1">{comment.text}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </article>
            ))}
          </div>
        </section>

        {/* Right Sidebar */}
        <aside className="hidden xl:block space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-[#d9d6ce] shadow-sm">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#b56b3b] mb-4">Assigned Tasks</h3>
            <div className="space-y-4">
              {data.projects.flatMap((p: any) => p.tasks.filter((t: any) => t.assignedTo === user.id)).length > 0 ? (
                data.projects.flatMap((p: any) => p.tasks.filter((t: any) => t.assignedTo === user.id)).map((t: any) => (
                  <div key={t.id} className="flex items-start gap-3 p-3 rounded-2xl bg-[#f6f4ef]/50 border border-transparent hover:border-[#d9d6ce] transition-all">
                    <div className={`mt-0.5 ${t.status === 'completed' ? 'text-green-500' : 'text-[#e1ad45]'}`}>
                      <CheckCircle2 size={18} />
                    </div>
                    <div>
                      <p className={`text-xs font-bold ${t.status === 'completed' ? 'line-through text-[#66716a]' : ''}`}>{t.title}</p>
                      <p className="text-[10px] text-[#66716a] mt-1 uppercase font-black">Due: Soon</p>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-xs text-[#66716a] italic">No tasks assigned yet.</p>
              )}
            </div>
            <Link href="/projects" className="block w-full mt-6 py-3 text-center rounded-xl border border-[#d9d6ce] text-[10px] font-black uppercase tracking-widest hover:bg-[#f6f4ef] transition-colors">
              View All Tasks
            </Link>
          </div>

          <div className="bg-[#1e5b49] rounded-3xl p-6 text-white shadow-lg">
            <h3 className="text-xs font-black uppercase tracking-widest text-[#e1ad45] mb-4">Impact Goal</h3>
            <p className="text-2xl font-black tracking-tight">₦1.2M / ₦5M</p>
            <p className="text-xs text-white/70 mt-2">Raised for Makoko School Project</p>
            <div className="mt-4 h-2 w-full bg-white/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#e1ad45] rounded-full" style={{ width: '24%' }}></div>
            </div>
            <Link href="/fundraise/f2" className="block text-center mt-6 py-3 rounded-xl bg-white text-[#1e5b49] text-[10px] font-black uppercase tracking-widest hover:bg-[#e1ad45] hover:text-[#17221e] transition-all">
              View Fundraiser
            </Link>
          </div>
        </aside>
      </main>
    </div>
  );
}
