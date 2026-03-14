import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';
import CandidateDetailsDrawer from '../components/CandidateDetailsDrawer';
import { clearApiCache } from '../utils/apiCache';

const Candidates = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [statusTabs] = useState(['ALL', 'INVITED', 'MANUALLY_INVITED', 'RESUME_REJECTED', 'TEST_COMPLETED', 'RECOMMENDED', 'NOT_RECOMMENDED', 'CAUTIOUSLY_RECOMMENDED']);
    const [statusCounts, setStatusCounts] = useState({ ALL: 0 });
    const [organizationId, setOrganizationId] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [openAvatarId, setOpenAvatarId] = useState(null);
    const [manualInviteLoadingId, setManualInviteLoadingId] = useState(null);
    const [manualInviteConfirmCandidate, setManualInviteConfirmCandidate] = useState(null);
    const [advancedFilters, setAdvancedFilters] = useState({
        status: [],
        createdBy: 'All Users',
        dateFrom: '',
        dateTo: '',
        orderBy: 'Newest to Oldest'
    });
    const menuRef = useRef(null);
    const filterRef = useRef(null);

    const statusOptions = [
        { label: 'PENDING', value: 'PENDING' },
        { label: 'INVITED', value: 'INVITED' },
        { label: 'TEST STARTED', value: 'TEST_STARTED' },
        { label: 'IN PROGRESS', value: 'IN_PROGRESS' },
        { label: 'TEST COMPLETED', value: 'TEST_COMPLETED' },
        { label: 'RECOMMENDED', value: 'RECOMMENDED' },
        { label: 'CAUTIOUSLY RECOMMENDED', value: 'CAUTIOUSLY_RECOMMENDED' },
        { label: 'NOT RECOMMENDED', value: 'NOT_RECOMMENDED' },
        { label: 'EXPIRED', value: 'EXPIRED' },
        { label: 'UNATTENDED', value: 'UNATTENDED' },
        { label: 'NETWORK DISCONNECTED', value: 'NETWORK_DISCONNECTED' }
    ];

    // Close menu and avatar preview on click outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setOpenMenuId(null);
            }
            if (openAvatarId && !event.target.closest('[data-avatar-trigger], [data-avatar-preview]')) {
                setOpenAvatarId(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openAvatarId]);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };

        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                setShowFilters(false);
            }
        };

        if (showFilters) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [showFilters]);

    useEffect(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const storedOrgId = storedUser?.organizationId || storedUser?.organization?.organizationId || localStorage.getItem('organizationId');
            if (storedOrgId) {
                setOrganizationId(storedOrgId);
            }
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
    }, []);

    const buildListParams = (currentPage = page) => {
        const params = {
            organization_id: organizationId,
            page: currentPage,
            size: pageSize
        };
        if (activeTab && activeTab !== 'ALL') {
            params.recommendationStatus = activeTab;
        } else if (advancedFilters.status.length > 0) {
            params.recommendationStatuses = advancedFilters.status;
        }
        if (searchTerm) params.searchTerm = searchTerm;
        if (advancedFilters.createdBy && advancedFilters.createdBy !== 'All Users') params.createdBy = advancedFilters.createdBy;
        if (advancedFilters.dateFrom) params.dateFrom = advancedFilters.dateFrom;
        if (advancedFilters.dateTo) params.dateTo = advancedFilters.dateTo;
        if (advancedFilters.orderBy === 'Newest to Oldest') params.sortOrder = 'NEWEST_TO_OLDEST';
        else if (advancedFilters.orderBy === 'Oldest to Newest') params.sortOrder = 'OLDEST_TO_NEWEST';
        else if (advancedFilters.orderBy === 'Title A-Z') { params.sortBy = 'candidate_name'; params.sortOrder = 'ASC'; }
        return params;
    };

    const buildCountParams = () => {
        const params = { organization_id: organizationId };
        if (searchTerm) params.searchTerm = searchTerm;
        if (advancedFilters.createdBy && advancedFilters.createdBy !== 'All Users') params.createdBy = advancedFilters.createdBy;
        if (advancedFilters.dateFrom) params.dateFrom = advancedFilters.dateFrom;
        if (advancedFilters.dateTo) params.dateTo = advancedFilters.dateTo;
        return params;
    };

    const fetchStatusCounts = async () => {
        try {
            if (!organizationId) return;
            const response = await axios.get('/candidates/counts', { params: buildCountParams() });
            if (response.data?.data) {
                setStatusCounts(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load status counts:', error);
        }
    };

    // Silent refresh — used by auto-poll. Does NOT touch loading state to avoid flickering.
    const silentRefresh = async () => {
        if (!organizationId) return;
        try {
            const [listRes, countRes] = await Promise.all([
                axios.get('/candidates', { params: buildListParams() }),
                axios.get('/candidates/counts', { params: buildCountParams() }),
            ]);
            setCandidates(listRes.data?.content || []);
            setTotal(listRes.data?.totalElements ?? 0);
            if (countRes.data?.data) setStatusCounts(countRes.data.data);
        } catch (err) {
            // Silent — don't show toasts on background refresh
            console.debug('[Candidates] Silent refresh failed:', err.message);
        }
    };

    useEffect(() => {
        setPage(0);
    }, [activeTab, searchTerm, advancedFilters]);

    useEffect(() => {
        if (!organizationId) {
            return;
        }

        fetchStatusCounts();
    }, [organizationId, searchTerm, advancedFilters]);

    useEffect(() => {
        if (!organizationId) {
            return;
        }

        const timeoutId = setTimeout(async () => {
            try {
                setLoading(true);
                const response = await axios.get('/candidates', { params: buildListParams() });
                setCandidates(response.data?.content || []);
                setTotal(response.data?.totalElements ?? 0);
            } catch (error) {
                console.error('Failed to load candidates:', error);
                toast.error('Failed to load candidates');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [activeTab, searchTerm, page, pageSize, organizationId, advancedFilters]);

    // Auto-poll every 30s to reflect live status changes:
    // TEST_STARTED → ROUND1 → ROUND2 → ROUND3 → ROUND4 → TEST_COMPLETED → RECOMMENDED / NOT_RECOMMENDED
    useEffect(() => {
        if (!organizationId) return;
        const pollInterval = setInterval(silentRefresh, 30000);
        return () => clearInterval(pollInterval);
    }, [organizationId, activeTab, searchTerm, page, pageSize, advancedFilters]);

    const getStatusStyles = (status) => {
        const styles = {
            'PENDING': 'bg-slate-100 text-slate-500 border-slate-200',
            'APPLIED': 'bg-slate-100 text-slate-500 border-slate-200',
            'INVITED': 'bg-blue-100 text-blue-700 border-blue-200 font-bold',
            'MANUALLY_INVITED': 'bg-indigo-50 text-indigo-700 border-indigo-100 font-bold',
            'RESUME_REJECTED': 'bg-red-50 text-red-700 border-red-200 font-bold',
            'RECOMMENDED': 'bg-emerald-100 text-emerald-600 border-emerald-200',
            'NOT_RECOMMENDED': 'bg-rose-50 text-rose-600 border-rose-100',
            'CAUTIOUSLY_RECOMMENDED': 'bg-amber-50 text-amber-600 border-amber-200',
            'TEST_STARTED': 'bg-blue-50 text-blue-600 border-blue-100',
            'IN_PROGRESS': 'bg-sky-50 text-sky-600 border-sky-100',
            'TEST_COMPLETED': 'bg-sky-100 text-sky-600 border-sky-200',
            'EXPIRED': 'bg-slate-100 text-slate-500 border-slate-200',
            'UNATTENDED': 'bg-slate-100 text-slate-500 border-slate-200',
            'NETWORK_DISCONNECTED': 'bg-amber-100 text-amber-800 border-amber-200',
            'ROUND1': 'bg-purple-50 text-purple-600 border-purple-100',
            'ROUND2': 'bg-purple-50 text-purple-600 border-purple-100',
            'ROUND3': 'bg-purple-50 text-purple-600 border-purple-100',
            'ROUND4': 'bg-purple-50 text-purple-600 border-purple-100',
            'NETWORK_ISSUE': 'bg-amber-100 text-amber-800 border-amber-200'
        };
        return styles[status] || 'bg-slate-50 text-slate-400 border-slate-100';
    };

    const formatStatus = (status) => {
        if (!status) return 'N/A';
        if (status === 'ALL') return 'All';
        if (status.startsWith('ROUND')) {
            return `Round ${status.replace('ROUND', '')}`;
        }
        return status
            .split('_')
            .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
            .join(' ');
    };

    const getScoreStyles = (score) => {
        if (score >= 80) return 'border-emerald-500 text-emerald-600';
        if (score >= 60) return 'border-amber-400 text-amber-600';
        return 'border-red-400 text-red-600';
    };

    const formatDate = (dateString) => {
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const handleViewMore = (candidate) => {
        setSelectedCandidate(candidate);
        setIsDrawerOpen(true);
        setOpenMenuId(null);
    };

    const handleManualInvite = async (candidate) => {
        const pid = candidate.positionCandidateId || candidate.position_candidate_id;
        if (!pid || !organizationId) {
            toast.error('Missing position-candidate or organization.');
            return;
        }
        setManualInviteConfirmCandidate(null);
        setManualInviteLoadingId(pid);
        let companyName = 'Company';
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const orgId = organizationId || storedUser?.organizationId || localStorage.getItem('organizationId');
            const isCollege = storedUser.isCollege === true;
            const path = orgId ? (isCollege ? `/admins/college-details/${orgId}` : `/admins/company-details/${orgId}`) : null;
            if (path) {
                const res = await axios.get(path);
                companyName = res.data?.data?.collegeName ?? res.data?.data?.companyName ?? companyName;
            }
        } catch (_) { }
        try {
            // Backend manual-invite: creates/ reuses private link (dynamic company/position), creates assessment summary if missing
            await axios.post('/position-candidates/manual-invite', {
                positionCandidateId: pid,
                organizationId: organizationId || JSON.parse(localStorage.getItem('admin_user') || '{}')?.organizationId,
                companyName
            });
            const userId = localStorage.getItem('userId') || localStorage.getItem('id') || '';
            const clientId = localStorage.getItem('client') || '';
            const now = new Date();
            const linkExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000).toISOString();
            const linkActiveAt = now.toISOString();
            await axios.post('/ai-assistant/schedule-interview', {
                candidateId: candidate.candidateId,
                email: candidate.candidateEmail || candidate.email,
                positionId: candidate.positionId,
                questionSetId: candidate.questionSetId,
                clientId,
                interviewPlatform: 'BROWSER',
                linkActiveAt,
                linkExpiresAt,
                createdBy: userId,
                sendInviteBy: 'EMAIL',
                candidateName: candidate.candidateName || candidate.candidate_name,
                companyName,
                organizationId,
                positionName: candidate.positionTitle || candidate.job_title || candidate.positionName
            });
            // Assessment summary is created by backend manual-invite when missing; no separate POST needed
            clearApiCache();
            await silentRefresh();
            toast.success('Manual invite sent. Private link created and assessment summary updated.');
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Manual invite failed';
            toast.error(msg, { duration: 5000 });
        } finally {
            setManualInviteLoadingId(null);
        }
    };

    const REPORT_ELIGIBLE_STATUSES = ['TEST_COMPLETED', 'RECOMMENDED', 'CAUTIOUSLY_RECOMMENDED', 'NOT_RECOMMENDED'];

    const openCandidateReport = (candidate) => {
        const candidateId = candidate.candidateId;
        const positionId = candidate.positionId || candidate.position_id;
        if (!candidateId || !positionId) {
            toast.error('Missing candidate or position data for report generation.');
            return;
        }

        const clientId = localStorage.getItem('client') || '';
        const query = new URLSearchParams({
            positionId,
            clientId,
            tenantId: clientId,
            questionSetId: candidate.questionSetId || '',
            candidateName: candidate.candidateName || candidate.candidate_name || '',
        }).toString();

        window.open(`/candidates/${candidateId}/report?${query}`, '_blank', 'noopener,noreferrer');
    };

    const openCandidateRecording = (candidate) => {
        const candidateId = candidate.candidateId;
        const recordingLink = candidate.recordingLink || '';
        if (!candidateId || !recordingLink) {
            toast.error('Recording not available for this candidate.');
            return;
        }

        const query = new URLSearchParams({
            recordingLink,
            candidateName: candidate.candidateName || candidate.candidate_name || '',
            positionTitle: candidate.positionTitle || candidate.job_title || '',
        }).toString();

        window.open(`/candidates/${candidateId}/recording?${query}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-6">
            {/* Page Header */}
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Candidates</h1>
                <button onClick={() => navigate('/candidates/add')} className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Candidate
                </button>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {statusTabs.map((status) => {
                    const count = status === 'ALL' ? (statusCounts.All ?? statusCounts.ALL ?? 0) : (statusCounts[status] ?? 0);
                    return (
                        <button
                            key={status}
                            onClick={() => {
                                setActiveTab(status);
                                setPage(0);
                            }}
                            className={`relative pb-3 flex items-center gap-2 transition-all group shrink-0 ${activeTab === status ? 'text-[#FF6B00] font-normal' : 'text-slate-900 font-normal hover:text-slate-900'}`}
                        >
                            <span className="text-xs">{formatStatus(status)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === status ? 'bg-orange-100 text-[#FF6B00]' : 'bg-slate-100 text-slate-900 group-hover:bg-slate-200'} transition-colors`}>
                                {count}
                            </span>
                            {activeTab === status && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B00] rounded-full" />
                            )}
                        </button>
                    );
                })}
            </div>

            {/* Filters Bar */}
            <div className="flex flex-wrap items-center gap-4">
                <div className="relative flex-1 min-w-[300px]">
                    <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                        <svg className="h-4 w-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                    </div>
                    <input
                        type="text"
                        placeholder="Search candidates by name, email or RegNo..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-50"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(0);
                        }}
                    />
                </div>

                <div className="flex items-center gap-3">
                    <div className="relative" ref={filterRef}>
                        <button
                            onClick={() => setShowFilters(!showFilters)}
                            className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-orange-400 ring-2 ring-orange-50' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all`}
                        >
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
                            </svg>
                            More Filters
                        </button>

                        {showFilters && (
                            <div className="absolute right-0 mt-2 w-[300px] bg-white rounded-xl border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-50 overflow-hidden">
                                <div className="p-4 space-y-4 max-h-[420px] overflow-y-auto no-scrollbar">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Status</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {statusOptions.map((status) => (
                                                <label key={status.value} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.status.includes(status.value)}
                                                        onChange={(e) => {
                                                            const newStatus = e.target.checked
                                                                ? [...advancedFilters.status, status.value]
                                                                : advancedFilters.status.filter(s => s !== status.value);
                                                            setAdvancedFilters({ ...advancedFilters, status: newStatus });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-[#FF6B00] focus:ring-[#FF6B00]"
                                                    />
                                                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors">{status.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posted By</label>
                                        <select
                                            value={advancedFilters.createdBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, createdBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-300"
                                        >
                                            <option value="All Users">All Users</option>
                                        </select>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Range</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">From</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateFrom}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-orange-300"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">To</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateTo}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-orange-300"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-black">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order By</label>
                                        <select
                                            value={advancedFilters.orderBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, orderBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-orange-300"
                                        >
                                            <option value="Newest to Oldest">Newest to Oldest</option>
                                            <option value="Oldest to Newest">Oldest to Newest</option>
                                            <option value="Title A-Z">Title A-Z</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setAdvancedFilters({
                                                status: [],
                                                createdBy: 'All Users',
                                                dateFrom: '',
                                                dateTo: '',
                                                orderBy: 'Newest to Oldest'
                                            });
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="px-3 py-1.5 bg-[#FF6B00] text-white text-[10px] font-bold rounded-md hover:bg-[#FF4E00] transition-colors shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={() => fetchStatusCounts()}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors"
                        title="Refresh"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Table Container - overflow-visible so avatar popup can show on top of table box without being cut */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Candidate Code</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Position Code</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Position Title</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Invited Date</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Resume Score</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            [...Array(6)].map((_, idx) => (
                                <tr key={idx} className="animate-pulse">
                                    <td colSpan={8} className="px-8 py-6">
                                        <div className="h-10 bg-slate-100 rounded-lg" />
                                    </td>
                                </tr>
                            ))
                        ) : candidates.length > 0 ? (
                            candidates.map((candidate) => {
                                const candidateId = candidate.candidateId;
                                const positionCandidateId = candidate.positionCandidateId || candidateId;
                                const candidateName = candidate.candidateName || 'N/A';
                                const candidateCode = candidate.candidateCode || 'N/A';
                                const positionTitle = candidate.positionTitle || candidate.job_title || '-';
                                const positionCode = candidate.positionCode || '-';
                                const invitedDate = candidate.linkActiveAt || candidate.candidateCreatedAt;
                                const resumeScore = candidate.resumeMatchScore ?? '-';
                                const status = candidate.recommendationStatus || 'All';
                                const recordingLink = candidate.recordingLink || null;
                                const canUseReport = REPORT_ELIGIBLE_STATUSES.includes(status);

                                return (
                                    <tr key={positionCandidateId} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="pl-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <button
                                                        type="button"
                                                        data-avatar-trigger
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenAvatarId((prev) => (prev === positionCandidateId ? null : positionCandidateId));
                                                        }}
                                                        className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50"
                                                    >
                                                        <img
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidateName}`}
                                                            alt={candidateName}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                    {openAvatarId === positionCandidateId && (
                                                        <div
                                                            className="absolute left-0 bottom-full mb-1.5 z-50 transition-opacity duration-150"
                                                            data-avatar-preview
                                                        >
                                                            <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200 shadow-lg overflow-hidden">
                                                                <img
                                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidateName}`}
                                                                    alt={candidateName}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900 group-hover:text-[#FF6B00] transition-colors truncate">{candidateName}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 font-normal truncate max-w-[200px]" title={candidate.candidateEmail || 'N/A'}>
                                                        {candidate.candidateEmail || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900">
                                                {candidateCode}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900">{positionCode}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900 truncate max-w-[180px] block" title={positionTitle}>{positionTitle}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900 whitespace-nowrap">
                                                {invitedDate ? formatDate(invitedDate) : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                <div className={`w-9 h-9 rounded-full border-2 flex items-center justify-center transition-all bg-transparent ${typeof resumeScore === 'number' ? getScoreStyles(resumeScore) : 'border-slate-200 text-slate-400'}`}>
                                                    <span className="text-[10px] font-bold">{resumeScore}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${getStatusStyles(status)}`}>
                                                {formatStatus(status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-0">
                                                {/* Report icon — outside dropdown */}
                                                {canUseReport && (
                                                    <button
                                                        title="View / Generate AI Report"
                                                        onClick={() => openCandidateReport(candidate)}
                                                        className="p-1 rounded-full transition-all text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {/* Recording icon — outside dropdown */}
                                                {['TEST_COMPLETED', 'RECOMMENDED', 'CAUTIOUSLY_RECOMMENDED', 'NOT_RECOMMENDED'].includes(status) && (
                                                    <button
                                                        title={recordingLink ? 'View Recording' : 'Recording not available'}
                                                        onClick={() => { if (recordingLink) openCandidateRecording(candidate); }}
                                                        disabled={!recordingLink}
                                                        className={`p-1 rounded-full transition-all ${recordingLink ? 'text-purple-700 hover:bg-purple-50' : 'text-slate-200 cursor-not-allowed'}`}
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {/* 3-dot menu */}
                                                <div className="relative">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenMenuId(openMenuId === positionCandidateId ? null : positionCandidateId);
                                                        }}
                                                        className={`p-1 rounded-full transition-all ${openMenuId === positionCandidateId ? 'bg-slate-100 text-[#FF6B00]' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}
                                                    >
                                                        <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                        </svg>
                                                    </button>

                                                    {openMenuId === positionCandidateId && (
                                                        <div
                                                            ref={menuRef}
                                                            className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in duration-200"
                                                        >
                                                            <button
                                                                onClick={() => handleViewMore(candidate)}
                                                                className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                                View more
                                                            </button>
                                                            <button
                                                                onClick={() => toast.success(`Editing ${candidateName}`)}
                                                                className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                                            >
                                                                <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                                                </svg>
                                                                Edit
                                                            </button>
                                                            {/* Manual invite: for Resume Rejected or Invited; hide once sent (Manually Invited); after Edit */}
                                                            {(status === 'RESUME_REJECTED' || status === 'INVITED' || candidate.recommendationStatus === 'RESUME_REJECTED' || candidate.recommendationStatus === 'INVITED') &&
                                                                status !== 'MANUALLY_INVITED' &&
                                                                candidate.recommendationStatus !== 'MANUALLY_INVITED' && (
                                                                    <button
                                                                        onClick={() => { setOpenMenuId(null); setManualInviteConfirmCandidate(candidate); }}
                                                                        disabled={manualInviteLoadingId === positionCandidateId}
                                                                        className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-[#FF6B00] hover:bg-orange-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                                                    >
                                                                        {manualInviteLoadingId === positionCandidateId ? (
                                                                            <span className="h-4 w-4 border-2 border-[#FF6B00] border-t-transparent rounded-full animate-spin" />
                                                                        ) : (
                                                                            <svg className="w-4 h-4 text-[#FF6B00]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                                                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9 2zm0 0v-8" />
                                                                            </svg>
                                                                        )}
                                                                        Manual invite
                                                                    </button>
                                                                )}
                                                        </div>
                                                    )}
                                                </div>{/* closes inner relative div */}
                                            </div>{/* closes outer flex wrapper */}
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={8} className="px-8 py-14 text-center text-sm text-slate-400">
                                    No candidates found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination Info */}
            <div className="flex items-center justify-between pb-6 mt-4">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 italic">
                        Showing {candidates.length} of {total} records
                    </span>
                </div>
                <div className="flex items-center gap-2">
                    <button
                        onClick={() => setPage((prev) => Math.max(prev - 1, 0))}
                        disabled={page === 0}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div className="flex items-center gap-1">
                        <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[#FF6B00] text-white text-[10px] font-bold shadow-sm">
                            {page + 1}
                        </button>
                    </div>
                    <button
                        onClick={() => setPage((prev) => prev + 1)}
                        disabled={(page + 1) * pageSize >= total}
                        className="h-8 w-8 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-all disabled:opacity-50"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                    </button>
                </div>
            </div>

            {/* Manual invite confirmation modal */}
            {manualInviteConfirmCandidate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={() => !manualInviteLoadingId && setManualInviteConfirmCandidate(null)}>
                    <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
                        <p className="text-sm font-medium text-slate-800 mb-1">Send manual invite?</p>
                        <p className="text-xs text-slate-500 mb-4">
                            Send invite to <span className="font-semibold text-slate-700">{manualInviteConfirmCandidate.candidateName || manualInviteConfirmCandidate.candidate_name || 'this candidate'}</span>? They will receive the test link by email.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setManualInviteConfirmCandidate(null)}
                                disabled={!!manualInviteLoadingId}
                                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleManualInvite(manualInviteConfirmCandidate)}
                                disabled={!!manualInviteLoadingId}
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-[#FF6B00] text-white hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
                            >
                                {manualInviteLoadingId ? (
                                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9 2zm0 0v-8" />
                                    </svg>
                                )}
                                Send invite
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Talent Details Drawer */}
            <CandidateDetailsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                candidate={selectedCandidate}
                organizationId={organizationId}
            />
        </div>
    );
};

export default Candidates;
