"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { useAuth } from "../../lib/auth";
import { loadData, saveData } from "../../lib/data";
import Link from "next/link";
import Image from "next/image";
import { 
  Briefcase, 
  Users, 
  MessageSquare, 
  Plus, 
  CheckCircle2, 
  Clock,
  ChevronLeft,
  Filter,
  MoreVertical,
  Send
} from "lucide-react";

function ProjectsInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const projectId = searchParams.get("id");
  
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<any>(null);
  const [comment, setComment] = useState("");

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/login");
    }
    if (user) {
      const currentData = loadData();
      setData(currentData);
      if (projectId) {
        setSelectedProject(currentData.projects.find((p: any) => p.id === projectId));
      }
      setIsLoading(false);
    }
  }, [user, authLoading, router, projectId]);

  const handleJoinProject = (id: string) => {
    if (!user) return;
    const newData = { ...data };
    const project = newData.projects.find((p: any) => p.id === id);
    if (project && !project.volunteers.includes(user.id)) {
      project.volunteers.push(user.id);
      setData(newData);
      saveData(newData);
      if (selectedProject?.id === id) setSelectedProject({ ...project });
    }
  };

  if (authLoading || isLoading || !user || !data) {
    return (
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e5b49]"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#f6f4ef] text-[#17221e]">
      <header className="bg-white border-b border-[#d9d6ce] px-6 py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="p-2 rounded-full hover:bg-[#f6f4ef] text-[#66716a]">
              <ChevronLeft size={24} />
            </Link>
            <h1 className="text-xl font-black uppercase tracking-tight">Collaboration Space</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative h-8 w-8 rounded-full overflow-hidden border border-[#e1ad45]">
              <Image src={user.avatar} alt={user.name} fill className="object-cover" />
            </div>
            <span className="text-xs font-black uppercase tracking-wider hidden sm:block">{user.name}</span>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-8">
        {/* Project List */}
        <aside className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-black uppercase tracking-widest text-[#b56b3b]">Active Initiatives</h2>
            <button className="p-2 rounded-lg bg-[#1e5b49] text-white hover:bg-[#17221e] transition-colors">
              <Plus size={18} />
            </button>
          </div>
          
          <div className="space-y-4">
            {data.projects.map((project: any) => (
              <button 
                key={project.id}
                onClick={() => {
                  setSelectedProject(project);
                  router.push(`/projects?id=${project.id}`);
                }}
                className={`w-full text-left p-5 rounded-3xl border transition-all ${
                  selectedProject?.id === project.id 
                    ? "bg-white border-[#1e5b49] shadow-md" 
                    : "bg-white/50 border-[#d9d6ce] hover:border-[#1e5b49]/50"
                }`}
              >
                <div className="flex justify-between items-start mb-3">
                  <span className={`px-2 py-1 rounded-md text-[9px] font-black uppercase tracking-wider ${
                    project.status === 'ongoing' ? 'bg-green-100 text-green-700' : 'bg-amber-100 text-amber-700'
                  }`}>
                    {project.status}
                  </span>
                  <MoreVertical size={16} className="text-[#66716a]" />
                </div>
                <h3 className="font-black text-sm mb-2">{project.title}</h3>
                <p className="text-xs text-[#66716a] line-clamp-2 mb-4">{project.description}</p>
                <div className="flex items-center justify-between pt-4 border-t border-[#f6f4ef]">
                  <div className="flex -space-x-2">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="w-6 h-6 rounded-full border-2 border-white bg-slate-200 overflow-hidden relative">
                        <Image src={`/images/outreach-${i+3}.png`} alt="User" fill className="object-cover" />
                      </div>
                    ))}
                    {project.volunteers.length > 3 && (
                      <div className="w-6 h-6 rounded-full border-2 border-white bg-[#f6f4ef] flex items-center justify-center text-[8px] font-black text-[#66716a]">
                        +{project.volunteers.length - 3}
                      </div>
                    )}
                  </div>
                  <span className="text-[10px] font-bold text-[#66716a] uppercase flex items-center gap-1">
                    <MessageSquare size={12} /> 4
                  </span>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Project Detail */}
        <section>
          {selectedProject ? (
            <div className="bg-white rounded-[40px] border border-[#d9d6ce] shadow-sm overflow-hidden min-h-[700px] flex flex-col">
              <div className="p-8 md:p-12 border-b border-[#f6f4ef]">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                  <div>
                    <h2 className="text-3xl font-black tracking-tight mb-2">{selectedProject.title}</h2>
                    <p className="text-[#66716a] max-w-2xl">{selectedProject.description}</p>
                  </div>
                  {!selectedProject.volunteers.includes(user.id) && selectedProject.lead !== user.name && (
                    <button 
                      onClick={() => handleJoinProject(selectedProject.id)}
                      className="px-8 py-3 rounded-full bg-[#1e5b49] text-white font-black uppercase tracking-widest text-xs hover:bg-[#17221e] transition-all"
                    >
                      Join Project
                    </button>
                  )}
                </div>
                
                <div className="grid grid-cols-2 md:grid-cols-4 gap-8 mt-10">
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b] mb-1">Lead</p>
                    <p className="text-sm font-bold">{selectedProject.lead}</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b] mb-1">Volunteers</p>
                    <p className="text-sm font-bold">{selectedProject.volunteers.length} Active</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b] mb-1">Tasks</p>
                    <p className="text-sm font-bold">{selectedProject.tasks.length} Total</p>
                  </div>
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest text-[#b56b3b] mb-1">Progress</p>
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 w-20 bg-[#f6f4ef] rounded-full overflow-hidden">
                        <div className="h-full bg-[#1e5b49]" style={{ width: '45%' }}></div>
                      </div>
                      <span className="text-xs font-bold">45%</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_350px]">
                {/* Tasks Board */}
                <div className="p-8 md:p-12 border-r border-[#f6f4ef]">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#17221e] mb-6 flex items-center gap-2">
                    <Briefcase size={16} className="text-[#e1ad45]" /> Task Board
                  </h3>
                  <div className="space-y-4">
                    {selectedProject.tasks.length > 0 ? selectedProject.tasks.map((task: any) => (
                      <div key={task.id} className="group flex items-center justify-between p-5 rounded-3xl bg-[#f6f4ef]/50 border border-transparent hover:border-[#d9d6ce] transition-all">
                        <div className="flex items-center gap-4">
                          <button className={`p-1 rounded-md ${task.status === 'completed' ? 'text-green-500' : 'text-[#d9d6ce] group-hover:text-[#1e5b49]'}`}>
                            <CheckCircle2 size={24} />
                          </button>
                          <div>
                            <p className={`text-sm font-black ${task.status === 'completed' ? 'line-through text-[#66716a]' : ''}`}>{task.title}</p>
                            <p className="text-[10px] font-bold text-[#66716a] uppercase mt-1">Assigned to: {task.assignedTo === user.id ? "You" : "Team Member"}</p>
                          </div>
                        </div>
                        <span className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded ${
                          task.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                        }`}>
                          {task.status}
                        </span>
                      </div>
                    )) : (
                      <div className="text-center py-12 border-2 border-dashed border-[#d9d6ce] rounded-[32px]">
                        <p className="text-sm text-[#66716a] italic">No tasks created for this project yet.</p>
                        <button className="mt-4 text-xs font-black uppercase tracking-widest text-[#1e5b49] hover:underline">Add first task</button>
                      </div>
                    )}
                  </div>
                </div>

                {/* Discussion */}
                <div className="p-8 flex flex-col bg-[#f6f4ef]/30">
                  <h3 className="text-xs font-black uppercase tracking-widest text-[#17221e] mb-6 flex items-center gap-2">
                    <MessageSquare size={16} className="text-[#e1ad45]" /> Discussion
                  </h3>
                  <div className="flex-1 space-y-6 overflow-y-auto mb-6 pr-2">
                    <div className="flex gap-3">
                      <div className="w-8 h-8 rounded-full bg-slate-200 overflow-hidden relative flex-shrink-0">
                        <Image src="/images/outreach-7.png" alt="User" fill className="object-cover" />
                      </div>
                      <div className="bg-white rounded-2xl p-4 shadow-sm border border-[#d9d6ce]/50">
                        <p className="text-[10px] font-black uppercase text-[#1e5b49] mb-1">Admin Worker</p>
                        <p className="text-xs text-[#17221e]">The logistics team has confirmed the delivery for Friday. Please ensure all volunteers are briefed.</p>
                        <p className="text-[8px] text-[#66716a] mt-2 uppercase font-bold">10:30 AM</p>
                      </div>
                    </div>
                    <div className="flex gap-3 flex-row-reverse">
                      <div className="w-8 h-8 rounded-full bg-[#e1ad45] overflow-hidden relative flex-shrink-0">
                        <Image src={user.avatar} alt="User" fill className="object-cover" />
                      </div>
                      <div className="bg-[#1e5b49] text-white rounded-2xl p-4 shadow-sm">
                        <p className="text-[10px] font-black uppercase text-[#e1ad45] mb-1">You</p>
                        <p className="text-xs">Understood. I&apos;ll send out the briefing document by EOD today.</p>
                        <p className="text-[8px] text-white/50 mt-2 uppercase font-bold text-right">11:15 AM</p>
                      </div>
                    </div>
                  </div>
                  <div className="relative">
                    <textarea 
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      placeholder="Type a message..."
                      className="w-full pl-5 pr-12 py-4 rounded-[24px] border border-[#d9d6ce] bg-white focus:border-[#1e5b49] outline-none text-xs resize-none"
                      rows={2}
                    />
                    <button className="absolute right-3 bottom-3 p-2 rounded-full bg-[#1e5b49] text-white hover:bg-[#17221e] transition-colors">
                      <Send size={16} />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white rounded-[40px] border border-[#d9d6ce] shadow-sm flex flex-col items-center justify-center p-20 text-center min-h-[700px]">
              <div className="w-24 h-24 rounded-full bg-[#e9f0e9] flex items-center justify-center text-[#1e5b49] mb-8">
                <Briefcase size={40} />
              </div>
              <h2 className="text-2xl font-black tracking-tight mb-4">Select a project to collaborate</h2>
              <p className="text-[#66716a] max-w-md mx-auto mb-10">Choose an initiative from the sidebar to view tasks, join the team, and participate in discussions.</p>
              <div className="grid grid-cols-2 gap-4 w-full max-w-sm">
                <div className="p-4 rounded-3xl bg-[#f6f4ef] border border-[#d9d6ce]">
                  <p className="text-2xl font-black text-[#1e5b49]">{data.projects.length}</p>
                  <p className="text-[10px] font-black uppercase text-[#66716a]">Total Projects</p>
                </div>
                <div className="p-4 rounded-3xl bg-[#f6f4ef] border border-[#d9d6ce]">
                  <p className="text-2xl font-black text-[#1e5b49]">12</p>
                  <p className="text-[10px] font-black uppercase text-[#66716a]">Active Volunteers</p>
                </div>
              </div>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default function ProjectsContent() {
  return (
    <Suspense fallback={
      <div className="min-h-screen bg-[#f6f4ef] flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#1e5b49]"></div>
      </div>
    }>
      <ProjectsInner />
    </Suspense>
  );
}
