import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../config/axios';
import { 
    Mail, Phone, MapPin, Calendar, Hash, User, Briefcase, 
    Download, Eye, FileText, CheckCircle2, Clock, Timer,
    ArrowRight, Star, ExternalLink, Globe, Trash2,
    Database, Shield, Zap, Activity
} from 'lucide-react';

const getStatusStyles = (status) => {
    const styles = {
        'INVITED': 'bg-purple-50 text-purple-600 border-purple-200',
        'MANUALLY_INVITED': 'bg-cyan-50 text-cyan-400 border-cyan-200',
        'RESUME_REJECTED': 'bg-red-50 text-red-600 border-red-200',
        'LINK_EXPIRED': 'bg-orange-50 text-orange-500 border-orange-200',
        'EXPIRED': 'bg-orange-50 text-orange-500 border-orange-200',
        'RECOMMENDED': 'bg-emerald-50 text-emerald-600 border-emerald-100',
        'NOT_RECOMMENDED': 'bg-rose-50 text-rose-600 border-rose-100',
        'CAUTIOUSLY_RECOMMENDED': 'bg-amber-50 text-amber-600 border-amber-100',
        'TEST_STARTED': 'bg-blue-50 text-blue-600 border-blue-100',
        'IN_PROGRESS': 'bg-sky-50 text-sky-600 border-sky-100',
        'TEST_COMPLETED': 'bg-sky-50 text-sky-600 border-sky-100',
        'UNATTENDED': 'bg-slate-50 text-slate-500 border-slate-100',
        'NETWORK_DISCONNECTED': 'bg-amber-50 text-amber-600 border-amber-100',
        'ROUND1': 'bg-purple-50 text-purple-600 border-purple-100',
        'ROUND2': 'bg-purple-50 text-purple-600 border-purple-100',
        'ROUND3': 'bg-purple-50 text-purple-600 border-purple-100',
        'ROUND4': 'bg-purple-50 text-purple-600 border-purple-100',
        'NETWORK_ISSUE': 'bg-amber-50 text-amber-600 border-amber-100'
    };
    return styles[status] || 'bg-slate-50 text-slate-500 border-slate-100';
};

const formatStatus = (status) => {
    if (!status) return 'N/A';
    if (status === 'ALL') return 'All';
    if (status.startsWith('ROUND')) return `Round ${status.replace('ROUND', '')}`;
    return status.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
};

const CandidateDetailsDrawer = ({ isOpen, onClose, candidate: passedCandidate, organizationId: propOrgId }) => {
    const [activeTab, setActiveTab] = useState('Contact Details');
    const fetchRequestedIdRef = useRef(null);
    const [fullCandidate, setFullCandidate] = useState(null);
    const [positions, setPositions] = useState([]);
    const [selectedPositionIndex, setSelectedPositionIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [assessmentSummary, setAssessmentSummary] = useState(null);
    const [creditsInfo, setCreditsInfo] = useState(null);
    const [loadingCredits, setLoadingCredits] = useState(false);

    const organizationId = propOrgId || localStorage.getItem('organizationId') || (typeof passedCandidate?.organizationId === 'string' ? passedCandidate.organizationId : null);

    // Requested = the student/candidate we're supposed to show (from the one just clicked)
    const requestedCandidateId = passedCandidate?.candidate_id || passedCandidate?.candidateId;
    // Only use fullCandidate if it matches the requested id; otherwise show passed so we don't show previous student
    const candidate = (fullCandidate && (fullCandidate.candidate_id || fullCandidate.candidateId) === requestedCandidateId)
        ? fullCandidate
        : (passedCandidate || { candidateCode: '—', jobTitle: '—', status: '—' });
    const candidateId = requestedCandidateId || candidate.candidate_id || candidate.candidateId;
    const candidateName = candidate.candidate_name || candidate.candidateName || 'N/A';
    const candidateSkills = (() => {
        const s = candidate.skills;
        if (Array.isArray(s)) return s;
        if (typeof s === 'string') { try { const p = JSON.parse(s); return Array.isArray(p) ? p : []; } catch (_) { return []; } }
        return [];
    })();
    const candidateCode = candidate.candidate_code || candidate.candidateCode || 'N/A';
    const selectedPosition = positions.length > 0 && selectedPositionIndex >= 0 && selectedPositionIndex < positions.length ? positions[selectedPositionIndex] : null;
    const positionTitle = selectedPosition?.positionTitle || candidate.positionTitle || candidate.jobTitle || '—';
    const positionCode = selectedPosition?.positionCode || candidate.positionCode || '—';
    const questionSetTitle = selectedPosition?.questionSetTitle || candidate.questionSetTitle || candidate.questionSetCode || '—';
    const questionSetCode = selectedPosition?.questionSetId || candidate.questionSetCode || '—';
    const questionSetDuration = selectedPosition?.questionSetDuration || candidate.questionSetDuration || '—';

    useEffect(() => {
        if (!isOpen) {
            setFullCandidate(null);
            setPositions([]);
            setAssessmentSummary(null);
            setSelectedPositionIndex(0);
            return;
        }
        if (!requestedCandidateId || !organizationId) {
            setFullCandidate(null);
            setPositions([]);
            return;
        }
        setFullCandidate(null);
        setLoading(true);
        const idToFetch = requestedCandidateId;
        fetchRequestedIdRef.current = idToFetch;
        Promise.all([
            axios.get(`/candidates/${idToFetch}`, { params: { organization_id: organizationId } }).then((r) => r.data?.data).catch(() => null),
            axios.get(`/candidates/${idToFetch}/positions`, { params: { organization_id: organizationId } }).then((r) => r.data?.data || []).catch(() => [])
        ]).then(([candidateData, positionsData]) => {
            if (fetchRequestedIdRef.current !== idToFetch) return;
            setFullCandidate(candidateData || passedCandidate || null);
            setPositions(Array.isArray(positionsData) ? positionsData : []);
            setSelectedPositionIndex(0);
        }).finally(() => {
            if (fetchRequestedIdRef.current === idToFetch) setLoading(false);
        });
    }, [isOpen, requestedCandidateId, organizationId]);

    useEffect(() => {
        if (isOpen) {
            setActiveTab('Contact Details');
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = 'unset';
        }
        return () => {
            document.body.style.overflow = 'unset';
        };
    }, [isOpen]);

    // Close on escape key
    useEffect(() => {
        const handleEsc = (event) => {
            if (event.keyCode === 27) onClose();
        };
        if (isOpen) {
            window.addEventListener('keydown', handleEsc);
        }
        return () => window.removeEventListener('keydown', handleEsc);
    }, [isOpen, onClose]);

    // Fetch assessment summary when position dropdown selection changes (for Stages rounds)
    useEffect(() => {
        if (!candidateId || !selectedPosition?.positionId) {
            setAssessmentSummary(null);
            return;
        }
        axios.get('/candidates/assessment-summaries', {
            params: { candidateId, positionId: selectedPosition.positionId }
        }).then((r) => {
            if (r.data?.success && r.data?.data) setAssessmentSummary(r.data.data);
            else setAssessmentSummary(null);
        }).catch(() => setAssessmentSummary(null));
    }, [candidateId, selectedPosition?.positionId]);

    // Fetch credits info
    useEffect(() => {
        if (!isOpen || !candidateId) return;
        
        setLoadingCredits(true);
        axios.get(`/candidates/${candidateId}/credits`)
            .then(r => {
                if (r.data?.success) setCreditsInfo(r.data.data);
                else setCreditsInfo(null);
            })
            .catch(() => setCreditsInfo(null))
            .finally(() => setLoadingCredits(false));
    }, [isOpen, candidateId]);

    if (!isOpen) return null;

    const tabs = ['Contact Details', 'Work History', 'Skills', 'Test Results', 'Credits'];

    const summary = assessmentSummary;
    const timelineItems = [
        { label: 'Round 1', status: summary?.round1Completed ? 'completed' : (summary?.round1Assigned ? 'pending' : 'not_started'), time: summary?.round1EndTime ? new Date(summary.round1EndTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (summary?.round1Completed ? 'Completed' : 'Pending') },
        { label: 'Round 2', status: summary?.round2Completed ? 'completed' : (summary?.round2Assigned ? 'pending' : 'not_started'), time: summary?.round2EndTime ? new Date(summary.round2EndTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (summary?.round2Completed ? 'Completed' : 'Pending') },
        { label: 'Round 3', status: summary?.round3Completed ? 'completed' : (summary?.round3Assigned ? 'pending' : 'not_started'), time: summary?.round3EndTime ? new Date(summary.round3EndTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (summary?.round3Completed ? 'Completed' : 'Pending') },
        { label: 'Round 4', status: summary?.round4Completed ? 'completed' : (summary?.round4Assigned ? 'pending' : 'not_started'), time: summary?.round4EndTime ? new Date(summary.round4EndTime).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : (summary?.round4Completed ? 'Completed' : 'Pending') },
    ];

    const content = (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto cursor-pointer"
                onClick={onClose}
            />

            {/* Drawer Content */}
            <div className="relative w-full max-w-5xl bg-[#F8F9FB] shadow-2xl flex flex-col h-full overflow-hidden pointer-events-auto rounded-l-2xl animate-in slide-in-from-right duration-300">
                {/* Header */}
                <div className="bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 tracking-tight">Talent Details</h2>
                        <p className="text-[10px] font-semibold text-slate-400 mt-0.5 uppercase tracking-widest leading-none truncate max-w-md" title={candidate.email || candidate.candidateEmail || candidateId || 'N/A'}>{candidate.email || candidate.candidateEmail || 'N/A'}</p>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2.5 bg-slate-50 rounded-xl border border-slate-100 text-slate-400 hover:text-red-500 hover:bg-red-50 hover:border-red-100 transition-all shadow-sm"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                </div>

                {/* Main Body */}
                <div className="flex-1 overflow-y-auto px-5 py-4 space-y-3 no-scrollbar">
                    {loading && (
                        <div className="flex items-center justify-center py-20">
                            <div className="animate-spin w-10 h-10 border-2 border-blue-600 border-t-transparent rounded-full" />
                        </div>
                    )}
                    {!loading && (
                    <div className="grid grid-cols-12 gap-4 items-stretch">

                        {/* ROW 1 – Profile Card (col 8) */}
                        <div className="col-span-8">
                            <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm h-full flex flex-col">
                                <div className="flex items-center gap-5 mb-4">
                                    <div className="w-20 h-20 rounded-full bg-blue-50 p-1 shadow-sm shrink-0">
                                        <div className="w-full h-full rounded-full bg-slate-100 border-2 border-white overflow-hidden shadow-inner">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidateName || 'Alex'}`} alt={candidateName} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2">
                                        <h3 className="text-xl font-black text-slate-900 leading-tight tracking-tight">{candidateName}</h3>
                                        <div className="flex items-center gap-2 flex-wrap">
                                            {(candidate.isTopTalent || selectedPosition?.resumeMatchScore >= 70) && (
                                                <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 border border-emerald-100 text-[9px] font-bold text-emerald-600 uppercase tracking-widest shadow-sm">
                                                    <Star size={9} className="fill-emerald-500" />
                                                    TOP TALENT
                                                </span>
                                            )}
                                            <span className="px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 text-[9px] font-bold uppercase tracking-widest border border-slate-200">
                                                {candidateCode}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                {/* Quick Stats Grid - Compact */}
                                <div className="grid grid-cols-3 gap-0 border border-slate-100 rounded-[18px] overflow-hidden bg-slate-50/50 mb-4">
                                    {[
                                        { label: 'Department', value: candidate.department ?? 'N/A', icon: Briefcase },
                                        { label: 'Semester', value: candidate.semester != null ? (Number(candidate.semester) ? `Sem ${candidate.semester}` : candidate.semester) : 'N/A', icon: User },
                                        { label: 'Match Score', value: selectedPosition?.resumeMatchScore ?? candidate.resumeMatchScore ?? 'N/A', icon: Star }
                                    ].map((stat, i) => (
                                        <div key={i} className={`p-3 text-center flex flex-col items-center justify-center border-r last:border-0 border-slate-100`}>
                                            <div className="flex items-center gap-1 mb-0.5">
                                                <stat.icon size={11} className="text-slate-400" />
                                                <span className="text-[14px] font-bold text-slate-800">{stat.value}</span>
                                            </div>
                                            <p className="text-[8px] text-slate-400 font-bold uppercase tracking-widest">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Enhanced Resume Component */}
                                <div className="bg-white border border-slate-200 rounded-[20px] p-3.5 flex items-center justify-between group hover:border-blue-200 transition-all shadow-sm">
                                    <div className="flex items-center gap-4 min-w-0">
                                        <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center text-red-500 shrink-0">
                                            <FileText size={20} />
                                        </div>
                                        <div className="min-w-0 pr-4 border-r border-slate-100 mr-2">
                                            <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5">Resume File</p>
                                            <button 
                                                onClick={() => {
                                                    const path = candidate.resumeStoragePath || candidate.resume_url;
                                                    if (path) window.open(`${axios.defaults.baseURL}/candidates/resume/view?path=${encodeURIComponent(path)}`, '_blank');
                                                    else toast.error('Resume path not found');
                                                }}
                                                className="text-[13px] font-bold text-slate-900 border-b border-dashed border-slate-300 hover:border-blue-500 hover:text-blue-600 truncate max-w-[180px] transition-all"
                                                title="View Resume"
                                            >
                                                {candidate.resumeFilename || candidate.resume_filename || 'resume.pdf'}
                                            </button>
                                        </div>
                                        <div className="flex items-center gap-5">
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 whitespace-nowrap">File Type</p>
                                                <p className="text-[10px] font-bold text-slate-600 uppercase">PDF / DOCX</p>
                                            </div>
                                            <div className="flex flex-col">
                                                <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-0.5 whitespace-nowrap">Source</p>
                                                <p className="text-[10px] font-bold text-blue-600 uppercase">Uploaded</p>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <button 
                                            onClick={() => {
                                                const path = candidate.resumeStoragePath || candidate.resume_url;
                                                const name = candidate.resumeFilename || candidate.resume_filename || 'resume.pdf';
                                                if (path) {
                                                    axios.get('/candidates/resume/download', { params: { path }, responseType: 'blob' })
                                                        .then(res => {
                                                            const url = window.URL.createObjectURL(new Blob([res.data]));
                                                            const link = document.createElement('a');
                                                            link.href = url;
                                                            link.setAttribute('download', name);
                                                            document.body.appendChild(link);
                                                            link.click();
                                                            link.remove();
                                                        }).catch(() => toast.error('Download failed'));
                                                } else toast.error('Resume path not found');
                                            }}
                                            className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 hover:bg-blue-100 transition-all shadow-sm"
                                            title="Download Resume"
                                        >
                                            <Download size={16} />
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ROW 1 – Stages Timeline (col 4) */}
                        <div className="col-span-4">
                            <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm h-full flex flex-col">
                                <h4 className="text-[16px] font-bold text-slate-800 tracking-tight mb-3.5 flex items-center gap-2">
                                    <Clock size={16} className="text-blue-600" />
                                    Stages
                                </h4>

                                {/* Position Selection Dropdown */}
                                <div className="relative mb-4">
                                    <select
                                        value={selectedPositionIndex}
                                        onChange={(e) => setSelectedPositionIndex(Number(e.target.value))}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 pr-10 text-[10px] font-bold text-slate-700 outline-none hover:border-blue-200 focus:border-blue-400 focus:ring-4 focus:ring-blue-50/50 transition-all cursor-pointer shadow-sm uppercase tracking-wide"
                                    >
                                        {positions.length === 0 && (
                                            <option value={0}>No active positions</option>
                                        )}
                                        {positions.map((pos, idx) => (
                                            <option key={pos.positionCandidateId || idx} value={idx}>
                                                {pos.positionTitle || `Position ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        <ArrowRight size={14} className="rotate-90" />
                                    </div>
                                </div>

                                <div className="space-y-5 relative flex-1">
                                    <div className="absolute left-[15px] top-4 bottom-6 w-[2px] bg-slate-100" />
                                    {timelineItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 relative group z-10 items-start">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 transition-all ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-500 border-emerald-100 shadow-sm' :
                                                item.status === 'pending' ? 'bg-blue-50 text-blue-600 border-blue-100' :
                                                    'bg-white text-slate-200 border-slate-100'
                                                }`}>
                                                {item.status === 'completed' ? (
                                                    <CheckCircle2 size={15} />
                                                ) : item.status === 'pending' ? (
                                                    <Timer size={15} className="animate-pulse" />
                                                ) : (
                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
                                                )}
                                            </div>
                                            <div className="pt-1">
                                                <p className="text-[12px] font-bold text-slate-700 leading-none mb-1.5">{item.label}</p>
                                                <p className={`text-[9px] font-bold uppercase tracking-wider leading-none ${item.status === 'completed' ? 'text-emerald-500' : item.status === 'pending' ? 'text-blue-500' : 'text-slate-400'}`}>
                                                    {item.time}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ROW 2 – Position Summary (col 4) & Tabs (col 8) */}
                        <div className="col-span-4">
                            <div className="bg-white rounded-[18px] border border-slate-100 p-5 shadow-sm h-full flex flex-col">
                                <h4 className="text-[16px] font-bold text-slate-800 tracking-tight mb-4 flex items-center gap-2">
                                    <Briefcase size={15} className="text-blue-600" />
                                    Position Summary
                                </h4>
                                <div className="space-y-5 flex-1">
                                    {selectedPosition ? (
                                        <>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[12px] text-slate-900 font-bold">Applied Position</span>
                                                <span className="text-[11px] font-normal text-slate-500 leading-tight">{positionTitle}</span>
                                                <p className="text-[9px] font-medium text-slate-400">#{positionCode}</p>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[12px] text-slate-900 font-bold">Round Type</span>
                                                <span className="text-[11px] font-normal text-slate-500 underline decoration-slate-200">{questionSetTitle}</span>
                                                {questionSetDuration && questionSetDuration !== '—' && (
                                                    <p className="text-[9px] font-medium text-blue-500 flex items-center gap-1">
                                                        <Timer size={10} /> {questionSetDuration}
                                                    </p>
                                                )}
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[12px] text-slate-900 font-bold">Invited</span>
                                                <div className="flex items-center gap-2 text-[11px] font-normal text-slate-500">
                                                    <Calendar size={12} className="text-slate-400" />
                                                    {selectedPosition.linkActiveAt ? new Date(selectedPosition.linkActiveAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) : '—'}
                                                </div>
                                            </div>
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[12px] text-slate-900 font-bold">Current Status</span>
                                                <div className="flex items-center gap-2">
                                                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-bold uppercase tracking-widest border transition-all ${getStatusStyles(selectedPosition.recommendationStatus)}`}>
                                                        {formatStatus(selectedPosition.recommendationStatus ?? 'PENDING')}
                                                    </span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center py-4 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                                            <p className="text-[10px] font-medium text-slate-400 text-center px-4">No active links found.</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ROW 2 – Tabs Section (col 8) */}
                        <div className="col-span-8">
                            <div className="bg-white rounded-[18px] border border-slate-100 overflow-hidden shadow-sm h-full flex flex-col">
                                <div className="flex border-b border-slate-100 px-5 bg-slate-50/20 shrink-0">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-3.5 px-1 mr-6 text-[12px] font-medium transition-all relative flex items-center gap-2 tracking-wide ${activeTab === tab ? 'text-blue-600' : 'text-slate-700 hover:text-blue-600'}`}
                                        >
                                            {tab}
                                            {activeTab === tab && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-blue-600 rounded-t-full shadow-[0_-2px_6px_rgba(37,99,235,0.3)]" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-6 space-y-4 overflow-y-auto custom-scrollbar flex-1">
                                    {activeTab === 'Contact Details' && (
                                        <div className="grid grid-cols-2 gap-x-12 gap-y-5">
                                            {[
                                                { label: 'Email', value: candidate.email || candidate.candidateEmail || '—', icon: Mail },
                                                { label: 'Phone', value: candidate.mobile_number || candidate.candidateMobileNumber || '—', icon: Phone },
                                                { label: 'Location', value: candidate.location || '—', icon: MapPin },
                                                { label: 'Birthdate', value: candidate.birthdate ? new Date(candidate.birthdate).toLocaleDateString('en-GB') : '—', icon: Calendar },
                                                { label: 'Reg No', value: candidate.register_no || '—', icon: Hash }
                                            ].map((field, i) => (
                                                <div key={i} className="flex flex-col gap-1">
                                                    <div className="flex items-center gap-1.5">
                                                        <field.icon size={10} className="text-slate-400" />
                                                        <p className="text-[12px] font-bold text-slate-900">{field.label}</p>
                                                    </div>
                                                    <p className="text-[11px] font-normal text-slate-500 truncate">{field.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {activeTab === 'Work History' && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 min-h-24">
                                            <p className="text-[12px] text-slate-600 leading-relaxed font-medium">
                                                {candidate.work_history || 'No professional history recorded.'}
                                            </p>
                                        </div>
                                    )}
                                    {activeTab === 'Skills' && (
                                        <div className="flex flex-wrap gap-2">
                                            {candidateSkills.length > 0
                                                ? candidateSkills.map((skill, i) => (
                                                    <span key={i} className="inline-flex items-center px-3 py-1.5 rounded-xl text-[10px] font-bold bg-white text-slate-700 border border-slate-200 shadow-sm">
                                                        {typeof skill === 'string' ? skill : (skill?.name || skill?.label)}
                                                    </span>
                                                ))
                                                : <p className="text-[11px] font-medium text-slate-400 uppercase italic">No skill data available</p>
                                            }
                                        </div>
                                    )}
                                    {activeTab === 'Test Results' && (
                                        <div className="bg-slate-50 rounded-xl p-4 border border-slate-100 min-h-24">
                                            <p className="text-[12px] text-slate-600 leading-relaxed font-medium capitalize">
                                                {candidate.assessments?.length ? `Detailed evaluation available (${candidate.assessments.length} records).` : 'No performance metrics found.'}
                                            </p>
                                        </div>
                                    )}
                                    {activeTab === 'Credits' && (
                                        <div className="space-y-6">
                                            {/* Summary Cards */}
                                            <div className="grid grid-cols-3 gap-4">
                                                <div className="bg-blue-50/50 border border-blue-100 rounded-2xl p-4 transition-all hover:shadow-md group">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="p-1.5 bg-blue-600 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
                                                            <Zap size={14} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-blue-600 uppercase tracking-widest">Purchased</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-2xl font-black text-slate-900 leading-none">{creditsInfo?.totalPurchased || 0}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">PTS</p>
                                                    </div>
                                                    <div className="mt-2 flex flex-col gap-0.5">
                                                        <p className="text-[9px] font-medium text-slate-400">Plan: {creditsInfo?.planName || 'N/A'}</p>
                                                        {creditsInfo?.validFrom && (
                                                            <p className="text-[8px] font-semibold text-slate-300 uppercase">Since {new Date(creditsInfo.validFrom).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-emerald-50/50 border border-emerald-100 rounded-2xl p-4 transition-all hover:shadow-md group">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="p-1.5 bg-emerald-600 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
                                                            <Shield size={14} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Remaining</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-2xl font-black text-slate-900 leading-none">{creditsInfo?.remaining || 0}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">PTS</p>
                                                    </div>
                                                    <div className="mt-2 flex flex-col gap-0.5">
                                                        <p className="text-[9px] font-medium text-emerald-600 flex items-center gap-1">
                                                            <Activity size={10} /> Active Balance
                                                        </p>
                                                        {creditsInfo?.validTill && (
                                                            <p className="text-[8px] font-semibold text-emerald-400 uppercase">Expires {new Date(creditsInfo.validTill).toLocaleDateString()}</p>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="bg-slate-50/50 border border-slate-100 rounded-2xl p-4 transition-all hover:shadow-md group">
                                                    <div className="flex items-center gap-2 mb-3">
                                                        <div className="p-1.5 bg-slate-600 rounded-lg text-white shadow-sm group-hover:scale-110 transition-transform">
                                                            <Clock size={14} />
                                                        </div>
                                                        <span className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">Utilized</span>
                                                    </div>
                                                    <div className="flex items-baseline gap-1">
                                                        <p className="text-2xl font-black text-slate-900 leading-none">{creditsInfo?.utilized || 0}</p>
                                                        <p className="text-[10px] font-bold text-slate-400">PTS</p>
                                                    </div>
                                                    <p className="text-[9px] font-medium text-slate-400 mt-2">Historical Usage</p>
                                                </div>
                                            </div>

                                            {/* History Table */}
                                            <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                                                <div className="px-5 py-3.5 bg-slate-50/50 border-b border-slate-100 flex items-center justify-between">
                                                    <h5 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
                                                        <Database size={15} className="text-blue-600" />
                                                        Usage History
                                                    </h5>
                                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{creditsInfo?.history?.length || 0} Records</span>
                                                </div>
                                                <div className="max-h-[300px] overflow-y-auto no-scrollbar">
                                                    {loadingCredits ? (
                                                        <div className="flex items-center justify-center py-10">
                                                            <div className="w-8 h-8 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                                                        </div>
                                                    ) : creditsInfo?.history?.length > 0 ? (
                                                        <table className="w-full text-left border-collapse">
                                                            <thead className="bg-slate-50 sticky top-0 z-10 shadow-sm">
                                                                <tr>
                                                                    <th className="px-5 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest">Service</th>
                                                                    <th className="px-5 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Points</th>
                                                                    <th className="px-5 py-2.5 text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Date</th>
                                                                </tr>
                                                            </thead>
                                                            <tbody className="divide-y divide-slate-50">
                                                                {creditsInfo.history.map((item, i) => (
                                                                    <tr key={item.id || i} className="hover:bg-slate-50/80 transition-colors group">
                                                                        <td className="px-5 py-2.5">
                                                                            <div className="flex flex-col">
                                                                                <p className="text-[11px] font-bold text-slate-800 leading-tight group-hover:text-blue-600 transition-colors">{item.service_name}</p>
                                                                                <p className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">{item.service_type}</p>
                                                                            </div>
                                                                        </td>
                                                                        <td className="px-5 py-2.5 text-right">
                                                                            <span className="inline-flex items-center px-2 py-0.5 rounded-lg bg-orange-50 text-orange-600 text-[10px] font-black border border-orange-100">
                                                                                -{item.credits_used}
                                                                            </span>
                                                                        </td>
                                                                        <td className="px-5 py-2.5 text-right">
                                                                            <p className="text-[10px] font-bold text-slate-500">{new Date(item.created_at).toLocaleDateString('en-GB', { day: '2-digit', month: 'short' })}</p>
                                                                            <p className="text-[9px] font-medium text-slate-300">{new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                        </td>
                                                                    </tr>
                                                                ))}
                                                            </tbody>
                                                        </table>
                                                    ) : (
                                                        <div className="flex flex-col items-center justify-center py-12 gap-3 opacity-60">
                                                            <div className="w-12 h-12 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 italic">
                                                                0
                                                            </div>
                                                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">No credit logic detected</p>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ROW 3 – AI Insight full width (col 12) */}
                        <div className="col-span-12">
                            <div className="bg-blue-600 rounded-[20px] p-6 shadow-[0_20px_40px_-12px_rgba(37,99,235,0.3)] relative overflow-hidden group transition-all">
                                <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 transition-transform group-hover:scale-110" />
                                <h4 className="text-[16px] font-bold text-white mb-4 flex items-center gap-2">
                                    <FileText size={18} />
                                    AI Insight Overview
                                </h4>
                                <div className="relative z-10 flex flex-col gap-4">
                                    <div className="bg-white/10 backdrop-blur-md rounded-2xl p-5 border border-white/20 shadow-inner">
                                        <p className="text-[13px] text-blue-50 leading-relaxed font-medium">
                                            {candidate.interview_notes || 'Profile classification pending. Analytical insight will automatically populate after candidate screening is finalized.'}
                                        </p>
                                    </div>
                                    <div className="flex items-center justify-between border-t border-white/10 pt-4">
                                        <div className="flex items-center gap-8">
                                            <div>
                                                <p className="text-[9px] text-blue-100/60 font-bold uppercase tracking-wider">Classification By</p>
                                                <p className="text-[11px] text-white font-bold flex items-center gap-1.5">
                                                    <Globe size={11} /> {candidate.notesBy || 'GLOBAL AI'}
                                                </p>
                                            </div>
                                            <div>
                                                <p className="text-[9px] text-blue-100/60 font-bold uppercase tracking-wider">Latest Update</p>
                                                <p className="text-[11px] text-white font-bold flex items-center gap-1.5">
                                                    <Calendar size={11} /> {candidate.notesDate ? new Date(candidate.notesDate).toLocaleDateString() : 'PENDING'}
                                                </p>
                                            </div>
                                        </div>
                                        <div className="px-4 py-1 rounded-full bg-white/10 border border-white/20 text-[10px] font-bold text-white uppercase tracking-widest shadow-sm">
                                            Analysis Active
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                    </div>
                    )}
                </div>


            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default CandidateDetailsDrawer;
