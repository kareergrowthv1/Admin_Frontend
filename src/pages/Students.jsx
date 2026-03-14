import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';
import CandidateDetailsDrawer from '../components/CandidateDetailsDrawer';

const Students = () => {
    const navigate = useNavigate();
    const [activeTab, setActiveTab] = useState('All');
    const [searchTerm, setSearchTerm] = useState('');
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [pageSize] = useState(10);
    const [total, setTotal] = useState(0);
    const [statusTabs] = useState(['All', 'Pending', 'Active', 'Inactive', 'Rejection']);
    const [statusCounts, setStatusCounts] = useState({ All: 0, Pending: 0, Active: 0, Inactive: 0, Rejection: 0 });
    const [organizationId, setOrganizationId] = useState(null);
    const [openAvatarId, setOpenAvatarId] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);
    const [selectedStudent, setSelectedStudent] = useState(null);
    const [openActionMenuId, setOpenActionMenuId] = useState(null);
    const [statusModalOpen, setStatusModalOpen] = useState(false);
    const [statusModalStudent, setStatusModalStudent] = useState(null);
    const [statusModalNewStatus, setStatusModalNewStatus] = useState(null);
    const [showApproveRejectButtons, setShowApproveRejectButtons] = useState(false);
    const [statusUpdating, setStatusUpdating] = useState(false);

    useEffect(() => {
        const handleClickOutside = (event) => {
            if (openAvatarId && !event.target.closest('[data-avatar-trigger], [data-avatar-preview]')) {
                setOpenAvatarId(null);
            }
            if (openActionMenuId && !event.target.closest('[data-action-menu]')) {
                setOpenActionMenuId(null);
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
            const response = await axios.get('/candidates/students/counts', {
                params: { organization_id: organizationId }
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
    }, [organizationId]);

    useEffect(() => {
        if (!organizationId) return;

        const timeoutId = setTimeout(async () => {
            try {
                setLoading(true);
                const params = {
                    organization_id: organizationId,
                    page,
                    size: pageSize
                };
                if (activeTab && activeTab !== 'All') {
                    params.status = activeTab === 'Rejection' ? 'Rejected' : activeTab;
                }
                if (searchTerm) params.searchTerm = searchTerm;

                const response = await axios.get('/candidates/students', { params });
                const content = response.data?.content || [];
                const totalElements = response.data?.totalElements ?? 0;

                setStudents(content);
                setTotal(totalElements);
                fetchStatusCounts();
            } catch (error) {
                console.error('Failed to load students:', error);
                toast.error('Failed to load students');
            } finally {
                setLoading(false);
            }
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [activeTab, searchTerm, page, pageSize, organizationId]);

    const getStatusStyles = (status) => {
        const s = (status || '').toString();
        const styles = {
            'Pending': 'bg-amber-50 text-amber-600 border-amber-100',
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

    const confirmStatusChange = async (newStatus) => {
        const statusToSet = newStatus ?? statusModalNewStatus;
        if (!statusModalStudent || !statusToSet || !organizationId) return;
        setStatusUpdating(true);
        try {
            const candidateId = statusModalStudent.candidate_id || statusModalStudent.candidateId;
            await axios.put(`/candidates/${candidateId}/status`, { status: statusToSet }, {
                params: { organization_id: organizationId }
            });
            toast.success(`Status updated to ${statusToSet}`);
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
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to update status');
        } finally {
            setStatusUpdating(false);
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

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-2xl font-bold text-slate-800">Students</h1>
                <button
                    onClick={() => navigate('/candidates/add')}
                    className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Add Student
                </button>
            </div>

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
                            className={`relative pb-3 flex items-center gap-2 transition-all group shrink-0 ${activeTab === status ? 'text-[#FF6B00] font-normal' : 'text-slate-900 font-normal hover:text-slate-900'}`}
                        >
                            <span className="text-xs">{status === 'Rejection' ? 'Rejection' : formatStatus(status)}</span>
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
                        placeholder="Search students by name, email or code..."
                        className="w-full bg-white border border-slate-200 rounded-lg pl-10 pr-4 py-2.5 text-sm text-slate-600 placeholder-slate-400 outline-none transition-all focus:border-orange-400 focus:ring-2 focus:ring-orange-50"
                        value={searchTerm}
                        onChange={(e) => {
                            setSearchTerm(e.target.value);
                            setPage(0);
                        }}
                    />
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

            {/* Table */}
            <div className="relative bg-white rounded-2xl border border-slate-200 shadow-[0_1px_4px_rgba(0,0,0,0.05)] overflow-visible">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="bg-slate-50/50 border-b border-slate-200">
                            <th className="pl-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">Student Name</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Reg No</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Student Code</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Department</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Status</th>
                            <th className="px-4 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-center">Created At</th>
                            <th className="pr-8 py-4 text-[11px] font-semibold text-slate-500 uppercase tracking-wider text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                        {loading ? (
                            [...Array(6)].map((_, idx) => (
                                <tr key={idx} className="animate-pulse">
                                    <td colSpan={7} className="px-8 py-6">
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
                                const department = (student.department != null && String(student.department).trim() !== '') ? String(student.department).trim() : '—';
                                const registerNo = (student.register_no != null && String(student.register_no).trim() !== '') ? String(student.register_no).trim() : '—';

                                return (
                                    <tr key={id} className="hover:bg-slate-100/40 transition-colors group">
                                        <td className="pl-8 py-4">
                                            <div className="flex items-center gap-4">
                                                <div className="relative shrink-0">
                                                    <button
                                                        type="button"
                                                        data-avatar-trigger
                                                        onClick={(e) => {
                                                            e.stopPropagation();
                                                            setOpenAvatarId((prev) => (prev === id ? null : id));
                                                        }}
                                                        className="w-10 h-10 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center overflow-hidden focus:outline-none focus:ring-2 focus:ring-[#FF6B00]/50"
                                                    >
                                                        <img
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
                                                            alt={name}
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </button>
                                                    {openAvatarId === id && (
                                                        <div
                                                            className="absolute left-0 bottom-full mb-1.5 z-50 transition-opacity duration-150"
                                                            data-avatar-preview
                                                        >
                                                            <div className="w-20 h-20 rounded-full bg-white border-2 border-slate-200 shadow-lg overflow-hidden">
                                                                <img
                                                                    src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name}`}
                                                                    alt={name}
                                                                    className="w-full h-full object-cover"
                                                                />
                                                            </div>
                                                        </div>
                                                    )}
                                                </div>
                                                <div className="min-w-0">
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-sm font-semibold text-slate-900 group-hover:text-[#FF6B00] transition-colors truncate">{name}</span>
                                                    </div>
                                                    <p className="text-[11px] text-slate-400 font-normal truncate max-w-[200px]" title={email}>
                                                        {email}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900">{registerNo}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900">{code}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs text-slate-700">{semester}, {department}</span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-bold border transition-all ${getStatusStyles(status)}`}>
                                                {formatStatus(status)}
                                            </span>
                                        </td>
                                        <td className="px-4 py-4 text-center">
                                            <span className="text-xs font-normal text-slate-900 whitespace-nowrap">
                                                {formatDate(createdAt)}
                                            </span>
                                        </td>
                                        <td className="pr-8 py-4 text-right">
                                            <div className="relative inline-block" data-action-menu>
                                                <button
                                                    type="button"
                                                    onClick={(e) => { e.stopPropagation(); setOpenActionMenuId((prev) => (prev === id ? null : id)); }}
                                                    className={`p-2 rounded-full transition-all ${openActionMenuId === id ? 'bg-slate-100 text-[#FF6B00]' : 'text-slate-400 hover:text-slate-600 hover:bg-slate-50'}`}
                                                    aria-label="Actions"
                                                >
                                                    <svg className="w-5 h-5 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
                                                    </svg>
                                                </button>
                                                {openActionMenuId === id && (
                                                    <div className="absolute right-0 top-full mt-1 w-44 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in zoom-in duration-200">
                                                        <button
                                                            type="button"
                                                            onClick={() => handleViewMore(student)}
                                                            className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                                                            View more
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => { setOpenActionMenuId(null); toast.success('Edit student — coming soon'); }}
                                                            className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                                        >
                                                            <svg className="w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" /></svg>
                                                            Edit
                                                        </button>
                                                        {getStatusOptions(student).length > 0 && (
                                                            <>
                                                                <div className="border-t border-slate-100 my-1" />
                                                                {getStatusOptions(student).map((opt) => (
                                                                    <button
                                                                        key={opt.value}
                                                                        type="button"
                                                                        onClick={() => openStatusModal(student, opt.value)}
                                                                        className="w-full text-left px-4 py-2.5 text-[11px] font-normal text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                                                                    >
                                                                        <StatusOptionIcon type={opt.icon} />
                                                                        {opt.label}
                                                                    </button>
                                                                ))}
                                                            </>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })
                        ) : (
                            <tr>
                                <td colSpan={7} className="px-8 py-14 text-center text-sm text-slate-400">
                                    No students found for the selected filters.
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between pb-6 mt-4">
                <div className="flex items-center gap-3">
                    <span className="text-xs font-semibold text-slate-400 italic">
                        Showing {students.length} of {total} records
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
        </div>
    );
};

export default Students;
