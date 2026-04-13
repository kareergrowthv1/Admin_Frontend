import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
    Search, Filter, Plus, MoreHorizontal,
    Mail, User, Clock, CheckCircle, Activity,
    XCircle, Calendar, Send, Edit, Globe, ExternalLink, RefreshCw, GripVertical, GripHorizontal,
    Bot, CheckSquare, UserCheck, Award, X, ArrowLeft, MoreVertical, Edit2, Trash2
} from 'lucide-react';
import {
    DndContext,
    closestCorners,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragOverlay,
    defaultDropAnimation,
    defaultDropAnimationSideEffects
} from '@dnd-kit/core';
import {
    useSortable,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    horizontalListSortingStrategy,
    arrayMove
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8002';
import AddAtsCandidateModal from '../candidates/AddAtsCandidateModal';

// --- Helper ---
const getInitials = (name) => {
    if (!name) return '??';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2);
};

const formatDate = (dateStr) => {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) +
            ' at ' + d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
    } catch { return dateStr; }
};

const avatarColors = [
    'bg-rose-500', 'bg-violet-500', 'bg-indigo-500', 'bg-amber-500',
    'bg-emerald-500', 'bg-sky-500', 'bg-pink-500', 'bg-teal-500'
];
const getAvatarColor = (str) => {
    if (!str) return avatarColors[0];
    let hash = 0;
    for (let i = 0; i < str.length; i++) hash = str.charCodeAt(i) + ((hash << 5) - hash);
    return avatarColors[Math.abs(hash) % avatarColors.length];
};

const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600 bg-emerald-50 border-emerald-200';
    if (score >= 60) return 'text-amber-600 bg-amber-50 border-amber-200';
    return 'text-red-600 bg-red-50 border-red-200';
};

// --- Candidate Card ---
const SortableCandidateCard = ({ candidate, isOverlay = false, onResend, onDelete }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: candidate.id });
    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.2 : 1,
    };
    const avatarColor = getAvatarColor(candidate.name || candidate.email);

    return (
        <div
            ref={setNodeRef}
            style={style}
            {...attributes}
            {...listeners}
            className={`bg-white border border-slate-100 rounded-xl p-3.5 mb-2 cursor-grab active:cursor-grabbing hover:border-slate-200 hover:shadow-sm transition-all group ${isOverlay ? 'shadow-2xl rotate-1 scale-105' : ''}`}
        >
            {candidate.type === 'invitation' ? (
                /* Invitation card */
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm group-hover:border-blue-200 transition-colors">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name || 'Candidate'}&backgroundColor=f8fafc`}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        {/* Name + score badge */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 overflow-hidden">
                                <span className="text-[13px] font-bold text-slate-900 truncate group-hover:text-blue-600 transition-colors leading-tight">
                                    {candidate.name || candidate.email.split('@')[0]}
                                </span>
                                {candidate.matchScore != null && (
                                    <span className="flex items-center gap-1 shrink-0">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="text-[11px] font-bold text-blue-600">{candidate.matchScore}%</span>
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-1.5 shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onResend?.(candidate.id); }}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-slate-900 rounded-md text-slate-900 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm transition-all group/btn"
                                    title="Resend Invitation"
                                >
                                    <RefreshCw size={11} className="text-slate-900 group-hover/btn:rotate-180 transition-transform duration-500" />
                                </button>
                                <button 
                                    onClick={(e) => { e.stopPropagation(); onDelete?.(candidate.id, candidate.stage); }}
                                    className="w-6 h-6 flex items-center justify-center bg-white border border-slate-900 rounded-md text-slate-900 hover:text-rose-600 hover:border-rose-300 hover:shadow-sm transition-all group/btn"
                                    title="Move back to Active"
                                >
                                    <Trash2 size={11} className="text-slate-900" />
                                </button>
                            </div>
                        </div>
                        {/* Email */}
                        <div className="text-[11px] text-slate-600 mt-0 truncate font-medium">{candidate.email}</div>
                        {/* Invitation Date/Time */}
                        <div className="text-[10px] text-slate-600 mt-0 font-medium">
                            Invited on {candidate.date} at {candidate.time}
                        </div>
                    </div>
                </div>
            ) : (
                /* Candidate card */
                <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-slate-50 flex items-center justify-center shrink-0 border border-slate-100 overflow-hidden shadow-sm group-hover:border-blue-200 transition-colors">
                        <img
                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidate.name || 'Candidate'}&backgroundColor=f8fafc`}
                            alt={candidate.name}
                            className="w-full h-full object-cover"
                        />
                    </div>
                    <div className="flex-1 min-w-0">
                        {/* Name, score, and actions */}
                        <div className="flex items-center justify-between gap-1.5 flex-wrap">
                            <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="text-[13px] font-bold text-slate-900 leading-tight group-hover:text-blue-600 transition-colors">{candidate.name || candidate.email.split('@')[0]}</span>
                                {candidate.matchScore != null && (
                                    <span className="flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-blue-400 inline-block shrink-0 shadow-[0_0_8px_rgba(59,130,246,0.5)]" />
                                        <span className="text-[11px] font-bold text-blue-600">{candidate.matchScore}%</span>
                                    </span>
                                )}
                            </div>
                            {candidate.stage === 'ai_test' && (
                                <div className="flex items-center gap-1.5 shrink-0 opacity-40 hover:opacity-100 transition-opacity">
                                    <button 
                                        onClick={(e) => { e.stopPropagation(); onResend?.(candidate.id); }}
                                        className="w-6 h-6 flex items-center justify-center bg-white border border-slate-900 rounded-md text-slate-900 hover:text-blue-600 hover:border-blue-300 hover:shadow-sm transition-all group/btn"
                                        title="Resend Invitation"
                                    >
                                        <RefreshCw size={11} className="text-slate-900 group-hover/btn:rotate-180 transition-transform duration-500" />
                                    </button>
                                </div>
                            )}
                        </div>
                        {/* Email */}
                        <div className="text-[11px] text-slate-600 mt-0 truncate font-medium">{candidate.email}</div>
                        {/* Added on Date/Time */}
                        <div className="text-[10px] text-slate-600 mt-0 font-medium">
                            Added on {candidate.date} at {candidate.time}
                        </div>
                        {/* Rating bar */}
                        {candidate.rating != null && (
                            <div className="mt-3 flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.3)]"
                                        style={{ width: `${(candidate.rating / 10) * 100}%` }}
                                    />
                                </div>
                                <span className="text-[11px] font-bold text-slate-900 whitespace-nowrap bg-slate-50 px-1.5 py-0.5 rounded border border-slate-100">{candidate.rating}/10</span>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

// --- Kanban Column ---
const KanbanColumn = ({ stage, candidates, isFixed, isOverlay = false, onResendInvite, onDeleteCandidate }) => {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
        id: stage.id,
        data: { type: 'Column', stage },
        disabled: isFixed
    });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.3 : 1,
        height: '100%'
    };

    return (
        <div 
            ref={setNodeRef} 
            style={style} 
            className={`flex-shrink-0 w-[350px] bg-white border ${isOverlay ? 'border-blue-400 rotate-1 scale-105 shadow-2xl' : 'border-slate-200 shadow-sm'} rounded-2xl flex flex-col`}
        >
            {/* Header */}
            <div className="px-3.5 pt-3.5 pb-3 border-b border-slate-100">
                <div className="flex items-center justify-between">
                    {/* Left: icon + title (count) */}
                    <div className="flex items-center gap-1.5 min-w-0">
                        <div className={`p-1.5 rounded-lg border shrink-0 ${stage.color}`}>{stage.icon}</div>
                        <div className="min-w-0 ml-1">
                            <div className="text-[13px] font-medium text-slate-900 leading-tight truncate">
                                {stage.title} <span className="font-normal text-slate-500">({candidates.length})</span>
                            </div>
                            <div className="text-[11px] text-slate-500 leading-tight mt-0.5 truncate">{stage.description}</div>
                        </div>
                    </div>
                    {/* Right: gradient rounded square + button OR drag handle */}
                    {isFixed ? (
                        <div className="flex items-center shrink-0 ml-2">
                            <button onClick={() => window.openAddCandidateModal && window.openAddCandidateModal()} className="w-7 h-7 bg-gradient-to-b from-slate-700 to-slate-900 hover:from-slate-800 hover:to-slate-950 rounded-xl flex items-center justify-center transition-all shadow-sm">
                                <Plus size={14} className="text-white" strokeWidth={2.5} />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center shrink-0 ml-2">
                            <div {...attributes} {...listeners} className="w-7 h-7 bg-slate-100 hover:bg-slate-200 rounded-xl flex items-center justify-center cursor-grab active:cursor-grabbing text-slate-900 transition-all shadow-sm">
                                <GripHorizontal size={14} strokeWidth={2.5} />
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* Cards */}
            <div className="flex-1 overflow-y-auto p-3 no-scrollbar">
                <SortableContext id={stage.id} items={candidates.map(c => c.id)} strategy={verticalListSortingStrategy}>
                    {candidates.length === 0 && stage.id === 'active_candidates' ? (
                        <div className="flex flex-col items-center justify-center text-center py-10 px-4">
                            <div className="w-16 h-16 bg-slate-50 border border-slate-100 rounded-2xl flex items-center justify-center mb-4">
                                <div className="w-10 h-12 bg-white border border-slate-200 rounded-lg shadow-sm flex flex-col items-center justify-center gap-1">
                                    <div className="w-6 h-0.5 bg-slate-200 rounded" />
                                    <div className="w-6 h-0.5 bg-slate-200 rounded" />
                                    <div className="w-4 h-0.5 bg-slate-200 rounded" />
                                </div>
                            </div>
                            <h4 className="text-[12px] font-bold text-slate-900 mb-1">No Resumes Added</h4>
                            <p className="text-[10px] text-slate-400 mb-4 leading-relaxed">
                                Upload candidate resumes for AI-powered compatibility screening
                            </p>
                            <button onClick={() => window.openAddCandidateModal && window.openAddCandidateModal()} className="px-5 py-1.5 bg-white border border-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm">
                                Upload
                            </button>
                        </div>
                    ) : candidates.length === 0 ? (
                        <div className="flex items-center justify-center py-10">
                            <span className="text-[11px] text-slate-300 font-medium">No candidates yet</span>
                        </div>
                    ) : (
                        candidates.map(c => (
                            <SortableCandidateCard 
                                key={c.id} 
                                candidate={c} 
                                onResend={['invitations', 'ai_test'].includes(stage.id) ? (id) => onResendInvite(id, c.stage) : null}
                                onDelete={stage.id === 'invitations' ? onDeleteCandidate : null}
                            />
                        ))
                    )}
                </SortableContext>
            </div>
        </div>
    );
};


// --- STAGE ICON MAPPING ---
const STAGE_ICON_MAP = {
    'User': <User size={13} />,
    'Mail': <Mail size={13} />,
    'Bot': <Bot size={13} />,
    'XCircle': <XCircle size={13} />,
    'Activity': <Activity size={13} />,
    'Calendar': <Calendar size={13} />,
    'UserCheck': <UserCheck size={13} />,
    'Award': <Award size={13} />,
    'Send': <Send size={13} />
};

// --- Main Component ---
const JobApplications = () => {
    const { jobId } = useParams();
    const navigate = useNavigate();
    const [searchTerm, setSearchTerm] = useState('');
    const [job, setJob] = useState(null);
    const [loadingJob, setLoadingJob] = useState(true);
    const [loadingCandidates, setLoadingCandidates] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [stages, setStages] = useState([]);
    const [activeCandidate, setActiveCandidate] = useState(null);
    const [activeColumn, setActiveColumn] = useState(null);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [noQuestionSetModal, setNoQuestionSetModal] = useState(false);

    // Map the centralized "Add Candidate" navigation dynamically
    useEffect(() => {
        window.openAddCandidateModal = () => {
            setIsAddModalOpen(true);
        };
        return () => { delete window.openAddCandidateModal; };
    }, []);

    const fetchCandidates = useCallback(async () => {
        if (!jobId) return;
        try {
            setLoadingCandidates(true);
            const candRes = await axios.get(`/admins/ats-candidates?job_id=${jobId}`);
            if (candRes.data.success) {
                const mapped = candRes.data.data.map(c => {
                    const d = new Date(c.createdAt);
                    return {
                        id: c.id, 
                        candidateId: c.candidateId || c.id,
                        name: c.name,
                        email: c.email,
                        matchScore: c.resumeScore,
                        rating: c.rating,
                        date: d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }),
                        time: d.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
                        stage: c.stage || 'active_candidates',
                        type: (c.stage === 'invitations') ? 'invitation' : 'candidate'
                    };
                });
                setCandidates(mapped);
            }
        } catch (err) {
            console.error('Failed to fetch candidates:', err);
            toast.error('Failed to update candidates');
        } finally {
            setLoadingCandidates(false);
        }
    }, [jobId]);

    // Combined Fetcher for initial load
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                setLoadingJob(true);
                // 1. Fetch Stages
                const stagesRes = await axios.get('/admins/ats-job-stages');
                if (stagesRes.data.success) {
                    const currentStages = stagesRes.data.data.map(s => ({
                        ...s,
                        id: s.stage_id,
                        title: s.stage_id === 'active_candidates' ? 'Active' : 
                               (s.stage_id === 'invitations' ? 'Invitations' : s.title),
                        icon: STAGE_ICON_MAP[s.icon] || <User size={13} />
                    }));
                    setStages(currentStages);
                }

                // 2. Fetch Job
                const jobRes = await axios.get(`/admins/jobs/${jobId}`);
                if (jobRes.data.success) {
                    setJob(jobRes.data.data);
                }

                // 3. Fetch Candidates
                await fetchCandidates();
            } catch (err) {
                console.error('Failed to fetch data:', err);
                toast.error('Failed to load application data');
            } finally {
                setLoadingJob(false);
            }
        };
        if (jobId) fetchInitialData();
    }, [jobId, fetchCandidates]);

    const onResendInvite = async (candidateId, stage) => {
        try {
            if (stage === 'ai_test') {
                await axios.post(`/admins/ats-candidates/${candidateId}/setup-assessment`, {});
            } else {
                await axios.post(`/admins/ats-candidates/${candidateId}/resend-invitation`);
            }
            toast.success('Invitation email resent!');
        } catch (err) {
            console.error('Failed to resend invitation:', err);
            toast.error('Failed to resend invitation');
        }
    };

    const onDeleteCandidate = async (candidateId, stage) => {
        if (stage === 'invitations') {
            if (!window.confirm('Move this candidate back to Active Candidates?')) return;
            try {
                await axios.put(`${API_BASE_URL}/admins/ats-candidates/${candidateId}/stage`, { stage: 'active_candidates' });
                toast.success('Candidate moved back to Active');
                fetchCandidates();
            } catch (err) {
                console.error('Failed to move candidate:', err);
                toast.error('Failed to move candidate');
            }
            return;
        }

        if (!window.confirm('Are you sure you want to delete this candidate?')) return;
        try {
            await axios.delete(`${API_BASE_URL}/admins/ats-candidates/${candidateId}`);
            toast.success('Candidate deleted successfully');
            fetchCandidates();
        } catch (err) {
            console.error('Failed to delete candidate:', err);
            toast.error('Failed to delete candidate');
        }
    };

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragStart = ({ active }) => {
        if (active.data.current?.type === 'Column') {
            setActiveColumn(active.data.current.stage);
            return;
        }
        setActiveCandidate(candidates.find(c => c.id === active.id) || null);
    };

    const handleDragOver = ({ active, over }) => {
        if (!over) return;
        const activeId = active.id;
        const overId = over.id;

        const isActiveAColumn = active.data.current?.type === 'Column';
        if (isActiveAColumn) return;

        const activeC = candidates.find(c => c.id === activeId);
        if (!activeC) return;
        let destStage = overId;
        const overC = candidates.find(c => c.id === overId);
        if (overC) destStage = overC.stage;

        // --- Guardrail 1: Block Visual "Snap" to Automated Result Stages ---
        const normalizedDestStage = String(destStage || '').toUpperCase();
        const isAutomatedStage = 
            normalizedDestStage.includes('RECOMMENDED') || 
            normalizedDestStage.includes('NOT_RECOMMENDED') || 
            normalizedDestStage.includes('CAUTIOUS') ||
            normalizedDestStage === 'RECOMMENDED' ||
            normalizedDestStage === 'CAUTIOUSLY_RECOMMENDED';

        if (isAutomatedStage) return;

        // --- Guardrail 2: Foolproof Assessment Visual Lock (ONLY Rejected allowed) ---
        if (activeC.stage === 'ai_test' && normalizedDestStage !== 'REJECTED') return;

        // --- Guardrail 3: Foolproof Invitations Visual Lock (ONLY Assessment allowed) ---
        if (activeC.stage === 'invitations' && normalizedDestStage !== 'AI_TEST') return;

        if (activeC.stage !== destStage && stages.find(s => s.id === destStage)) {
            setCandidates(prev => prev.map(c => c.id === activeId ? { ...c, stage: destStage } : c));
        }
    };

    const handleDragEnd = async (event) => {
        const { active, over } = event;
        if (!over) {
            setActiveCandidate(null);
            setActiveColumn(null);
            return;
        }

        const activeId = active.id;
        const overId = over.id;

        const isActiveAColumn = active.data.current?.type === 'Column';
        if (isActiveAColumn) {
            setStages(prevStages => {
                const oldIndex = prevStages.findIndex(s => s.id === activeId);
                const newIndex = prevStages.findIndex(s => s.id === overId);
                const newArr = arrayMove(prevStages, oldIndex, newIndex);
                
                // Save new arrangement to backend if needed
                axios.put(`${API_BASE_URL}/admins/jobs/${jobId}/stages`, { stages: newArr.map(s => s.id) })
                    .catch(err => console.error('Failed to save stage order', err));

                return newArr;
            });
            setActiveColumn(null);
            return;
        }

        const activeC = candidates.find(c => c.id === activeId);
        if (activeC) {
            const overStage = over.data.current?.type === 'Column' ? overId : candidates.find(c => c.id === overId)?.stage;

            // --- Guardrail 1: Block Manual Move to Automated Result Stages ---
            const normalizedOverStage = String(overStage || '').toUpperCase();
            const isAutomatedTarget = 
                normalizedOverStage.includes('RECOMMENDED') || 
                normalizedOverStage.includes('NOT_RECOMMENDED') || 
                normalizedOverStage.includes('CAUTIOUS') ||
                normalizedOverStage === 'RECOMMENDED' ||
                normalizedOverStage === 'CAUTIOUSLY_RECOMMENDED';
            
            if (isAutomatedTarget) {
                toast.error('This stage is updated automatically based on assessment results.', { id: 'guard-result' });
                fetchCandidates();
                setActiveCandidate(null);
                setActiveColumn(null);
                return;
            }

            // --- Guardrail 2: Foolproof Assessment Exit (ONLY 'Rejected' box allowed) ---
            if (activeCandidate?.stage === 'ai_test') {
                const overStageUpper = String(overStage || '').toUpperCase();
                // Strictly exclude 'RESUME_REJECTED' or any other variant. Must be the main REJECTED stage.
                if (overStageUpper !== 'REJECTED') {
                    toast.error('Assessment Candidates can ONLY be moved to the Rejected box.', { id: 'guard-assessment-lock' });
                    fetchCandidates();
                    setActiveCandidate(null);
                    setActiveColumn(null);
                    return;
                }
            }

            // --- Guardrail 3: Foolproof Invitations Exit (ONLY 'Assessment' allowed) ---
            if (activeCandidate?.stage === 'invitations' && String(overStage || '').toUpperCase() !== 'AI_TEST') {
                toast.error('Invitation Candidates can ONLY be moved to the Assessment stage.', { id: 'guard-invite-lock' });
                fetchCandidates();
                setActiveCandidate(null);
                setActiveColumn(null);
                return;
            }

            // Guard: moving to ai_test (KareerGrowth Assessment) requires a question set and setup
            if (overStage === 'ai_test' || overStage === 'kareergrowth_assessment') {
                const hasQuestionSet = !!(job?.questionSetId || job?.question_set_id);
                if (!hasQuestionSet) {
                    // Revert the optimistic move done in handleDragOver
                    fetchCandidates();
                    setActiveCandidate(null);
                    setActiveColumn(null);
                    setNoQuestionSetModal(true);
                    return;
                }

                // Trigger Assessment Setup Flow (Step-by-Step)
                try {
                    toast.loading('Setting up assessment...', { id: 'setup-asmt' });
                    
                    // 1. Fetch Particular Application Details using Candidate ID (Safety Check)
                    // This ensures we have the correct application ID (candidates_job.id)
                    let actualApplicationId = activeId;
                    let appData = activeC;
                    try {
                        const appRes = await axios.get(`/admins/ats-applications/candidate/${activeC?.candidateId || activeC?.candidate_id || activeId}`);
                        if (appRes.data?.success) {
                            actualApplicationId = appRes.data.data.id;
                            appData = appRes.data.data;
                        }
                    } catch (appErr) {
                        console.warn('Failed to fetch specific application details:', appErr);
                    }

                    // 2. Fetch Particular Candidate Details
                    let candidateName = appData?.name || activeC?.name;
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
                        const qSetRes = await axios.get(`/admins/question-sets?jobId=${jobId}`);
                        if (qSetRes.data?.success && qSetRes.data.data?.length > 0) {
                            questionSetData = qSetRes.data.data[0];
                        }
                    } catch (qsErr) {
                        console.warn('Failed to fetch explicit question set details:', qsErr);
                    }

                    // 4. Fetch Organization/Company Details
                    let companyName = 'Company';
                    try {
                        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
                        const orgId = job?.organizationId || storedUser?.organizationId || localStorage.getItem('organizationId');
                        const isCollegeRole = storedUser?.isCollege;
                        if (orgId) {
                            const endpoint = isCollegeRole ? `/admins/college-details/${orgId}` : `/admins/company-details/${orgId}`;
                            const res = await axios.get(endpoint);
                            companyName = res.data?.data?.companyName || res.data?.data?.collegeName || companyName;
                        }
                    } catch (orgErr) {
                        console.warn('Failed to fetch organization details:', orgErr);
                    }

                    // 5. Setup Assessment
                    console.log(`[JobApplications] Calling setup-assessment for ${actualApplicationId}...`);
                    const setupRes = await axios.post(`/admins/ats-candidates/${actualApplicationId}/setup-assessment`, {
                        companyName,
                        jobTitle: job?.title || job?.job_title || appData?.jobTitle || appData?.job_title,
                        candidateName: candidateName,
                        questionSetId: questionSetData?.id
                    });

                    if (setupRes.data?.success) {
                        console.log(`[JobApplications] Setup SUCCESS:`, setupRes.data);
                        toast.success('Assessment setup successful', { id: 'setup-asmt' });

                        // 6. Update Stage
                        console.log(`[JobApplications] Updating stage to ${overStage}...`);
                        const updateRes = await axios.put(`/admins/ats-candidates/${actualApplicationId}/stage`, { stage: overStage });
                        if (updateRes.data?.success) {
                            console.log(`%c[STAGE_UPDATE_SUCCESS] Metadata:`, 'color: #059669; font-weight: bold;', {
                                candidate: activeC.name,
                                email: activeC.email,
                                from: activeC.stage,
                                to: overStage,
                                applicationId: actualApplicationId
                            });
                            toast.success('Candidate moved successfully');
                        }
                    } else {
                        console.error(`[JobApplications] Setup FAILED:`, setupRes.data?.message);
                        toast.error(setupRes.data?.message || 'Failed to setup assessment', { id: 'setup-asmt' });
                    }
                } catch (err) {
                    console.error('[JobApplications] Assessment flow CRASHED:', err);
                    toast.error('Error setting up assessment', { id: 'setup-asmt' });
                }
            } else {
                console.log(`[JobApplications] Standard move to ${overStage}...`);
                try {
                    const updateRes = await axios.put(`${API_BASE_URL}/admins/ats-candidates/${activeId}/stage`, { stage: overStage });
                    if (updateRes.data?.success) {
                        console.log(`%c[STAGE_UPDATE_SUCCESS] Standard:`, 'color: #059669; font-weight: bold;', {
                            candidate: activeC.name,
                            email: activeC.email,
                            from: activeC.stage,
                            to: overStage
                        });
                        toast.success(`Moved to ${formatStageLabel(overStage)}`);
                    } else {
                        console.warn(`[JobApplications] Update partially failed:`, updateRes.data);
                    }
                } catch (err) {
                    console.error('[JobApplications] Standard move FAILED:', err);
                    const errMsg = err.response?.data?.message || 'Failed to save move';
                    toast.error(errMsg);
                }
            }
            
            console.log(`[JobApplications] Finalizing drag. Refreshing candidates...`);
            fetchCandidates();
        }
        setActiveCandidate(null);
        setActiveColumn(null);
    };

    const formatStageLabel = (stage) => {
        if (!stage) return '';
        const s = stage.toLowerCase();
        if (s === 'all') return 'All';
        if (s === 'active_candidates') return 'Active';
        if (s === 'invitations') return 'Selected';
        if (s === 'ai_test') return 'Invited';
        if (s === 'offer_letter_sent') return 'Offered';

        // Check if it's a metadata stage object
        const meta = stages.find(stg => (stg.stage_id === stage || stg.id === stage));
        if (meta) return meta.title;
        
        return stage.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase()).join(' ');
    };

    const filtered = candidates.filter(c =>
        (c.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
         c.email?.toLowerCase().includes(searchTerm.toLowerCase()))
    );

    return (
        <div className="flex flex-col" style={{ height: 'calc(100vh - 120px)', gap: '16px' }}>
            {/* Page Header */}
            <div className="flex items-start justify-between">
                <div>
                    <h1 className="text-lg font-extrabold text-slate-900 tracking-tight">
                        {loadingJob ? 'Loading...' : `Applications for ${job?.jobTitle || ''}`}
                    </h1>
                    <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                        {loadingJob ? '' : `Manage your applications for ${job?.jobTitle || ''} at ${job?.clientName || ''}`}
                    </p>
                </div>
                <div className="flex items-center gap-2.5">
                    <div className="flex items-center bg-white border border-slate-200 rounded-xl px-3 py-2 gap-2 cursor-pointer hover:border-slate-300 transition-colors shadow-sm">
                        <span className="text-[10px] font-semibold text-slate-400 truncate max-w-[160px]">
                            https://app.goodfit.so/jobs/...
                        </span>
                        <div className="flex items-center gap-1.5 pl-2 border-l border-slate-200">
                            <Globe size={12} className="text-slate-400 hover:text-blue-500 transition-colors" />
                            <ExternalLink size={12} className="text-slate-400 hover:text-blue-500 transition-colors" />
                        </div>
                    </div>
                    <button
                        onClick={() => navigate(`/jobs/edit/${jobId}`)}
                        className="flex items-center gap-1.5 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-sm"
                    >
                        <Edit size={13} className="text-slate-400" />
                        Edit Job
                    </button>
                    <button onClick={() => setIsAddModalOpen(true)} className="p-2.5 bg-slate-900 rounded-xl text-white hover:bg-slate-800 transition-all shadow-sm">
                        <Plus size={16} />
                    </button>
                </div>
            </div>

            {/* Filter Bar */}
            <div className="flex items-center gap-4">
                <div className="relative flex-1 max-w-xs">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                        <Search size={14} className="text-slate-400" />
                    </div>
                    <input
                        type="text"
                        placeholder="Search by email or name..."
                        className="w-full bg-white border border-slate-200 rounded-xl pl-10 pr-4 py-2 text-xs text-slate-700 placeholder-slate-400 outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-50 transition-all font-medium"
                        value={searchTerm}
                        onChange={e => { setSearchTerm(e.target.value); }}
                    />
                </div>
                <button className="flex items-center gap-1.5 text-xs font-bold text-blue-600 px-3 py-2 bg-blue-50 hover:bg-blue-100 rounded-xl transition-all">
                    <Filter size={13} />
                    Filter
                </button>
                {loadingCandidates && (
                    <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
                        <RefreshCw size={12} className="animate-spin" />
                        Loading...
                    </div>
                )}
            </div>

            {/* Kanban Board */}
            <DndContext
                sensors={sensors}
                collisionDetection={closestCorners}
                onDragStart={handleDragStart}
                onDragOver={handleDragOver}
                onDragEnd={handleDragEnd}
            >
                <div className="flex-1 overflow-x-auto overflow-y-hidden -mx-1 px-1" style={{ minHeight: 0, paddingBottom: '20px' }}
                >
                    <div className="flex gap-4" style={{ minWidth: 'max-content', height: 'calc(100% - 20px)' }}>
                        {/* Make the columns horizontally sortable */}
                        <SortableContext items={stages.slice(2).map(s => s.id)} strategy={horizontalListSortingStrategy}>
                            {stages.map((stage, index) => (
                                <KanbanColumn
                                    key={stage.id}
                                    stage={stage}
                                    candidates={filtered.filter(c => c.stage === stage.id)}
                                    isFixed={index < 2}
                                    onResendInvite={onResendInvite}
                                    onDeleteCandidate={onDeleteCandidate}
                                />
                            ))}
                        </SortableContext>

                        {/* Create New Stage */}
                        <div className="flex-shrink-0 w-[350px] flex items-center justify-center" style={{ height: '100%' }}>
                            <div className="flex flex-col items-center gap-5">
                                <div className="w-20 h-20 bg-white border-2 border-dashed border-slate-200 rounded-2xl flex items-center justify-center relative group cursor-pointer hover:border-blue-300 hover:bg-blue-50/30 transition-all shadow-sm">
                                    <Plus size={24} className="text-slate-200 group-hover:text-blue-400 transition-colors" />
                                    <div className="absolute -bottom-2.5 -right-2 w-7 h-7 bg-white border border-slate-200 rounded-xl shadow-md flex items-center justify-center group-hover:scale-110 transition-transform">
                                        <Plus size={12} className="text-slate-400" />
                                    </div>
                                </div>
                                <button className="px-6 py-2.5 bg-white border border-slate-200 rounded-xl text-[10px] font-bold text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-sm tracking-wider uppercase">
                                    Create New Stage
                                </button>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Drag Overlay */}
                <DragOverlay dropAnimation={defaultDropAnimation}>
                    {activeCandidate ? <SortableCandidateCard candidate={activeCandidate} isOverlay /> : null}
                    {activeColumn ? (
                        <KanbanColumn 
                            stage={activeColumn} 
                            candidates={filtered.filter(c => c.stage === activeColumn.id)} 
                            isOverlay 
                            onResendInvite={onResendInvite}
                            onDeleteCandidate={onDeleteCandidate}
                        />
                    ) : null}
                </DragOverlay>
            </DndContext>

            {/* No Question Set Guard Modal */}
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
                                            navigate('/admins/positions/setup-interview', {
                                                state: {
                                                    position: {
                                                        id: jobId,
                                                        title: job?.jobTitle,
                                                        code: job?.code
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

            <AddAtsCandidateModal 
                isOpen={isAddModalOpen} 
                onClose={() => setIsAddModalOpen(false)} 
                onRefresh={fetchCandidates}
                jobId={jobId}
            />
        </div>
    );
};

export default JobApplications;
