import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import { 
    ChevronLeft, Briefcase, Users, FileText, Clock, 
    Download, Eye, CheckCircle2, Building, ChevronRight, X,
    Globe, Award, Hash, User, Mail, Phone, Calendar, Timer
} from 'lucide-react';
import CandidateDetailsDrawer from '../../components/CandidateDetailsDrawer';

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

const getScoreStyles = (score) => {
    if (score >= 80) return 'border-emerald-500 text-emerald-600';
    if (score >= 60) return 'border-amber-400 text-amber-600';
    return 'border-red-400 text-red-600';
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

const PositionView = () => {
    const { positionId } = useParams();
    const navigate = useNavigate();
    
    const [position, setPosition] = useState(null);
    const [candidates, setCandidates] = useState([]);
    const [candidateCount, setCandidateCount] = useState(0);
    const [questionSets, setQuestionSets] = useState([]);
    const [creatorInfo, setCreatorInfo] = useState(null);
    
    const [loading, setLoading] = useState(true);
    const [jdBlobUrl, setJdBlobUrl] = useState(null);
    const [jdLoading, setJdLoading] = useState(false);
    const [showJdModal, setShowJdModal] = useState(false);
    
    // Candidate Details State
    const [selectedCandidate, setSelectedCandidate] = useState(null);
    const [isDrawerOpen, setIsDrawerOpen] = useState(false);

    useEffect(() => {
        if (!positionId) return;
        fetchAllData();
    }, [positionId]);

    useEffect(() => {
        if (!position?.jobDescriptionDocumentPath) {
            setJdBlobUrl(null);
            return;
        }
        let cancelled = false;
        setJdLoading(true);
        axios.get(`/admins/positions/${positionId}/job-description`, { responseType: 'blob' })
            .then((res) => {
                if (cancelled) return;
                setJdBlobUrl(URL.createObjectURL(res.data));
            })
            .catch(() => { if (!cancelled) setJdBlobUrl(null); })
            .finally(() => { if (!cancelled) setJdLoading(false); });
            
        return () => {
            cancelled = true;
            if (jdBlobUrl) URL.revokeObjectURL(jdBlobUrl);
        };
    }, [positionId, position?.jobDescriptionDocumentPath]);

    const fetchAllData = async () => {
        try {
            setLoading(true);
            
            // Fetch multiple endpoints simultaneously
            const [posRes, candRes, qsRes] = await Promise.allSettled([
                axios.get(`/admins/positions/${positionId}`),
                axios.get(`/admins/positions/${positionId}/candidates`, { params: { limit: 10 } }),
                axios.get(`/admins/question-sets`, { params: { positionId } })
            ]);

            if (posRes.status === 'fulfilled' && posRes.value.data?.data) {
                const posData = posRes.value.data.data;
                setPosition(posData);
                
                // Fetch Creator Info
                if (posData.createdBy) {
                    axios.get(`/auth/users/${posData.createdBy}`).then((res) => {
                        if (res.data?.data?.user) setCreatorInfo(res.data.data.user);
                    }).catch(console.error);
                }
            } else {
                toast.error('Failed to load position details');
                navigate('/positions');
                return;
            }

            if (candRes.status === 'fulfilled' && candRes.value.data) {
                const root = candRes.value.data;
                const candData = root.data || root;
                const candList = Array.isArray(candData) ? candData : (candData.content || candData.candidates || []);
                
                // Enhanced candidate fetching (fallback if names/emails are missing)
                const enhancedCandidates = await Promise.all(candList.map(async (cand) => {
                    const hasBasicInfo = (cand.name || cand.candidate_name) && (cand.email || cand.candidate_email);
                    const candidateId = cand.candidate_id || cand.candidateId || cand.id;
                    
                    if (!hasBasicInfo && candidateId) {
                        try {
                            const profileRes = await axios.get(`/candidates/${candidateId}`);
                            if (profileRes.data) {
                                const profile = profileRes.data.data || profileRes.data;
                                return {
                                    ...cand,
                                    name: profile.candidate_name || profile.name || cand.name,
                                    email: profile.email || cand.email,
                                    phone: profile.mobile_number || profile.phone || cand.phone || cand.mobileNumber
                                };
                            }
                        } catch (e) {
                            console.warn(`Failed to fetch fallback profile for candidate ${candidateId}`);
                        }
                    }
                    return cand;
                }));

                setCandidates(enhancedCandidates.slice(0, 10)); // Explicitly enforce max 10
                setCandidateCount(candData.totalElements || candData.totalCount || candData.total || enhancedCandidates.length || 0);
            }

            if (qsRes.status === 'fulfilled' && qsRes.value.data) {
                const root = qsRes.value.data;
                const qsData = root.data || root;
                const setsArray = Array.isArray(qsData) ? qsData : (qsData.content || qsData.questionSets || []);
                
                // Fetch detailed structure for each question set to get rounds and questions
                const detailedSets = await Promise.all(setsArray.map(async (qs) => {
                    if (!qs.id) return qs;
                    try {
                        // 1. Get Set Metadata
                        const detailRes = await axios.get(`/admins/question-sets/${qs.id}`);
                        const metadata = detailRes.data?.data || qs;
                        
                        // 2. Get Sections (Rounds & Questions)
                        const sectionRes = await axios.get(`/admins/question-sections/question-set/${qs.id}`);
                        const sections = sectionRes.data?.data || sectionRes.data || [];
                        
                        // Transform sections into the format expected by UI
                        // sectionRes usually returns an array of sections, each having general_questions, position_specific_questions, etc.
                        const rounds = [];
                        const rawSections = Array.isArray(sections) ? sections : [sections];
                        
                        rawSections.forEach(sec => {
                            if (sec.generalQuestions && sec.generalQuestions.questions?.length > 0) {
                                rounds.push({ title: 'General Round', questions: sec.generalQuestions.questions });
                            }
                            if (sec.positionSpecificQuestions && sec.positionSpecificQuestions.questions?.length > 0) {
                                rounds.push({ title: 'Technical Round', questions: sec.positionSpecificQuestions.questions });
                            }
                            if (sec.codingQuestions && sec.codingQuestions.length > 0) {
                                rounds.push({ title: 'Coding Round', questions: sec.codingQuestions });
                            }
                            if (sec.aptitudeQuestions && sec.aptitudeQuestions.length > 0) {
                                rounds.push({ title: 'Aptitude Round', questions: sec.aptitudeQuestions });
                            }
                        });

                        return { ...metadata, sections: rounds };
                    } catch (e) {
                        console.error('Error fetching QS details:', e);
                        return qs;
                    }
                }));
                
                setQuestionSets(detailedSets);
            }

        } catch (err) {
            console.error('Error fetching position view data:', err);
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadJd = (e) => {
        if (e) e.stopPropagation();
        if (!jdBlobUrl || !position?.jobDescriptionDocumentFileName) return;
        const a = document.createElement('a');
        a.href = jdBlobUrl;
        a.download = position.jobDescriptionDocumentFileName || 'job-description.pdf';
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center h-full bg-transparent">
                <div className="flex flex-col items-center gap-3">
                    <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                    <span className="text-[11px] font-normal text-slate-400 uppercase tracking-widest">Loading...</span>
                </div>
            </div>
        );
    }

    if (!position) return null;

    const mandatorySkills = Array.isArray(position.mandatorySkills) ? position.mandatorySkills : JSON.parse(position.mandatorySkills || '[]');
    const optionalSkills = Array.isArray(position.optionalSkills) ? position.optionalSkills : JSON.parse(position.optionalSkills || '[]');

    return (
        <div className="flex h-full bg-transparent overflow-hidden gap-4 pb-0 pt-2 font-['Inter',sans-serif]">
            
            {/* Left Panel - Main Position Content */}
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                {/* Header (No box) */}
                <div className="flex items-center gap-4 shrink-0 mb-6 px-2 pt-2">
                    <div>
                        <h1 className="text-lg font-bold text-slate-900 flex items-center gap-3">
                            {position.code} - {position.title} 
                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                                position.status === 'ACTIVE' ? 'bg-green-100 text-green-700' :
                                position.status === 'CLOSED' ? 'bg-slate-100 text-slate-700' :
                                'bg-orange-100 text-orange-700'
                            }`}>
                                {position.status}
                            </span>
                        </h1>
                    </div>
                </div>

                {/* Scrollable Left Side Content (No boxes) */}
                <div className="flex-1 overflow-y-auto custom-scrollbar pr-4 pb-6 space-y-6 px-2">
                    
                    {/* Position Summary & Meta text - Refactored to Grid */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-y-8 gap-x-12 mb-10 bg-white p-6 rounded-2xl border border-slate-200/60 shadow-sm max-w-5xl">
                        {/* Domain */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-indigo-50 rounded-xl text-indigo-600 shrink-0">
                                <Globe className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Domain</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">{position.domainType || 'N/A'}</span>
                            </div>
                        </div>

                        {/* Experience */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-blue-50 rounded-xl text-blue-600 shrink-0">
                                <Award className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Experience</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">{position.minimumExperience}-{position.maximumExperience} Years</span>
                            </div>
                        </div>

                        {/* Positions */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-purple-50 rounded-xl text-purple-600 shrink-0">
                                <Hash className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Positions</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">{position.noOfPositions || 0} Openings</span>
                            </div>
                        </div>

                        {/* Created By */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
                                <User className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Created by</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">
                                    {creatorInfo ? `${creatorInfo.firstName} ${creatorInfo.lastName}` : position.createdBy || 'Unknown'}
                                </span>
                            </div>
                        </div>

                        {/* Email */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-rose-50 rounded-xl text-rose-600 shrink-0">
                                <Mail className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Email</span>
                                <span className="text-sm text-slate-900 font-semibold truncate" title={creatorInfo?.email || 'N/A'}>
                                    {creatorInfo?.email || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Phone */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-amber-50 rounded-xl text-amber-600 shrink-0">
                                <Phone className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Phone</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">
                                    {creatorInfo?.mobileNumber || creatorInfo?.phoneNumber || 'N/A'}
                                </span>
                            </div>
                        </div>

                        {/* Posted On */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-slate-50 rounded-xl text-slate-600 shrink-0">
                                <Calendar className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Posted on</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">{new Date(position.createdAt).toLocaleDateString()}</span>
                            </div>
                        </div>

                        {/* Deadline */}
                        <div className="flex items-start gap-3.5">
                            <div className="p-2.5 bg-orange-50 rounded-xl text-orange-600 shrink-0">
                                <Timer className="w-4 h-4" />
                            </div>
                            <div className="flex flex-col min-w-0">
                                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Deadline</span>
                                <span className="text-sm text-slate-900 font-semibold truncate">
                                    {position.applicationDeadline ? new Date(position.applicationDeadline).toLocaleDateString() : 'No Deadline'}
                                </span>
                            </div>
                        </div>

                        {/* Company (Conditional) */}
                        {position.companyName && (
                            <div className="flex items-start gap-3.5">
                                <div className="p-2.5 bg-cyan-50 rounded-xl text-cyan-600 shrink-0">
                                    <Building className="w-4 h-4" />
                                </div>
                                <div className="flex flex-col min-w-0">
                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-0.5">Company</span>
                                    <span className="text-sm text-slate-900 font-semibold truncate">{position.companyName}</span>
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Content Sections Stacked Vertically */}
                    <div className="flex flex-col space-y-8 pt-4 max-w-3xl">
                        
                        {/* Skills */}
                        <div className="space-y-4">
                            <div>
                                <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">Skills Set</h3>
                                <div className="space-y-3">
                                    <div className="flex flex-col gap-2">
                                        <span className="text-slate-600 text-xs">Mandatory</span>
                                        <div className="flex flex-wrap gap-1.5">
                                            {mandatorySkills.length === 0 ? <span className="text-sm text-slate-400">None</span> : 
                                             mandatorySkills.map((s, i) => (
                                                <span key={i} className="px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-100 rounded text-xs">{s}</span>
                                            ))}
                                        </div>
                                    </div>
                                    {optionalSkills.length > 0 && (
                                        <div className="flex flex-col gap-2 pt-2">
                                            <span className="text-slate-600 text-xs">Optional</span>
                                            <div className="flex flex-wrap gap-1.5">
                                                {optionalSkills.map((s, i) => (
                                                    <span key={i} className="px-2 py-0.5 bg-slate-100 text-slate-600 border border-slate-200 rounded text-xs">{s}</span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Question Sets */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide">Question Sets</h3>
                            {questionSets.length === 0 ? (
                                <p className="text-sm text-slate-500">No question sets attached.</p>
                            ) : (
                                <div className="space-y-4 max-w-2xl">
                                    {questionSets.map((qs, idx) => (
                                        <div key={idx} className="bg-white border border-slate-200 shadow-sm rounded-xl p-4">
                                            <div className="flex items-center justify-between mb-3">
                                                <h4 className="font-bold text-slate-800 text-sm">{qs.title || qs.questionSetName || `Question Set #${qs.id}`}</h4>
                                                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full font-semibold">
                                                    {qs.sections?.length || 0} Rounds
                                                </span>
                                            </div>
                                            
                                            {qs.sections && qs.sections.length > 0 ? (
                                                <div className="space-y-4">
                                                    {qs.sections.map((section, sidx) => (
                                                        <div key={sidx} className="space-y-2">
                                                            <h5 className="text-xs font-semibold text-slate-700 bg-slate-50 border border-slate-100 px-2 py-1 rounded inline-block">
                                                                Round {sidx + 1} - {section.title || section.name || section.description || 'General'}
                                                            </h5>
                                                            {section.questions && section.questions.length > 0 ? (
                                                                <ol className="list-decimal pl-5 space-y-3">
                                                                    {section.questions.map((q, qidx) => (
                                                                        <li key={qidx} className="text-xs text-slate-900 leading-relaxed flex-col gap-1 marker:text-slate-900">
                                                                            <span className="font-normal text-slate-900">{q.questionText || q.question || q.title || 'Untitled Question'}</span>
                                                                            {(q.difficulty || q.programmingLanguages || q.duration) && (
                                                                                <div className="flex items-center gap-2 mt-0.5">
                                                                                    {q.difficulty && (
                                                                                        <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                                                                            q.difficulty.toLowerCase() === 'easy' ? 'bg-emerald-50 text-emerald-600 border border-emerald-100' :
                                                                                            q.difficulty.toLowerCase() === 'medium' ? 'bg-amber-50 text-amber-600 border border-amber-100' :
                                                                                            'bg-rose-50 text-rose-600 border-rose-100'
                                                                                        }`}>
                                                                                            {q.difficulty}
                                                                                        </span>
                                                                                    )}
                                                                                    {(q.programmingLanguages || q.languages || q.programming_languages) && (
                                                                                        <div className="flex flex-wrap gap-1">
                                                                                            {(Array.isArray(q.programmingLanguages || q.languages || q.programming_languages) 
                                                                                                ? (q.programmingLanguages || q.languages || q.programming_languages) 
                                                                                                : String(q.programmingLanguages || q.languages || q.programming_languages).split(',')
                                                                                            ).map((lang, lidx) => (
                                                                                                <span key={lidx} className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-100 text-[8px] font-bold uppercase tracking-tight">
                                                                                                    {lang.trim()}
                                                                                                </span>
                                                                                            ))}
                                                                                        </div>
                                                                                    )}
                                                                                    {q.duration && (
                                                                                        <span className="text-[9px] text-slate-400 font-medium flex items-center gap-0.5">
                                                                                            <Clock className="w-2.5 h-2.5" /> {q.duration}m
                                                                                        </span>
                                                                                    )}
                                                                                </div>
                                                                            )}
                                                                        </li>
                                                                    ))}
                                                                </ol>
                                                            ) : (
                                                                <p className="text-xs text-slate-400 pl-2 italic">0 questions in this round</p>
                                                            )}
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <p className="text-xs text-slate-400 italic">No structured rounds found.</p>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>

                        {/* Job Description */}
                        <div>
                            <h3 className="text-xs font-bold text-slate-800 mb-2 uppercase tracking-wide flex items-center gap-1.5">
                                <FileText className="w-4 h-4" /> Job Description
                            </h3>
                            
                            {position.jobDescriptionText ? (
                                <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed mb-2 max-w-2xl">
                                    {position.jobDescriptionText}
                                </p>
                            ) : (
                                <p className="text-sm text-slate-400 italic mb-2">
                                    {position.jobDescriptionDocumentPath ? 'Document attached.' : 'No description provided.'}
                                </p>
                            )}

                            {(position.jobDescriptionDocumentPath || position.jobDescriptionText) && (
                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        onClick={() => setShowJdModal(true)}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-800"
                                    >
                                        <Eye className="w-3.5 h-3.5" /> Preview
                                    </button>
                                    
                                    {position.jobDescriptionDocumentPath && (
                                        <button
                                            onClick={handleDownloadJd}
                                            className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-800"
                                        >
                                            <Download className="w-3.5 h-3.5" /> Download
                                        </button>
                                    )}
                                </div>
                            )}
                        </div>

                    </div>
                </div>
            </div>

            {/* Right Panel - Candidates Sidebar */}
            <div className="w-80 h-full flex flex-col bg-white border border-slate-200 rounded-t-xl rounded-b-none mb-0 shrink-0 shadow-sm">
                <div className="p-4 border-b border-slate-100 flex items-center justify-between shrink-0">
                    <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                        <Users className="w-4 h-4 text-purple-600" />
                        Added Candidates
                    </h3>
                    <span className="bg-slate-100 text-slate-700 text-[10px] px-2 py-0.5 rounded-full font-bold">
                        {candidateCount}
                    </span>
                </div>
                
                <div className="flex-1 overflow-y-auto custom-scrollbar p-2">
                    {candidates.length === 0 ? (
                        <div className="flex flex-col items-center justify-center h-full text-center p-4">
                            <Users className="w-10 h-10 text-slate-200 mb-2" />
                            <p className="text-xs text-slate-500">No candidates added yet.</p>
                        </div>
                    ) : (
                        <div className="space-y-1">
                            {candidates.map(cand => (
                                <div 
                                    key={cand.id || cand.candidate_id} 
                                    onClick={() => {
                                        setSelectedCandidate(cand);
                                        setIsDrawerOpen(true);
                                    }}
                                    className="flex items-center justify-between p-2.5 rounded-lg hover:bg-slate-50 transition-all group border-b border-slate-50 last:border-0 cursor-pointer"
                                >
                                    <div className="flex-1 min-w-0 pr-2">
                                        <div className="flex items-center gap-2 mb-1">
                                            <p className="text-xs font-bold text-slate-900 truncate" title={cand.candidate_name || cand.name}>
                                                {cand.candidate_name || cand.name}
                                            </p>
                                            <span className={`shrink-0 px-2 py-0.5 rounded-full text-[9px] font-bold border transition-all ${getStatusStyles(cand.status || cand.candidateStatus)}`}>
                                                {formatStatus(cand.status || cand.candidateStatus || 'PENDING')}
                                            </span>
                                        </div>
                                        <p className="text-[10px] text-slate-500 truncate leading-relaxed">{cand.email || cand.candidate_email}</p>
                                        <p className="text-[10px] text-slate-500 truncate leading-relaxed">{cand.phone || cand.phoneNumber || cand.mobileNumber || cand.candidate_phone || 'Phone unavailable'}</p>
                                    </div>
                                    <div className="flex items-center gap-3 shrink-0">
                                        <div className={`w-8 h-8 rounded-full border-2 flex items-center justify-center transition-all bg-transparent ${((cand.resumeMatchScore ?? cand.resumeScore) != null && !isNaN(cand.resumeMatchScore ?? cand.resumeScore)) ? getScoreStyles(Number(cand.resumeMatchScore ?? cand.resumeScore)) : 'border-slate-200 text-slate-300'}`}>
                                            <span className="text-[10px] font-black">
                                                {(cand.resumeMatchScore ?? cand.resumeScore) != null ? Math.round(Number(cand.resumeMatchScore ?? cand.resumeScore)) : '-'}
                                            </span>
                                        </div>
                                        <div className="text-slate-900 hover:text-blue-600 transition-all cursor-pointer">
                                            <Eye className="w-4 h-4" />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* View More Link pinned to bottom */}
                {candidateCount > 10 && (
                    <div className="p-3 border-t border-slate-100 shrink-0 bg-slate-50">
                        <button
                            onClick={() => navigate(`/candidates?positionId=${positionId}`)}
                            className="w-full py-2 flex items-center justify-center gap-1.5 text-xs font-bold text-blue-600 hover:text-blue-800 bg-white border border-blue-100 rounded-lg shadow-sm hover:shadow transition-all"
                        >
                            View More ({candidateCount - 10}) <ChevronRight className="w-3.5 h-3.5" />
                        </button>
                    </div>
                )}
            </div>

            {/* JD Modal */}
            {showJdModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in duration-200">
                        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                            <h2 className="text-sm font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-4 h-4 text-slate-400" />
                                Job Description Preview
                            </h2>
                            <div className="flex items-center gap-3">
                                {position.jobDescriptionDocumentPath && (
                                    <button
                                        onClick={handleDownloadJd}
                                        className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition-colors"
                                    >
                                        Download File
                                    </button>
                                )}
                                <div className="w-px h-4 bg-slate-300"></div>
                                <button
                                    onClick={() => setShowJdModal(false)}
                                    className="p-1 hover:bg-slate-200 rounded-md transition-colors text-slate-500"
                                >
                                    <X className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                        <div className="flex-1 overflow-y-auto custom-scrollbar p-6 bg-white">
                            {jdBlobUrl ? (
                                <iframe
                                    title="Job description document"
                                    src={jdBlobUrl}
                                    className="w-full h-[60vh] rounded border border-slate-200"
                                />
                            ) : position.jobDescriptionText ? (
                                <div className="prose prose-slate prose-sm max-w-none whitespace-pre-wrap text-slate-700 leading-relaxed">
                                    {position.jobDescriptionText}
                                </div>
                            ) : (
                                <div className="text-center text-slate-400 py-10">No description content available.</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Detail Drawer */}
            <CandidateDetailsDrawer 
                isOpen={isDrawerOpen}
                onClose={() => setIsDrawerOpen(false)}
                candidate={selectedCandidate}
            />
        </div>
    );
};

export default PositionView;
