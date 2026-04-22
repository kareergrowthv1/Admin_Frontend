import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
    User, Mail, Phone, MapPin, Calendar, Building, 
    Briefcase, Hash, Clock, Shield, Monitor, Trash2, 
    Activity
} from 'lucide-react';
import axios from '../config/axios';
import { authAPI } from '../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import { clearAuthStorage } from '../utils/authStorage';

const Profile = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('PROFILE');
    const [user, setUser] = useState(null);
    const [college, setCollege] = useState(null);
    const [credits, setCredits] = useState(null);
    const [activities, setActivities] = useState([]);
    const [isChangePasswordOpen, setIsChangePasswordOpen] = useState(false);
    const [passwordForm, setPasswordForm] = useState({ oldPassword: '', newPassword: '', confirmPassword: '' });
    const [isChangingPassword, setIsChangingPassword] = useState(false);
    const [isLoggingOutDevice, setIsLoggingOutDevice] = useState(false);

    useEffect(() => {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        if (!storedUser || !storedUser.id) {
            setUser(null);
            return;
        }

        setUser(storedUser);
        fetchActivities(storedUser.id);
        fetchCredits(storedUser.id);
        if (storedUser.organizationId) {
            fetchCollegeDetails(storedUser.organizationId, storedUser.isCollege);
        }
        fetchUserProfile(storedUser.id);
    }, []);

    const fetchUserProfile = async (userId) => {
        try {
            const response = await authAPI.getUserById(userId);
            const latestUser = response.data?.data?.user;
            if (latestUser) {
                setUser(latestUser);
                localStorage.setItem('admin_user', JSON.stringify(latestUser));
            }
        } catch (error) {
            console.error('Failed to fetch latest profile data:', error);
        }
    };

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

    const resolveLastLoginAt = (u) => {
        if (!u) return null;
        return u.lastLoginAt || u.last_login_at || u.lastLogin || u.last_login || null;
    };

    const resolvePasswordChangedAt = (u) => {
        if (!u) return null;
        return u.passwordChangedAt || u.password_changed_at || u.updatedAt || u.updated_at || null;
    };

    const parseProfileTimestamp = (value) => {
        if (!value) return null;

        if (value instanceof Date) {
            return Number.isNaN(value.getTime()) ? null : value;
        }

        const raw = String(value).trim();
        if (!raw) return null;

        // Backend timestamps are treated as wall-clock values for profile display.
        // Remove trailing timezone marker to avoid timezone jump in browser rendering.
        const normalized = raw.endsWith('Z') ? raw.slice(0, -1) : raw;
        const parsed = new Date(normalized);
        return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    const getDaysSince = (dateString) => {
        if (!dateString) return null;
        const parsed = parseProfileTimestamp(dateString);
        if (!parsed) return null;
        const now = new Date();
        const diffMs = now.getTime() - parsed.getTime();
        return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
    };

    const formatDateTime = (dateString) => {
        if (!dateString) return 'Not available';
        const parsed = parseProfileTimestamp(dateString);
        if (!parsed) return 'Not available';
        return parsed.toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    const getCurrentDeviceName = () => {
        if (typeof navigator === 'undefined') return 'Current Device';
        const ua = navigator.userAgent || '';
        if (ua.includes('Mac')) return 'Mac Device';
        if (ua.includes('Windows')) return 'Windows Device';
        if (ua.includes('iPhone')) return 'iPhone';
        if (ua.includes('iPad')) return 'iPad';
        if (ua.includes('Android')) return 'Android Device';
        return 'Current Device';
    };

    const handlePasswordChange = async (e) => {
        e.preventDefault();
        const { oldPassword, newPassword, confirmPassword } = passwordForm;

        if (!oldPassword || !newPassword || !confirmPassword) {
            toast.error('All password fields are required');
            return;
        }
        if (newPassword !== confirmPassword) {
            toast.error('New password and confirm password do not match');
            return;
        }

        try {
            setIsChangingPassword(true);
            await authAPI.changePassword({ oldPassword, newPassword });
            toast.success('Password changed successfully');
            setIsChangePasswordOpen(false);
            setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
            if (user?.id) await fetchUserProfile(user.id);
        } catch (error) {
            const msg = error?.response?.data?.message || error?.response?.data?.error || 'Failed to change password';
            toast.error(msg);
        } finally {
            setIsChangingPassword(false);
        }
    };

    const handleLogoutCurrentDevice = async () => {
        try {
            setIsLoggingOutDevice(true);
            await authAPI.logout();
        } catch (error) {
            console.error('Logout failed:', error);
        } finally {
            // Always clear local session and redirect.
            clearAuthStorage();
            window.location.href = '/login';
        }
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
                                <span className="text-[11px] font-normal text-slate-900">{formatDateTime(resolveLastLoginAt(user))}</span>
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
                                        <div className="flex items-center justify-between p-4 bg-slate-50/50 rounded-xl border border-slate-100 group hover:border-blue-200 transition-all">
                                            <div className="flex items-center gap-4">
                                                <div className="p-2.5 bg-white rounded-lg shadow-sm text-slate-400 group-hover:text-blue-500 transition-colors">
                                                    <Monitor className="w-5 h-5" />
                                                </div>
                                                <div>
                                                    <h4 className="text-xs font-normal text-slate-900">{getCurrentDeviceName()}</h4>
                                                    <p className="text-[10px] text-slate-400 font-normal">Last used: {formatDateTime(resolveLastLoginAt(user))}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <span className="text-[9px] font-normal text-green-500 uppercase tracking-wider">Active</span>
                                                <button
                                                    onClick={handleLogoutCurrentDevice}
                                                    disabled={isLoggingOutDevice}
                                                    className="px-3 py-1 text-[10px] font-normal text-red-600 border border-red-200 rounded-md hover:bg-red-50 disabled:opacity-60"
                                                >
                                                    {isLoggingOutDevice ? 'Logging out...' : 'Logout'}
                                                </button>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Password */}
                                    <div className="flex items-center justify-between pt-6 border-t border-slate-50">
                                        <div>
                                            <h4 className="text-xs font-normal text-slate-900 mb-0.5">Password</h4>
                                            <p className="text-[11px] text-slate-400 font-normal">
                                                Last changed {(() => {
                                                    const days = getDaysSince(resolvePasswordChangedAt(user));
                                                    if (days === null) return 'Not available';
                                                    if (days === 0) return 'today';
                                                    if (days === 1) return '1 day ago';
                                                    return `${days} days ago`;
                                                })()}
                                            </p>
                                            <p className="text-[10px] text-slate-400 font-normal mt-0.5">
                                                Updated at {formatDateTime(resolvePasswordChangedAt(user))}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setIsChangePasswordOpen(true)}
                                            className="px-4 py-2 bg-white border border-slate-200 text-slate-600 text-[11px] font-normal rounded-lg hover:bg-slate-50 transition-all"
                                        >
                                            Change
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {isChangePasswordOpen && (
                <div className="fixed inset-0 bg-black/30 z-[120] flex items-center justify-center p-4">
                    <div className="w-full max-w-md bg-white rounded-2xl border border-slate-100 shadow-xl p-6">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-base font-bold text-slate-900">Change Password</h3>
                            <button
                                onClick={() => {
                                    setIsChangePasswordOpen(false);
                                    setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                }}
                                className="text-slate-400 hover:text-slate-600"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>

                        <form onSubmit={handlePasswordChange} className="space-y-4">
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Current Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.oldPassword}
                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, oldPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.newPassword}
                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                    required
                                />
                            </div>
                            <div>
                                <label className="block text-[11px] text-slate-500 mb-1">Confirm New Password</label>
                                <input
                                    type="password"
                                    value={passwordForm.confirmPassword}
                                    onChange={(e) => setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm outline-none focus:border-blue-400"
                                    required
                                />
                            </div>

                            <div className="flex items-center justify-end gap-2 pt-2">
                                <button
                                    type="button"
                                    onClick={() => {
                                        setIsChangePasswordOpen(false);
                                        setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' });
                                    }}
                                    className="px-4 py-2 text-xs border border-slate-200 rounded-lg text-slate-600 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                                <button
                                    type="submit"
                                    disabled={isChangingPassword}
                                    className="px-4 py-2 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-60"
                                >
                                    {isChangingPassword ? 'Updating...' : 'Update Password'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
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
