import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import axios from '../config/axios';

const CandidateDetailsDrawer = ({ isOpen, onClose, candidate: passedCandidate, organizationId: propOrgId }) => {
    const [activeTab, setActiveTab] = useState('Contact Details');
    const fetchRequestedIdRef = useRef(null);
    const [fullCandidate, setFullCandidate] = useState(null);
    const [positions, setPositions] = useState([]);
    const [selectedPositionIndex, setSelectedPositionIndex] = useState(0);
    const [loading, setLoading] = useState(false);
    const [assessmentSummary, setAssessmentSummary] = useState(null);

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

    if (!isOpen) return null;

    const tabs = ['Contact Details', 'Work History', 'Skills', 'Test Results'];

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
            <div className="relative w-full max-w-5xl bg-[#F8F9FB] shadow-2xl flex flex-col h-full overflow-hidden pointer-events-auto rounded-l-[40px] animate-in slide-in-from-right duration-300">
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
                <div className="flex-1 overflow-y-auto px-4 py-4 space-y-4 no-scrollbar">
                    {loading && (
                        <div className="flex items-center justify-center py-12">
                            <div className="animate-spin w-8 h-8 border-2 border-[#FF6B00] border-t-transparent rounded-full" />
                        </div>
                    )}
                    {!loading && (
                    <div className="grid grid-cols-12 gap-4 items-stretch">

                        {/* ROW 1 – Profile Card (col 8) */}
                        <div className="col-span-8">
                            {/* Profile Card */}
                            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm h-full flex flex-col justify-between">
                                <div className="flex items-center gap-5 mb-3">
                                    <div className="w-20 h-20 rounded-full bg-orange-50 p-1 shadow-sm shrink-0">
                                        <div className="w-full h-full rounded-full bg-slate-100 border border-orange-100 overflow-hidden">
                                            <img src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidateName || 'Alex'}`} alt={candidateName} className="w-full h-full object-cover" />
                                        </div>
                                    </div>
                                    <div className="flex flex-col gap-2 pt-1">
                                        <h3 className="text-xl font-bold text-slate-900 leading-none">{candidateName}</h3>
                                        {(candidate.isTopTalent || selectedPosition?.resumeMatchScore >= 70) && (
                                            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-100/60 border border-emerald-100 text-[9px] font-bold text-emerald-600 uppercase tracking-widest w-fit">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                TOP TALENT
                                            </span>
                                        )}
                                    </div>
                                </div>

                                {/* Reg / ID badges below the avatar+name row */}
                                <div className="flex items-center gap-2 flex-wrap mb-4">
                                    <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                        <span className="font-semibold text-slate-400">Reg:</span>
                                        <span className="text-slate-700 font-medium">{candidateCode}</span>
                                    </div>
                                    {candidateId && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-normal text-slate-500 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-100">
                                            <span className="font-semibold text-slate-400">ID:</span>
                                            <span className="text-slate-700 font-medium">{candidateId}</span>
                                        </div>
                                    )}
                                    {candidate.interestedPosition && (
                                        <div className="flex items-center gap-1.5 text-[11px] font-normal text-[#FF6B00] bg-orange-50 px-2.5 py-1 rounded-lg border border-orange-100">
                                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            <span className="font-medium">{candidate.interestedPosition}</span>
                                        </div>
                                    )}
                                </div>

                                {/* Quick Stats Grid */}
                                <div className="grid grid-cols-3 gap-0 border border-slate-200 rounded-[16px] overflow-hidden bg-slate-50/50 shadow-[0_0_8px_2px_rgba(0,0,0,0.04)] mb-3">
                                    {[
                                        { label: 'Department', value: candidate.department ?? '—' },
                                        { label: 'Semester', value: candidate.semester != null ? (Number(candidate.semester) ? `Sem ${candidate.semester}` : candidate.semester) : '—' },
                                        { label: 'Resume Score', value: selectedPosition?.resumeMatchScore ?? candidate.resumeMatchScore ?? '—' }
                                    ].map((stat, i) => (
                                        <div key={i} className={`p-3 text-center flex flex-col items-center justify-center border-r last:border-0 border-slate-100 transition-colors`}>
                                            <span className="text-[14px] font-normal text-slate-800 leading-tight">{stat.value}</span>
                                            <p className="text-[10px] text-slate-400 font-normal uppercase mt-1 tracking-widest whitespace-nowrap">{stat.label}</p>
                                        </div>
                                    ))}
                                </div>

                                {/* Resume Action Bar */}
                                <button className="w-full flex items-center justify-between p-4 bg-white border border-slate-200 rounded-[18px] hover:border-slate-300 transition-all group shadow-[0_0_8px_2px_rgba(0,0,0,0.04)]">
                                    <div className="flex items-center gap-4">
                                        <div className="p-2 text-red-500 rounded-xl transition-all">
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                                        </div>
                                        <span className="text-xs font-normal text-black underline underline-offset-4 decoration-slate-200 group-hover:decoration-red-200">View CV/Resume</span>
                                    </div>
                                    <svg className="w-4 h-4 text-slate-300 group-hover:text-slate-500 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                                </button>
                            </div>
                        </div>

                        {/* ROW 1 – Stages Timeline (col 4) */}
                        <div className="col-span-4">
                            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm h-full flex flex-col">
                                <h4 className="text-[15px] font-bold text-slate-800 tracking-tight mb-3">Stages</h4>

                                {/* Position Selection Dropdown – latest first */}
                                <div className="relative mb-3">
                                    <select
                                        value={selectedPositionIndex}
                                        onChange={(e) => setSelectedPositionIndex(Number(e.target.value))}
                                        className="w-full appearance-none bg-slate-50 border border-slate-200 rounded-lg px-3 py-2 pr-10 text-xs font-normal text-black outline-none hover:border-orange-200 focus:border-orange-400 focus:ring-1 focus:ring-orange-50 transition-all cursor-pointer"
                                    >
                                        {positions.length === 0 && (
                                            <option value={0}>No positions</option>
                                        )}
                                        {positions.map((pos, idx) => (
                                            <option key={pos.positionCandidateId || idx} value={idx}>
                                                {pos.positionTitle || `Position ${idx + 1}`}
                                            </option>
                                        ))}
                                    </select>
                                    <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                    </div>
                                </div>

                                <div className="space-y-4 relative flex-1">
                                    <div className="absolute left-[15px] top-4 bottom-6 w-[2px] bg-slate-100/80" />
                                    {timelineItems.map((item, idx) => (
                                        <div key={idx} className="flex gap-4 relative group z-10 items-center">
                                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border-2 ${item.status === 'completed' ? 'bg-emerald-50 text-emerald-500 border-emerald-100' :
                                                item.status === 'pending' ? 'bg-orange-50 text-[#FF6B00] border-orange-100' :
                                                    'bg-slate-50 text-slate-300 border-slate-100'
                                                }`}>
                                                {item.status === 'pending' ? (
                                                    <svg className="w-[16px] h-[16px]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                                                    </svg>
                                                ) : item.status === 'completed' ? (
                                                    <svg className="w-[18px] h-[18px]" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                ) : (
                                                    <svg className="w-[18px] h-[18px] opacity-50" viewBox="0 0 20 20" fill="currentColor">
                                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                                    </svg>
                                                )}
                                            </div>
                                            <div>
                                                <p className="text-[13px] font-normal text-slate-700 leading-none mb-1.5">{item.label}</p>
                                                <p className="text-[11px] text-slate-500 font-normal leading-none">{item.time}</p>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ROW 2 – Position Details (col 8) – dynamic from selected position */}
                        <div className="col-span-8">
                            <div className="bg-white rounded-[24px] border border-slate-100 p-5 shadow-sm h-full flex flex-col">
                                <h4 className="text-[15px] font-bold text-slate-800 tracking-tight mb-4">Position Details</h4>
                                <div className="space-y-4 flex-1">
                                    {selectedPosition ? (
                                        <>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Position</span>
                                                <span className="text-[13px] font-semibold text-black">{positionTitle} {selectedPosition.domainType ? `(${selectedPosition.domainType})` : ''}</span>
                                                <p className="text-[11px] text-slate-500 font-normal">#{positionCode}</p>
                                            </div>
                                            <div className="flex flex-col gap-1.5">
                                                <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Question Set</span>
                                                <span className="text-[13px] font-semibold text-black">{questionSetTitle}</span>
                                                {questionSetDuration && questionSetDuration !== '—' && (
                                                    <p className="text-[11px] text-slate-500 font-normal">Duration: {questionSetDuration}</p>
                                                )}
                                            </div>
                                            <div className="flex gap-16 pt-2">
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Invited Date</span>
                                                    <span className="text-[13px] font-normal text-black">
                                                        {selectedPosition.linkActiveAt ? new Date(selectedPosition.linkActiveAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '—'}
                                                    </span>
                                                </div>
                                                <div className="flex flex-col gap-1.5">
                                                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Status</span>
                                                    <span className="text-[13px] font-normal text-black">{selectedPosition.recommendationStatus ?? '—'}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <p className="text-[13px] text-slate-500">No position selected. Add this candidate to a position to see details.</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* ROW 2 – Interview Notes (col 4) */}
                        <div className="col-span-4">
                            <div className="bg-[#FFF9E5] border border-amber-200 rounded-[24px] p-5 shadow-[0_20px_50px_rgba(217,119,6,0.08)] relative overflow-hidden h-full flex flex-col">
                                <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-amber-400/20 to-transparent rotate-45 translate-x-12 -translate-y-12" />
                                <h4 className="text-[15px] font-bold text-black mb-3">Interview Notes</h4>
                                <div className="flex-1 flex flex-col">
                                    <p className="text-[13px] text-[#92400E] leading-relaxed font-normal mb-4 flex-1">
                                        {candidate.interview_notes || 'No interview notes available for this candidate yet.'}
                                    </p>
                                    <div className="flex items-center justify-between pt-3 border-t border-amber-200/40">
                                        <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Notes by {candidate.notesBy || 'N/A'}</p>
                                        <p className="text-[9px] text-slate-500 font-semibold uppercase tracking-wider text-right">
                                            {candidate.notesDate ? new Date(candidate.notesDate).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : '-'}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* ROW 3 – Tabs Section full width (col 12) */}
                        <div className="col-span-12">
                            <div className="bg-white rounded-[24px] border border-slate-100 overflow-hidden shadow-sm">
                                <div className="flex border-b border-slate-100 px-5 bg-slate-50/20">
                                    {tabs.map(tab => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`py-4 px-2 mr-8 text-xs font-normal transition-all relative flex items-center gap-2 ${activeTab === tab ? 'text-[#FF6B00]' : 'text-slate-400 hover:text-slate-600'}`}
                                        >
                                            {tab === 'Contact Details' && (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            )}
                                            {tab === 'Work History' && (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                            )}
                                            {tab === 'Skills' && (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" /></svg>
                                            )}
                                            {tab === 'Test Results' && (
                                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                            )}
                                            {tab}
                                            {activeTab === tab && (
                                                <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#FF6B00] rounded-t-full" />
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <div className="p-5 space-y-4">
                                    {activeTab === 'Contact Details' && (
                                        <div className="grid grid-cols-1 gap-y-6">
                                            {[
                                                { label: 'Email', value: candidate.email || candidate.candidateEmail || '—' },
                                                { label: 'Phone Number', value: candidate.mobile_number || candidate.candidateMobileNumber || candidate.mobileNumber || '—' },
                                                { label: 'Location', value: candidate.location || '—' },
                                                { label: 'Birthdate', value: candidate.birthdate ? new Date(candidate.birthdate).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) : '—' },
                                                { label: 'Register Number', value: candidate.register_no || candidate.registerNo || '—' },
                                                { label: 'Address', value: candidate.address || '—' }
                                            ].map((field, i) => (
                                                <div key={i} className="flex gap-16 items-start">
                                                    <p className="text-[10px] font-normal text-black uppercase tracking-widest w-28 shrink-0 pt-0.5">{field.label}</p>
                                                    <p className="text-xs font-normal text-black tracking-tight leading-relaxed">{field.value}</p>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {activeTab === 'Work History' && (
                                        <p className="text-xs text-slate-500">{candidate.work_history || candidate.workHistory || 'No work history data available.'}</p>
                                    )}
                                    {activeTab === 'Skills' && (
                                        <div className="flex flex-wrap gap-2">
                                            {candidateSkills.length > 0
                                                ? candidateSkills.map((skill, i) => (
                                                    <span key={i} className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-100 text-slate-700 border border-slate-200">
                                                        {typeof skill === 'string' ? skill : (skill?.name || skill?.label || String(skill))}
                                                    </span>
                                                ))
                                                : <p className="text-xs text-slate-500">No skills added for this candidate.</p>
                                            }
                                        </div>
                                    )}
                                    {activeTab === 'Test Results' && (
                                        <p className="text-xs text-slate-500">{candidate.assessments?.length ? `Assessment data available (${candidate.assessments.length} records).` : (candidate.test_results || candidate.testResults || 'No test results data available.')}</p>
                                    )}
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
