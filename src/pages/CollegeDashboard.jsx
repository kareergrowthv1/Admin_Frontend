import React from 'react';
import { 
  Users, Briefcase, Calendar, TrendingUp, Activity, 
  Clock, ExternalLink, Mail 
} from 'lucide-react';
import { 
  AreaChart, Area, LineChart, Line, Radar, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, Legend 
} from 'recharts';

const MiniStatCard = ({ title, value, colorClass = "blue", icon: Icon }) => {
    const colorMap = {
        blue: { bg: "bg-blue-50", text: "text-blue-500" },
        emerald: { bg: "bg-emerald-50", text: "text-emerald-500" },
        violet: { bg: "bg-violet-50", text: "text-violet-500" },
        indigo: { bg: "bg-indigo-50", text: "text-indigo-500" },
    };
    const c = colorMap[colorClass] || colorMap.blue;

    return (
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between transition-all hover:border-slate-200 h-[92px]">
            <div className="flex flex-col">
                <p className="text-sm font-normal text-slate-500 mb-1">{title}</p>
                <p className="text-2xl font-bold text-black tabular-nums">{value}</p>
            </div>
            <div className={`h-10 w-10 rounded-xl ${c.bg} ${c.text} flex items-center justify-center shadow-sm shrink-0`}>
                <Icon size={20} strokeWidth={2.5} />
            </div>
        </div>
    );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-3 shadow-xl">
        <p className="mb-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
        {payload.map((entry, index) => (
          <div key={index} className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full" style={{ backgroundColor: entry.color }} />
            <p className="text-sm font-bold text-slate-700">
              {entry.name}: <span className="text-slate-900">{entry.value}</span>
            </p>
          </div>
        ))}
      </div>
    );
  }
  return null;
};

const CollegeDashboard = ({ 
    dashboardData, activities, candidateStatus, credits, orgDetails, 
    isVisible, navigate, displayDate 
}) => {
    const orgName = orgDetails?.collegeName;
    const orgCity = orgDetails?.city;
    const orgWebsite = orgDetails?.websiteUrl;

    const intUsed = credits?.utilizedInterviews ?? 0;
    const intTotal = credits?.totalInterviews ?? 0;
    const intRem = credits?.remainingInterviews ?? (intTotal - intUsed);

    const posUsed = credits?.utilizedPositions ?? 0;
    const posTotal = credits?.totalPositions ?? 0;
    const posRem = credits?.remainingPositions ?? (posTotal - posUsed);

    const getActivityIcon = (type) => {
        switch (type) {
          case 'MASS_EMAIL':
          case 'SINGLE_EMAIL': return <Mail className="h-4 w-4" />;
          case 'JOB_POSTED': return <Briefcase className="h-4 w-4" />;
          case 'INTERVIEW_SCHEDULED': return <Calendar className="h-4 w-4" />;
          case 'CANDIDATE_ADDED': return <Users className="h-4 w-4" />;
          case 'STATUS_CHANGED': return <Activity className="h-4 w-4" />;
          default: return <Activity className="h-4 w-4" />;
        }
    };

    return (
        <div className="pt-2 pb-12 space-y-3 animate-in fade-in duration-500">
            {/* Unified Credit & Validity Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 items-stretch">
                {/* Interview Credits Row */}
                <MiniStatCard title="Interview Credits Total" value={intTotal} icon={Activity} colorClass="blue" />
                <MiniStatCard title="Interview Credits Utilized" value={intUsed} icon={Activity} colorClass="blue" />
                <MiniStatCard title="Interview Credits Remaining" value={intRem} icon={TrendingUp} colorClass="emerald" />

                {/* Account Validity (Spans 2 Rows) */}
                {isVisible('dashboard_page') && (
                    <div className="lg:row-span-2 rounded-xl border border-slate-100 bg-white p-5 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:border-slate-200">
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] mb-3">Account Validity</p>
                        {displayDate ? (
                            <div className="flex flex-col items-center">
                                <div className="h-14 w-14 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm mb-3">
                                    <Clock size={28} strokeWidth={2.5} />
                                </div>
                                <p className="text-3xl font-black text-slate-800 leading-none">
                                    {displayDate.day}<sup className="text-sm font-semibold text-slate-500 ml-0.5">{displayDate.suffix}</sup>
                                </p>
                                <p className="text-lg font-bold text-slate-600 mt-1">{displayDate.month} {displayDate.year}</p>
                            </div>
                        ) : <div className="h-24 w-32 bg-slate-50 animate-pulse rounded-xl"></div>}
                    </div>
                )}

                {/* Position Credits Row */}
                <MiniStatCard title="Position Credits Total" value={posTotal} icon={Briefcase} colorClass="emerald" />
                <MiniStatCard title="Position Credits Utilized" value={posUsed} icon={Activity} colorClass="emerald" />
                <MiniStatCard title="Position Credits Remaining" value={posRem} icon={TrendingUp} colorClass="emerald" />
            </div>

            {/* Organization Info Banner */}
            {orgDetails && (
                <div className="w-full rounded-lg border border-slate-100 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-4 duration-500">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner shrink-0">🏛️</div>
                    <div>
                    <p className="text-sm font-normal text-slate-500 mb-0.5">College Information</p>
                    <h2 className="text-xl font-normal text-black tracking-tight">{orgName}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5">
                        <ExternalLink size={12} className="text-slate-300" />
                        {orgDetails.address ? `${orgDetails.address}, ` : ''}{orgCity}
                        </span>
                        {orgWebsite && (
                        <a href={orgWebsite.startsWith('http') ? orgWebsite : `https://${orgWebsite}`} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 text-blue-600 hover:underline font-bold">
                            <Activity size={12} className="rotate-45" />
                            {orgWebsite.replace(/^https?:\/\//, '')}
                        </a>
                        )}
                    </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 md:border-l md:border-slate-50 md:pl-8">
                    <div className="flex -space-x-2">
                    {[1, 2, 3].map(i => <div key={i} className="h-8 w-8 rounded-full border border-slate-100 bg-slate-50 flex items-center justify-center text-[10px] text-black">U</div>)}
                    <div className="h-8 w-8 rounded-full border border-slate-100 bg-blue-100 flex items-center justify-center text-[10px] text-blue-600 font-normal">+{dashboardData.team.length}</div>
                    </div>
                    <div className="text-right hidden sm:block">
                    <p className="text-sm font-normal text-slate-500">Active Team</p>
                    <p className="text-xs font-bold text-black">{dashboardData.team.length} Members</p>
                    </div>
                </div>
                </div>
            )}



            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
                {isVisible('analytics_chart') && (
                <div className="lg:col-span-2 rounded-lg border border-slate-100 bg-white p-8 shadow-sm">
                <div className="mb-8 flex items-center justify-between">
                    <h2 className="text-2xl font-normal text-black tracking-tight flex items-center gap-2"><TrendingUp className="text-blue-600" />Performance Analysis</h2>
                </div>
                <div className="h-[350px] w-full mt-4">
                    {dashboardData.trends?.monthly?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={dashboardData.trends.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorCand" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.1}/><stop offset="95%" stopColor="#3b82f6" stopOpacity={0}/>
                            </linearGradient>
                            <linearGradient id="colorInt" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#10b981" stopOpacity={0.1}/><stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                            </linearGradient>
                        </defs>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 400}} dy={10} tickFormatter={(val) => { const [y, m] = val.split('-'); return new Date(y, m-1).toLocaleString('en-US', { month: 'short' }); }} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 400}} />
                        <Tooltip content={<CustomTooltip />} />
                        <Area type="monotone" dataKey="candidates" stroke="#3b82f6" strokeWidth={3} fillOpacity={1} fill="url(#colorCand)" name="Candidates" />
                        <Area type="monotone" dataKey="interviews" stroke="#10b981" strokeWidth={3} fillOpacity={1} fill="url(#colorInt)" name="Interviews" />
                        </AreaChart>
                    </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400">No trend data available</div>}
                </div>
                </div>
                )}

                {isVisible('activity_feed') && (
                <div className={`lg:col-span-1 rounded-lg border border-slate-100 bg-white p-6 shadow-sm flex flex-col h-[482px]`}>
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-xl font-normal text-black tracking-tight flex items-center gap-2"><Clock className="text-slate-400" />Recent Activity</h2>
                    <button onClick={() => navigate('/inbox')} className="text-xs font-normal text-blue-600 hover:underline">View All</button>
                </div>
                <div className="flex-1 overflow-y-auto pr-2 space-y-6">
                    {activities.length > 0 ? activities.map((activity, idx) => (
                    <div key={activity.id || idx} className="flex gap-4 group">
                        <div className="relative">
                        <div className="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-slate-50 text-slate-500 shadow-inner group-hover:bg-blue-50 group-hover:text-blue-600">
                            {getActivityIcon(activity.activityType)}
                        </div>
                        {idx !== activities.length - 1 && <div className="absolute left-4 top-10 w-px h-[calc(100%+12px)] bg-slate-100" />}
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                        <p className="text-[13px] font-bold text-slate-700 leading-tight">{activity.activityTitle}</p>
                        <p className="mt-1 text-[11px] font-medium text-slate-400">By <span className="text-slate-500">{activity.actorName}</span></p>
                        </div>
                    </div>
                    )) : <div className="h-full flex flex-col items-center justify-center text-slate-300"><Activity size={40} className="mb-3 opacity-20" /><p className="text-sm">No recent activity</p></div>}
                </div>
                </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                {isVisible('volume_chart') && (
                <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm h-96 flex flex-col">
                <h2 className="text-[14px] font-bold text-slate-800 tracking-tight mb-6">Daily Volume Trend</h2>
                <div className="h-[280px] w-full">
                    {dashboardData.trends?.daily?.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={dashboardData.trends.daily}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} dy={10} />
                        <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10}} />
                        <Tooltip /><Legend iconType="circle" />
                        <Line type="monotone" dataKey="submitted" stroke="#8b5cf6" strokeWidth={3} dot={{ r: 3 }} name="Submitted" />
                        <Line type="monotone" dataKey="selected" stroke="#10b981" strokeWidth={3} dot={{ r: 3 }} name="Selected" />
                        </LineChart>
                    </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-[12px]">No data</div>}
                </div>
                </div>
                )}

                {isVisible('performance_radar') && (
                <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm h-96 flex flex-col items-center">
                <h2 className="text-[14px] font-bold text-slate-800 tracking-tight mb-6 text-center">Candidates Performance</h2>
                <div className="h-[300px] w-full -mt-6">
                    {candidateStatus.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                        <RadarChart cx="50%" cy="50%" outerRadius="65%" data={candidateStatus}>
                        <PolarGrid stroke="#e2e8f0" /><PolarAngleAxis dataKey="metric" tick={{ fill: '#64748b', fontSize: 11 }} /><PolarRadiusAxis angle={30} domain={[0, 'auto']} tick={{ fill: '#cbd5e1', fontSize: 10 }} />
                        <Tooltip /><Radar name="Candidates" dataKey="value" stroke="#8b5cf6" fill="#8b5cf6" fillOpacity={0.25} /><Legend />
                        </RadarChart>
                    </ResponsiveContainer>
                    ) : <div className="h-full flex items-center justify-center text-slate-400 text-[12px]">No data</div>}
                </div>
                </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mt-6">
                {isVisible('recent_positions') && (
                <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-bold text-slate-800 tracking-tight">Recent Positions</h2>
                    <button onClick={() => navigate('/positions')} className="text-[11px] text-blue-500">View All</button>
                </div>
                <div className="grid grid-cols-12 gap-4 pb-2 mb-2 border-b border-slate-50">
                    <div className="col-span-4 text-[10px] font-semibold text-black uppercase">Position / Code</div>
                    <div className="col-span-4 text-[10px] font-semibold text-black uppercase">Added By</div>
                    <div className="col-span-2 text-center text-[10px] font-semibold text-black uppercase">Required</div>
                    <div className="col-span-2 text-right text-[10px] font-semibold text-black uppercase">Candidates</div>
                </div>
                <div className="space-y-5">
                    {dashboardData.recentGrid?.positions?.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0 items-center">
                        <div className="col-span-4 min-w-0">
                        <p className="text-[13px] font-normal text-black truncate">{item.job_title}</p>
                        <p className="text-[10px] text-black mt-0.5 uppercase">{item.position_code}</p>
                        </div>
                        <div className="col-span-4 min-w-0">
                        <p className="text-[12px] font-normal text-black truncate">{item.first_name || 'Admin'}</p>
                        <p className="text-[10px] text-black/60 truncate mt-0.5">{item.admin_email}</p>
                        </div>
                        <div className="col-span-2 text-center"><p className="text-[12px] font-normal text-black">{item.no_of_positions || 0}</p></div>
                        <div className="col-span-2 text-right"><p className="text-[12px] font-normal text-blue-600">{item.candidates_count || 0}</p></div>
                    </div>
                    ))}
                </div>
                </div>
                )}

                {isVisible('recent_students') && (
                <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-bold text-slate-800 tracking-tight">Recent Student Added</h2>
                    <button onClick={() => navigate('/students')} className="text-[11px] text-blue-500">View All</button>
                </div>
                <div className="grid grid-cols-12 gap-4 pb-2 mb-2 border-b border-slate-50">
                    <div className="col-span-5 text-[10px] font-semibold uppercase text-black">Student / Reg No</div>
                    <div className="col-span-4 text-[10px] font-semibold uppercase text-black">Added By</div>
                    <div className="col-span-3 text-right text-[10px] font-semibold uppercase text-black">Date</div>
                </div>
                <div className="space-y-5">
                    {dashboardData.recentGrid?.candidates?.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0 items-center">
                        <div className="col-span-5 min-w-0">
                        <p className="text-[13px] font-normal text-black truncate">{item.candidate_name}</p>
                        <p className="text-[10px] text-black mt-0.5 uppercase">{item.reg_number || 'N/A'}</p>
                        </div>
                        <div className="col-span-4 min-w-0">
                        <p className="text-[12px] font-normal text-black truncate">{item.first_name || 'System'}</p>
                        <p className="text-[10px] text-black/60 truncate mt-0.5">{item.admin_email}</p>
                        </div>
                        <div className="col-span-3 text-right"><p className="text-[11px] text-black">{new Date(item.created_at).toLocaleDateString()}</p></div>
                    </div>
                    ))}
                </div>
                </div>
                )}

                {isVisible('recent_interviews') && (
                <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-bold text-slate-800 tracking-tight">Recent Interviews</h2>
                    <button onClick={() => navigate('/interviews')} className="text-[11px] text-blue-500">View All</button>
                </div>
                <div className="grid grid-cols-12 gap-4 pb-2 mb-2 border-b border-slate-50">
                    <div className="col-span-4 text-[10px] font-semibold uppercase text-black">Candidate / Job</div>
                    <div className="col-span-3 text-[10px] font-semibold uppercase text-black">Added By</div>
                    <div className="col-span-3 text-center text-[10px] font-semibold uppercase text-black">Status</div>
                    <div className="col-span-2 text-right text-[10px] font-semibold uppercase text-black">Date</div>
                </div>
                <div className="space-y-5">
                    {dashboardData.recentGrid?.interviews?.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-50 last:border-0 last:pb-0 items-center">
                        <div className="col-span-4 min-w-0">
                        <p className="text-[13px] font-normal text-black truncate">{item.candidate_name}</p>
                        <p className="text-[10px] text-black mt-0.5 truncate uppercase">{item.job_title}</p>
                        </div>
                        <div className="col-span-3 min-w-0">
                        <p className="text-[12px] font-normal text-black truncate">{item.first_name || 'Admin'}</p>
                        <p className="text-[10px] text-black/60 truncate mt-0.5">{item.admin_email}</p>
                        </div>
                        <div className="col-span-3 text-center"><span className="text-[10px] bg-slate-100 px-2 py-0.5 rounded">{item.status}</span></div>
                        <div className="col-span-2 text-right"><p className="text-[10px] text-black">{new Date(item.updated_at).toLocaleDateString()}</p></div>
                    </div>
                    ))}
                </div>
                </div>
                )}

                {isVisible('recent_tasks') && (
                <div className="rounded-lg border border-slate-100 bg-white p-6 shadow-sm">
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-[14px] font-bold text-slate-800 tracking-tight">Recent Task Added</h2>
                    <button onClick={() => navigate('/tasks')} className="text-[11px] text-blue-500">View All</button>
                </div>
                <div className="grid grid-cols-12 gap-4 pb-2 mb-2 border-b border-slate-50">
                    <div className="col-span-4 text-[10px] font-semibold text-black uppercase">Task / Code</div>
                    <div className="col-span-3 text-[10px] font-semibold text-black uppercase">Assigned By</div>
                    <div className="col-span-3 text-[10px] font-semibold text-black uppercase">Dept / Branch / Sub</div>
                    <div className="col-span-2 text-right text-[10px] font-semibold text-black uppercase">Due Date</div>
                </div>
                <div className="space-y-5">
                    {dashboardData.recentGrid?.tasks?.map((item, i) => (
                    <div key={i} className="grid grid-cols-12 gap-4 pb-4 border-b border-slate-50 last:border-0 items-start">
                        <div className="col-span-4 min-w-0"><p className="text-[13px] font-normal text-black truncate">{item.title}</p><p className="text-[10px] text-black mt-0.5 uppercase">{item.task_code || 'No Code'}</p></div>
                        <div className="col-span-3 min-w-0"><p className="text-[12px] font-normal text-black truncate">{item.first_name || 'Admin'}</p><p className="text-[10px] text-black/60 truncate mt-0.5">{item.admin_email}</p></div>
                        <div className="col-span-3 min-w-0"><p className="text-[11px] font-normal text-black truncate">{item.department}, {item.branch}</p><p className="text-[10px] text-black/60 truncate mt-0.5">{item.subject}, Sem: {item.semester}</p></div>
                        <div className="col-span-2 text-right"><p className="text-[10px] text-black">{item.due_date ? new Date(item.due_date).toLocaleDateString() : 'N/A'}</p></div>
                    </div>
                    ))}
                </div>
                </div>
                )}
            </div>
        </div>
    );
};

export default CollegeDashboard;
