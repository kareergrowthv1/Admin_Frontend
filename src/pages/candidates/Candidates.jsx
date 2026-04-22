import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../config/axios';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import CandidateDetailsDrawer from '../../components/CandidateDetailsDrawer';
import { clearApiCache } from '../../utils/apiCache';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import Pagination from '../../components/common/Pagination';
import { getFeatureDataScope, getLoggedInUserId } from '../../utils/permissionUtils';
import { X, Users, Briefcase, RefreshCw, Plus } from 'lucide-react';
import { checkIsCollege } from '../../routes/ProtectedRoute';
import AddAtsCandidateModal from './AddAtsCandidateModal';

const Candidates = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const topStatusTabs = ['ALL', 'INVITED', 'MANUALLY_INVITED', 'RESUME_REJECTED', 'RECOMMENDED', 'NOT_RECOMMENDED', 'CAUTIOUSLY_RECOMMENDED'];
    const requestedStatusTab = searchParams.get('status') || 'ALL';
    const positionId = searchParams.get('positionId');
    const filterUserId = searchParams.get('userId');
    const filterUserName = searchParams.get('userName');
    const [position, setPosition] = useState(null);
    const [activeTab, setActiveTab] = useState(topStatusTabs.includes(requestedStatusTab) ? requestedStatusTab : 'ALL');
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [openMenuId, setOpenMenuId] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, buttonRight: 0 });
    const [statusTabs] = useState(topStatusTabs);
    const [statusCounts, setStatusCounts] = useState({ ALL: 0 });
    const [organizationId, setOrganizationId] = useState(null);
    const [showFilters, setShowFilters] = useState(false);
    const [openAvatarId, setOpenAvatarId] = useState(null);
    const [manualInviteLoadingId, setManualInviteLoadingId] = useState(null);
    const [manualInviteConfirmCandidate, setManualInviteConfirmCandidate] = useState(null);
    const [resendInviteLoadingId, setResendInviteLoadingId] = useState(null);
    const [resendInviteConfirmCandidate, setResendInviteConfirmCandidate] = useState(null);
    const [deleteConfirmCandidate, setDeleteConfirmCandidate] = useState(null);
    const [isDeleting, setIsDeleting] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [subUsers, setSubUsers] = useState([]);
    const [userSearchTerm, setUserSearchTerm] = useState('');
    const [advancedFilters, setAdvancedFilters] = useState({
        status: [],
        createdBy: '',
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
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const storedOrgId = storedUser?.organizationId || storedUser?.organization?.organizationId || localStorage.getItem('organizationId');
            if (storedOrgId) {
                setOrganizationId(storedOrgId);
            }
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
        fetchSubUsers();
    }, []);

    useEffect(() => {
        if (positionId) {
            fetchPositionDetails();
        }
    }, [positionId]);

    const fetchPositionDetails = async () => {
        try {
            const isCollege = checkIsCollege();
            const endpoint = isCollege ? `/admins/positions/${positionId}` : `/admins/jobs/${positionId}`;
            const response = await axios.get(endpoint);
            if (response.data?.data) {
                setPosition(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching position details:', err);
        }
    };

    const buildListParams = useCallback((currentPage = page, isManualRefresh = false) => {
        const params = {
            page: currentPage,
            size: pageSize,
            organizationId: organizationId
        };

        if (isManualRefresh) {
            params._t = Date.now();
        }

        // Enforce OWN scope if applicable
        const dataScope = getFeatureDataScope('candidates');
        if (filterUserId) {
            params.createdBy = filterUserId;
        } else if (dataScope === 'OWN') {
            params.createdBy = getLoggedInUserId();
        }

        if (positionId) {
            params.position_id = positionId;
            params.limit = pageSize;
            params.offset = currentPage * pageSize;
        }
        if (activeTab && activeTab !== 'ALL') {
            params.recommendationStatus = activeTab;
        } else if (advancedFilters.status.length > 0) {
            params.recommendationStatuses = advancedFilters.status;
        }
        if (searchTerm) params.searchTerm = searchTerm;
        if (advancedFilters.createdBy && advancedFilters.createdBy !== 'All Users' && dataScope !== 'OWN') {
            params.createdBy = advancedFilters.createdBy;
        }
        if (advancedFilters.dateFrom) params.dateFrom = advancedFilters.dateFrom;
        if (advancedFilters.dateTo) params.dateTo = advancedFilters.dateTo;
        if (advancedFilters.orderBy === 'Newest to Oldest') params.sortOrder = 'NEWEST_TO_OLDEST';
        else if (advancedFilters.orderBy === 'Oldest to Newest') params.sortOrder = 'OLDEST_TO_NEWEST';
        else if (advancedFilters.orderBy === 'Title A-Z') { params.sortBy = 'candidate_name'; params.sortOrder = 'ASC'; }
        return params;
    }, [organizationId, page, pageSize, positionId, activeTab, advancedFilters.status, advancedFilters.createdBy, advancedFilters.dateFrom, advancedFilters.dateTo, advancedFilters.orderBy, searchTerm]);

    const buildCountParams = useCallback(() => {
        const params = {
            organizationId: organizationId
        };

        // Enforce OWN scope if applicable
        const dataScope = getFeatureDataScope('candidates');
        if (dataScope === 'OWN') {
            params.createdBy = getLoggedInUserId();
        }

        if (positionId) params.position_id = positionId;
        if (searchTerm) params.searchTerm = searchTerm;
        if (advancedFilters.createdBy && advancedFilters.createdBy !== 'All Users' && dataScope !== 'OWN') {
            params.createdBy = advancedFilters.createdBy;
        }
        if (advancedFilters.dateFrom) params.dateFrom = advancedFilters.dateFrom;
        if (advancedFilters.dateTo) params.dateTo = advancedFilters.dateTo;
        return params;
    }, [organizationId, positionId, searchTerm, advancedFilters.createdBy, advancedFilters.dateFrom, advancedFilters.dateTo]);

    const fetchStatusCounts = async () => {
        try {
            if (!organizationId) return;
            const response = await axios.get('/candidates/counts', { 
                params: buildCountParams(),
                skipCache: true 
            });
            if (response.data?.data) {
                setStatusCounts(response.data.data);
            }
        } catch (error) {
            console.error('Failed to load status counts:', error);
        }
    };

    const fetchCandidates = useCallback(async (showLoading = true, isManualRefresh = false) => {
        if (!organizationId) return;
        try {
            if (showLoading) setLoading(true);
            const normalizeCandidate = (item) => {
                const toFlag = (value) => value === true || value === 1 || value === '1' || value === 'true';

                // Report icon visibility must depend only on backend report-generated flag,
                // not on recommendation status.
                const reportGeneratedRaw = item.isReportGenerated ?? item.is_report_generated;
                const reportGenerated = toFlag(reportGeneratedRaw);

                return {
                ...item,
                candidateName: item.candidateName || item.name || 'N/A',
                candidateEmail: item.candidateEmail || item.email || 'N/A',
                candidateCode: item.candidateCode || item.code || 'N/A',
                candidateId: item.candidateId || item.id,
                positionTitle: item.positionTitle || (position?.title) || '-',
                positionCode: item.positionCode || (position?.code) || '-',
                recordingLink: item.recordingLink || item.recording_link || null,
                screenRecordingLink: item.screenRecordingLink || item.screen_recording_link || item.recordingLink || item.recording_link || null,
                cameraRecordingLink: item.cameraRecordingLink || item.camera_recording_link || null,
                isVideoMerged: toFlag(item.isVideoMerged ?? item.is_video_merged),
                is_video_merged: toFlag(item.is_video_merged ?? item.isVideoMerged),
                isVideoGenerated: toFlag(item.isVideoGenerated ?? item.is_video_generated ?? item.isVideoMerged ?? item.is_video_merged),
                is_video_generated: toFlag(item.is_video_generated ?? item.isVideoGenerated ?? item.is_video_merged ?? item.isVideoMerged),
                isScreenVideoMerged: toFlag(item.isScreenVideoMerged ?? item.is_screen_video_merged ?? item.isVideoMerged ?? item.is_video_merged),
                isCameraVideoMerged: toFlag(item.isCameraVideoMerged ?? item.is_camera_video_merged),
                recommendationStatus: item.recommendationStatus || item.status || 'All',
                linkActiveAt: item.linkActiveAt || item.assignedAt || item.candidateCreatedAt,
                isReportGenerated: reportGenerated,
                is_report_generated: reportGenerated,
                };
            };

            const listUrl = '/candidates';
            const response = await axios.get(listUrl, { 
                params: buildListParams(page, isManualRefresh),
                skipCache: isManualRefresh || !showLoading // Bypass cache on polling or manual refresh
            });
            const listData = response.data?.content || response.data?.data?.content || response.data?.data || [];
            setCandidates(Array.isArray(listData) ? listData.map(normalizeCandidate) : []);
            setTotal(response.data?.totalElements ?? response.data?.data?.totalElements ?? (Array.isArray(listData) ? listData.length : 0));
        } catch (error) {
            console.error('Failed to load candidates:', error);
            toast.error('Failed to load candidates');
        } finally {
            if (showLoading) setLoading(false);
        }
    }, [organizationId, buildListParams, position, page]);

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchCandidates(false, true),
                fetchStatusCounts()
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!organizationId) return;
        const timeoutId = setTimeout(() => {
            fetchCandidates(true);
            fetchStatusCounts();
        }, 300);
        return () => clearTimeout(timeoutId);
    }, [activeTab, searchTerm, page, pageSize, organizationId, advancedFilters, positionId, fetchCandidates]);

    const getStatusStyles = (status) => {
        const styles = {
            'INVITED': 'bg-purple-50 text-purple-600 border-purple-300',
            'MANUALLY_INVITED': 'bg-cyan-50 text-cyan-400 border-cyan-300',
            'RESUME_REJECTED': 'bg-red-50 text-red-600 border-red-300',
            'LINK_EXPIRED': 'bg-pink-50 text-pink-600 border-pink-400',
            'EXPIRED': 'bg-pink-50 text-pink-600 border-pink-400',
            'RECOMMENDED': 'bg-emerald-50 text-emerald-600 border-emerald-300',
            'NOT_RECOMMENDED': 'bg-orange-50 text-orange-600 border-orange-300',
            'CAUTIOUSLY_RECOMMENDED': 'bg-amber-50 text-amber-600 border-amber-300',
            'TEST_STARTED': 'bg-blue-50 text-blue-600 border-blue-300',
            'IN_PROGRESS': 'bg-sky-50 text-sky-600 border-sky-300',
            'TEST_COMPLETED': 'bg-sky-50 text-sky-600 border-sky-300',
            'UNATTENDED': 'bg-slate-50 text-slate-500 border-slate-300',
            'NETWORK_DISCONNECTED': 'bg-amber-50 text-amber-600 border-amber-300',
            'ROUND1': 'bg-purple-50 text-purple-600 border-purple-300',
            'ROUND2': 'bg-purple-50 text-purple-600 border-purple-300',
            'ROUND3': 'bg-purple-50 text-purple-600 border-purple-300',
            'ROUND4': 'bg-purple-50 text-purple-600 border-purple-300',
            'NETWORK_ISSUE': 'bg-amber-50 text-amber-600 border-amber-300'
        };
        return styles[status] || 'bg-slate-50 text-slate-500 border-slate-300';
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

    const getScoreRingConfig = (rawScore) => {
        const parsedScore = typeof rawScore === 'string'
            ? parseFloat(rawScore.replace('%', '').trim())
            : Number(rawScore);

        if (!Number.isFinite(parsedScore)) {
            return {
                score: null,
                progress: 0,
                ringColor: '#cbd5e1',
                textClass: 'text-slate-400'
            };
        }

        // Handle fractional inputs like 0.82 as 82%.
        const normalizedScore = parsedScore > 0 && parsedScore <= 1 ? parsedScore * 100 : parsedScore;
        const score = Math.max(0, Math.min(100, normalizedScore));
        let ringColor = '#ef4444'; // <40 red
        let textClass = 'text-red-600';

        if (score >= 80 && score <= 100) {
            ringColor = '#10b981'; // 80-100 green
            textClass = 'text-emerald-600';
        } else if (score >= 60 && score < 80) {
            ringColor = '#2563eb'; // 60-80 blue
            textClass = 'text-blue-600';
        } else if (score >= 40 && score < 60) {
            ringColor = '#eab308'; // 40-60 yellow
            textClass = 'text-yellow-600';
        }

        return {
            score,
            progress: score / 100,
            ringColor,
            textClass
        };
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
                companyName,
                candidateEmail: candidate.candidateEmail || candidate.email
            });
            // Backend manual-invite handles: private link creation, assessment summary, email sending
            clearApiCache();
            await handleRefresh();
            toast.success('Manual invite sent. Email has been triggered.');
            setManualInviteConfirmCandidate(null);
            fetchCandidates();
        } catch (error) {
            console.error('Failed to send manual invite:', error);
            toast.error(error.response?.data?.message || 'Failed to send manual invite');
        } finally {
            setManualInviteLoadingId(null);
        }
    };

    const handleResendInvite = async (candidate) => {
        const pid = candidate.positionCandidateId || candidate.position_candidate_id;
        if (!pid || !organizationId) {
            toast.error('Missing position-candidate or organization.');
            return;
        }
        setResendInviteConfirmCandidate(null);
        setResendInviteLoadingId(pid);
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
            await axios.post('/position-candidates/manual-invite', {
                positionCandidateId: pid,
                organizationId: organizationId || JSON.parse(localStorage.getItem('admin_user') || '{}')?.organizationId,
                companyName,
                candidateEmail: candidate.candidateEmail || candidate.email
            });
            clearApiCache();
            await handleRefresh();
            toast.success('Invite resent successfully. Email has been sent.');
            fetchCandidates();
        } catch (error) {
            console.error('Failed to resend invite:', error);
            toast.error(error.response?.data?.message || 'Failed to resend invite');
        } finally {
            setResendInviteLoadingId(null);
        }
    };

    const handleDeleteCandidate = async (candidate) => {
        setIsDeleting(true);
        const loadingToast = toast.loading('Removing candidate...');
        try {
            const candidateId = candidate.candidateId || candidate.positionCandidateId || candidate.id;
            const posId = candidate.positionId || candidate.jobId || positionId;
            
            if (!candidateId || !posId) {
                throw new Error('Missing candidate or position identification');
            }

            await axios.delete(`/candidates/${candidateId}/position/${posId}`);
            
            toast.success('Candidate removed successfully. Notification email sent.', { id: loadingToast });
            setDeleteConfirmCandidate(null);
            fetchCandidates();
        } catch (error) {
            console.error('Failed to remove candidate:', error);
            toast.error(error.response?.data?.message || 'Failed to remove candidate', { id: loadingToast });
        } finally {
            setIsDeleting(false);
        }
    };

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
            reportGenerated: candidate.isReportGenerated ? '1' : '0',
        }).toString();

        window.open(`/candidates/${candidateId}/report?${query}`, '_blank', 'noopener,noreferrer');
    };

    const openCandidateRecording = (candidate) => {
        const candidateId = candidate.candidateId;
        const screenRecordingLink = candidate.screenRecordingLink || candidate.recordingLink || '';
        const cameraRecordingLink = candidate.cameraRecordingLink || '';
        if (!candidateId || (!screenRecordingLink && !cameraRecordingLink)) {
            toast.error('Recording not available for this candidate.');
            return;
        }

        const query = new URLSearchParams({
            recordingLink: screenRecordingLink,
            screenRecordingLink,
            cameraRecordingLink,
            candidateName: candidate.candidateName || candidate.candidate_name || '',
            positionTitle: candidate.positionTitle || candidate.job_title || '',
        }).toString();

        window.open(`/candidates/${candidateId}/recording?${query}`, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="space-y-6 pt-2 pb-12">
            {/* Filtered By Member Indicator */}
            {filterUserId && filterUserName && (
                <div className="flex items-center justify-between bg-purple-50 border border-purple-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-purple-100 flex items-center justify-center text-purple-600 shadow-sm">
                            <Users size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-purple-400 uppercase tracking-wider leading-none mb-1">Filtered by Member</p>
                            <h3 className="text-sm font-bold text-purple-900 capitalize leading-none">{filterUserName}</h3>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            searchParams.delete('userId');
                            searchParams.delete('userName');
                            setSearchParams(searchParams);
                        }}
                        className="text-[11px] font-bold text-purple-600 hover:text-purple-800 transition-colors flex items-center gap-1.5 group"
                    >
                        <span>Clear Filter</span>
                        <X size={14} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}

            {/* Filtered by Position Indicator */}
            {positionId && position && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                            <Briefcase size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider leading-none mb-1">Filtered by Position</p>
                            <h3 className="text-sm font-bold text-blue-900 capitalize leading-none">{position.title || position.jobTitle}</h3>
                        </div>
                    </div>
                    <button 
                        onClick={() => navigate('/candidates')}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5 group"
                    >
                        <span>Clear Filter</span>
                        <X size={14} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}
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
                            className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${activeTab === status ? 'text-blue-600 font-normal' : 'text-slate-900 font-normal hover:text-slate-900'}`}
                        >
                            <span className="text-xs">{formatStatus(status)}</span>
                            <span className={`px-2 py-0.5 rounded-full text-[10px] ${activeTab === status ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-900 group-hover:bg-slate-200'} transition-colors`}>
                                {count}
                            </span>
                            {activeTab === status && (
                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-full" />
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
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-slate-300 focus:ring-0 focus:outline-none"
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
                            className={`flex items-center gap-2 bg-white border ${showFilters ? 'border-blue-400 ring-2 ring-blue-50' : 'border-slate-200'} rounded-lg px-4 py-2.5 text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all`}
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
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-[11px] text-slate-600 group-hover:text-slate-900 transition-colors">{status.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Posted By</label>
                                        <div className="space-y-2">
                                            <input 
                                                type="text"
                                                placeholder="Search user..."
                                                value={userSearchTerm}
                                                onChange={(e) => setUserSearchTerm(e.target.value)}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300"
                                            />
                                            <select 
                                                value={advancedFilters.createdBy}
                                                onChange={(e) => setAdvancedFilters({ ...advancedFilters, createdBy: e.target.value })}
                                                className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
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

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date Range</label>
                                        <div className="grid grid-cols-2 gap-2">
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">From</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateFrom}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateFrom: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300"
                                                />
                                            </div>
                                            <div className="space-y-1">
                                                <span className="text-[10px] text-slate-400">To</span>
                                                <input
                                                    type="date"
                                                    value={advancedFilters.dateTo}
                                                    onChange={(e) => setAdvancedFilters({ ...advancedFilters, dateTo: e.target.value })}
                                                    className="w-full bg-slate-50 border border-slate-100 rounded-lg px-2 py-1.5 text-[10px] text-slate-700 outline-none focus:border-blue-300"
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 text-black">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order By</label>
                                        <select
                                            value={advancedFilters.orderBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, orderBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
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
                                                createdBy: '',
                                                dateFrom: '',
                                                dateTo: '',
                                                orderBy: 'Newest to Oldest'
                                            });
                                            setUserSearchTerm('');
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-colors shadow-sm"
                                    >
                                        Apply Filters
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>

                    <button
                        onClick={handleRefresh}
                        className="p-2.5 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 transition-colors shadow-sm shrink-0"
                        title="Refresh"
                    >
                        <RefreshCw size={18} className={isRefreshing ? 'animate-spin' : ''} />
                    </button>
                    <PermissionWrapper feature="candidates" permission="create">
                        <button 
                            onClick={() => {
                                if (checkIsCollege()) {
                                    navigate('/candidates/add');
                                } else {
                                    setIsAddModalOpen(true);
                                }
                            }} 
                            className="px-5 py-2.5 text-[11px] font-bold tracking-wide rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2"
                        >
                            <Plus size={16} />
                            New Candidate
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            {/* Table Container - overflow-visible so avatar popup can show on top of table box without being cut */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Code</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Candidate Name</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Position</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Mobile</th>
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
                            candidates.map((candidate, index) => {
                                const candidateId = candidate.candidateId;
                                const positionCandidateId = candidate.positionCandidateId || candidateId;
                                const candidateName = candidate.candidateName || 'N/A';
                                const candidateCode = candidate.candidateCode || 'N/A';
                                const positionTitle = candidate.positionTitle || candidate.job_title || '-';
                                const positionCode = candidate.positionCode || '-';
                                const invitedDate = candidate.linkActiveAt || candidate.candidateCreatedAt;
                                const resumeScore = candidate.resumeMatchScore;
                                const scoreRing = getScoreRingConfig(resumeScore);
                                const status = candidate.recommendationStatus || 'All';
                                const recordingLink = (candidate.recordingLink || '').trim() || null;
                                const screenRecordingLink = (candidate.screenRecordingLink || recordingLink || '').trim() || null;
                                const cameraRecordingLink = (candidate.cameraRecordingLink || '').trim() || null;
                                const hasMergedRecording = Boolean(
                                    candidate.isVideoMerged ??
                                    candidate.is_video_merged ??
                                    candidate.isVideoGenerated ??
                                    candidate.is_video_generated ??
                                    candidate.isScreenVideoMerged ??
                                    candidate.isCameraVideoMerged
                                ) || Boolean(screenRecordingLink || cameraRecordingLink);
                                const canUseReport = (candidate.isReportGenerated ?? candidate.is_report_generated) === true;

                                return (
                                    <tr key={candidate.id || positionCandidateId || index} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="pl-8 py-4">
                                            <span className="text-xs text-black font-normal">
                                                {candidateCode}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden text-black font-normal">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.candidateEmail || candidate.candidateId || 'Candidate'}&backgroundColor=f8fafc`}
                                                        alt={candidateName}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm text-black group-hover:text-blue-600 transition-colors truncate font-normal">{candidateName}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-500 font-normal truncate max-w-[200px]" title={candidate.candidateEmail || 'N/A'}>
                                                        {candidate.candidateEmail || 'N/A'}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="min-w-0 flex flex-col" style={{gap:0, lineHeight:1.2}}>
                                                <span className="text-xs text-black font-normal truncate max-w-[180px]" title={positionTitle}>{positionTitle}</span>
                                                <span className="text-[11px] text-slate-500 font-normal">{positionCode}</span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4">
                                            <span className="text-xs text-black">{candidate.candidateMobileNumber || candidate.mobile_number || '-'}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-black whitespace-nowrap">
                                                {invitedDate ? formatDate(invitedDate) : 'N/A'}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex justify-center">
                                                <div className="relative w-9 h-9 flex items-center justify-center">
                                                    <svg className="w-9 h-9 -rotate-90" viewBox="0 0 36 36" aria-hidden="true">
                                                        <circle
                                                            cx="18"
                                                            cy="18"
                                                            r="15"
                                                            fill="none"
                                                            stroke="#e2e8f0"
                                                            strokeWidth="2"
                                                        />
                                                        <circle
                                                            cx="18"
                                                            cy="18"
                                                            r="15"
                                                            fill="none"
                                                            stroke={scoreRing.ringColor}
                                                            strokeWidth="2"
                                                            strokeLinecap="round"
                                                            strokeDasharray={`${2 * Math.PI * 15}`}
                                                            strokeDashoffset={`${2 * Math.PI * 15 * (1 - scoreRing.progress)}`}
                                                        />
                                                    </svg>
                                                    <span className={`absolute text-[10px] font-bold ${scoreRing.textClass}`}>
                                                        {scoreRing.score == null ? '-' : Math.round(scoreRing.score)}
                                                    </span>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium border transition-all ${getStatusStyles(candidate.recommendationStatus)}`}>
                                                {formatStatus(status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4">
                                            <div className="flex items-center justify-center gap-0">
                                                {/* Report icon — outside dropdown */}
                                                {canUseReport && (
                                                    <button
                                                        title="View AI Report"
                                                        onClick={() => openCandidateReport(candidate)}
                                                        className="p-1 rounded-full transition-all text-blue-700 hover:bg-blue-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {/* Recording icon: show only when merged GCP video exists */}
                                                {hasMergedRecording && (
                                                    <button
                                                        title="View Recording"
                                                        onClick={() => openCandidateRecording(candidate)}
                                                        className="p-1 rounded-full transition-all text-purple-700 hover:bg-purple-50"
                                                    >
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                                            <path strokeLinecap="round" strokeLinejoin="round" d="M15 10l4.553-2.069A1 1 0 0121 8.82v6.36a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                                                        </svg>
                                                    </button>
                                                )}
                                                {/* 3-dot menu */}
                                                <button
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setDropdownPos({ top: rect.bottom, buttonRight: rect.right });
                                                        setOpenMenuId(openMenuId === positionCandidateId ? null : positionCandidateId);
                                                    }}
                                                    className={`p-1 rounded-full transition-all ${openMenuId === positionCandidateId ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-800 hover:bg-slate-50'}`}
                                                >
                                                    <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={9} className="px-8 py-14 text-center text-sm text-slate-400">
                                    No candidates found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Fixed Action Menu Portal-like */}
            {openMenuId && (
                <div 
                    ref={menuRef}
                    className="fixed z-[100] w-44 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-slate-100 py-1.5 animate-in fade-in zoom-in duration-200"
                    style={{ top: dropdownPos.top + 2, left: dropdownPos.buttonRight - 176 }}
                >
                    {(() => {
                        const candidateIdToMatch = openMenuId;
                        const candidate = candidates.find(c => (c.positionCandidateId === candidateIdToMatch || c.candidateId === candidateIdToMatch || c.id === candidateIdToMatch));
                        if (!candidate) return null;
                        return (
                            <>
                                <button
                                    onClick={() => handleViewMore(candidate)}
                                    className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    View more
                                </button>
                                {!['INVITED', 'MANUALLY_INVITED', 'TEST_STARTED', 'IN_PROGRESS', 'TEST_COMPLETED', 'RECOMMENDED', 'NOT_RECOMMENDED', 'CAUTIOUSLY_RECOMMENDED'].includes(candidate.recommendationStatus) && (
                                    <PermissionWrapper feature="candidates" permission="update">
                                        <button
                                            onClick={() => { setOpenMenuId(null); setManualInviteConfirmCandidate(candidate); }}
                                            disabled={manualInviteLoadingId === candidate.positionCandidateId}
                                            className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <svg className={`w-4 h-4 ${manualInviteLoadingId === candidate.positionCandidateId ? 'animate-spin' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            {manualInviteLoadingId === candidate.positionCandidateId ? 'Sending...' : 'Manual Invite'}
                                        </button>
                                    </PermissionWrapper>
                                )}
                                {['INVITED', 'MANUALLY_INVITED'].includes(candidate.recommendationStatus) && (
                                    <PermissionWrapper feature="candidates" permission="update">
                                        <button
                                            onClick={() => { setOpenMenuId(null); setResendInviteConfirmCandidate(candidate); }}
                                            disabled={resendInviteLoadingId === candidate.positionCandidateId}
                                            className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2 disabled:opacity-50"
                                        >
                                            <svg className={`w-4 h-4 ${resendInviteLoadingId === candidate.positionCandidateId ? 'animate-spin' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                                            {resendInviteLoadingId === candidate.positionCandidateId ? 'Sending...' : 'Resend Invite'}
                                        </button>
                                    </PermissionWrapper>
                                )}
                                {['INVITED', 'RESUME_REJECTED', 'MANUALLY_INVITED'].includes(candidate.recommendationStatus) && (
                                    <PermissionWrapper feature="candidates" permission="delete">
                                        <button
                                            onClick={() => { setOpenMenuId(null); setDeleteConfirmCandidate(candidate); }}
                                            className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-red-600 hover:bg-red-50 transition-colors flex items-center gap-2"
                                        >
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                            Delete
                                        </button>
                                    </PermissionWrapper>
                                )}
                            </>
                        );
                    })()}
                </div>
            )}

            {/* Pagination Info */}
            <Pagination
                currentPage={page}
                totalPages={Math.ceil(total / pageSize)}
                onPageChange={setPage}
                pageSize={pageSize}
                totalElements={total}
            />

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
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-blue-600 text-white hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
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

            {/* Resend invite confirmation modal */}
            {resendInviteConfirmCandidate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={() => !resendInviteLoadingId && setResendInviteConfirmCandidate(null)}>
                    <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
                        <p className="text-sm font-medium text-slate-800 mb-1">Resend invite link?</p>
                        <p className="text-xs text-slate-500 mb-4">
                            Resend the test link and verification code to <span className="font-semibold text-slate-700">{resendInviteConfirmCandidate.candidateName || resendInviteConfirmCandidate.candidate_name || 'this candidate'}</span> by email.
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setResendInviteConfirmCandidate(null)}
                                disabled={!!resendInviteLoadingId}
                                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleResendInvite(resendInviteConfirmCandidate)}
                                disabled={!!resendInviteLoadingId}
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-indigo-600 text-white hover:brightness-110 flex items-center gap-2 disabled:opacity-50"
                            >
                                {resendInviteLoadingId ? (
                                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                                    </svg>
                                )}
                                Resend
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete confirmation modal */}
            {deleteConfirmCandidate && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/40" onClick={() => !isDeleting && setDeleteConfirmCandidate(null)}>
                    <div className="bg-white rounded-xl shadow-xl border border-slate-100 max-w-sm w-full p-5" onClick={e => e.stopPropagation()}>
                        <div className="flex items-center gap-3 mb-4 text-red-600">
                            <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </div>
                            <p className="text-base font-bold">Remove Candidate?</p>
                        </div>
                        <p className="text-xs text-slate-500 mb-6 leading-relaxed">
                            Are you sure you want to remove <span className="font-semibold text-slate-800">{deleteConfirmCandidate.candidateName || deleteConfirmCandidate.candidate_name || 'this candidate'}</span> from this position?
                            <br/><br/>
                            <span className="text-red-500 font-medium italic">This will delete their assessment mappings and send a notification email.</span>
                        </p>
                        <div className="flex gap-2 justify-end">
                            <button
                                type="button"
                                onClick={() => setDeleteConfirmCandidate(null)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-xs font-semibold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                onClick={() => handleDeleteCandidate(deleteConfirmCandidate)}
                                disabled={isDeleting}
                                className="px-4 py-2 text-xs font-semibold rounded-lg bg-red-600 text-white hover:bg-red-700 flex items-center gap-2 disabled:opacity-50 shadow-sm"
                            >
                                {isDeleting ? (
                                    <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                ) : (
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                )}
                                Confirm Remove
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
            <AddAtsCandidateModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onRefresh={handleRefresh}
                jobId={positionId}
            />
        </div>
    );
};

export default Candidates;
