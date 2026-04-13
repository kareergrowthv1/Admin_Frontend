import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Pagination from '../../components/common/Pagination';
import axios from '../../config/axios';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import { MoreVertical, RefreshCw, Briefcase, Plus, Users, GraduationCap } from 'lucide-react';
import AddAtsCandidateModal from '../candidates/AddAtsCandidateModal';

const Jobs = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('ALL');
    const [searchTerm, setSearchTerm] = useState('');
    const [jobs, setJobs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(0);
    const [pageSize, setPageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [statusCounts, setStatusCounts] = useState({
        ALL: 0,
        ACTIVE: 0,
        INACTIVE: 0,
        HOLD: 0,
        DRAFT: 0,
        CLOSED: 0
    });
    const [activeDropdownId, setActiveDropdownId] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [selectedJobForCandidate, setSelectedJobForCandidate] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [subUsers, setSubUsers] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const filterRef = useRef(null);
    const dropdownRef = useRef(null);
    const [advancedFilters, setAdvancedFilters] = useState({
        status: [],
        client: '',
        priority: '',
        domain: '',
        createdBy: '',
        jobTypes: [],
        orderBy: 'Newest to Oldest'
    });

    const statusOptions = ['ACTIVE', 'INACTIVE', 'HOLD', 'DRAFT', 'CLOSED'];

    const formatStatusName = (status) => {
        if (!status) return '';
        if (status === 'ALL') return 'All';
        return status.charAt(0).toUpperCase() + status.slice(1).toLowerCase().replace('_', ' ');
    };

    const fetchStatusCounts = async () => {
        try {
            const dataScope = JSON.parse(localStorage.getItem('jobsPermissions') || '[]').includes('READ') ? 'ALL' : 'OWN';
            const params = {};
            if (dataScope === 'OWN') {
                params.createdBy = localStorage.getItem('userId');
            }
            const res = await axios.get('/admins/jobs/counts', { params });
            if (res.data.success) {
                setStatusCounts(res.data.data);
            }
        } catch (err) {
            console.error('Failed to fetch jobs counts:', err);
        }
    };

    const fetchJobs = async (isManualRefresh = false) => {
        if (isManualRefresh) setIsRefreshing(true);
        else setLoading(true);
        
        try {
            const params = {
                limit: pageSize,
                offset: currentPage * pageSize,
                status: activeTab !== 'ALL' ? activeTab : (advancedFilters.status.length > 0 ? advancedFilters.status.join(',') : undefined),
                search: searchTerm || undefined,
                priority: advancedFilters.priority || undefined,
                domain: advancedFilters.domain || undefined,
                createdBy: advancedFilters.createdBy || undefined,
                jobTypes: advancedFilters.jobTypes.length > 0 ? advancedFilters.jobTypes.join(',') : undefined,
                sortBy: advancedFilters.orderBy || undefined
            };

            const res = await axios.get('/admins/jobs', { params });
            if (res.data.success) {
                setJobs(res.data.data);
                setTotalElements(res.data.totalElements || 0);
                setTotalPages(Math.ceil((res.data.totalElements || 0) / pageSize));
            }
        } catch (err) {
            console.error('Failed to fetch jobs:', err);
            toast.error('Failed to load jobs');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    };

    const fetchSubUsers = async () => {
        try {
            const orgId = localStorage.getItem('organizationId');
            if (orgId) {
                const res = await authAPI.getUsersByOrganizationId(orgId);
                setSubUsers(res.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching sub users:', error);
        }
    };

    useEffect(() => {
        fetchJobs();
        fetchSubUsers();
        fetchStatusCounts();
    }, [activeTab, currentPage, searchTerm, advancedFilters]);

    // Close dropdown on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setActiveDropdownId(null);
            }
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };
        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                setShowFilters(false);
                setActiveDropdownId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        document.addEventListener('keydown', handleEscKey);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, []);

    const handleStatusChange = async (jobId, newStatus) => {
        try {
            await axios.put(`/admins/jobs/${jobId}/status`, { status: newStatus });
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, status: newStatus } : j));
            toast.success(`Status updated to ${newStatus}`);
            setActiveDropdownId(null);
        } catch (err) {
            toast.error('Failed to update status');
        }
    };

    const handleVisibilityChange = async (jobId, isPublic) => {
        try {
            await axios.put(`/admins/jobs/${jobId}/visibility`, { showToVendor: isPublic });
            setJobs(prev => prev.map(j => j.id === jobId ? { ...j, showToVendor: isPublic ? 1 : 0 } : j));
            toast.success(`Visibility updated to ${isPublic ? 'Public' : 'Private'}`);
            setActiveDropdownId(null);
        } catch (err) {
            toast.error('Failed to update visibility');
        }
    };

    const getStatusColor = (status) => {
        switch (status) {
            case 'ACTIVE': return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'HOLD': return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'CLOSED': return 'bg-red-50 text-red-600 border-red-100';
            default: return 'bg-slate-50 text-slate-400 border-slate-100';
        }
    };

    const getVisibilityColor = (isPublic) => {
        return isPublic 
            ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
            : 'bg-slate-50 text-slate-500 border-slate-200';
    };

    const getTimeAgo = (dateStr) => {
        if (!dateStr) return '';
        try {
            const date = new Date(dateStr);
            const now = new Date();
            const diffMs = Math.max(0, now - date);
            const diffMin = Math.floor(diffMs / (1000 * 60));
            const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffHrs / 24);

            if (diffMin < 60) return `${diffMin}min`;
            if (diffHrs < 24) return `${diffHrs}hr`;
            if (diffDays < 7) return `${diffDays}dy`;
            return `${Math.floor(diffDays / 7)}wk`;
        } catch (e) { return ''; }
    };

    const handleRefresh = () => fetchJobs(true);

    return (
        <div className="space-y-6 pt-2 pb-12">
            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {['ALL', ...statusOptions].map((tab) => (
                    <button
                        key={tab}
                        onClick={() => { setActiveTab(tab); setCurrentPage(0); }}
                        className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${activeTab === tab ? 'text-blue-600 font-normal' : 'text-black font-normal hover:text-blue-600'}`}
                    >
                        <span className="text-xs transition-colors">{formatStatusName(tab)}</span>
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === tab ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                            {statusCounts[tab] || 0}
                        </span>
                        {activeTab === tab && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                        )}
                    </button>
                ))}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[200px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search jobs..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        value={searchTerm}
                        onChange={(e) => { setSearchTerm(e.target.value); setCurrentPage(0); }}
                    />
                </div>

                <button
                    onClick={handleRefresh}
                    className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm shrink-0"
                    title="Refresh"
                >
                    <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                </button>

                <div className="flex items-center gap-3">
                    <div className="relative" ref={filterRef}>
                        <button 
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            More Filters
                        </button>

                        {/* More Filters Dropdown */}
                        {showFilters && (
                            <div className="absolute right-0 mt-2 w-[320px] bg-white rounded-xl border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-[110] overflow-hidden">
                                <div className="p-4 space-y-4 max-h-[450px] overflow-y-auto no-scrollbar">
                                    {/* Status */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {statusOptions.map((status) => (
                                                <label key={status} className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox"
                                                        checked={advancedFilters.status.includes(status)}
                                                        onChange={(e) => {
                                                            const newStatus = e.target.checked 
                                                                ? [...advancedFilters.status, status]
                                                                : advancedFilters.status.filter(s => s !== status);
                                                            setAdvancedFilters({ ...advancedFilters, status: newStatus });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{status}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Job Types */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Job Type</label>
                                        <div className="grid grid-cols-2 gap-x-4 gap-y-2">
                                            {['FULL_TIME', 'PART_TIME', 'CONTRACT', 'INTERNSHIP', 'FREELANCE'].map((type) => (
                                                <label key={type} className="flex items-center gap-2 cursor-pointer group">
                                                    <input 
                                                        type="checkbox"
                                                        checked={advancedFilters.jobTypes.includes(type)}
                                                        onChange={(e) => {
                                                            const newTypes = e.target.checked 
                                                                ? [...advancedFilters.jobTypes, type]
                                                                : advancedFilters.jobTypes.filter(t => t !== type);
                                                            setAdvancedFilters({ ...advancedFilters, jobTypes: newTypes });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{type.replace('_', ' ')}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Priority */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Priority</label>
                                        <select 
                                            value={advancedFilters.priority}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, priority: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
                                        >
                                            <option value="">All Priorities</option>
                                            <option value="HIGH">High</option>
                                            <option value="MEDIUM">Medium</option>
                                            <option value="LOW">Low</option>
                                        </select>
                                    </div>

                                    {/* Created By */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Created By</label>
                                        <div className="relative">
                                            <input 
                                                type="text"
                                                placeholder="Search user..."
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
                                                value={userSearchTerm}
                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                            />
                                            <select 
                                                value={advancedFilters.createdBy}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, createdBy: e.target.value })}
                                                className="w-full mt-1 bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
                                            >
                                                <option value="">All Users</option>
                                                {subUsers
                                                    .filter(u => `${u.first_name || ''} ${u.last_name || ''}`.toLowerCase().includes(userSearchTerm.toLowerCase()))
                                                    .map(user => (
                                                        <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                                                    ))
                                                }
                                            </select>
                                        </div>
                                    </div>

                                    {/* Order By */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order By</label>
                                        <select 
                                            value={advancedFilters.orderBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, orderBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
                                        >
                                            <option value="Newest to Oldest">Newest to Oldest</option>
                                            <option value="Oldest to Newest">Oldest to Newest</option>
                                            <option value="Job Title (A - Z)">Job Title (A - Z)</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button 
                                        onClick={() => {
                                            setAdvancedFilters({
                                                status: [],
                                                client: '',
                                                priority: '',
                                                domain: '',
                                                createdBy: '',
                                                jobTypes: [],
                                                orderBy: 'Newest to Oldest'
                                            });
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button 
                                        onClick={() => { setShowFilters(false); fetchJobs(); }}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => navigate('/jobs/create')}
                        className="ml-auto flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        + New Job
                    </button>
                </div>
            </div>

            {/* Table Container */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <div className="relative">
                    <table className="w-full text-left border-collapse table-fixed">
                        <thead>
                            <tr className="bg-slate-50/50 border-b border-slate-200 uppercase tracking-widest text-center">
                                <th className="pl-8 px-2 py-4 text-[10px] font-bold text-slate-400 text-left w-[8%]">Job Code</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-left w-[12%]">Job Title</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Location</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Priority</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Visibility</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Experience</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Candidates</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Resumes</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">SPOC</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[10%]">Status</th>
                                <th className="px-2 py-4 text-[10px] font-bold text-slate-400 text-center w-[8%]">Posted</th>
                                <th className="pr-4 px-2 py-4 text-[10px] font-bold text-slate-400 text-right w-[6%]">Actions</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="12" className="py-12 text-center">
                                        <div className="flex items-center justify-center">
                                            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                                        </div>
                                    </td>
                                </tr>
                            ) : jobs.length === 0 ? (
                                <tr>
                                    <td colSpan="12" className="py-12 text-center text-black text-sm font-medium">No jobs found</td>
                                </tr>
                            ) : (
                                jobs.map((job) => (
                                    <tr key={job.id} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="pl-8 px-2 py-4">
                                            <span className="text-[11px] text-black font-normal tracking-tight whitespace-nowrap">
                                                {job.code}
                                            </span>
                                        </td>
                                        <td className="px-2 py-4">
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                <span 
                                                    onClick={() => navigate(`/jobs/applications/${job.id}`)}
                                                    className="text-sm text-black font-normal truncate cursor-pointer hover:text-blue-600 transition-colors"
                                                >
                                                    {job.jobTitle}
                                                </span>
                                                <span className="text-[11px] text-black font-normal truncate">{job.clientName}</span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-left">
                                            <div className="flex flex-col gap-0.5 line-clamp-1">
                                                <p className="text-xs text-black font-normal">{job.location}</p>
                                                <p className="text-[11px] text-slate-400 uppercase tracking-tight font-normal">{job.jobType?.replace('_', ' ')}</p>
                                            </div>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded text-[10px] font-normal ${job.priorityLevel === 'HIGH' ? 'text-red-500 bg-red-50 border border-red-100' : 'text-amber-500 bg-amber-50 border border-amber-100'}`}>
                                                {job.priorityLevel}
                                            </span>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <div className="relative group/status inline-block">
                                                <select
                                                    value={!!job.showToVendor}
                                                    onChange={(e) => handleVisibilityChange(job.id, e.target.value === 'true')}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-normal border cursor-pointer appearance-none outline-none text-center min-w-[75px] transition-all shadow-sm ${getVisibilityColor(!!job.showToVendor).replace(/text-[a-z]+-\d+/, 'text-black')}`}
                                                >
                                                    <option value="true" className="bg-white text-black text-xs">Public</option>
                                                    <option value="false" className="bg-white text-black text-xs">Private</option>
                                                </select>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover/status:opacity-100 transition-opacity">
                                                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <p className="text-xs text-black font-normal">{job.experience || '0-0'} Yrs</p>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <div 
                                                onClick={() => navigate(`/candidates?jobId=${job.id}`)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-blue-50 text-blue-600 rounded-2xl border border-blue-100 hover:bg-blue-100 transition-all shadow-sm active:scale-95 cursor-pointer"
                                            >
                                                <Users size={16} className="opacity-70" />
                                                <span className="text-xs font-bold">{job.totalCandidates || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <div 
                                                onClick={() => navigate(`/candidates?jobId=${job.id}`)}
                                                className="inline-flex items-center gap-2 px-4 py-2 bg-purple-50 text-purple-600 rounded-2xl border border-purple-100 hover:bg-purple-100 transition-all shadow-sm active:scale-95 cursor-pointer"
                                            >
                                                <GraduationCap size={16} className="opacity-70" />
                                                <span className="text-xs font-bold">{job.resumeCandidates || 0}</span>
                                            </div>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            {job.spocName ? (
                                                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] bg-slate-100 text-black font-normal truncate max-w-[85px]">
                                                    {job.spocName}
                                                </span>
                                            ) : (
                                                <span className="text-xs text-black font-normal">-</span>
                                            )}
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <div className="relative group/status inline-block">
                                                <select
                                                    value={job.status}
                                                    onChange={(e) => handleStatusChange(job.id, e.target.value)}
                                                    className={`px-3 py-1 rounded-full text-[10px] font-normal border cursor-pointer appearance-none outline-none text-center min-w-[75px] transition-all shadow-sm ${getStatusColor(job.status).replace(/text-[a-z]+-\d+/, 'text-black')}`}
                                                >
                                                    {['ACTIVE', 'INACTIVE', 'HOLD', 'DRAFT', 'CLOSED'].map(status => (
                                                        <option key={status} value={status} className="bg-white text-black text-xs">
                                                            {formatStatusName(status)}
                                                        </option>
                                                    ))}
                                                </select>
                                                <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none opacity-40 group-hover/status:opacity-100 transition-opacity">
                                                    <svg className="w-2 h-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M19 9l-7 7-7-7" />
                                                    </svg>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-1 py-4 text-center">
                                            <p className="text-xs text-black font-normal whitespace-nowrap">{getTimeAgo(job.createdAt)}</p>
                                        </td>
                                        <td className="pr-4 px-1 py-4 text-right relative">
                                            <button
                                                onClick={() => setActiveDropdownId(activeDropdownId === job.id ? null : job.id)}
                                                className={`p-2 rounded-full transition-all ${activeDropdownId === job.id ? 'bg-slate-100 text-blue-600' : 'text-black/40 hover:text-black hover:bg-slate-50'}`}
                                            >
                                                <MoreVertical size={18} />
                                            </button>

                                            {activeDropdownId === job.id && (
                                                <div
                                                    ref={dropdownRef}
                                                    className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-[100] animate-in fade-in zoom-in duration-200"
                                                >
                                                    <button
                                                        onClick={() => { 
                                                            setSelectedJobForCandidate(job.id);
                                                            setIsAddModalOpen(true);
                                                            setActiveDropdownId(null); 
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-emerald-600 hover:bg-emerald-50 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                                                        </svg>
                                                        Upload Resume
                                                    </button>
                                                    <button
                                                        onClick={() => { navigate(`/jobs/details/${job.id}`); setActiveDropdownId(null); }}
                                                        className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                                                        </svg>
                                                        View Details
                                                    </button>
                                                    <button
                                                        onClick={() => { navigate(`/jobs/edit/${job.id}`); setActiveDropdownId(null); }}
                                                        className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                        </svg>
                                                        Edit Job
                                                    </button>
                                                    <button
                                                        onClick={() => { 
                                                            navigate('/admins/positions/setup-interview', { 
                                                                state: { 
                                                                    position: { 
                                                                        id: job.id, 
                                                                        title: job.jobTitle, 
                                                                        code: job.code 
                                                                    } 
                                                                } 
                                                            }); 
                                                            setActiveDropdownId(null); 
                                                        }}
                                                        className="w-full px-4 py-2.5 text-left text-[11px] font-normal text-black hover:bg-slate-50 flex items-center gap-2"
                                                    >
                                                        <svg className="w-4 h-4 text-black/40" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                                        </svg>
                                                        Set Up Interview
                                                    </button>
                                                </div>
                                            )}
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Pagination */}
            <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                pageSize={pageSize}
                totalElements={totalElements}
            />
            <AddAtsCandidateModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onRefresh={handleRefresh}
                jobId={selectedJobForCandidate}
            />
        </div>
    );
};

export default Jobs;
