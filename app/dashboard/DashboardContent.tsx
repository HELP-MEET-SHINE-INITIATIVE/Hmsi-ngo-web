"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useAuth } from "../../lib/auth";
import { loadData } from "../../lib/data";
import Link from "next/link";
import Image from "next/image";
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
  LogOut
} from "lucide-react";

export default function DashboardContent() {
  const { user, logout, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    if (user) {
      setData(loadData());
      setIsLoading(false);
    }
  }, [user, authLoading, router]);

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
                className="pl-10 pr-4 py-2 rounded-full bg-[#f6f4ef] border-none focus:ring-2 focus:ring-[#1e5b49] outline-none w-64 text-sm"
              />
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <button className="p-2 rounded-full hover:bg-[#f6f4ef] text-[#66716a] relative">
              <Bell size={20} />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
            </button>
            <button className="p-2 rounded-full hover:bg-[#f6f4ef] text-[#66716a]">
              <MessageSquare size={20} />
            </button>
            <div className="h-8 w-px bg-[#d9d6ce] mx-2"></div>
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <p className="text-xs font-black uppercase tracking-wider">{user.name}</p>
                <p className="text-[10px] font-bold text-[#66716a] uppercase">{user.role}</p>
              </div>
              <div className="relative h-10 w-10 rounded-full overflow-hidden border-2 border-[#e1ad45]">
                <Image src={user.avatar} alt={user.name} fill className="object-cover" />
              </div>
              <button onClick={logout} className="p-2 rounded-full hover:bg-red-50 text-red-600" title="Logout">
                <LogOut size={20} />
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[280px_1fr_320px] gap-8">
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
              <button className="flex-1 text-left px-6 py-3 rounded-full bg-[#f6f4ef] text-[#66716a] text-sm hover:bg-[#e9f0e9] transition-colors">
                Share an update or progress photo...
              </button>
            </div>
            <div className="flex items-center justify-between mt-6 pt-4 border-t border-[#f6f4ef]">
              <div className="flex gap-4">
                <button className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                  <Plus size={16} className="text-[#e1ad45]" /> Photo/Video
                </button>
                <button className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                  <Calendar size={16} className="text-[#e1ad45]" /> Event
                </button>
              </div>
              <button className="px-6 py-2 rounded-full bg-[#17221e] text-white text-xs font-black uppercase tracking-widest">Post</button>
            </div>
          </div>

          {/* Activity Feed */}
          <div className="space-y-6">
            {userActivities.map((activity: any) => (
              <article key={activity.id} className="bg-white rounded-3xl border border-[#d9d6ce] shadow-sm overflow-hidden">
                <div className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="relative h-10 w-10 rounded-full overflow-hidden">
                        <Image src={activity.userId === user.id ? user.avatar : "/images/outreach-4.png"} alt={activity.userName} fill className="object-cover" />
                      </div>
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
                  <button className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                    <ThumbsUp size={16} /> Like
                  </button>
                  <button className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                    <MessageSquare size={16} /> Comment ({activity.comments.length})
                  </button>
                  <button className="flex items-center gap-2 text-xs font-bold text-[#66716a] hover:text-[#1e5b49]">
                    <Share2 size={16} /> Share
                  </button>
                </div>

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
            <button className="w-full mt-6 py-3 rounded-xl border border-[#d9d6ce] text-[10px] font-black uppercase tracking-widest hover:bg-[#f6f4ef] transition-colors">
              View All Tasks
            </button>
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
