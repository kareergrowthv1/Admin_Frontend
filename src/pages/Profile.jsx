import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, Calendar, Building, 
    Briefcase, Hash, Clock, Shield, Monitor, Trash2, 
    Activity
} from 'lucide-react';
import axios from '../config/axios';

const Profile = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('PROFILE');
    const [user, setUser] = useState(null);
    const [college, setCollege] = useState(null);
    const [credits, setCredits] = useState(null);
    const [activities, setActivities] = useState([]);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        setUser(storedUser);
        fetchActivities(storedUser.id);
        fetchCredits(storedUser.id);
        if (storedUser.organizationId) {
            fetchCollegeDetails(storedUser.organizationId, storedUser.isCollege);
        }
    }, []);

    const fetchCredits = async (userId) => {
        try {
            const response = await axios.get(`/admins/credits/${userId}`);
            setCredits(response.data?.data || null);
        } catch (error) {
            console.error('Failed to fetch credits:', error);
        }
    };

    const fetchCollegeDetails = async (orgId, isCollege) => {
        try {
            const endpoint = isCollege 
                ? `/admins/college-details/${orgId}` 
                : `/admins/company-details/${orgId}`;
            const response = await axios.get(endpoint);
            setCollege(response.data?.data || null);
        } catch (error) {
            console.error('Failed to fetch organization details:', error);
        }
    };

    const fetchActivities = async (userId) => {
        try {
            const response = await axios.get('/admins/activities', {
                params: { actorId: userId, limit: 4, hours: 168 } // 7 days
            });
            setActivities(response.data?.data || []);
        } catch (error) {
            console.error('Failed to fetch profile activities:', error);
        }
    };

    const formatRelativeTime = (dateString) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        const now = new Date();
        const diffInSeconds = Math.floor((now - date) / 1000);
        if (diffInSeconds < 60) return 'Just now';
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
        return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getActivityTitle = (activity) => {
        const posName = activity.metadata?.positionName || activity.metadata?.positionTitle;
        const canName = activity.metadata?.candidateName || 'Candidate';
        
        if (activity.activityType === 'INTERVIEW_SCHEDULED') {
            return `Interview Scheduled: ${canName} for ${posName || 'a role'}`;
        }
        if (activity.activityType === 'JOB_POSTED') {
            return `${posName || 'New'} Position Created`;
        }
        if (activity.activityType === 'CANDIDATE_ADDED') {
            return `New Candidate: ${canName}`;
        }
        if (activity.activityType === 'STATUS_CHANGED') {
            return `Status Updated: ${canName}`;
        }
        return activity.activityTitle || activity.activityDescription || 'Performed an action';
    };

    const tabs = [
        { id: 'PROFILE', label: 'Profile' },
        { id: 'RECENT_ACTIVITY', label: 'Recent Activity' },
        { id: 'SECURITY_SETTINGS', label: 'Security Settings' }
    ];

    if (!user) return <div className="p-8">Loading profile...</div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500 pt-2 pb-12">
            {/* Top Navigation Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar mb-6">
                {tabs.map((tab) => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${
                            activeTab === tab.id ? 'text-blue-600 font-normal' : 'text-slate-500 font-normal hover:text-slate-700'
                        }`}
                    >
                        <span className="text-xs">{tab.label}</span>
                        {activeTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            <div className="flex flex-col lg:flex-row gap-6 items-stretch">
                {/* Left Card: Profile Summary */}
                <div className="w-full lg:w-[320px] shrink-0">
                    <div className="bg-white rounded-2xl border border-slate-100 p-8 flex flex-col items-center text-center shadow-sm h-full">
                        <div className="relative mb-6">
                            <div className="w-24 h-24 rounded-full bg-orange-100 border-4 border-white shadow-sm overflow-hidden">
                                <img 
                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${user.username || 'Admin'}`} 
                                    alt="Avatar" 
                                    className="w-full h-full object-cover"
                                />
                            </div>
                        </div>

                        <h2 className="text-xl font-bold text-slate-900 mb-1">{user.username || 'User Name'}</h2>
                        <p className="text-sm text-slate-500 mb-4 font-normal">{user.role?.name || 'Administrator'}</p>
                        
                        <div className="px-3 py-1 bg-green-50 text-green-600 text-[10px] font-normal rounded-full border border-green-100 mb-8">
                            Active
                        </div>

                        <div className="w-full pt-8 border-t border-slate-100/60 space-y-4">
                            <div className="flex items-center justify-between text-left">
                                <span className="text-[11px] text-slate-400 font-normal">Last Login</span>
                                <span className="text-[11px] font-normal text-slate-900">Today at 9:30 AM</span>
                            </div>
                            <div className="flex items-center justify-between text-left">
                                <span className="text-[11px] text-slate-400 font-normal">Access Level</span>
                                <div className="px-3 py-1 bg-purple-50 text-purple-600 text-[10px] font-normal rounded-full border border-purple-100">
                                    Full Access
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Area: Content Area */}
                <div className="flex-1 min-w-0">
                    <div className={`${activeTab === 'PROFILE' ? '' : 'bg-white rounded-2xl border border-slate-100 p-8 shadow-sm'} h-full`}>
                        {activeTab === 'PROFILE' && (
                            <div className="space-y-4 animate-in slide-in-from-right-4 duration-300">
                                {/* Personal Information Card */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                            <User className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">Personal Information</h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                        <InfoField icon={Mail} label="Email" value={user.email} />
                                        <InfoField icon={Phone} label="Phone" value={user.phoneNumber || '+91 9876543210'} />
                                        <InfoField icon={MapPin} label="Location" value={college?.city || 'Bangalore, India'} />
                                        <InfoField icon={Calendar} label="Valid Till" value={credits?.validTill ? new Date(credits.validTill).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unlimited'} />
                                    </div>
                                </div>

                                {/* College Information Card */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                    <div className="flex items-center gap-3 mb-5">
                                        <div className="p-2 bg-blue-50 rounded-lg text-blue-600">
                                            <Building className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">
                                            {user.isCollege ? 'College Information' : 'Company Information'}
                                        </h3>
                                    </div>
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-12">
                                        <InfoField 
                                            icon={Building} 
                                            label={user.isCollege ? 'College Name' : 'Company Name'} 
                                            value={college?.collegeName || college?.companyName || user.organizationName} 
                                        />
                                        <InfoField 
                                            icon={Shield} 
                                            label={user.isCollege ? 'University' : 'Industry Type'} 
                                            value={college?.university || college?.industryType} 
                                        />
                                        <InfoField 
                                            icon={Mail} 
                                            label={user.isCollege ? 'College Email' : 'Company Email'} 
                                            value={college?.collegeEmail || college?.companyEmail} 
                                        />
                                        <InfoField 
                                            icon={Monitor} 
                                            label="Website URL" 
                                            value={college?.websiteUrl} 
                                        />
                                        <InfoField 
                                            icon={MapPin} 
                                            label="City" 
                                            value={college?.city} 
                                        />
                                        <InfoField 
                                            icon={Hash} 
                                            label="Pincode" 
                                            value={college?.pincode} 
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        {activeTab === 'RECENT_ACTIVITY' && (
                            <div className="animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center justify-between mb-8">
                                    <div className="flex items-center gap-3">
                                        <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                            <Activity className="w-5 h-5" />
                                        </div>
                                        <h3 className="text-base font-bold text-slate-900">Recent Activity</h3>
                                    </div>
                                    <button 
                                        onClick={() => navigate('/inbox')}
                                        className="text-[11px] font-normal text-blue-500 hover:underline"
                                    >
                                        View More
                                    </button>
                                </div>
                                <div className="space-y-2">
                                    {activities.slice(0, 4).length > 0 ? activities.slice(0, 4).map((activity, idx) => (
                                        <div key={activity.id || idx} className="flex gap-4 group">
                                            <div className="relative flex flex-col items-center">
                                                <div className="w-2 h-2 rounded-full bg-blue-600 mt-2 shrink-0 z-10" />
                                                {idx !== activities.slice(0, 4).length - 1 && (
                                                    <div className="absolute top-4 w-px h-[calc(100%+8px)] bg-slate-100" />
                                                )}
                                            </div>
                                            <div className="flex-1 pb-3 border-b border-slate-50 last:border-0">
                                                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                                                    <p className="text-xs font-normal text-slate-900 group-hover:text-blue-600 transition-colors">
                                                        {getActivityTitle(activity)}
                                                    </p>
                                                    <span className="text-[10px] text-slate-400 font-normal">
                                                        {formatRelativeTime(activity.createdAt)}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-2 flex-wrap">
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[9px] font-normal rounded uppercase">
                                                        {activity.actorName || 'System'}
                                                    </span>
                                                    {/* Position code for JOB_POSTED */}
                                                    {activity.activityType === 'JOB_POSTED' && activity.metadata?.positionId && (
                                                        <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-normal rounded uppercase">
                                                            {activity.metadata.positionId}
                                                        </span>
                                                    )}
                                                    {/* Candidate code for CANDIDATE_ADDED */}
                                                    {activity.activityType === 'CANDIDATE_ADDED' && activity.metadata?.candidateCode && (
                                                        <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-normal rounded uppercase">
                                                            {activity.metadata.candidateCode}
                                                        </span>
                                                    )}
                                                    {/* Position + Candidate code for INTERVIEW_SCHEDULED or STATUS_CHANGED */}
                                                    {(activity.activityType === 'INTERVIEW_SCHEDULED' || activity.activityType === 'STATUS_CHANGED') && (
                                                        <>
                                                            {activity.metadata?.positionId && (
                                                                <span className="px-2 py-0.5 bg-blue-50 text-blue-600 text-[9px] font-normal rounded uppercase">
                                                                    {activity.metadata.positionId}
                                                                </span>
                                                            )}
                                                            {activity.metadata?.candidateCode && (
                                                                <span className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[9px] font-normal rounded uppercase">
                                                                    {activity.metadata.candidateCode}
                                                                </span>
                                                            )}
                                                        </>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )) : (
                                        <div className="text-center py-12 text-slate-400 text-sm">
                                            No recent activities found
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {activeTab === 'SECURITY_SETTINGS' && (
                            <div className="space-y-8 animate-in slide-in-from-right-4 duration-300">
                                <div className="flex items-center gap-3 mb-2">
                                    <div className="p-2 bg-purple-50 rounded-lg text-purple-600">
                                        <Shield className="w-5 h-5" />
                                    </div>
                                    <h3 className="text-base font-bold text-slate-900">Security Settings</h3>
                                </div>

                                <div className="space-y-8">
                                    {/* Active Devices */}
                                    <div className="space-y-4">
                                        {[
                                            { device: 'MacBook Pro', lastUsed: 'Today at 9:30 AM', icon: Monitor },
                                            { device: 'iPhone 14 Pro', lastUsed: 'Yesterday at 3:45 PM', icon: Hash },
                                            { device: 'iPad Air', lastUsed: '2 days ago', icon: Monitor }
                                        ].map((item, i) => (
                                            <div key={i} className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                                                <div className="flex items-center gap-4">
                                                    <div className="p-2.5 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                                        <item.icon className="w-5 h-5" />
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-normal text-slate-900">{item.device}</h4>
                                                        <p className="text-[10px] text-slate-400 font-normal">Last used: {item.lastUsed}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-6">
                                                    <span className="text-[9px] font-normal text-green-500 uppercase tracking-wider">Active</span>
                                                    <button className="text-slate-300 hover:text-red-500 transition-colors">
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Password */}
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div>
                                            <h4 className="text-xs font-normal text-slate-900 mb-0.5">Password</h4>
                                            <p className="text-[11px] text-slate-400 font-normal">Last changed 30 days ago</p>
                                        </div>
                                        <button className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[11px] font-normal rounded-lg hover:bg-slate-50 transition-all">
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

const InfoField = ({ icon: Icon, label, value }) => (
    <div className="flex items-start gap-4 flex-1">
        <div className="shrink-0 pt-0.5">
            <Icon className="w-4 h-4 text-slate-300" />
        </div>
        <div className="flex-1 min-w-0">
            <label className="block text-[10px] font-normal text-slate-500 mb-1">{label}</label>
            <p className="text-xs font-normal text-slate-900 truncate">{value || 'Not provided'}</p>
        </div>
    </div>
);

export default Profile;
