import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import CandidateDetailsDrawer from '../../components/CandidateDetailsDrawer';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import Pagination from '../../components/common/Pagination';
import { getFeatureDataScope, getLoggedInUserId } from '../../utils/permissionUtils';
import { X, GraduationCap, RefreshCw } from 'lucide-react';
import * as XLSX from 'xlsx';

const Students = () => {
    const navigate = useNavigate();
    const [searchParams, setSearchParams] = useSearchParams();
    const filterUserId = searchParams.get('userId');
    const filterUserName = searchParams.get('userName');
    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [statusTabs] = useState(['All', 'Pending', 'Active', 'Inactive', 'Rejection']);
    const [statusCounts, setStatusCounts] = useState({ All: 0, Pending: 0, Active: 0, Inactive: 0, Rejection: 0 });
    const [organizationId, setOrganizationId] = useState(null);
    const [openAvatarId, setOpenAvatarId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const [dropdownPos, setDropdownPos] = useState({ top: 0, buttonRight: 0 });
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalStudent, setStatusModalStudent] = useState(null);
    const [statusModalNewStatus, setStatusModalNewStatus] = useState(null);
    const [showApproveRejectButtons, setShowApproveRejectButtons] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);
    const [showFilters, setShowFilters] = useState(false);
    const [advancedFilters, setAdvancedFilters] = useState({
        status: [],
        deptIds: [],
        branchIds: [],
        semesters: [],
        batches: [],
        orderBy: 'Newest to Oldest'
    });
    const [metadata, setMetadata] = useState({
        departments: [],
        branches: [],
        semesters: [1, 2, 3, 4, 5, 6, 7, 8],
        batches: []
    });
    const filterRef = useRef(null);
    const dropdownRef = useRef(null);
    const bulkFileRef = useRef(null);
    const [showBulkModal, setShowBulkModal] = useState(false);
    const [bulkRows, setBulkRows] = useState([]);
    const [bulkFileName, setBulkFileName] = useState('');
    const statusOptions = [
        { label: 'Active', value: 'Active' },
        { label: 'Inactive', value: 'Inactive' },
        { label: 'Hold', value: 'Hold' },
        { label: 'Block', value: 'Block' },
        { label: 'Rejected', value: 'Rejected' },
    ];

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openAvatarId && !event.target.closest('[data-avatar-trigger], [data-avatar-preview]')) {
                setOpenAvatarId(null);
            }
            if (openActionMenuId && !event.target.closest('[data-action-menu]')) {
                setOpenActionMenuId(null);
            }
            if (filterRef.current && !filterRef.current.contains(event.target)) {
                setShowFilters(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, [openAvatarId, openActionMenuId]);

    useEffect(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const storedOrgId = storedUser?.organizationId || storedUser?.organization?.organizationId || localStorage.getItem('organizationId');
            if (storedOrgId) setOrganizationId(storedOrgId);
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
    }, []);

    const fetchStatusCounts = async () => {
        try {
            if (!organizationId) return;
            const params = {};
            
            const dataScope = getFeatureDataScope('students');
            if (filterUserId) {
                params.createdBy = filterUserId;
            } else if (dataScope === 'OWN') {
                params.createdBy = getLoggedInUserId();
            }

            const response = await axios.get('/candidates/students/counts', {
                params
            });
            const raw = response.data?.data || response.data || {};
            setStatusCounts({
                All: Number(raw.All ?? raw.all ?? 0),
                Pending: Number(raw.Pending ?? raw.pending ?? 0),
                Active: Number(raw.Active ?? raw.active ?? 0),
                Inactive: Number(raw.Inactive ?? raw.inactive ?? 0),
                Rejection: Number(raw.Rejected ?? raw.rejected ?? 0)
            });
        } catch (error) {
            console.error('Failed to load student counts:', error);
        }
    };

    useEffect(() => {
        setPage(0);
    }, [activeTab, searchTerm]);

    useEffect(() => {
        if (!organizationId) return;
        fetchStatusCounts();
        fetchMetadata();
    }, [organizationId]);

    const fetchMetadata = async () => {
        try {
            const [metaRes, batchRes] = await Promise.all([
                axios.get('/candidates/academic-metadata', { params: {} }),
                axios.get('/candidates/students/batches', { params: {} })
            ]);
            setMetadata(prev => ({
                ...prev,
                departments: metaRes.data?.data?.departments || [],
                branches: metaRes.data?.data?.branches || [],
                batches: Array.isArray(batchRes.data) 
                    ? batchRes.data 
                    : (Array.isArray(batchRes.data?.data) ? batchRes.data.data : [])
            }));
        } catch (error) {
            console.error('Failed to fetch academic metadata:', error);
        }
    };

    const fetchStudents = async (showLoading = true, isManualRefresh = false) => {
        if (!organizationId) return;
        try {
            if (showLoading) setLoading(true);
            const params = {
                page,
                size: pageSize
            };

            if (isManualRefresh) {
                params._t = Date.now();
            }

            const dataScope = getFeatureDataScope('students');
            if (filterUserId) {
                params.createdBy = filterUserId;
            } else if (dataScope === 'OWN') {
                params.createdBy = getLoggedInUserId();
            }

            if (activeTab && activeTab !== 'All') {
                params.status = activeTab === 'Rejection' ? 'Rejected' : activeTab;
            }
            if (searchTerm) params.searchTerm = searchTerm;

            // Advanced Filters
            if (advancedFilters.status.length > 0) params.statuses = advancedFilters.status;
            if (advancedFilters.deptIds.length > 0) params.deptIds = advancedFilters.deptIds;
            if (advancedFilters.branchIds.length > 0) params.branchIds = advancedFilters.branchIds;
            if (advancedFilters.semesters.length > 0) params.semesters = advancedFilters.semesters;
            if (advancedFilters.batches.length > 0) params.batches = advancedFilters.batches;
            if (advancedFilters.orderBy) params.sortOrder = advancedFilters.orderBy === 'Title A-Z' ? 'A-Z' : (advancedFilters.orderBy === 'Oldest to Newest' ? 'OLDEST_TO_NEWEST' : 'NEWEST_TO_OLDEST');

            const response = await axios.get('/candidates/students', { params });
            const content = response.data?.content || [];
            const totalElements = response.data?.totalElements ?? 0;

            setStudents(content);
            setTotal(totalElements);
        } catch (error) {
            console.error('Failed to load students:', error);
            toast.error('Failed to load students');
        } finally {
            if (showLoading) setLoading(false);
        }
    };

    const handleRefresh = async () => {
        setIsRefreshing(true);
        try {
            await Promise.all([
                fetchStudents(true, true),
                fetchStatusCounts()
            ]);
        } finally {
            setIsRefreshing(false);
        }
    };

    useEffect(() => {
        if (!organizationId) return;
        const timeoutId = setTimeout(() => fetchStudents(true), 300);
        return () => clearTimeout(timeoutId);
    }, [activeTab, searchTerm, page, pageSize, organizationId, advancedFilters]);

    const getStatusStyles = (status) => {
        const s = (status || '').toString();
        const styles = {
            'Pending': 'bg-blue-50 text-blue-600 border-blue-200',
            'Active': 'bg-emerald-50 text-emerald-600 border-emerald-100',
            'Inactive': 'bg-red-100 text-red-700 border-red-200',
            'Rejected': 'bg-red-100 text-red-700 border-red-200',
            'All': 'bg-slate-100 text-slate-500 border-slate-200'
        };
        return styles[s] || 'bg-slate-50 text-slate-400 border-slate-100';
    };

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleDateString('en-GB', {
            day: '2-digit',
            month: 'short',
            year: 'numeric'
        });
    };

    const formatStatus = (status) => {
        if (!status) return 'N/A';
        return String(status).charAt(0).toUpperCase() + String(status).slice(1).toLowerCase();
    };

    const handleViewMore = (student) => {
        setOpenActionMenuId(null);
        setSelectedStudent({
            candidateId: student.candidate_id || student.candidateId,
            candidate_id: student.candidate_id || student.candidateId,
            candidate_name: student.candidate_name,
            candidateName: student.candidate_name,
            email: student.email,
            candidateEmail: student.email,
            candidate_code: student.candidate_code,
            candidateCode: student.candidate_code,
            status: student.status,
            register_no: student.register_no,
            registerNo: student.register_no,
            mobile_number: student.mobile_number,
            location: student.location,
            address: student.address,
            birthdate: student.birthdate,
            department: student.department,
            semester: student.semester,
            ...student
        });
        setIsDrawerOpen(true);
    };

    const openStatusModal = (student, newStatus) => {
        setStatusModalStudent(student);
        setStatusModalNewStatus(newStatus);
        setShowApproveRejectButtons(newStatus === PENDING_CHOICE);
        setStatusModalOpen(true);
        setOpenActionMenuId(null);
    };

    const confirmStatusChange = async (newStatus, targetStudent) => {
        const student = targetStudent || statusModalStudent;
        const statusToSet = newStatus ?? statusModalNewStatus;
        
        if (!student) {
            toast.error('Student context missing');
            return;
        }
        if (!statusToSet) {
            toast.error('Status to set is missing');
            return;
        }
        if (!organizationId) {
            toast.error('Organization context missing. Please refresh.');
            return;
        }
        
        const loadingToast = toast.loading(`Updating status to ${statusToSet}...`);
        setStatusUpdating(true);
        try {
            const candidateId = student.candidate_id || student.candidateId;
            await axios.put(`/candidates/${candidateId}/status`, { status: statusToSet }, {
                params: {}
            });
            toast.success(`Status updated to ${statusToSet}`, { id: loadingToast });
            setStatusModalOpen(false);
            setStatusModalStudent(null);
            setStatusModalNewStatus(null);
            setShowApproveRejectButtons(false);
            fetchStatusCounts();
            setStudents((prev) => prev.map((s) => {
                const sid = s.candidate_id || s.candidateId;
                if (sid === candidateId) return { ...s, status: statusToSet };
                return s;
            }));
            setOpenActionMenuId(null);
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status', { id: loadingToast });
        } finally {
            setStatusUpdating(false);
        }
    };

    const handleResendInvitation = async (student) => {
        if (!student) {
            toast.error('Student context missing');
            return;
        }
        if (!organizationId) {
            toast.error('Organization context missing. Please refresh.');
            return;
        }
        
        const candidateId = student.candidate_id || student.candidateId;
        const loadingToast = toast.loading('Resending invitation...');
        try {
            await axios.post(`/candidates/${candidateId}/resend-invitation`);
            toast.success('Invitation resent successfully', { id: loadingToast });
            setOpenActionMenuId(null);
        } catch (err) {
            console.error('Failed to resend invitation:', err);
            toast.error(err.response?.data?.message || 'Failed to resend invitation', { id: loadingToast });
        }
    };

    const PENDING_CHOICE = 'PENDING_CHOICE';

    const getStatusOptions = (student) => {
        const current = (student?.status || '').toString().toLowerCase();
        if (current === 'pending') {
            return [{ label: 'Approve/Reject', value: PENDING_CHOICE, icon: 'approve_reject' }];
        }
        if (current === 'active') return [{ label: 'Inactive', value: 'Inactive', icon: 'inactive' }];
        if (current === 'inactive') return [{ label: 'Active', value: 'Active', icon: 'active' }];
        if (current === 'rejected') return [{ label: 'Active', value: 'Active', icon: 'active' }];
        return [];
    };

    const StatusOptionIcon = ({ type, className = 'w-4 h-4' }) => {
        if (type === 'approve_reject') return (
            <svg className={`${className} text-slate-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" /></svg>
        );
        if (type === 'active') return (
            <svg className={`${className} text-emerald-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        );
        if (type === 'inactive') return (
            <svg className={`${className} text-red-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 9v6m4-6v6m7-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
        );
        return null;
    };

    const BULK_REQUIRED_COLS = ['candidate_name', 'email', 'mobile_number'];
    const BULK_SAMPLE_ROW = {
        candidate_name: 'John Doe', email: 'john@college.edu', mobile_number: '9876543210',
        register_no: '21CS001', department_name: 'Computer Science', semester: '3',
        year_of_passing: '2025', location: 'Bangalore'
    };

    const handleBulkFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        setBulkFileName(file.name);
        const reader = new FileReader();
        reader.onload = (evt) => {
            try {
                const data = new Uint8Array(evt.target.result);
                const wb = XLSX.read(data, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                setBulkRows(rows.map(r => ({
                    candidate_name: String(r.candidate_name || r['Full Name'] || r['Name'] || '').trim(),
                    email: String(r.email || r['Email'] || r['Email Address'] || '').trim().toLowerCase(),
                    mobile_number: String(r.mobile_number || r['Mobile'] || r['Phone'] || r['Mobile Number'] || '').trim(),
                    register_no: String(r.register_no || r['Register No'] || r['Roll No'] || '').trim(),
                    department_name: String(r.department_name || r['Department'] || '').trim(),
                    semester: String(r.semester || r['Semester'] || '').trim(),
                    year_of_passing: String(r.year_of_passing || r['Year of Passing'] || '').trim(),
                    location: String(r.location || r['Location'] || r['City'] || '').trim(),
                })));
            } catch (err) {
                toast.error('Failed to read file. Please use a valid CSV or Excel file.');
            }
        };
        reader.readAsArrayBuffer(file);
        e.target.value = '';
    };

    const handleBulkUpload = () => {
        if (!bulkRows.length) return;
        const invalid = bulkRows.filter(r => !r.candidate_name || !r.email || !r.mobile_number);
        if (invalid.length) {
            toast.error(`${invalid.length} row(s) missing required fields (Name, Email, Mobile)`);
            return;
        }
        // Close modal immediately — process in background
        setShowBulkModal(false);
        const rowsToProcess = [...bulkRows];
        toast.success(`Processing ${rowsToProcess.length} students in background...`);
        (async () => {
            let success = 0, failed = 0;
            for (const row of rowsToProcess) {
                try {
                    const fd = new FormData();
                    Object.entries(row).forEach(([k, v]) => {
                        if (k !== 'status' && v) fd.append(k, v);
                    });
                    await axios.post('/candidates', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                    success++;
                } catch (err) {
                    failed++;
                }
            }
            if (success > 0) {
                toast.success(`${success} student(s) added successfully`);
                fetchStudents(false, true);
            }
            if (failed > 0) toast.error(`${failed} student(s) failed to add`);
        })();
    };

    const downloadSampleFile = () => {
        const ws = XLSX.utils.json_to_sheet([BULK_SAMPLE_ROW]);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Students');
        XLSX.writeFile(wb, 'students_bulk_upload_sample.xlsx');
    };

    return (
        <div className="space-y-6 pt-2 pb-12">
            {/* Filtered By Indicator */}
            {filterUserId && filterUserName && (
                <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-xl px-4 py-3 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 shadow-sm">
                            <GraduationCap size={16} />
                        </div>
                        <div>
                            <p className="text-[10px] font-bold text-blue-400 uppercase tracking-wider leading-none mb-1">Filtered by Member</p>
                            <h3 className="text-sm font-bold text-blue-900 capitalize leading-none">{filterUserName}</h3>
                        </div>
                    </div>
                    <button 
                        onClick={() => {
                            searchParams.delete('userId');
                            searchParams.delete('userName');
                            setSearchParams(searchParams);
                        }}
                        className="text-[11px] font-bold text-blue-600 hover:text-blue-800 transition-colors flex items-center gap-1.5 group"
                    >
                        <span>Clear Filter</span>
                        <X size={14} className="group-hover:rotate-90 transition-transform" />
                    </button>
                </div>
            )}


            {/* Tabs: All, Pending, Active, Inactive */}
            <div className="flex items-center gap-8 border-b border-slate-100 overflow-x-auto no-scrollbar">
                {statusTabs.map((status) => {
                    const count = statusCounts[status] ?? 0;
                    return (
                        <button
                            key={status}
                            onClick={() => {
                                setActiveTab(status);
                                setPage(0);
                            }}
                            className={`relative pb-2 flex items-center gap-2 transition-all group shrink-0 ${activeTab === status ? 'text-blue-600 font-normal' : 'text-slate-900 font-normal hover:text-slate-900'}`}
                        >
                            <span className="text-xs">{status === 'Rejection' ? 'Rejection' : formatStatus(status)}</span>
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
                        placeholder="Search students by name, email or code..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-50"
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
                            <div className="absolute right-0 mt-2 w-[280px] bg-white rounded-xl border border-slate-100 shadow-[0_10px_25px_rgba(0,0,0,0.1)] z-50 overflow-hidden text-black">
                                <div className="p-4 space-y-5 max-h-[480px] overflow-y-auto no-scrollbar text-black">
                                    <div className="space-y-2.5">
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
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{status.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Department</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {metadata.departments.map((dept) => (
                                                <label key={dept.id} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.deptIds.includes(dept.id)}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...advancedFilters.deptIds, dept.id]
                                                                : advancedFilters.deptIds.filter(id => id !== dept.id);
                                                            setAdvancedFilters({ ...advancedFilters, deptIds: newIds });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors truncate">{dept.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Branch</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {metadata.branches
                                                .filter(b => advancedFilters.deptIds.length === 0 || advancedFilters.deptIds.includes(b.department_id))
                                                .map((branch) => (
                                                <label key={branch.id} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.branchIds.includes(branch.id)}
                                                        onChange={(e) => {
                                                            const newIds = e.target.checked
                                                                ? [...advancedFilters.branchIds, branch.id]
                                                                : advancedFilters.branchIds.filter(id => id !== branch.id);
                                                            setAdvancedFilters({ ...advancedFilters, branchIds: newIds });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors truncate">{branch.name}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Semester</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {metadata.semesters.map((sem) => (
                                                <label key={sem} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.semesters.includes(sem)}
                                                        onChange={(e) => {
                                                            const newSems = e.target.checked
                                                                ? [...advancedFilters.semesters, sem]
                                                                : advancedFilters.semesters.filter(s => s !== sem);
                                                            setAdvancedFilters({ ...advancedFilters, semesters: newSems });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">S {sem}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Passout Year</label>
                                        <div className="grid grid-cols-1 gap-2">
                                            {(Array.isArray(metadata.batches) ? metadata.batches : []).map((batch) => (
                                                <label key={batch} className="flex items-center gap-2 cursor-pointer group">
                                                    <input
                                                        type="checkbox"
                                                        checked={advancedFilters.batches.includes(batch)}
                                                        onChange={(e) => {
                                                            const newBatches = e.target.checked
                                                                ? [...advancedFilters.batches, batch]
                                                                : advancedFilters.batches.filter(b => b !== batch);
                                                            setAdvancedFilters({ ...advancedFilters, batches: newBatches });
                                                        }}
                                                        className="w-3.5 h-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-600"
                                                    />
                                                    <span className="text-xs text-slate-600 group-hover:text-slate-900 transition-colors uppercase">{batch}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="space-y-1.5 ">
                                        <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Order By</label>
                                        <select
                                            value={advancedFilters.orderBy}
                                            onChange={(e) => setAdvancedFilters({ ...advancedFilters, orderBy: e.target.value })}
                                            className="w-full bg-slate-50 border border-slate-100 rounded-lg px-3 py-2 text-xs text-slate-700 outline-none focus:border-blue-300"
                                        >
                                            <option value="Newest to Oldest">Newest to Oldest</option>
                                            <option value="Oldest to Newest">Oldest to Newest</option>
                                            <option value="Title A-Z">Name A-Z</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="p-3 bg-slate-50 border-t border-slate-100 flex items-center justify-end gap-2">
                                    <button
                                        onClick={() => {
                                            setAdvancedFilters({
                                                status: [],
                                                deptIds: [],
                                                branchIds: [],
                                                semesters: [],
                                                batches: [],
                                                orderBy: 'Newest to Oldest'
                                            });
                                        }}
                                        className="text-[10px] font-bold text-slate-400 hover:text-slate-600 transition-colors"
                                    >
                                        Reset
                                    </button>
                                    <button
                                        onClick={() => setShowFilters(false)}
                                        className="px-3 py-1.5 bg-blue-600 text-white text-[10px] font-bold rounded-md hover:bg-blue-700 transition-all shadow-sm active:scale-95"
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
                </div>

                {/* Add Student button */}
                <PermissionWrapper feature="students" permission="create">
                    <button
                        onClick={() => { setBulkRows([]); setBulkFileName(''); setShowBulkModal(true); }}
                        className="flex items-center gap-2 px-4 py-2.5 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-lg hover:bg-slate-50 transition-all shrink-0 shadow-sm"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                        </svg>
                        Bulk Upload
                    </button>
                    <button
                        onClick={() => navigate('/students/add')}
                        className="ml-2 flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shrink-0"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                        </svg>
                        + Add Student
                    </button>
                </PermissionWrapper>
            </div>

            {/* Table */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Phone</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Reg No</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Department</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center whitespace-nowrap">Batch Year</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Created At</th>
                            <th className="pr-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            [...Array(6)].map((_, idx) => (
                                <tr key={idx} className="animate-pulse">
                                    <td colSpan={9} className="px-8 py-6">
                                        <div className="h-10 bg-slate-100 rounded-lg" />
                                    </td>
                                </tr>
                            ))
                        ) : students.length > 0 ? (
                            students.map((student) => {
                                const id = student.candidate_id || student.candidateId || student.email;
                                const name = student.candidate_name || student.candidateName || 'N/A';
                                const code = student.candidate_code || student.candidateCode || 'N/A';
                                const email = student.email || student.candidateEmail || 'N/A';
                                const status = student.status || 'All';
                                const createdAt = student.created_at || student.createdAt || student.candidate_created_at;
                                const semester = student.semester != null && student.semester !== '' ? (Number(student.semester) ? `Sem ${student.semester}` : '—') : '—';
                                const department = (student.department_name || student.department || '').trim() || '—';
                                const registerNo = (student.register_no != null && String(student.register_no).trim() !== '') ? String(student.register_no).trim() : '—';
                                const batchYear = student.batch_start_year && student.batch_end_year
                                    ? `${student.batch_start_year} - ${student.batch_end_year}`
                                    : student.year_of_passing
                                        ? String(student.year_of_passing)
                                        : '—';

                                return (
                                    <tr key={id} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="pl-8 py-4">
                                            <div className="flex items-center gap-3 min-w-0">
                                                <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center shrink-0 border border-slate-200 overflow-hidden">
                                                    <img
                                                        src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'Student'}`}
                                                        alt={name}
                                                        className="w-full h-full object-cover"
                                                    />
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className={student.status === 'PENDING' ? 'text-sm text-blue-600' : 'text-sm text-black group-hover:text-blue-600 transition-colors truncate'}>{name}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]" title={email}>
                                                        {email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-black">{student.mobile_number || '—'}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-black">{registerNo}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-black">{semester}, {department}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-black">{batchYear}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${getStatusStyles(status)}`}>
                                                {formatStatus(status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-black whitespace-nowrap">
                                                {formatDate(createdAt)}
                                            </span>
                                        </td>
                                        <td className="pr-8 py-4 text-center">
                                            <div className="relative inline-block" data-action-menu>
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        const rect = e.currentTarget.getBoundingClientRect();
                                                        setDropdownPos({ top: rect.bottom, buttonRight: rect.right });
                                                        setOpenActionMenuId(openActionMenuId === id ? null : id);
                                                    }}
                                                    className={`p-2 rounded-full transition-all ${openActionMenuId === id ? 'bg-slate-100 text-blue-600' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                    aria-label="Actions"
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
                                <td colSpan={8} className="px-8 py-14 text-center text-sm text-slate-400">
                                    No students found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Fixed Action Menu Portal-like */}
            {openActionMenuId && (
                <div 
                    ref={dropdownRef}
                    data-action-menu
                    className="fixed z-[100] w-44 bg-white rounded-xl shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-slate-100 py-1.5 animate-in fade-in zoom-in duration-200"
                    style={{ top: dropdownPos.top + 2, left: dropdownPos.buttonRight - 176 }}
                >
                    {(() => {
                        const studentIdToMatch = openActionMenuId;
                        const student = students.find(s => (s.candidate_id === studentIdToMatch || s.candidateId === studentIdToMatch || s.id === studentIdToMatch));
                        if (!student) return null;
                        return (
                            <>
                                <button
                                    type="button"
                                    onClick={() => handleViewMore(student)}
                                    className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                >
                                    <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                    View more
                                </button>
                                <PermissionWrapper feature="students" permission="update">
                                    <button
                                        type="button"
                                        onClick={() => navigate(`/students/edit/${student.candidate_id || student.candidateId}`)}
                                        className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                        Edit
                                    </button>
                                </PermissionWrapper>
                                {getStatusOptions(student).length > 0 && (
                                    <>
                                        {getStatusOptions(student).map((opt) => (
                                            <PermissionWrapper key={opt.value} feature="students" permission="update">
                                                <button
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        if (opt.value === PENDING_CHOICE) {
                                                            setStatusModalStudent(student);
                                                            setStatusModalNewStatus(opt.value);
                                                            setStatusModalOpen(true);
                                                            setOpenActionMenuId(null);
                                                        } else {
                                                            // Direct API call for Active/Inactive/etc
                                                            confirmStatusChange(opt.value, student);
                                                        }
                                                    }}
                                                    className={`w-full text-left px-4 py-2.5 text-[11px] font-normal hover:bg-slate-50 transition-colors flex items-center gap-2 ${opt.color}`}
                                                >
                                                    <StatusOptionIcon type={opt.icon} />
                                                    Mark as {opt.label}
                                                </button>
                                            </PermissionWrapper>
                                        ))}
                                    </>
                                )}
                                <PermissionWrapper feature="students" permission="update">
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleResendInvitation(student);
                                        }}
                                        className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-blue-600 hover:bg-blue-50 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                        Resend Invitation
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
                totalPages={Math.ceil(total / pageSize)}
                onPageChange={setPage}
                pageSize={pageSize}
                totalElements={total}
            />

            <CandidateDetailsDrawer
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                candidate={selectedStudent}
                organizationId={organizationId}
            />

            {/* Status change confirmation modal */}
            {statusModalOpen && (
                <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
                    <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" onClick={() => !statusUpdating && setStatusModalOpen(false)} />
                    <div className="relative bg-white rounded-2xl border border-slate-200 shadow-xl max-w-sm w-full p-6">
                        <div className="flex items-start justify-between gap-3 mb-3">
                            <div className="flex items-center gap-3 min-w-0">
                                <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
                                    <svg className="w-5 h-5 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                                    </svg>
                                </div>
                                <div className="min-w-0">
                                    <h3 className="text-base font-bold text-slate-800">{showApproveRejectButtons ? 'Approve or Reject' : 'Change status'}</h3>
                                    <p className="text-[11px] text-slate-500 font-normal">{showApproveRejectButtons ? 'Choose an action for this student' : 'Update student status'}</p>
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => !statusUpdating && setStatusModalOpen(false)}
                                disabled={statusUpdating}
                                className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 disabled:opacity-50 transition-colors shrink-0"
                                aria-label="Close"
                            >
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                        </div>
                        {showApproveRejectButtons ? (
                            <>
                                <p className="text-sm text-slate-600 mb-5">
                                    <span className="font-semibold text-slate-800">{statusModalStudent?.candidate_name || statusModalStudent?.candidateName || 'This student'}</span> is pending. Approve or reject?
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => confirmStatusChange('Rejected')}
                                        disabled={statusUpdating}
                                        className="px-4 py-2.5 text-xs font-semibold text-white bg-red-500 rounded-lg hover:bg-red-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                                        Reject
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => confirmStatusChange('Active')}
                                        disabled={statusUpdating}
                                        className="px-4 py-2.5 text-xs font-semibold text-white bg-emerald-500 rounded-lg hover:bg-emerald-600 disabled:opacity-50 transition-colors flex items-center gap-2"
                                    >
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
                                        Approve
                                    </button>
                                </div>
                            </>
                        ) : (
                            <>
                                <p className="text-sm text-slate-600 mb-5">
                                    Change <span className="font-semibold text-slate-800">{statusModalStudent?.candidate_name || statusModalStudent?.candidateName || 'this student'}</span> to
                                    <span className={`ml-1.5 font-bold ${statusModalNewStatus === 'Active' ? 'text-emerald-600' : 'text-red-600'}`}>
                                        {statusModalNewStatus}
                                    </span>?
                                </p>
                                <div className="flex gap-3 justify-end">
                                    <button
                                        type="button"
                                        onClick={() => confirmStatusChange()}
                                        disabled={statusUpdating}
                                        className={`px-4 py-2.5 text-xs font-semibold text-white rounded-lg hover:brightness-110 disabled:opacity-50 transition-colors ${(statusModalNewStatus === 'Rejected' || statusModalNewStatus === 'Inactive') ? 'bg-red-500 hover:bg-red-600' : 'bg-emerald-500 hover:bg-emerald-600'}`}
                                    >
                                        {statusUpdating ? 'Updating...' : 'OK'}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            )}

            {/* Bulk Upload Modal */}
            {showBulkModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl mx-4 flex flex-col max-h-[90vh]">
                        {/* Header */}
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <div>
                                <h2 className="text-sm font-bold text-slate-800">Bulk Upload Students</h2>
                                <p className="text-[11px] text-slate-400 mt-0.5">Upload a CSV or Excel file to add multiple students at once</p>
                            </div>
                            <button onClick={() => setShowBulkModal(false)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400">
                                <X size={16} />
                            </button>
                        </div>

                        <div className="p-6 overflow-y-auto space-y-5 flex-1">
                            {/* File picker — shown only when no rows loaded */}
                            {bulkRows.length === 0 && (
                                <>
                                    <div className="bg-blue-50 border border-blue-100 rounded-xl p-4">
                                        <p className="text-[11px] font-bold text-blue-700 mb-2 uppercase tracking-wider">Required Columns</p>
                                        <div className="flex flex-wrap gap-2">
                                            {['candidate_name', 'email', 'mobile_number'].map(c => (
                                                <span key={c} className="px-2 py-0.5 bg-blue-600 text-white text-[10px] font-semibold rounded-full">{c} *</span>
                                            ))}
                                            {['register_no', 'department_name', 'semester', 'year_of_passing', 'location'].map(c => (
                                                <span key={c} className="px-2 py-0.5 bg-blue-100 text-blue-700 text-[10px] font-semibold rounded-full">{c}</span>
                                            ))}
                                        </div>
                                    </div>
                                    <div
                                        onClick={() => bulkFileRef.current?.click()}
                                        className="border-2 border-dashed border-slate-300 rounded-xl px-6 py-10 text-center cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                    >
                                        <input ref={bulkFileRef} type="file" accept=".csv,.xlsx,.xls" className="hidden" onChange={handleBulkFileChange} />
                                        <svg className="w-10 h-10 mx-auto text-slate-300 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" /></svg>
                                        <p className="text-sm text-slate-400">Click to select a <span className="font-semibold">.csv</span> or <span className="font-semibold">.xlsx</span> file</p>
                                        <p className="text-[11px] text-slate-300 mt-1">All records will be shown for review before adding</p>
                                    </div>
                                </>
                            )}

                            {/* Full preview of ALL records */}
                            {bulkRows.length > 0 && (
                                <div>
                                    <div className="flex items-center justify-between mb-3">
                                        <div>
                                            <p className="text-sm font-bold text-slate-800">{bulkRows.length} Student(s) Ready to Add</p>
                                            {bulkRows.filter(r => !r.candidate_name || !r.email || !r.mobile_number).length > 0 && (
                                                <p className="text-[11px] text-red-500 mt-0.5">{bulkRows.filter(r => !r.candidate_name || !r.email || !r.mobile_number).length} row(s) have missing required fields (highlighted in red)</p>
                                            )}
                                        </div>
                                        <button
                                            onClick={() => { setBulkRows([]); setBulkFileName(''); }}
                                            className="text-[11px] text-slate-400 hover:text-red-500 transition-colors flex items-center gap-1"
                                        >
                                            <X size={12} /> Change File
                                        </button>
                                    </div>
                                    <div className="overflow-auto rounded-xl border border-slate-200 max-h-[380px]">
                                        <table className="w-full text-[11px]">
                                            <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                                                <tr>
                                                    {['#', 'Name', 'Email', 'Mobile', 'Reg No', 'Department', 'Sem', 'Year', 'Location'].map(h => (
                                                        <th key={h} className="px-3 py-2.5 text-left font-semibold text-slate-500 whitespace-nowrap">{h}</th>
                                                    ))}
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {bulkRows.map((r, i) => {
                                                    const hasError = !r.candidate_name || !r.email || !r.mobile_number;
                                                    return (
                                                        <tr key={i} className={hasError ? 'bg-red-50' : 'hover:bg-slate-50'}>
                                                            <td className="px-3 py-2 text-slate-400 font-medium">{i + 1}</td>
                                                            <td className="px-3 py-2 font-medium text-slate-800 max-w-[120px] truncate">{r.candidate_name || <span className="text-red-500 font-semibold">Missing</span>}</td>
                                                            <td className="px-3 py-2 text-slate-600 max-w-[160px] truncate">{r.email || <span className="text-red-500 font-semibold">Missing</span>}</td>
                                                            <td className="px-3 py-2 text-slate-600 whitespace-nowrap">{r.mobile_number || <span className="text-red-500 font-semibold">Missing</span>}</td>
                                                            <td className="px-3 py-2 text-slate-500">{r.register_no || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-500 max-w-[120px] truncate">{r.department_name || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-500">{r.semester || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-500">{r.year_of_passing || '—'}</td>
                                                            <td className="px-3 py-2 text-slate-500 max-w-[100px] truncate">{r.location || '—'}</td>
                                                        </tr>
                                                    );
                                                })}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Footer */}
                        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between">
                            <button onClick={downloadSampleFile} className="flex items-center gap-1.5 text-[11px] text-slate-400 hover:text-blue-600 font-semibold transition-colors">
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                                Download Sample
                            </button>
                            <div className="flex gap-3">
                                <button onClick={() => setShowBulkModal(false)} className="px-4 py-2 text-xs font-semibold text-slate-600 bg-slate-100 rounded-lg hover:bg-slate-200 transition-colors">
                                    Cancel
                                </button>
                                {bulkRows.length > 0 && bulkRows.filter(r => !r.candidate_name || !r.email || !r.mobile_number).length === 0 && (
                                    <button
                                        onClick={handleBulkUpload}
                                        className="px-5 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                                    >
                                        Add {bulkRows.length} Students
                                    </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Students;
