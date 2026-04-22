import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';
import {
    Calendar,
    UserPlus,
    RefreshCw,
    RefreshCcw,
    Briefcase,
    Bell,
    Search,
    Filter,
    Clock,
    User,
    ChevronRight,
    MessageSquare,
    CheckCircle2,
    AlertCircle,
    FileText,
    ExternalLink,
    Mail,
    ChevronDown,
    Copy,
    ListFilter
} from 'lucide-react';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';

import { getFeatureDataScope, getLoggedInUserId } from '../../utils/permissionUtils';

const formatRelativeTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) return 'Just now';
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    if (diffInSeconds < 172800) return 'Yesterday';
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

const Inbox = () => {
    const [activities, setActivities] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('ALL');
    const [page, setPage] = useState(0);
    const pageSize = 10;
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [user, setUser] = useState(null);
    const [activityCounts, setActivityCounts] = useState({
        ALL: 0,
        INTERVIEW_SCHEDULED: 0,
        CANDIDATE_ADDED: 0,
        STATUS_CHANGED: 0,
        JOB_POSTED: 0,
        EMAILS: 0
    });
    const [activityLoading, setActivityLoading] = useState(false);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchFailures = async (activityId, mongoId) => {
        if (!mongoId) return;
        try {
            const res = await axios.get(`/candidates/bulk-email/failures/${mongoId}`);
            if (res.data?.success) {
                setActivities(prev => prev.map(act =>
                    act.id === activityId
                        ? { ...act, metadata: { ...act.metadata, errors: res.data.data.failures } }
                        : act
                ));
            }
        } catch (err) {
            console.error('Error fetching failures:', err);
        }
    };

    const tabs = [
        { id: 'ALL', label: 'All Activities' },
        { id: 'INTERVIEW_SCHEDULED', label: 'Interviews' },
        { id: 'CANDIDATE_ADDED', label: 'Candidates' },
        { id: 'STATUS_CHANGED', label: 'Status Changes' },
        { id: 'JOB_POSTED', label: 'Jobs' },
        { id: 'EMAILS', label: 'Emails' }
    ];

    useEffect(() => {
        const storedUser = localStorage.getItem('admin_user');
        if (storedUser) {
            setUser(JSON.parse(storedUser));
        }
    }, []);

    useEffect(() => {
        setPage(0);
    }, [activeTab]);

    const getInboxParams = (baseParams) => {
        const params = { ...baseParams };
        const dataScope = getFeatureDataScope('dashboard'); // Backend uses 'dashboard' for activities RBAC
        if (dataScope === 'OWN') {
            params.actorId = getLoggedInUserId();
        }
        return params;
    };

    useEffect(() => {
        if (user) {
            fetchActivities();
            fetchCounts();

            // Set up polling for dynamic updates (every 30 seconds)
            const interval = setInterval(() => {
                fetchActivities();
                fetchCounts();
            }, 30000);

            return () => clearInterval(interval);
        }
    }, [user, activeTab, page]);

    const fetchActivities = async (isManualRefresh = false) => {
        setActivityLoading(true);
        try {
            const organizationId = user.organizationId || user.organization_id;

            const response = await axios.get(`/admins/activities`, {
                params: getInboxParams({
                    organizationId,
                    activityType: activeTab,
                    hours: 72,
                    page,
                    pageSize,
                    ...(isManualRefresh ? { _t: Date.now() } : {})
                })
            });

            if (response.data.success) {
                setActivities(response.data.data);
                const pager = response.data.pagination || {};
                setTotalElements(Number(pager.totalElements || 0));
                setTotalPages(Number(pager.totalPages || 0));
            }
        } catch (error) {
            console.error('Error fetching activities:', error);
        } finally {
            setActivityLoading(false);
            setLoading(false);
        }
    };

    const fetchCounts = async () => {
        try {
            const organizationId = user.organizationId || user.organization_id;
            const response = await axios.get(`/admins/activities/counts`, {
                params: getInboxParams({ organizationId, hours: 72 })
            });
            if (response.data.success) {
                setActivityCounts(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching activity counts:', error);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchActivities(true),
                fetchCounts()
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    const handleViewJd = async (activity) => {
        if (!activity.entityId) {
            toast.error('Job Description not found');
            return;
        }

        const toastId = toast.loading('Opening Job Description...');
        try {
            // Use authenticated request to get the file
            const response = await axios.get(`/admins/positions/${activity.entityId}/job-description`, {
                responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            window.open(blobUrl, '_blank');
            toast.success('Opened in new tab', { id: toastId });
        } catch (error) {
            console.error('Error opening JD:', error);
            toast.error('Failed to open Job Description', { id: toastId });
        }
    };

    const handleViewResume = async (activity) => {
        if (!activity.entityId) {
            toast.error('Candidate not found');
            return;
        }

        const toastId = toast.loading('Opening Resume...');
        try {
            const organizationId = user.organizationId || user.organization_id;
            const response = await axios.get(`/candidates/${activity.entityId}/resume/download`, {
                params: {},
                responseType: 'blob'
            });
            const blobUrl = URL.createObjectURL(response.data);
            window.open(blobUrl, '_blank');
            toast.success('Opened in new tab', { id: toastId });
        } catch (error) {
            console.error('Error opening resume:', error);
            toast.error('Failed to open resume', { id: toastId });
        }
    };

    const getTypeBadge = (type) => {
        switch (type) {
            case 'INTERVIEW_SCHEDULED':
                return <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Interview</span>;
            case 'CANDIDATE_ADDED':
                return <span className="bg-green-100 text-green-700 border border-green-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Candidate</span>;
            case 'STATUS_CHANGED':
                return <span className="bg-orange-100 text-orange-700 border border-orange-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Status</span>;
            case 'JOB_POSTED':
                return <span className="bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Job Posting</span>;
            case 'MASS_EMAIL':
                return <span className="bg-blue-100 text-blue-700 border border-blue-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Bulk Email</span>;
            case 'SINGLE_EMAIL':
                return <span className="bg-cyan-100 text-cyan-700 border border-cyan-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Email</span>;
            case 'SOURCING_ACTIVITY':
                return <span className="bg-purple-100 text-purple-700 border border-purple-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Sourcing</span>;
            case 'UPDATE':
                return <span className="bg-gray-100 text-gray-700 border border-gray-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Update</span>;
            default:
                return <span className="bg-slate-100 text-slate-700 border border-slate-200 text-[10px] px-2 py-0.5 rounded-full font-bold">Activity</span>;
        }
    };

    const getActivityIcon = (type) => {
        switch (type) {
            case 'INTERVIEW_SCHEDULED': return <Calendar className="w-4 h-4 text-purple-600" />;
            case 'CANDIDATE_ADDED': return <UserPlus className="w-4 h-4 text-purple-600" />;
            case 'STATUS_CHANGED': return <RefreshCcw className="w-4 h-4 text-purple-600" />;
            case 'JOB_POSTED': return <Briefcase className="w-4 h-4 text-purple-600" />;
            case 'SOURCING_ACTIVITY': return <Search className="w-4 h-4 text-purple-600" />;
            case 'MASS_EMAIL': return <Mail className="w-4 h-4 text-blue-600" />;
            case 'SINGLE_EMAIL': return <Mail className="w-4 h-4 text-cyan-600" />;
            default: return <Bell className="w-4 h-4 text-purple-600" />;
        }
    };

    const getInitials = (name) => {
        if (!name) return 'A';
        return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    };

    const getActivityLabel = (type) => {
        switch (type) {
            case 'INTERVIEW_SCHEDULED': return 'Interview Scheduled';
            case 'CANDIDATE_ADDED': return 'New Candidate Added';
            case 'STATUS_CHANGED': return 'Status Changed';
            case 'JOB_POSTED': return 'New Job Posted';
            case 'SOURCING_ACTIVITY': return 'Sourcing Activity';
            case 'UPDATE': return 'Update';
            case 'MASS_EMAIL': return 'Mass Email Campaign';
            case 'SINGLE_EMAIL': return 'Single Email sent';
            default: return 'New Activity';
        }
    };

    const paginationTotalElements = totalElements > 0 ? totalElements : Number(activityCounts[activeTab] || 0);
    const paginationTotalPages = totalPages > 0 ? totalPages : Math.ceil(paginationTotalElements / pageSize);

    return (
        <div className="flex flex-col h-full bg-transparent overflow-hidden pt-2">
            {/* Tabs matching Candidates/Positions style */}
            <div className="flex items-center justify-between border-b border-slate-100 mb-4">
                <div className="flex items-center gap-8 overflow-x-auto no-scrollbar">
                    {tabs.map((tab) => {
                    const isActive = activeTab === tab.id;
                    const count = activityCounts[tab.id] || 0;
                    return (
                        <button
                            key={tab.id}
                            onClick={() => {
                                setActiveTab(tab.id);
                                setPage(0);
                            }}
                            className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${isActive ? 'text-blue-600 font-normal' : 'text-slate-900 font-normal hover:text-slate-900'
                                }`}
                        >
                            <span className="text-[12px]">{tab.label}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-900 group-hover:bg-slate-200'
                                } transition-colors`}>
                                {count}
                            </span>
                            {isActive && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    );
                })}
                </div>
                <button 
                    onClick={handleRefresh}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm shrink-0"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>
            </div>

            {/* List Area - Minimized margins for "less" look */}
            <div className="flex-1 overflow-y-auto px-0 py-2 custom-scrollbar">
                {activities.length === 0 && !loading ? (
                    <div className="flex flex-col items-center justify-center h-full py-12 px-6 text-center">
                        <div className="w-16 h-16 bg-white border border-slate-100 rounded-2xl flex items-center justify-center shadow-sm mb-4">
                            <Bell className="w-8 h-8 text-slate-300" />
                        </div>
                        <h3 className="text-slate-500 font-normal text-lg">No recent activity</h3>
                        <p className="text-slate-400 text-sm mt-1 max-w-[240px]">
                            Activities from the last 72 hours will appear here as they happen.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-4">
                        {activities.map((activity) => (
                            <div
                                key={activity.id}
                                className="bg-white rounded-[12px] border border-slate-200 p-4 transition-all hover:border-slate-300"
                            >
                                <div className="space-y-4">
                                    {/* Header with Icon, Title, Time and Type Badge */}
                                    <div className="flex items-start justify-between">
                                        <div className="flex items-start gap-3">
                                            <div className="mt-1">
                                                {getActivityIcon(activity.activityType)}
                                            </div>
                                            <div>
                                                <h3 className="text-[15px] font-normal text-slate-600 flex items-center gap-2">
                                                    {(activity.activityType === 'JOB_POSTED' && activity.metadata?.positionName)
                                                        ? activity.metadata.positionName
                                                        : (activity.activityTitle || getActivityLabel(activity.activityType))}
                                                    {!activity.read && (
                                                        <span className="w-2 h-2 rounded-full bg-purple-600"></span>
                                                    )}
                                                </h3>
                                                <p className="text-[12px] text-slate-400 font-normal mt-0.5 flex items-center gap-2">
                                                    <span>{formatRelativeTime(activity.createdAt)}</span>
                                                    <span className="text-slate-200">•</span>
                                                    <span>{new Date(activity.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {activity.activityType === 'MASS_EMAIL' && activity.metadata && (
                                                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                                                    activity.metadata.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
                                                    activity.metadata.status === 'FAILED' ? 'bg-red-100 text-red-700' :
                                                    'bg-blue-100 text-blue-700 animate-pulse'
                                                }`}>
                                                    {activity.metadata.status || 'PROCESSING'}
                                                </span>
                                            )}
                                            {getTypeBadge(activity.activityType)}
                                        </div>
                                    </div>

                                    {/* Mass Email Status Progress - Specialized UI (Show only for actual bulk > 1) */}
                                    {activity.activityType === 'MASS_EMAIL' && activity.metadata && activity.metadata.total > 1 && (
                                        <div className="mt-4 p-4 bg-slate-50/50 rounded-2xl border border-slate-100 space-y-4">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="flex items-center gap-4">
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Sent</span>
                                                        <span className="text-sm font-bold text-green-600">{activity.metadata.sent || 0}</span>
                                                    </div>
                                                    <div className="w-[1px] h-6 bg-slate-200"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Failed</span>
                                                        <span className="text-sm font-bold text-red-600">{activity.metadata.failed || 0}</span>
                                                    </div>
                                                    <div className="w-[1px] h-6 bg-slate-200"></div>
                                                    <div className="flex flex-col">
                                                        <span className="text-[10px] text-slate-400 uppercase font-bold tracking-wider">Pending</span>
                                                        <span className="text-sm font-bold text-slate-600">{activity.metadata.pending || 0}</span>
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Progress Bar */}
                                            <div className="w-full bg-slate-100 h-1.5 rounded-full overflow-hidden">
                                                <div
                                                    className="bg-blue-600 h-full transition-all duration-500"
                                                    style={{ width: `${Math.round(((activity.metadata.sent + activity.metadata.failed) / (activity.metadata.total || 1)) * 100)}%` }}
                                                ></div>
                                            </div>

                                            {/* Failed Emails Dropdown */}
                                            {(activity.metadata.errors?.length > 0 || activity.metadata.failuresMongoId) && (
                                                <div className="mt-4 pt-4 border-t border-slate-200/50">
                                                    <details 
                                                        className="group"
                                                        onToggle={(e) => {
                                                            if (e.target.open && !activity.metadata.errors?.length && activity.metadata.failuresMongoId) {
                                                                fetchFailures(activity.id, activity.metadata.failuresMongoId);
                                                            }
                                                        }}
                                                    >
                                                        <summary className="flex items-center justify-between cursor-pointer list-none">
                                                            <div className="flex items-center gap-2 text-red-600 font-bold text-[11px] uppercase tracking-wider">
                                                                <AlertCircle className="w-3.5 h-3.5" />
                                                                <span>View Failed Emails ({activity.metadata.failed || activity.metadata.errors?.length || 0})</span>
                                                            </div>
                                                            <div className="flex items-center gap-3">
                                                                <button
                                                                    onClick={(e) => {
                                                                        e.preventDefault();
                                                                        navigator.clipboard.writeText(JSON.stringify(activity.metadata.errors, null, 2));
                                                                        toast.success('Failed emails copied to clipboard');
                                                                    }}
                                                                    className="p-1.5 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-all group/copy"
                                                                >
                                                                    <Copy className="w-3.5 h-3.5 text-slate-400 group-hover/copy:text-blue-600" />
                                                                </button>
                                                                <ChevronDown className="w-4 h-4 text-slate-400 group-open:rotate-180 transition-transform" />
                                                            </div>
                                                        </summary>
                                                        <div className="mt-3 p-3 bg-slate-900 rounded-xl overflow-x-auto max-h-40 no-scrollbar">
                                                            <pre className="text-[10px] text-blue-300 font-mono leading-relaxed">
                                                                {activity.metadata.errors?.length > 0 
                                                                    ? JSON.stringify(activity.metadata.errors, null, 2)
                                                                    : (activity.metadata.failuresMongoId ? 'Loading failures from high-volume log...' : 'No details available')}
                                                            </pre>
                                                        </div>
                                                    </details>
                                                </div>
                                            )}
                                        </div>
                                    )}


                                    {/* Metadata Row - Separate Boxes */}
                                    <div className="flex flex-wrap items-center gap-3">
                                        {/* Position Box */}
                                        {activity.metadata?.positionName && (
                                            <div className="bg-[#F2FFF7] rounded-[10px] px-3 py-1.5 border border-[#E1FFEB] flex items-center gap-2">
                                                <Briefcase className="h-3.5 w-3.5 text-emerald-600" />
                                                <span className="text-[11px] text-black/60 font-normal">Position:</span>
                                                <span className="text-[12px] font-normal text-black ml-1">{activity.metadata.positionName}</span>
                                            </div>
                                        )}

                                        {/* Template Box */}
                                        {(activity.activityType === 'MASS_EMAIL' || activity.activityType === 'SINGLE_EMAIL') && (
                                            <div className="bg-[#F0F7FF] rounded-[10px] px-3 py-1.5 border border-[#D0E7FF] flex items-center gap-2">
                                                <FileText className="h-3.5 w-3.5 text-blue-600" />
                                                <span className="text-[11px] text-black/60 font-normal">Template:</span>
                                                <span className="text-[12px] font-normal text-black ml-1">
                                                    {activity.metadata?.templateName || (activity.activityType === 'MASS_EMAIL' ? 'Custom Bulk Email' : 'Direct Message')}
                                                </span>
                                            </div>
                                        )}
                                        {/* Recruiter Box */}
                                        <div className="bg-[#F8F9FB] rounded-[10px] px-3 py-1.5 border border-slate-100 flex items-center gap-2">
                                            <User className="h-3.5 w-3.5 text-blue-600" />
                                            <span className="text-[11px] text-black/60 font-normal">Created By:</span>
                                            <div className="flex items-center gap-2 ml-1">
                                                <span className="text-[12px] font-normal text-black">{activity.actorName}</span>
                                            </div>
                                        </div>

                                        {/* Candidate Box */}
                                        {activity.metadata?.candidateName && (
                                            <div className="bg-[#FDF2FF] rounded-[10px] px-3 py-1.5 border border-[#F5E1FF] flex items-center gap-2">
                                                <UserPlus className="h-3.5 w-3.5 text-purple-600" />
                                                <span className="text-[11px] text-purple-600 font-medium">Candidate:</span>
                                                <span className="text-[12px] font-normal text-black ml-1">
                                                    {activity.metadata.candidateName}
                                                    {activity.metadata.candidateCode && <span className="text-black/40 ml-1">({activity.metadata.candidateCode})</span>}
                                                </span>
                                            </div>
                                        )}

                                    </div>

                                    {/* Description / Content - Premium light background box */}
                                    <div className="bg-[#FBFCFD] rounded-[12px] p-4 border border-slate-100">
                                        {/* Dynamic Status Message */}
                                        {activity.activityType === 'STATUS_CHANGED' ? (
                                            <div className="text-[13px] text-black/80 font-normal leading-relaxed">
                                                The user <span className="text-black font-medium">{activity.actorName}</span> has
                                                <span className={`mx-1 px-1.5 py-0.5 rounded text-[11px] font-normal ${activity.metadata?.newStatus === 'SHORTLISTED' ? 'bg-green-50 text-green-700' :
                                                        activity.metadata?.newStatus === 'REJECTED' ? 'bg-red-50 text-red-700' :
                                                            'bg-blue-50 text-blue-700'
                                                    }`}>
                                                    {activity.metadata?.newStatus || 'UPDATED'}
                                                </span>
                                                for the <span className="text-black font-medium">{activity.metadata?.candidateName || 'Candidate'}</span>
                                                {activity.metadata?.candidateCode && <span className="text-black/40 ml-1">({activity.metadata.candidateCode})</span>}
                                            </div>
                                        ) : (
                                            /* Hide description for INTERVIEW_SCHEDULED (ID check) and JOB_POSTED (user request) */
                                            (!activity.activityDescription?.includes(activity.entityId) &&
                                                activity.activityType !== 'INTERVIEW_SCHEDULED' &&
                                                activity.activityType !== 'JOB_POSTED') && (
                                                <p className="text-[13px] text-slate-500 font-normal leading-relaxed">
                                                    {activity.activityDescription}
                                                </p>
                                            )
                                        )}

                                        {/* Dynamic JD Link if available */}
                                        {activity.metadata?.jdFile && (
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => handleViewJd(activity)}
                                                    className="inline-flex items-center gap-2 text-blue-600 hover:text-blue-700 text-[12px] font-normal transition-all hover:translate-x-1"
                                                >
                                                    <FileText className="w-4 h-4" />
                                                    <span>View Job Description ({activity.metadata.jdFile})</span>
                                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Dynamic Resume Link if available */}
                                        {activity.activityType === 'INTERVIEW_SCHEDULED' && activity.metadata?.candidateName && (
                                            <div className="flex items-center justify-between">
                                                <button
                                                    onClick={() => handleViewResume(activity)}
                                                    className="inline-flex items-center gap-2 text-purple-600 hover:text-purple-700 text-[12px] font-normal transition-all hover:translate-x-1"
                                                >
                                                    <UserPlus className="w-4 h-4" />
                                                    <span>View Candidate Resume</span>
                                                    <ExternalLink className="w-3 h-3 opacity-50" />
                                                </button>
                                            </div>
                                        )}

                                        {/* Nested Details like Time Slots */}
                                        {activity.activityType === 'INTERVIEW_SCHEDULED' && activity.metadata?.timeSlot && (
                                            <div className="flex items-center gap-3 mt-3 pt-3 border-t border-slate-100/50">
                                                <Clock className="h-4 w-4 text-slate-400" />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[11px] text-black/60 font-normal">Time Slot:</span>
                                                    <span className="text-[12px] font-normal text-black">{activity.metadata.timeSlot}</span>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {activityLoading && (
                    <div className="flex items-center justify-center py-12">
                        <div className="flex flex-col items-center gap-3">
                            <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                            <span className="text-[11px] font-normal text-slate-400 uppercase tracking-widest">Updating Feed...</span>
                        </div>
                    </div>
                )}

                <Pagination
                    currentPage={page}
                    totalPages={paginationTotalPages}
                    onPageChange={setPage}
                    pageSize={pageSize}
                    totalElements={paginationTotalElements}
                />
            </div>
        </div>
    );
};

export default Inbox;
