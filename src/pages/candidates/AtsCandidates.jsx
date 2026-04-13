import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import Pagination from '../../components/common/Pagination';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import { X, Users, Briefcase, RefreshCw, FileText, Trash2, Plus, Mail, ChevronDown, ChevronRight, Calendar, Search, Filter } from 'lucide-react';
import AddAtsCandidateModal from './AddAtsCandidateModal';

const AtsCandidates = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const jobId = searchParams.get('jobId');

    const [activeTab, setActiveTab] = useState(searchParams.get('status') || 'ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [totalElements, setTotalElements] = useState(0);
    const [statusCounts, setStatusCounts] = useState({});
    const [stages, setStages] = useState([]);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [organizationId, setOrganizationId] = useState(null);
    const [jobDetails, setJobDetails] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [openStageMenuId, setOpenStageMenuId] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, buttonRight: 0 });
    const [noQuestionSetModal, setNoQuestionSetModal] = useState(false);
    const [selectedJobIdForSetup, setSelectedJobIdForSetup] = useState(null);
    const [subUsers, setSubUsers] = useState([]);
    const menuRef = useRef(null);
    const filterRef = useRef(null);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [showFilters, setShowFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        stages: [],
        createdBy: '',
        dateFrom: '',
        dateTo: '',
        orderBy: 'Newest to Oldest'
    });

    const STAGE_TABS = [
        'ALL',
        'invitations',
        'ai_test',
        'recommended',
        'cautiously_recommended',
        'REJECTED',
        'resume_rejected',
        'hr_round',
        'offer_letter_sent'
    ];

    useEffect(() => {
        try {
            const orgId = localStorage.getItem('organizationId');
            if (orgId) setOrganizationId(orgId);
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
    }, []);

    useEffect(() => {
        const handleClick = (e) => {
            if (menuRef.current && !menuRef.current.contains(e.target)) {
                setOpenMenuId(null);
            }
            if (filterRef.current && !filterRef.current.contains(e.target)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);


    const fetchStatusCounts = async () => {
        try {
            const orgId = localStorage.getItem('organizationId');
            if (!orgId) return;
            const res = await axios.get('/admins/ats-candidates/status-counts', {
                params: { organization_id: orgId, jobId: jobId || undefined }
            });
            if (res.data?.success) setStatusCounts(res.data.data || {});
        } catch (err) { console.error('Failed to fetch status counts:', err); }
    };

    const fetchJobStages = async () => {
        try {
            const res = await axios.get('/admins/ats-job-stages');
            if (res.data?.success) setStages(res.data.data || []);
        } catch (err) { console.error('Failed to fetch stages:', err); }
    };

    const fetchSubUsers = async () => {
        try {
            const orgId = localStorage.getItem('organizationId');
            if (orgId) {
                const { authAPI } = await import('../../features/auth/authAPI');
                const res = await authAPI.getUsersByOrganizationId(orgId);
                setSubUsers(res.data.data || []);
            }
        } catch (error) {
            console.error('Error fetching sub-users:', error);
        }
    };

    const fetchCandidates = useCallback(async (isManualRefresh = false) => {
        if (!organizationId) return;
        if (isManualRefresh) setIsRefreshing(true);
        else setLoading(true);

        try {
            const params = {
                limit: pageSize,
                offset: page * pageSize,
                organization_id: organizationId,
                search: searchTerm || undefined,
                stage: activeTab === 'ALL' ? (advancedFilters.stages.length > 0 ? advancedFilters.stages.join(',') : undefined) : activeTab,
                createdBy: advancedFilters.createdBy || undefined,
                dateFrom: advancedFilters.dateFrom || undefined,
                dateTo: advancedFilters.dateTo || undefined,
                sortBy: advancedFilters.orderBy || undefined,
                jobId: jobId || undefined
            };
            const res = await axios.get('/admins/ats-candidates', { params });
            if (res.data?.success) {
                setCandidates(res.data.data);
                setTotalElements(res.data.totalElements || 0);
            }
        } catch (err) {
            console.error('Failed to fetch candidates:', err);
            toast.error('Failed to load candidates');
        } finally {
            setLoading(false);
            setIsRefreshing(false);
        }
    }, [organizationId, page, pageSize, jobId, activeTab, searchTerm, advancedFilters]);

    // Fetch job details independently when jobId is present
    useEffect(() => {
        const fetchJobDetails = async () => {
            if (!jobId) {
                setJobDetails(null);
                return;
            }
            try {
                const res = await axios.get(`/admins/jobs/${jobId}`);
                if (res.data?.success) {
                    setJobDetails(res.data.data);
                }
            } catch (err) {
                console.error('Error fetching job details:', err);
                setJobDetails(null);
            }
        };
        fetchJobDetails();
    }, [jobId]);

    useEffect(() => {
        fetchCandidates();
        fetchStatusCounts();
        fetchJobStages();
    }, [fetchCandidates, jobId]);

    const handleStageChange = async (candidateId, newStage, candidate) => {
        // Guard: moving to ai_test requires a question set and setup
        if (newStage === 'ai_test') {
            const hasQuestionSet = !!(candidate.questionSetId || candidate.question_set_id);
            if (!hasQuestionSet) {
                setSelectedJobIdForSetup(candidate.jobId || candidate.job_id);
                setNoQuestionSetModal(true);
                return;
            }

            // Trigger Assessment Setup Flow (Step-by-Step)
            try {
                toast.loading('Setting up assessment...', { id: 'setup-asmt' });

                // 1. Fetch Particular Application Details using Candidate ID
                // This ensures we have the correct application ID (candidates_job.id)
                let actualApplicationId = candidateId; // candidateId passed to the function is often the candidate_id
                let appData = candidate;
                try {
                    const appRes = await axios.get(`/admins/ats-applications/candidate/${candidateId}`);
                    if (appRes.data?.success) {
                        actualApplicationId = appRes.data.data.id;
                        appData = appRes.data.data;
                    }
                } catch (appErr) {
                    console.warn('Failed to fetch specific application details:', appErr);
                }

                // 2. Fetch Particular Candidate Details
                let candidateName = appData.name || candidate.name;
                try {
                    const candRes = await axios.get(`/admins/ats-candidates/${actualApplicationId}`);
                    if (candRes.data?.success) {
                        candidateName = candRes.data.data.name || candidateName;
                    }
                } catch (candErr) {
                    console.warn('Failed to fetch explicit candidate details:', candErr);
                }

                // 3. Fetch Particular Question Set Details
                let questionSetData = null;
                try {
                    const qSetRes = await axios.get(`/admins/question-sets?jobId=${candidate.jobId || candidate.job_id}`);
                    if (qSetRes.data?.success && qSetRes.data.data?.length > 0) {
                        questionSetData = qSetRes.data.data[0];
                    }
                } catch (qsErr) {
                    console.warn('Failed to fetch explicit question set details:', qsErr);
                }

                // 3. Fetch Organization/Company Details
                let companyName = 'Company';
                try {
                    const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
                    const orgId = candidate.organizationId || candidate.organization_id || storedUser?.organizationId || localStorage.getItem('organizationId');
                    const isCollegeRole = storedUser?.isCollege;
                    if (orgId) {
                        const endpoint = isCollegeRole ? `/admins/college-details/${orgId}` : `/admins/company-details/${orgId}`;
                        const res = await axios.get(endpoint);
                        companyName = res.data?.data?.companyName || res.data?.data?.collegeName || companyName;
                    }
                } catch (orgErr) {
                    console.warn('Failed to fetch organization details:', orgErr);
                }

                // 4. Call Setup Assessment with explicit granular metadata
                // actualApplicationId is the correct candidates_job.id
                const setupRes = await axios.post(`/admins/ats-candidates/${actualApplicationId}/setup-assessment`, {
                    companyName,
                    jobTitle: appData.jobTitle || appData.job_title || candidate.jobTitle || candidate.job_title,
                    candidateName: candidateName,
                    questionSetId: questionSetData?.id
                });

                if (setupRes.data?.success) {
                    toast.success('Assessment setup and link sent!', { id: 'setup-asmt' });

                    // 5. Update the stage via API ONLY AFTER SUCCESSFUL SETUP
                    await axios.put(`/admins/ats-candidates/${actualApplicationId}/stage`, { stage: newStage });
                    toast.success(`Stage updated to ${formatStageLabel(newStage)}`);
                    fetchCandidates();
                } else {
                    toast.error(setupRes.data?.message || 'Failed to setup assessment', { id: 'setup-asmt' });
                    return; // Stop if setup fails
                }
            } catch (err) {
                console.error('Failed to setup assessment:', err);
                toast.error('Error setting up assessment', { id: 'setup-asmt' });
                return;
            }
        }

        try {
            await axios.put(`/admins/ats-candidates/${candidateId}/stage`, { stage: newStage });
            toast.success(`Stage updated to ${formatStageLabel(newStage)}`);
            fetchCandidates();
        } catch (err) {
            console.error('Failed to update stage:', err);
            toast.error(err.response?.data?.message || 'Failed to update stage');
        }
    };

    const handleRefresh = () => fetchCandidates(true);

    const getStatusStyles = (status) => {
        const s = (status || '').toUpperCase();
        switch (s) {
            case 'INVITATIONS':
            case 'HIRED':
            case 'SELECTED':
                return 'bg-emerald-50 text-emerald-600 border-emerald-100';
            case 'AI_TEST':
            case 'INVITED':
                return 'bg-purple-50 text-purple-600 border-purple-100';
            case 'REJECTED':
            case 'NOT_RECOMMENDED':
            case 'RESUME_REJECTED':
                return 'bg-rose-50 text-rose-600 border-rose-100';
            case 'OFFER_LETTER_SENT':
            case 'OFFERED':
                return 'bg-blue-50 text-blue-600 border-blue-100';
            case 'SCHEDULED_INTERVIEW':
            case 'CAUTIOUSLY_RECOMMENDED':
                return 'bg-amber-50 text-amber-600 border-amber-100';
            case 'SHORTLISTED':
                return 'bg-cyan-50 text-cyan-600 border-cyan-100';
            case 'ACTIVE_CANDIDATES':
                return 'bg-slate-50 text-slate-500 border-slate-200';
            default:
                return 'bg-slate-50 text-slate-400 border-slate-100';
        }
    };

    const getScoreStyles = (score) => {
        if (score >= 80) return 'border-emerald-500 text-emerald-600';
        if (score >= 50) return 'border-amber-500 text-amber-600';
        return 'border-rose-500 text-rose-600';
    };

    const formatStageLabel = (stage) => {
        if (!stage) return '';
        const s = stage.toLowerCase();
        if (s === 'all') return 'All';
        if (s === 'active_candidates') return 'Active';
        if (s === 'invitations') return 'Selected';
        if (s === 'ai_test') return 'Invited';
        if (s === 'offer_letter_sent') return 'Offered';
        if (s === 'resume_rejected') return 'Resume Rejected';
        if (s === 'hired') return 'Hired';
        if (s === 'recommended') return 'Recommended';
        if (s === 'not_recommended') return 'Not Recommended';
        if (s === 'cautiously_recommended') return 'Cautiously Recommended';
        if (s === 'hr_round') return 'HR Round';
        if (s === 'rejected') return 'Rejected';

        // Check if it's a metadata stage object
        const meta = stages.find(stg => stg.stage_id === stage);
        if (meta) return meta.title;

        return stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    return (
        <div className="space-y-6 pt-2 pb-12">
            {/* Filtered by Position Indicator */}
            {jobId && jobDetails && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm border border-blue-200">
                            <Briefcase size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider leading-none mb-1">Filtered by Job</p>
                            <h3 className="text-sm font-bold text-blue-900 capitalize leading-none">{jobDetails.jobTitle}</h3>
                        </div>
                    </div>
                    <button
                        onClick={() => {
                            const newParams = new URLSearchParams(searchParams);
                            newParams.delete('jobId');
                            setSearchParams(newParams);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5 group"
                    >
                        <span>Clear Filter</span>
                        <X size={14} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}

            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {STAGE_TABS.map((stage) => {
                    const count = stage === 'ALL' ? statusCounts['ALL'] : (statusCounts[stage] || 0);
                    return (
                        <button
                            key={stage}
                            onClick={() => { setActiveTab(stage); setPage(0); }}
                            className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${activeTab === stage ? 'text-blue-600 font-normal' : 'text-black font-normal'}`}
                        >
                            <span className="text-xs">{formatStageLabel(stage)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === stage ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200'} transition-colors`}>
                                {count}
                            </span>
                            {activeTab === stage && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search candidates by name, email or code..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(0);
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <button
                        onClick={handleRefresh}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>

                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => {
                                setShowFilters(!showFilters);
                                if (!showFilters) {
                                    if (subUsers.length === 0) fetchSubUsers();
                                    if (stages.length === 0) fetchJobStages();
                                }
                            }}
                            className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-xs font-medium text-slate-600 hover:bg-slate-50 transition-all`}
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
                                    {/* Status (Stages) */}
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 tracking-wider">Status (Stage)</label>
                                        <div className="flex flex-col gap-2">
                                            {stages.length > 0 ? stages.map((stage) => {
                                                const stageId = stage.stage_id || stage;
                                                const stageTitle = typeof stage === 'object' ? stage.title : formatStageLabel(stage);
                                                return (
                                                    <label key={stageId} className="flex items-center gap-2 cursor-pointer group">
                                                        <input
                                                            type="checkbox"
                                                            checked={advancedFilters.stages.includes(stageId)}
                                                            onChange={(e) => {
                                                                const newStages = e.target.checked
                                                                    ? [...advancedFilters.stages, stageId]
                                                                    : advancedFilters.stages.filter(s => s !== stageId);
                                                                setAdvancedFilters({ ...advancedFilters, stages: newStages });
                                                            }}
                                                            className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                        />
                                                        <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors font-medium">{stageTitle}</span>
                                                    </label>
                                                );
                                            }) : (
                                                <span className="text-[10px] text-slate-400 italic">No stages loaded...</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Posted By */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 tracking-wider">Posted By</label>
                                        <div className="space-y-2">
                                            <select
                                                value={advancedFilters.createdBy}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, createdBy: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300 font-normal"
                                            >
                                                <option value="">All Users</option>
                                                {subUsers.map(user => (
                                                    <option key={user.id} value={user.id}>{user.first_name} {user.last_name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    {/* Date Range */}
                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 tracking-wider">Date Range</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">From</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateFrom}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300 font-normal"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">To</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateTo}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300 font-normal"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    {/* Order By */}
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 tracking-wider">Order By</label>
                                        <select
                                            value={advancedFilters.orderBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, orderBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
                                        >
                                            <option value="Newest to Oldest">Newest to Oldest</option>
                                            <option value="Oldest to Newest">Oldest to Newest</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setAdvancedFilters({
                                                status: [],
                                                createdBy: '',
                                                orderBy: 'Newest to Oldest'
                                            });
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-all font-bold"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => { setShowFilters(false); fetchCandidates(); }}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-all shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <PermissionWrapper feature="candidates" permission="write">
                        <button
                            onClick={() => setIsAddModalOpen(true)}
                            className="px-5 py-2.5 text-[11px] font-medium tracking-wide rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 shadow-md shadow-blue-100 active:scale-95"
                        >
                            <Plus size={16} />
                            New Candidate
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            {/* Table Container */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <table className="w-full text-left border-collapse table-fixed">
                    <colgroup>
                        <col className="w-[8%]" />
                        <col className="w-[24%]" />
                        <col className="w-[10%]" />
                        <col className="w-[15%]" />
                        <col className="w-[12%]" />
                        <col className="w-[10%]" />
                        <col className="w-[12%]" />
                        <col className="w-[9%]" />
                    </colgroup>
                    <thead>
                        <tr className="bg-slate-50/30 border-b border-slate-100 uppercase tracking-widest">
                            <th className="pl-8 pr-4 py-4 text-left text-[10px] font-bold text-slate-400">CODE</th>
                            <th className="px-6 py-4 text-left text-[10px] font-bold text-slate-400">Candidate Name</th>
                            <th className="px-4 py-4 pl-2 text-left text-[10px] font-bold text-slate-400">Experience</th>
                            <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400">Job Details</th>
                            <th className="px-4 py-4 text-left text-[10px] font-bold text-slate-400">Invited Date</th>
                            <th className="px-4 py-4 text-center text-[10px] font-bold text-slate-400">Resume Score</th>
                            <th className="px-4 py-4 text-center text-[10px] font-bold text-slate-400">Status</th>
                            <th className="px-4 py-4 text-center text-[10px] font-bold text-slate-400">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            [...Array(5)].map((_, idx) => (
                                <tr key={idx} className="animate-pulse">
                                    <td colSpan={9} className="px-8 py-6">
                                        <div className="h-10 bg-slate-100 rounded-lg w-full" />
                                    </td>
                                </tr>
                            ))
                        ) : candidates.length > 0 ? (
                            candidates.map((candidate, index) => {
                                const displayCode = candidate.candidateCode || 'CAN-000';
                                return (
                                    <tr key={candidate.id || index} className="hover:bg-slate-100/40 transition-colors group">
                                        {/* Candidate Code */}
                                        <td className="pl-8 pr-4 py-4 whitespace-nowrap">
                                            <span className="text-[10px] text-black font-normal tracking-tight">
                                                {displayCode}
                                            </span>
                                        </td>

                                        {/* Candidate Name */}
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden shadow-sm">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.email || candidate.id || 'Candidate'}&backgroundColor=f8fafc`}
                                                        alt={candidate.name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="flex flex-col min-w-0">
                                                    <span className="text-[11px] font-normal text-black truncate leading-tight tracking-tight">{candidate.name || 'Anonymous'}</span>
                                                    <div className="flex items-center gap-1.5 mt-0.5" title={candidate.email || 'No email'}>
                                                        <Mail size={10} className="text-slate-400 shrink-0" />
                                                        <span className="text-[10px] text-slate-400 whitespace-nowrap">{candidate.email || 'No email'}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        {/* Experience */}
                                        <td className="px-4 py-4 text-left whitespace-nowrap">
                                            <span className="text-xs font-normal text-black">{candidate.totalExperience || '0'} Yrs</span>
                                        </td>
                                        {/* Job Details */}
                                        <td className="px-4 py-4 text-left">
                                            <div className="flex flex-col gap-0.5 overflow-hidden">
                                                <span className="text-xs font-normal text-black truncate max-w-[200px] inline-block">{candidate.jobTitle || '—'}</span>
                                                <span className="text-[10px] text-slate-400 font-normal truncate max-w-[200px] inline-block uppercase tracking-tight">{candidate.jobCode || 'JOB-000'}</span>
                                            </div>
                                        </td>
                                        {/* Invited Date */}
                                        <td className="px-4 py-4 text-left whitespace-nowrap">
                                            <div className="flex flex-col items-start">
                                                {candidate.invitedAt ? (
                                                    <>
                                                        <span className="text-xs font-normal text-black">
                                                            {new Date(candidate.invitedAt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}
                                                        </span>
                                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                                            {new Date(candidate.invitedAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}
                                                        </span>
                                                    </>
                                                ) : (
                                                    <span className="text-xs font-normal text-black">—</span>
                                                )}
                                            </div>
                                        </td>
                                        {/* Resume Score */}
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                <div className={`w-9 h-9 rounded-full border-2 bg-transparent flex items-center justify-center ${candidate.resumeScore ? getScoreStyles(candidate.resumeScore) : 'border-slate-200 text-slate-400'}`}>
                                                    <span className="text-[10px] font-semibold">{candidate.resumeScore ?? 0}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <div
                                                className={`inline-flex items-center justify-center px-4 py-1.5 rounded-full border transition-all ${getStatusStyles(candidate.stage)} min-w-[100px] cursor-default`}
                                            >
                                                <span className="text-[10px] font-bold truncate tracking-widest uppercase">
                                                    {formatStageLabel(candidate.stage)}
                                                </span>
                                            </div>
                                        </td>
                                        {/* Actions */}
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center">
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setDropdownPos({ top: rect.bottom, buttonRight: rect.right });
                                                        setOpenMenuId(openMenuId === candidate.id ? null : candidate.id);
                                                    }}
                                                    className={`p-1.5 rounded-full transition-all ${openMenuId === candidate.id
                                                        ? 'bg-slate-100 text-blue-600'
                                                        : 'text-slate-400 hover:text-slate-700 hover:bg-slate-100'
                                                        }`}
                                                >
                                                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })
                        ) : (
                            <tr>
                                <td colSpan={9} className="py-12 text-center">
                                    <div className="flex flex-col items-center justify-center text-slate-400 gap-2">
                                        <Users size={32} strokeWidth={1} />
                                        <p className="text-sm font-medium">No candidates found</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Fixed Portal Dropdown */}
            {openMenuId && (
                <div
                    ref={menuRef}
                    className="fixed z-[200] w-44 bg-white rounded-md shadow-[0_4px_20px_rgba(0,0,0,0.14)] border border-slate-100 overflow-hidden"
                    style={{ top: dropdownPos.top, left: dropdownPos.buttonRight - 176 }}
                >
                    {(() => {
                        const c = candidates.find(x => x.id === openMenuId);
                        if (!c) return null;
                        return (
                            <>
                                <button
                                    onClick={() => { setOpenMenuId(null); navigate(`/admins/ats-candidates/details/${c.id}`); }}
                                    className="w-full text-left px-3 py-2 text-[11px] font-normal text-slate-800 hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <FileText size={13} className="text-slate-400" />
                                    View Details
                                </button>
                                <PermissionWrapper feature="candidates" permission="delete">
                                    <button
                                        onClick={() => { setOpenMenuId(null); toast.error('Delete not implemented yet'); }}
                                        className="w-full text-left px-3 py-2 text-[11px] font-normal text-rose-600 hover:bg-rose-50 transition-colors flex items-center gap-2"
                                    >
                                        <Trash2 size={13} className="text-rose-400" />
                                        Delete Candidate
                                    </button>
                                </PermissionWrapper>
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Pagination */}
            <Pagination
                currentPage={page}
                totalPages={Math.ceil(totalElements / pageSize)}
                onPageChange={setPage}
                pageSize={pageSize}
                totalElements={totalElements}
            />
            <AddAtsCandidateModal
                isOpen={isAddModalOpen}
                onClose={() => setIsAddModalOpen(false)}
                onRefresh={handleRefresh}
                jobId={jobId}
            />

            {/* No Question Set Warning Modal */}
            {noQuestionSetModal && (
                <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white rounded-3xl w-full max-w-xl max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200">
                        {/* Header */}
                        <div className="flex items-center justify-between px-10 pt-6 pb-2 shrink-0">
                            <h2 className="text-xl font-bold text-slate-800">No Question Set Found</h2>
                            <button
                                onClick={() => setNoQuestionSetModal(false)}
                                className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                            >
                                <X size={20} />
                            </button>
                        </div>

                        {/* Content */}
                        <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-6 pt-2">
                            <div className="flex flex-col items-center justify-center py-4 text-left">
                                <p className="text-slate-500 text-base leading-relaxed mb-6 mr-auto">
                                    There is no question set for these job please add to move the candidate.
                                </p>
                                <div className="flex items-center justify-end gap-6 w-full mt-2">
                                    <button
                                        onClick={() => setNoQuestionSetModal(false)}
                                        className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest"
                                    >
                                        Cancel
                                    </button>
                                    <button
                                        onClick={() => {
                                            setNoQuestionSetModal(false);
                                            // Navigate to setup-interview page
                                            const job = candidates.find(c => c.jobId === selectedJobIdForSetup);
                                            navigate('/admins/positions/setup-interview', {
                                                state: {
                                                    position: {
                                                        id: selectedJobIdForSetup,
                                                        title: job?.jobTitle || 'Job',
                                                        code: job?.jobCode || 'JOB'
                                                    }
                                                }
                                            });
                                        }}
                                        className="px-10 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-wider"
                                    >
                                        Add
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default AtsCandidates;

