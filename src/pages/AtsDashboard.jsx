import React from 'react';
import { 
  Users, Briefcase, Calendar, TrendingUp, Activity, 
  Clock, ExternalLink, Mail, ShieldCheck, AlertCircle, Award, Star
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
        <div className="rounded-xl border border-slate-100 bg-white p-4 shadow-sm flex items-center justify-between transition-all hover:border-slate-200 h-[84px]">
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
            <div className="h-2 w-1 rounded-full" style={{ backgroundColor: entry.color }} />
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

const AtsDashboard = ({ 
    dashboardData, activities, candidateStatus, credits, orgDetails, 
    isVisible, navigate, displayDate 
}) => {
    const orgName = orgDetails?.companyName;
    const orgCity = orgDetails?.city;
    const orgWebsite = orgDetails?.websiteUrl;

    const avatarColors = [
        'bg-rose-500', 'bg-violet-500', 'bg-indigo-500', 'bg-amber-500',
        'bg-emerald-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500'
    ];
    const getAvatarColor = (str) => {
        if (!str) return avatarColors[0];
        let hash = 0;
        for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
        return avatarColors[Math.abs(hash) % avatarColors.length];
    };

    const formatTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        const date = new Date(dateStr);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        
        if (diffInSeconds < 60) return 'just now';
        
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        if (diffInMinutes < 60) return `${diffInMinutes} minute${diffInMinutes > 1 ? 's' : ''} ago`;
        
        const diffInHours = Math.floor(diffInMinutes / 60);
        if (diffInHours < 24) return `${diffInHours} hour${diffInHours > 1 ? 's' : ''} ago`;
        
        const diffInDays = Math.floor(diffInHours / 24);
        if (diffInDays < 30) return `${diffInDays} day${diffInDays > 1 ? 's' : ''} ago`;
        
        return date.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'MASS_EMAIL':
            case 'SINGLE_EMAIL': 
                return { 
                    icon: <Mail size={18} />, 
                    bg: 'bg-orange-50', 
                    text: 'text-orange-500',
                    border: 'border-orange-100'
                };
            case 'JOB_POSTED': 
                return { 
                    icon: <Briefcase size={18} />, 
                    bg: 'bg-blue-50', 
                    text: 'text-blue-500',
                    border: 'border-blue-100'
                };
            case 'INTERVIEW_SCHEDULED': 
                return { 
                    icon: <Calendar size={18} />, 
                    bg: 'bg-emerald-50', 
                    text: 'text-emerald-500',
                    border: 'border-emerald-100'
                };
            case 'CANDIDATE_ADDED': 
                return { 
                    icon: <Users size={18} />, 
                    bg: 'bg-violet-50', 
                    text: 'text-violet-500',
                    border: 'border-violet-100'
                };
            case 'STATUS_CHANGED': 
                return { 
                    icon: <Activity size={18} />, 
                    bg: 'bg-emerald-50', 
                    text: 'text-emerald-500',
                    border: 'border-emerald-100'
                };
            default: 
                return { 
                    icon: <Activity size={18} />, 
                    bg: 'bg-slate-50', 
                    text: 'text-slate-500',
                    border: 'border-slate-100'
                };
        }
    };

    const intUsed = credits?.utilizedInterviews ?? 0;
    const intTotal = credits?.totalInterviews ?? 0;
    const intRem = credits?.remainingInterviews ?? (intTotal - intUsed);

    const posUsed = credits?.utilizedPositions ?? 0;
    const posTotal = credits?.totalPositions ?? 0;
    const posRem = credits?.remainingPositions ?? (posTotal - posUsed);

    const scrUsed = credits?.utilizedScreening ?? 0;
    const scrTotal = credits?.totalScreening ?? 0;
    const scrRem = credits?.remainingScreening ?? (scrTotal - scrUsed);

    return (
        <div className="pt-2 pb-12 space-y-3 animate-in fade-in duration-500">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
                {/* Interviews (Row 1-3) */}
                <MiniStatCard title="Interview Credits Total" value={intTotal} icon={ShieldCheck} colorClass="blue" />
                <MiniStatCard title="Interview Credits Utilized" value={intUsed} icon={Activity} colorClass="blue" />
                <MiniStatCard title="Interview Credits Remaining" value={intRem} icon={TrendingUp} colorClass="emerald" />
                
                {/* Account Validity (Spans 3 Rows) */}
                <div className="lg:row-span-3 rounded-xl border border-slate-100 bg-white p-6 shadow-sm flex flex-col items-center justify-center text-center transition-all hover:border-slate-200">
                    <p className="text-sm font-normal text-slate-500 mb-4">Account Validity</p>
                    {displayDate ? (
                        <div className="flex flex-col items-center">
                            <div className="h-16 w-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center shadow-sm mb-4">
                                <Calendar size={32} strokeWidth={2.5} />
                            </div>
                            <p className="text-3xl font-bold text-black leading-none">
                                {displayDate.day}<sup className="text-sm font-normal text-slate-500 ml-0.5">{displayDate.suffix}</sup>
                            </p>
                            <p className="text-lg font-normal text-slate-500 mt-1">{displayDate.month} {displayDate.year}</p>
                        </div>
                    ) : <div className="h-24 w-32 bg-slate-50 animate-pulse rounded-xl"></div>}
                </div>

                {/* Job Posts (Row 2) */}
                <MiniStatCard title="Job Credits Total" value={posTotal} icon={Briefcase} colorClass="emerald" />
                <MiniStatCard title="Job Credits Utilized" value={posUsed} icon={Activity} colorClass="emerald" />
                <MiniStatCard title="Job Credits Remaining" value={posRem} icon={TrendingUp} colorClass="emerald" />

                {/* Screening (Row 3) */}
                <MiniStatCard title="Screening Credits Total" value={scrTotal} icon={ShieldCheck} colorClass="violet" />
                <MiniStatCard title="Screening Credits Utilized" value={scrUsed} icon={Activity} colorClass="violet" />
                <MiniStatCard title="Screening Credits Remaining" value={scrRem} icon={TrendingUp} colorClass="emerald" />
            </div>


            {/* Company Banner */}
            {orgDetails && (
                <div className="w-full rounded-lg border border-slate-100 bg-white p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-5">
                    <div className="h-14 w-14 rounded-xl bg-slate-50 flex items-center justify-center text-3xl shadow-inner shrink-0">🏢</div>
                    <div>
                    <p className="text-sm font-normal text-slate-500 mb-0.5">Company Information</p>
                    <h2 className="text-xl font-normal text-black tracking-tight">{orgName || 'Recruitment Partner'}</h2>
                    <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs font-medium text-slate-500">
                        <span className="flex items-center gap-1.5"><ExternalLink size={12} className="text-slate-300" />{orgCity || 'Incomplete Profile'}</span>
                        {orgWebsite && <a href={orgWebsite} target="_blank" rel="noreferrer" className="text-blue-600 hover:underline font-bold">{orgWebsite}</a>}
                    </div>
                    </div>
                </div>
                <div className="flex items-center gap-3 border-l border-slate-50 pl-8 hidden md:flex">
                    <div className="text-right">
                    <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Recruiters</p>
                    <p className="text-xs font-bold text-slate-700">{dashboardData.team.length} Active Members</p>
                    </div>
                </div>
                </div>
            )}

            {/* Summary Strip */}
            {/* Summary & Candidate Status Grid */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-3 mt-3">
                <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center shrink-0"><Users size={18} /></div>
                    <div><p className="text-[13px] font-normal text-slate-500">Total Candidates</p><p className="text-xl font-bold text-black leading-tight">{dashboardData.stats?.totalCandidates || 0}</p></div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Briefcase size={18} /></div>
                    <div><p className="text-[13px] font-normal text-slate-500">Active Jobs</p><p className="text-xl font-bold text-black leading-tight">{dashboardData.stats?.totalPositions || 0}</p></div>
                </div>
                <div className="rounded-lg border border-slate-100 bg-white p-3 shadow-sm flex items-center gap-3">
                    <div className="h-9 w-9 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0"><Calendar size={18} /></div>
                    <div><p className="text-[13px] font-normal text-slate-500">Assessments</p><p className="text-xl font-bold text-black leading-tight">{dashboardData.stats?.totalInterviews || 0}</p></div>
                </div>
                
                {/* Status Boxes (Aligned same as summary cards) */}
                {[
                    { metric: 'Invited', color: 'bg-blue-50 text-blue-600' },
                    { metric: 'Shortlisted', color: 'bg-indigo-50 text-indigo-600' },
                    { metric: 'Not Recommended', color: 'bg-cyan-50 text-cyan-600' },
                    { metric: 'Recommended', color: 'bg-emerald-50 text-emerald-600' },
                    { metric: 'Rejected', color: 'bg-rose-50 text-rose-600' },
                    { metric: 'Cautiously Recommended', color: 'bg-amber-50 text-amber-600' },
                    { metric: 'Hired', color: 'bg-green-50 text-green-600' }
                ].map((conf, i) => {
                    const status = candidateStatus.find(s => s.metric === conf.metric) || { metric: conf.metric, value: 0 };
                    const [bgClass, textClass] = conf.color.split(' ');
                    return (
                        <div key={i} className="rounded-lg border border-slate-100 bg-white px-3.5 py-2.5 shadow-sm flex items-center gap-2.5">
                            <div className={`h-9 w-9 rounded-lg ${bgClass} ${textClass} flex items-center justify-center shadow-sm shrink-0`}>
                                <Activity size={18} />
                            </div>
                            <div>
                                <p className="text-[13px] font-normal text-slate-500">{status.metric}</p>
                                <p className="text-xl font-bold text-black leading-tight">{status.value}</p>
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3 mt-3">
                {/* Graph */}
                <div className="lg:col-span-2 rounded-2xl border border-slate-100 bg-white p-8 shadow-sm">
                    <h2 className="text-2xl font-normal text-black tracking-tight flex items-center gap-2 mb-5"><TrendingUp className="text-blue-600" />Hiring Pipeline</h2>
                    <div className="h-[350px] w-full">
                        {dashboardData.trends?.monthly?.length > 0 ? (
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={dashboardData.trends.monthly} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} dy={10} />
                                    <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 10, fontWeight: 600}} />
                                    <Tooltip content={<CustomTooltip />} /><Legend />
                                    <Area type="monotone" dataKey="candidates" stroke="#3b82f6" strokeWidth={3} fillOpacity={0.1} fill="#3b82f6" name="Candidates" />
                                    <Area type="monotone" dataKey="interviews" stroke="#10b981" strokeWidth={3} fillOpacity={0.1} fill="#10b981" name="Assessments" />
                                </AreaChart>
                            </ResponsiveContainer>
                        ) : <div className="h-full flex items-center justify-center text-slate-400">No data available</div>}
                    </div>
                </div>

                {/* Recent Activity Section - Redesigned to match image exactly */}
                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm flex flex-col hover:border-slate-200 transition-colors">
                    <div className="mb-6 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                            <Clock size={20} className="text-slate-400" />
                            <h2 className="text-[17px] font-normal text-black leading-tight">Recent Activity</h2>
                        </div>
                        <button onClick={() => navigate('/admins/activities')} className="text-[13px] font-medium text-blue-600 hover:text-blue-800 transition-colors">View All</button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-0 no-scrollbar relative">
                        {/* Connecting Line (Timeline) */}
                        {activities.length > 1 && (
                            <div className="absolute left-4.5 top-6 bottom-6 w-px bg-slate-100" style={{ left: '19px' }} />
                        )}

                        {activities.length > 0 ? activities.map((activity, idx) => {
                            const isStatusChange = activity.activityType === 'STATUS_CHANGED';
                            const toStage = activity.metadata?.toStage;

                            return (
                                <div key={activity.id || idx} className="pb-5 last:pb-0 relative flex gap-4 group">
                                    {/* Standardized Icon Box (matches image) */}
                                    <div className="h-9 w-9 rounded-lg bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 z-10 group-hover:bg-blue-50 group-hover:text-blue-500 transition-colors">
                                        <Mail size={16} />
                                    </div>
                                    <div className="min-w-0 pt-0.5">
                                        <p className="text-[14px] font-normal text-slate-800 leading-snug">
                                            {isStatusChange ? (
                                                <span>Candidate moved to {toStage?.replace(/_/g, ' ')}</span>
                                            ) : activity.activityTitle}
                                        </p>
                                        <p className="mt-0.5 text-[12px] font-normal text-slate-400">
                                            By {activity.actorName} • {formatTimeAgo(activity.createdAt)}
                                        </p>
                                    </div>
                                </div>
                            );
                        }) : (
                            <div className="py-20 text-center opacity-20">
                                <Activity className="mx-auto mb-3" size={40} />
                                <p className="text-sm font-bold uppercase tracking-widest">No Recent Activity</p>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {/* Bottom Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 mt-3">
                {/* Recent Jobs Section - Simplified as per request */}
                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-5">
                        <div className="flex items-center gap-2.5">
                            <Briefcase size={20} className="text-slate-400" />
                            <h2 className="text-[17px] font-normal text-black leading-tight">Recent Jobs</h2>
                        </div>
                        <button 
                            onClick={() => navigate('/admins/positions')} 
                            className="text-[13px] font-medium text-blue-600 hover:text-blue-800 transition-colors"
                        >
                            View All
                        </button>
                    </div>

                    <div className="space-y-0">
                        {dashboardData.recentGrid?.positions?.length > 0 ? (
                            dashboardData.recentGrid.positions.map((item, i) => (
                                <div 
                                    key={i} 
                                    className="group flex items-center justify-between py-3.5 border-b border-slate-50 last:border-0 cursor-pointer transition-colors"
                                    onClick={() => navigate(`/admins/jobs/applications/${item.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded-xl bg-slate-50 text-slate-400 flex items-center justify-center shrink-0 group-hover:bg-violet-50 group-hover:text-violet-500 transition-colors">
                                            <Briefcase size={18} />
                                        </div>
                                        <div className="min-w-0">
                                            <h3 className="text-[14px] font-normal text-slate-800 leading-snug group-hover:text-blue-600 transition-colors">{item.job_title}</h3>
                                            <div className="flex items-center gap-2 mt-0.5 text-[11px] font-normal text-slate-400 uppercase tracking-tight">
                                                <span>{item.location || 'Remote'}{item.job_type ? `, ${item.job_type}` : ''}</span>
                                                <span className="h-1 w-1 rounded-full bg-slate-200" />
                                                <span>{item.candidates_count || 0} applications</span>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-600 text-[10px] font-semibold uppercase tracking-wider">
                                            Active
                                        </span>
                                        <ExternalLink size={14} className="text-slate-300 group-hover:text-blue-500 transition-colors" />
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="py-14 text-center opacity-30">
                                <Briefcase className="mx-auto mb-3" size={40} />
                                <p className="text-sm font-bold uppercase tracking-widest text-slate-400">No Recent Jobs Found</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Replacement: Recent Candidates Section can be kept or removed if redundant */}
                {/* The user wanted Recent Activity specifically. I'll replace this one with a "Top Candidates" or similar if needed, or just leave it for now. */}
                <div className="rounded-2xl border border-slate-100 bg-white px-5 py-4 shadow-sm hover:border-slate-200 transition-colors">
                    <div className="flex items-center justify-between mb-5">
                        <h2 className="text-[17px] font-normal text-slate-900 tracking-tight">Recent Candidates</h2>
                        <button onClick={() => navigate('/admins/ats-candidates')} className="text-[12px] text-blue-600 font-bold hover:underline transition-all">View Pipeline</button>
                    </div>
                    <div className="space-y-4">
                        {dashboardData.recentGrid?.candidates?.slice(0, 5).map((item, i) => (
                            <div key={i} className="flex items-center justify-between pb-4 border-b border-slate-50 last:border-0 last:pb-0 group">
                                <div className="flex items-center gap-3">
                                    <div className="h-10 w-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-sm group-hover:border-blue-200 transition-colors">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${item.candidate_name || 'Candidate'}&backgroundColor=f8fafc`}
                                            alt={item.candidate_name}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <div>
                                        <p className="text-[14px] font-bold text-slate-800 group-hover:text-blue-600 transition-colors leading-tight mb-0.5">{item.candidate_name}</p>
                                        <p className="text-[11px] text-slate-400 font-medium truncate max-w-[150px] uppercase tracking-wider">CODE: {item.candidate_code || 'N/A'}</p>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-600 text-[10px] font-bold border border-blue-100 shadow-sm">
                                        <Award size={12} className="text-blue-400" />
                                        92%
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AtsDashboard;
