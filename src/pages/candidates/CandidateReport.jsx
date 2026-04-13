import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { gatewayApi } from '../../config/axios';
import logo from '../../assets/logo.png';
import logo1 from '../../assets/logo1.png';

// --- Icon Components (Standard Weights) ---
const IconBack = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>;
const IconCheck = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-emerald-500"><path d="M20 6 9 17l-5-5" /></svg>;
const IconAlert = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-amber-500"><circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" /></svg>;
const IconSparkles = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-indigo-400 text-opacity-70"><path d="m12 3 1.912 5.813a2 2 0 0 0 1.275 1.275L21 12l-5.813 1.912a2 2 0 0 0-1.275 1.275L12 21l-1.912-5.813a2 2 0 0 0-1.275-1.275L3 12l5.813-1.912a2 2 0 0 0 1.275-1.275L12 3Z" /></svg>;
const IconCode = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="16 18 22 12 16 6" /><polyline points="8 6 2 12 8 18" /></svg>;
const IconAcademic = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 10v6M2 10l10-5 10 5-10 5z" /><path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" /></svg>;
const IconCalendar = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" /></svg>;
const IconStack = () => <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2" /><polyline points="2 17 12 22 22 17" /><polyline points="2 12 12 17 22 12" /></svg>;
const IconDoc = () => <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" /></svg>;
const IconUser = () => <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" /><circle cx="12" cy="7" r="4" /></svg>;
const IconMail = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect width="20" height="16" x="2" y="4" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
const IconPhone = () => <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>;
const IconBot = () => (
    <div className="w-8 h-8 rounded-full bg-white flex items-center justify-center border border-slate-100 overflow-hidden">
        <img src={logo} alt="KareerBot" className="w-5 h-5 object-contain" />
    </div>
);
const IconPerson = ({ name }) => (
    <div className="w-8 h-8 rounded-full bg-slate-50 flex items-center justify-center border border-slate-100 shadow-sm overflow-hidden group-hover:border-blue-200 transition-colors">
        <img
            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${name || 'Candidate'}&backgroundColor=f8fafc`}
            alt={name}
            className="w-full h-full object-cover"
        />
    </div>
);

// --- Helper Components (Simplified) ---

const ProgressBar = ({ percentage, color = 'bg-blue-600' }) => (
    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full ${color} transition-all duration-700 ease-in-out`} style={{ width: `${percentage}%` }}></div>
    </div>
);

const CircularGauge = ({ value, label, size = 60, color }) => {
    const radius = 25;
    const circumference = 2 * Math.PI * radius;
    const offset = circumference - (value / 100) * circumference;
    const fontSize = size >= 80 ? 'text-lg' : 'text-[10px]';
    const labelSize = size >= 80 ? 'text-[12px]' : 'text-[9px]';

    // Dynamic color logic based on percentage (if color isn't provided)
    const getGaugeColor = (pct) => {
        if (pct >= 70) return 'text-emerald-500';
        if (pct >= 40) return 'text-amber-500';
        return 'text-rose-500';
    };

    const strokeColor = color || getGaugeColor(value);

    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative" style={{ width: size, height: size }}>
                <svg viewBox="0 0 60 60" className="w-full h-full transform -rotate-90">
                    <circle cx="30" cy="30" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" className="text-slate-100" />
                    <circle cx="30" cy="30" r={radius} stroke="currentColor" strokeWidth="4" fill="transparent" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className={`${strokeColor} transition-all duration-1000`} />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className={`${fontSize} font-black text-slate-900`}>{Math.round(value)}%</span>
                </div>
            </div>
            <span className={`${labelSize} font-bold text-slate-400 uppercase tracking-widest text-center leading-tight max-w-[120px]`}>{label}</span>
        </div>
    );
};

const SectionHeader = ({ title, icon }) => (
    <h2 className="text-[15px] md:text-[17px] font-bold text-slate-800 tracking-tight flex items-center gap-2 mb-6 border-l-4 border-slate-900 pl-3 uppercase">
        {icon} {title}
    </h2>
);

const MetricBlock = ({ label, value, max = 10 }) => {
    const percentage = (value / max) * 100;

    // Dynamic color logic based on percentage
    const getTheme = (pct) => {
        if (pct >= 70) return { text: 'text-emerald-600', bg: 'bg-emerald-500' };
        if (pct >= 40) return { text: 'text-amber-600', bg: 'bg-amber-500' };
        return { text: 'text-rose-600', bg: 'bg-rose-500' };
    };

    const theme = getTheme(percentage);

    return (
        <div className="bg-white p-5 rounded-xl border border-slate-100 shadow-sm">
            <div className="flex justify-between items-baseline mb-3">
                <span className="text-[9px] md:text-[11px] font-bold text-slate-900 uppercase tracking-widest">{label}</span>
                <span className={`text-base font-black ${theme.text}`}>
                    {value}<span className="text-[10px] text-slate-300 ml-0.5 font-bold">/{max}</span>
                </span>
            </div>
            <div className="w-full h-1.5 bg-slate-50 rounded-full overflow-hidden">
                <div
                    className={`h-full ${theme.bg} transition-all duration-1000 ease-out`}
                    style={{ width: `${percentage}%` }}
                ></div>
            </div>
        </div>
    );
};

// --- Smarter Text Parser ---
const PointsList = ({ text, color = 'text-slate-600', background = 'bg-slate-50/50' }) => {
    if (!text) return null;

    // Improved regex to split by dots/bullets/newlines but NOT within words like emails (e.g., gmail.com)
    const points = text
        .split(/(?<=\.|\?|\!)\s+|[•·|\n]\s+|[\n\r]+/)
        .map(p => p.trim())
        .filter(p => p.length > 3);

    return (
        <div className={`${background} rounded-2xl p-6 border border-slate-100`}>
            <ul className="space-y-3">
                {points.map((point, idx) => (
                    <li key={idx} className={`text-[11px] md:text-[13px] font-normal ${color} leading-relaxed flex items-start gap-3`}>
                        <span className="text-slate-300 mt-1.5 shrink-0 select-none">•</span>
                        <span>{point}</span>
                    </li>
                ))}
            </ul>
        </div>
    );
};

// --- Main Component ---

const CandidateReport = () => {
    const navigate = useNavigate();
    const { candidateId = '' } = useParams();
    const [searchParams] = useSearchParams();

    const [reportData, setReportData] = useState(null);
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [isRegenerating, setIsRegenerating] = useState(false);
    const isCancelledRef = useRef(false);

    const positionId = (searchParams.get('positionId') || '').trim();
    const clientId = (searchParams.get('clientId') || '').trim();
    const tenantId = (searchParams.get('tenantId') || '').trim();
    const questionSetId = (searchParams.get('questionSetId') || '').trim();
    const candidateNameQuery = (searchParams.get('candidateName') || '').trim();

    const loadReport = useCallback(async (forceRegenerate = false) => {
        if (!candidateId || !positionId) {
            setError('Missing candidate or position reference.');
            setIsLoading(false);
            return;
        }
        if (forceRegenerate) {
            setIsRegenerating(true);
        } else {
            setIsLoading(true);
        }
        setError('');
        try {
            const res = await gatewayApi.get('/admin-report/fetch-or-generate', {
                params: { positionId, candidateId, clientId, tenantId, questionSetId, forceRegenerate: forceRegenerate ? 'true' : undefined },
                validateStatus: () => true,
                timeout: 5 * 60 * 1000,
            });
            if (isCancelledRef.current) return;
            if (res.status === 200) {
                setReportData(res.data?.data || null);
            } else {
                setError(res.data?.message || 'Unable to load report.');
            }
        } catch (err) {
            if (!isCancelledRef.current) setError(err.message || 'Network error.');
        } finally {
            setIsLoading(false);
            setIsRegenerating(false);
        }
    }, [candidateId, positionId, clientId, tenantId, questionSetId]);

    useEffect(() => {
        isCancelledRef.current = false;
        loadReport();
        return () => { isCancelledRef.current = true; };
    }, [loadReport]);

    if (isLoading) {
        return (
            <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6">
                <div className="h-10 w-10 border-2 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
                <p className="mt-4 text-[10px] font-bold text-slate-400 uppercase tracking-[0.3em]">Syncing KAreer Intelligence...</p>
            </div>
        );
    }

    if (error || !reportData) {
        return (
            <div className="min-h-screen bg-slate-50 flex items-center justify-center p-6">
                <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 p-10 text-center">
                    <div className="text-rose-500 mb-6 flex justify-center"><IconAlert /></div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2 tracking-tight">Report Retrieval Failed</h2>
                    <p className="text-sm text-slate-500 font-medium mb-8 leading-relaxed">{error || 'Data mapping error.'}</p>
                    <button onClick={loadReport} className="w-full bg-blue-600 text-white py-3.5 rounded-xl font-bold uppercase text-[10px] tracking-widest hover:bg-blue-700 active:scale-[0.98] transition-all">Reload Assessment</button>
                    <button onClick={() => navigate(-1)} className="mt-4 w-full text-slate-400 font-bold uppercase text-[9px] tracking-widest">Return to Candidates</button>
                </div>
            </div>
        );
    }

    const {
        candidateName, email, phone, candidateCode, jobTitle, positionName, companyName,
        resumeScore = 0, overallMarks = 0, recommendationStatus = 'PENDING',
        generalScreeningScore = 0, aptitudeScreeningScore = 0, codingScreeningScore = 0, positionSpecificScreeningScore = 0,
        aiGeneratedPercentage = 0, humanWrittenPercentage = 0,
        resumeSummary = "", resumeSummaryPoints = [], suspiciousActivity = "None detected",
        aiRatings = {}, sectionWiseAnalysis = {},
        mandatorySkills = [], softSkills = { skills: [] },
        strengths = [], areasForImprovement = [], generalRemarks = [], conclusion = [],
        screeningQuestions = { generalQuestions: [], specificQuestions: [] },
        codingQuestionSets = [], aptitudeAssessment = { questions: [] }
    } = reportData;

    const getStatusColor = (status) => {
        if (status === 'RECOMMENDED') return 'bg-emerald-50 text-emerald-600 border-emerald-200';
        if (status === 'NOT_RECOMMENDED') return 'bg-rose-50 text-rose-600 border-rose-200';
        return 'bg-blue-50 text-blue-600 border-blue-200';
    };

    return (
        <div className="min-h-screen bg-[#F1F5F9] text-slate-900 py-6 px-4 sm:px-8">
            <div className="max-w-[98%] xl:max-w-[1500px] mx-auto bg-white rounded-[1.5rem] overflow-hidden">

                {/* Premium Unified Header Banner */}
                <div className="bg-[#f8fafc] p-6 md:p-12 relative overflow-hidden">
                    <div className="max-w-[1500px] mx-auto relative z-10 space-y-12">

                        {/* Branding Row */}
                        <div className="flex justify-between items-start">
                            <div className="flex flex-col gap-1">
                                <span className="text-lg md:text-xl font-black text-slate-900 tracking-tighter uppercase italic">KAreerGrowth</span>
                                <span className="text-[8px] md:text-[9px] font-bold text-slate-400 uppercase tracking-[0.2em]">Tech Driven Hiring Solution</span>
                            </div>
                        </div>

                        {/* Profile Row */}
                        <div className="flex flex-col lg:flex-row justify-between items-center gap-12">
                            <div className="flex flex-col md:flex-row items-center gap-10">
                                <div className="flex flex-col items-center gap-4 shrink-0">
                                    {/* Avatar Circle */}
                                    <div className="w-24 h-24 md:w-32 h-32 rounded-full bg-white border-4 border-white shadow-xl flex items-center justify-center overflow-hidden ring-1 ring-slate-100 select-none">
                                        <img
                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${candidateName || candidateNameQuery || 'Candidate'}&backgroundColor=f8fafc`}
                                            alt={candidateName}
                                            className="w-full h-full object-cover"
                                        />
                                    </div>
                                    <p className="text-[8px] md:text-[10px] font-black text-slate-900 uppercase tracking-[0.3em] bg-slate-100 px-3 py-1 rounded-full">#{candidateCode || 'CAN000'}</p>
                                </div>

                                <div className="text-center md:text-left">
                                    <div className="space-y-4">
                                        <h1 className="text-2xl md:text-4xl font-black text-slate-900 tracking-tighter leading-tight mb-4 text-center md:text-left">
                                            {candidateName || candidateNameQuery}
                                        </h1>

                                        <div className="flex flex-col items-center md:items-start gap-1.5 font-['Inter']">
                                            <p className="text-[11px] md:text-[13px] font-normal text-slate-900 tracking-wide">
                                                {jobTitle || positionName}
                                            </p>
                                            <p className="text-[11px] md:text-[13px] font-normal text-slate-900 tracking-wide flex items-center gap-2">
                                                Company: <span className="font-bold">{(companyName || 'Not Specified')}</span>
                                            </p>
                                            <p className="text-[11px] md:text-[13px] font-normal text-slate-900 tracking-wide lowercase flex items-center gap-1.5">
                                                <IconMail /> {email}
                                            </p>
                                            <p className="text-[11px] md:text-[13px] font-normal text-slate-900 tracking-wide flex items-center gap-1.5">
                                                <IconPhone /> {phone}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Recommendation Card */}
                            <div className={`rounded-xl px-6 py-4 min-w-[240px] text-center border ${recommendationStatus === 'RECOMMENDED'
                                ? 'bg-emerald-50 border-emerald-100 text-emerald-600'
                                : recommendationStatus === 'NOT_RECOMMENDED'
                                    ? 'bg-rose-50 border-rose-100 text-rose-600'
                                    : 'bg-slate-50 border-slate-200 text-slate-600'
                                }`}>
                                <div className="text-base font-black tracking-tight uppercase italic leading-none whitespace-nowrap">
                                    {recommendationStatus.replace('_', ' ')}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <main className="p-8 md:p-10 space-y-12">

                    {/* section: Assessment Narrative */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                        <section className="lg:col-span-8 space-y-8">
                            <div>
                                <SectionHeader title="Candidate Intelligence Summary" icon={<IconDoc />} />
                                {resumeSummaryPoints && resumeSummaryPoints.length > 0 ? (
                                    <div className="bg-slate-50/50 rounded-2xl p-6 border border-slate-100">
                                        <ul className="space-y-3">
                                            {resumeSummaryPoints.map((point, idx) => (
                                                <li key={idx} className="text-[13px] font-normal text-slate-600 leading-relaxed flex items-start gap-3">
                                                    <span className="text-slate-300 mt-1.5 shrink-0 select-none">•</span>
                                                    <span>{point}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                ) : (
                                    <PointsList text={resumeSummary || generalRemarks[0]} />
                                )}
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="bg-emerald-50/10 border border-emerald-100/50 p-6 rounded-xl">
                                    <p className="text-[10px] font-bold text-emerald-600 uppercase tracking-widest mb-4 flex items-center gap-1.5"><IconCheck /> Top Performance Indicators</p>
                                    <ul className="space-y-3">
                                        {strengths.slice(0, 6).map((s, i) => (
                                            <li key={i} className="text-xs font-normal text-slate-600 leading-snug flex gap-2">
                                                <span className="text-emerald-400/60">•</span> {s}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="bg-blue-50/10 border border-blue-100/50 p-6 rounded-xl">
                                    <p className="text-[10px] font-bold text-blue-600 uppercase tracking-widest mb-4 flex items-center gap-1.5"><IconAlert /> Skill Gap Observations</p>
                                    <ul className="space-y-3">
                                        {areasForImprovement.slice(0, 6).map((a, i) => (
                                            <li key={i} className="text-xs font-normal text-slate-600 leading-snug flex gap-2">
                                                <span className="text-blue-400/60">•</span> {a}
                                            </li>
                                        ))}
                                    </ul>
                                </div>
                            </div>
                        </section>

                        {/* section: Comparative Ratings */}
                        <aside className="lg:col-span-4 bg-white border border-slate-100 rounded-2xl p-8 shadow-sm">
                            <div className="flex flex-col items-center mb-10 pb-8 border-b border-slate-50">
                                <CircularGauge value={overallMarks} label="Overall Match Score" size={100} color="text-slate-900" />
                            </div>
                            <h3 className="text-[12px] font-bold text-slate-400 uppercase tracking-widest mb-8 text-center">AI Behavioral Scoring</h3>
                            <div className="space-y-8">
                                {[
                                    { label: 'Technical Proficiency', val: aiRatings.technicalKnowledge },
                                    { label: 'Analytical Capability', val: aiRatings.problemSolving },
                                    { label: 'Verbal Fluency', val: aiRatings.communication },
                                    { label: 'Cognitive Aptitude', val: aiRatings.aptitude }
                                ].map((r, i) => (
                                    <div key={i} className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <span className="text-[11px] font-semibold text-slate-500">{r.label}</span>
                                            <span className="text-xs font-bold text-slate-900">{r.val ? r.val.toFixed(1) : 0}%</span>
                                        </div>
                                        <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                                            <div className="h-full bg-slate-900 opacity-70 transition-all duration-1000" style={{ width: `${r.val || 0}%` }}></div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                            <div className="mt-10 pt-8 border-t border-slate-50 space-y-6">
                                <div className="space-y-4">
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest">
                                        <span className="text-emerald-500">Human Auth-Code</span>
                                        <span className="text-slate-900">{humanWrittenPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-emerald-400" style={{ width: `${humanWrittenPercentage}%` }}></div>
                                    </div>
                                    <div className="flex justify-between items-center text-[10px] font-bold uppercase tracking-widest mt-2">
                                        <span className="text-indigo-400">AI Synthesized</span>
                                        <span className="text-slate-900">{aiGeneratedPercentage}%</span>
                                    </div>
                                    <div className="w-full h-1 bg-slate-50 rounded-full overflow-hidden">
                                        <div className="h-full bg-indigo-400" style={{ width: `${aiGeneratedPercentage}%` }}></div>
                                    </div>
                                </div>
                                <div className="flex justify-between items-center text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 pt-4 border-t border-slate-50/50">
                                    <span>Suspicious Flag</span>
                                    <span className={suspiciousActivity === 'None detected' ? 'text-emerald-500' : 'text-rose-500'}>{suspiciousActivity}</span>
                                </div>
                                <div className="w-full h-1 bg-slate-50 rounded-full">
                                    <div className={`h-full rounded-full ${suspiciousActivity === 'None detected' ? 'bg-emerald-400' : 'bg-rose-400'}`} style={{ width: '100%' }}></div>
                                </div>
                            </div>
                        </aside>
                    </div>

                    {/* section: Core Competency Scoreboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                        <MetricBlock label="General Knowledge" value={generalScreeningScore} max={10} />
                        <MetricBlock label="Cognitive Analysis" value={aptitudeScreeningScore} max={10} />
                        <MetricBlock label="Technical Scoring" value={codingScreeningScore} max={10} />
                        <MetricBlock label="Domain Expertise" value={positionSpecificScreeningScore} max={40} />
                    </div>

                    {/* section: Cross-Round Sectional Matrix */}
                    <section>
                        <SectionHeader title="Assessment Round Deep-Dive" icon={<IconStack />} />
                        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                            {['position', 'general', 'coding'].map(key => {
                                const data = sectionWiseAnalysis[key];
                                if (!data) return null;
                                return (
                                    <div key={key} className="bg-white border border-slate-100 rounded-xl p-6 shadow-sm flex flex-col h-full">
                                        <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-4 border-b border-slate-50 pb-3 text-left">{key} Rounded Outcome</h4>
                                        <div className="flex-1 space-y-5">
                                            <div>
                                                <p className="text-[9px] font-bold uppercase text-emerald-500 mb-2 text-left">Strengths</p>
                                                <ul className="space-y-2">
                                                    {(data.strengths || []).slice(0, 2).map((s, i) => (
                                                        <li key={i} className="text-xs font-normal text-slate-600 leading-snug text-left"><span>• {s}</span></li>
                                                    ))}
                                                </ul>
                                            </div>
                                            <div>
                                                <p className="text-[9px] font-bold uppercase text-blue-500 mb-2 text-left">Observations</p>
                                                <ul className="space-y-2 text-left">
                                                    {(data.concerns || []).slice(0, 2).map((c, i) => (
                                                        <li key={i} className="text-xs font-normal text-slate-600 leading-snug flex flex-row gap-2"><span className="shrink-0">•</span> {c}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        </div>
                                        <div className="mt-5 pt-4 border-t border-slate-50">
                                            <p className="text-xs font-medium text-slate-800 leading-relaxed italic line-clamp-3 text-left">"{data.overallAssessment}"</p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </section>

                    {/* section: Soft Skill Profile */}
                    <section className="bg-slate-50/50 rounded-2xl p-8 border border-slate-100">
                        <div className="flex items-center justify-between mb-10">
                            <div>
                                <h3 className="text-xl font-bold text-slate-900 tracking-tight">Behavioral Persona</h3>
                                <p className="text-[11px] font-bold text-slate-400 uppercase tracking-[0.3em] mt-1">Linguistic and confidence metrics</p>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 lg:grid-cols-4 gap-12">
                            {(softSkills?.skills || []).map((s, i) => (
                                <div key={i} className="bg-white p-8 rounded-2xl border border-slate-100 flex flex-col items-center justify-center gap-6 shadow-sm hover:shadow-md transition-shadow">
                                    <CircularGauge
                                        value={(s.score / (s.maxMarks || 10)) * 100}
                                        label={s.skill}
                                        size={80}
                                    />
                                </div>
                            ))}
                        </div>
                    </section>

                    {/* section: Statutory Skill Mapping */}
                    {mandatorySkills.length > 0 && (
                        <section>
                            <SectionHeader title="Technical Competency Mapping" icon={<IconAcademic />} />
                            <div className="flex flex-wrap gap-5">
                                {mandatorySkills.map((m, i) => (
                                    <div key={i} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm flex-1 min-w-[300px] max-w-[calc(50%-10px)] flex flex-col gap-4 hover:border-slate-200 transition-all">
                                        <div className="flex flex-col gap-3">
                                            <h4 className="text-[14px] font-black text-slate-900 uppercase tracking-tight border-b border-slate-50 pb-2">{m.skill}</h4>

                                            <div className="flex items-center gap-4 bg-slate-50/10 p-2.5 rounded-xl border border-slate-100/50">
                                                <span className={`text-[13px] font-black whitespace-nowrap px-2 py-0.5 rounded-md ${m.aiRating >= 8 ? 'bg-emerald-50 text-emerald-600' :
                                                    m.aiRating >= 5 ? 'bg-amber-50 text-amber-600' :
                                                        'bg-rose-50 text-rose-600'
                                                    }`}>
                                                    {m.aiRating || 0}<span className="text-[10px] opacity-60 ml-0.5 font-bold">/10</span>
                                                </span>

                                                <div className="flex-1 h-2.5 bg-slate-50 rounded-full border border-slate-100/50 overflow-hidden">
                                                    <div
                                                        className={`h-full rounded-full transition-all duration-700 ease-out shadow-sm ${m.aiRating >= 8 ? 'bg-emerald-500' :
                                                            m.aiRating >= 5 ? 'bg-amber-500' :
                                                                'bg-rose-500'
                                                            }`}
                                                        style={{ width: `${(m.aiRating || 0) * 10}%` }}
                                                    ></div>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-1">
                                            <p className="text-[12px] font-normal text-slate-600 leading-relaxed italic border-l-2 border-slate-100 pl-4 py-1">
                                                "{m.aiComment}"
                                            </p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* section: Conversational Insights */}
                    <section className="space-y-12">
                        <SectionHeader title="Assessment Trace & Interaction" icon={<IconSparkles />} />

                        {(screeningQuestions.generalQuestions?.length > 0 || screeningQuestions.specificQuestions?.length > 0) && (
                            <div className="space-y-16">
                                {/* Round 1: General Questions */}
                                {screeningQuestions.generalQuestions?.length > 0 && (
                                    <div className="space-y-8">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 px-6 rounded-xl text-center font-black text-[11px] uppercase tracking-[0.25em] border border-white/10">
                                            General Round Transcript
                                        </div>
                                        <div className="space-y-12 w-full px-4">
                                            {screeningQuestions.generalQuestions.map((q, i) => (
                                                <div key={i} className="space-y-6">
                                                    {/* Bot Question */}
                                                    <div className="max-w-3xl group">
                                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm group-hover:border-slate-200 transition-colors w-full">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <IconBot />
                                                                <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                                                    KareerBot
                                                                </p>
                                                            </div>
                                                            <p className="text-[13px] font-normal text-slate-900 leading-relaxed">{q.question}</p>
                                                        </div>
                                                    </div>

                                                    {/* Candidate Response */}
                                                    <div className="flex justify-end w-full">
                                                        <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 max-w-4xl shadow-sm space-y-4">
                                                            <div className="flex items-center gap-3 justify-end mb-2">
                                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{candidateName || 'Candidate'}</span>
                                                                <IconPerson name={candidateName} />
                                                            </div>
                                                            <p className="text-[13px] font-normal text-slate-900 leading-relaxed whitespace-pre-line">
                                                                {q.candidateAnswer || q.answer || 'No response recorded.'}
                                                            </p>

                                                            {/* AI Analysis Sub-bubble - Only show if there's an actual response */}
                                                            {(q.candidateAnswer || q.answer) && q.aiComments && (
                                                                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 space-y-2">
                                                                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                        <IconSparkles /> AI Analysis Reflection
                                                                    </p>
                                                                    <p className="text-[12px] font-medium text-blue-700 leading-relaxed italic">
                                                                        "{q.aiComments}"
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                {/* Round 2: Technical/Specific Questions */}
                                {screeningQuestions.specificQuestions?.length > 0 && (
                                    <div className="space-y-8 pt-6">
                                        <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 px-6 rounded-xl text-center font-black text-[11px] uppercase tracking-[0.25em] border border-white/10">
                                            Domain Specific Assessment Trace
                                        </div>
                                        <div className="space-y-12 w-full px-4">
                                            {screeningQuestions.specificQuestions.map((q, i) => (
                                                <div key={i} className="space-y-6">
                                                    {/* Bot Question */}
                                                    <div className="max-w-3xl group">
                                                        <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm group-hover:border-slate-200 transition-colors w-full">
                                                            <div className="flex items-center gap-2 mb-2">
                                                                <IconBot />
                                                                <p className="text-[9px] font-black text-slate-900 uppercase tracking-widest">
                                                                    KareerBot
                                                                </p>
                                                            </div>
                                                            <p className="text-[13px] font-normal text-slate-900 leading-relaxed">{q.question}</p>
                                                        </div>
                                                    </div>

                                                    {/* Candidate Response */}
                                                    <div className="flex justify-end w-full">
                                                        <div className="bg-white border border-slate-100 rounded-2xl p-6 sm:p-8 max-w-4xl shadow-sm space-y-4">
                                                            <div className="flex items-center gap-3 justify-end mb-2">
                                                                <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">{candidateName || 'Candidate'}</span>
                                                                <IconPerson name={candidateName} />
                                                            </div>
                                                            <p className="text-[13px] font-normal text-slate-900 leading-relaxed whitespace-pre-line">
                                                                {q.candidateAnswer || q.answer || 'No response recorded.'}
                                                            </p>

                                                            {/* AI Analysis Sub-bubble - Only show if there's an actual response */}
                                                            {(q.candidateAnswer || q.answer) && q.aiComments && (
                                                                <div className="bg-blue-50/60 border border-blue-100 rounded-xl p-5 space-y-2">
                                                                    <p className="text-[9px] font-bold text-blue-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                                                        <IconSparkles /> AI Analysis Reflection
                                                                    </p>
                                                                    <p className="text-[12px] font-medium text-blue-700 leading-relaxed italic">
                                                                        "{q.aiComments}"
                                                                    </p>
                                                                </div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </section>

                    {/* section: Coding Assessment Detail */}
                    {codingQuestionSets.length > 0 && (
                        <section className="space-y-12">
                            <SectionHeader title="Technical Execution: Coding Rounds" icon={<IconCode />} />

                            {codingQuestionSets.map((round, rIdx) => (
                                <div key={rIdx} className="space-y-10">
                                    <div className="bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3.5 px-6 rounded-xl text-center font-black text-[11px] uppercase tracking-[0.25em] border border-white/10 mb-8">
                                        Coding Assessment - Set {rIdx + 1}
                                    </div>

                                    {round.questions.map((q, qIdx) => {
                                        const finalSubmission = q.submissions?.find(s => s.isFinalSubmission) || q.submissions?.[q.submissions.length - 1];
                                        return (
                                            <div key={qIdx} className="space-y-10">
                                                {/* Question Card */}
                                                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
                                                    <div className="p-8 space-y-8">
                                                        <h4 className="text-base font-bold text-slate-900 leading-snug">{q.questionTitle}</h4>

                                                        {/* Description & Constraints */}
                                                        <div className="space-y-6">
                                                            <p className="text-[13px] text-slate-600 leading-relaxed font-normal">{q.questionDescription}</p>

                                                            <div className="bg-slate-50/50 border border-slate-100 rounded-xl p-5 space-y-4">
                                                                <div>
                                                                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2">Constraints:</p>
                                                                    <div className="bg-white border border-slate-100 rounded-lg p-3 font-mono text-[11px] text-slate-600">
                                                                        {q.constraints || "Assume standard constraints apply."}
                                                                    </div>
                                                                </div>
                                                                <div className="flex gap-8">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Limit:</span>
                                                                        <span className="text-[11px] font-medium text-slate-600">{q.timeLimit || 0} minutes</span>
                                                                    </div>
                                                                    <div className="flex items-center gap-2">
                                                                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Tags:</span>
                                                                        <span className="text-[11px] font-medium text-slate-600">{(q.tags || []).join(', ') || 'coding'}</span>
                                                                    </div>
                                                                </div>
                                                            </div>
                                                        </div>

                                                        {/* Sample Test Case */}
                                                        {q.sampleInputAndOutput && (
                                                            <div className="bg-blue-50/30 border border-blue-100/50 rounded-xl p-6 space-y-6">
                                                                <p className="text-[10px] font-bold text-blue-500 uppercase tracking-widest">Sample Test Case</p>
                                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-blue-900/40">Input:</p>
                                                                        <div className="bg-white border border-blue-100 rounded-lg p-3 font-mono text-[11px] text-slate-700">
                                                                            {q.sampleInputAndOutput.input}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-blue-900/40">Expected Output:</p>
                                                                        <div className="bg-white border border-blue-100 rounded-lg p-3 font-mono text-[11px] text-slate-700">
                                                                            {q.sampleInputAndOutput.output}
                                                                        </div>
                                                                    </div>
                                                                </div>
                                                                {q.sampleInputAndOutput.explanation && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-blue-900/40">Explanation:</p>
                                                                        <div className="bg-white/50 border border-blue-100/50 rounded-lg p-3 text-[11px] text-blue-800/80 italic leading-relaxed">
                                                                            {q.sampleInputAndOutput.explanation}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>

                                                {/* Solution & Metadata Card */}
                                                <div className="bg-blue-50/30 border border-blue-100 rounded-2xl shadow-sm p-8 space-y-8">
                                                    <div className="flex flex-wrap items-center justify-between gap-6">
                                                        <h5 className="text-[13px] font-bold text-blue-900/70">{candidateName || 'Candidate'}'s Solution</h5>
                                                        <div className="flex flex-wrap items-center gap-x-8 gap-y-3">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-blue-900/40 uppercase tracking-widest">Test Cases:</span>
                                                                <span className={`text-[12px] font-bold ${q.testCasesPassed === q.totalTestCases ? 'text-emerald-600' : 'text-rose-600'}`}>{q.testCasesPassed || 0}/{q.totalTestCases || 0}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-blue-900/40 uppercase tracking-widest">Status:</span>
                                                                <span className={`text-[11px] font-bold uppercase tracking-wider ${q.executionStatus === 'SUBMITTED' ? 'text-emerald-600' : 'text-blue-600'}`}>{q.executionStatus}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-blue-900/40 uppercase tracking-widest">Language:</span>
                                                                <span className="text-[11px] font-bold text-slate-700 uppercase">{q.language}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-blue-900/40 uppercase tracking-widest">Time Complexity:</span>
                                                                <span className="text-[11px] font-bold text-slate-700 font-mono">{finalSubmission?.timeComplexity || 'O(n)'}</span>
                                                            </div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-blue-900/40 uppercase tracking-widest">Space Complexity:</span>
                                                                <span className="text-[11px] font-bold text-slate-700 font-mono">{finalSubmission?.spaceComplexity || 'O(1)'}</span>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    <div className="space-y-4">
                                                        <p className="text-[10px] font-bold text-amber-900/40 uppercase tracking-widest">Source Code:</p>
                                                        <div className="bg-[#0f172a] rounded-xl p-8 font-mono text-[12px] leading-relaxed text-slate-300 overflow-x-auto border border-slate-800 shadow-2xl">
                                                            <pre><code>{finalSubmission?.sourceCode || '// No code submitted'}</code></pre>
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Test Case Results Details */}
                                                <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8 space-y-8">
                                                    <h5 className="text-[13px] font-bold text-slate-900 uppercase tracking-wider">Test Cases Results</h5>
                                                    <div className="space-y-6">
                                                        {(q.testCases || []).map((tc, tcIdx) => (
                                                            <div key={tcIdx} className="border border-slate-100 rounded-2xl p-6 space-y-6 bg-slate-50/30">
                                                                <div className="flex justify-between items-center">
                                                                    <p className="text-[11px] font-bold text-slate-900">Test Case {tcIdx + 1}</p>
                                                                    <span className={`px-3 py-1 rounded text-[10px] font-bold uppercase tracking-widest ${tc.isPassed ? 'bg-emerald-500 text-white' : 'bg-rose-500 text-white'}`}>
                                                                        {tc.isPassed ? 'Passed' : 'Failed'}
                                                                    </span>
                                                                </div>

                                                                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Input:</p>
                                                                        <div className="bg-white border border-slate-100 rounded-lg p-3 font-mono text-[11px] text-slate-600">
                                                                            {tc.locked ? 'Hidden' : (tc.input || 'N/A')}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Expected:</p>
                                                                        <div className="bg-white border border-slate-100 rounded-lg p-3 font-mono text-[11px] text-slate-600">
                                                                            {tc.locked ? 'Hidden' : (tc.expectedOutput || 'N/A')}
                                                                        </div>
                                                                    </div>
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Actual:</p>
                                                                        <div className={`bg-white border rounded-lg p-3 font-mono text-[11px] ${tc.isPassed ? 'border-emerald-100 text-emerald-700' : 'border-rose-100 text-rose-700'}`}>
                                                                            {tc.locked ? 'Hidden' : (tc.actualOutput || (tc.isPassed ? tc.expectedOutput : 'N/A'))}
                                                                        </div>
                                                                    </div>
                                                                </div>

                                                                {!tc.isPassed && tc.errorMessage && (
                                                                    <div className="space-y-2">
                                                                        <p className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Error Message:</p>
                                                                        <div className="bg-white border border-rose-100 rounded-lg p-4 font-mono text-[11px] text-rose-600 leading-relaxed overflow-x-auto whitespace-pre">
                                                                            {tc.errorMessage}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        ))}
                                                    </div>
                                                </div>

                                                {/* AI Analysis Points (Moved to bottom of each question) */}
                                                {q.aiAnalysisPoints && q.aiAnalysisPoints.length > 0 && (
                                                    <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-8 space-y-6">
                                                        <p className="text-[11px] font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                                                            <IconSparkles /> AI Logic & Code Analysis
                                                        </p>
                                                        <div className="space-y-4">
                                                            {q.aiAnalysisPoints.map((point, pIdx) => {
                                                                const [label, ...rest] = point.split(':');
                                                                return (
                                                                    <div key={pIdx} className="flex items-start gap-4">
                                                                        <span className="shrink-0 w-1.5 h-1.5 bg-slate-900 rounded-full mt-2"></span>
                                                                        <p className="text-[13px] leading-relaxed text-slate-800 font-normal">
                                                                            {rest.length > 0 ? (
                                                                                <><span className="font-bold text-slate-900 uppercase tracking-tighter text-[11px]">{label}:</span> {rest.join(':')}</>
                                                                            ) : point}
                                                                        </p>
                                                                    </div>
                                                                );
                                                            })}
                                                        </div>

                                                        {/* Summary Scores */}
                                                        <div className="flex justify-end gap-6 pt-6 border-t border-slate-50">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Code Quality</span>
                                                                <span className="text-xs font-bold text-indigo-600">{q.codeQualityScore ?? '—'}%</span>
                                                            </div>
                                                            <div className="w-px h-3 bg-slate-200 self-center"></div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Test Cases</span>
                                                                <span className="text-xs font-bold text-emerald-600">{q.testCasePercentage ?? 0}%</span>
                                                            </div>
                                                            <div className="w-px h-3 bg-slate-200 self-center"></div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest leading-none">Composite Performance</span>
                                                                <span className="text-sm font-black text-slate-900">{q.compositeScore ?? 0}%</span>
                                                            </div>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            ))}
                        </section>
                    )}

                    {/* section: Cognitive Reasoning Outcome */}
                    {(aptitudeAssessment.questions || []).length > 0 && (
                        <section>
                            <SectionHeader title="Cognitive Diagnostics Results" icon={<IconAcademic />} />
                            <div className="flex flex-col gap-6">
                                {aptitudeAssessment.questions.map((q, i) => (
                                    <div key={i} className="bg-white border border-slate-100 p-6 rounded-2xl shadow-sm flex flex-col gap-6 transition-all hover:border-slate-200">
                                        <div className="flex flex-col gap-3">
                                            <div className="text-[13px] text-slate-800 leading-relaxed tracking-tight flex items-start gap-2">
                                                <span className="font-black shrink-0">{i + 1}.</span>
                                                <span className="font-normal">{q.question}</span>
                                            </div>
                                        </div>

                                        <div className="flex flex-col gap-3">
                                            {(q.options || []).map(opt => {
                                                const isSelected = q.candidateAnswer === opt.optionKey;
                                                const isCorrect = q.correctAnswer === opt.optionKey;

                                                let bgColor = 'bg-white';
                                                let borderColor = 'border-slate-100';
                                                let badge = null;

                                                if (isSelected && isCorrect) {
                                                    bgColor = 'bg-emerald-100';
                                                    borderColor = 'border-emerald-300';
                                                    badge = (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 bg-emerald-700 text-white text-[9px] font-black rounded uppercase tracking-widest">Selected</span>
                                                            <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                                                <IconCheck size={14} /> Correct
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (isSelected && !isCorrect) {
                                                    bgColor = 'bg-rose-50';
                                                    borderColor = 'border-rose-200';
                                                    badge = (
                                                        <div className="flex items-center gap-2">
                                                            <span className="px-3 py-1 bg-rose-800 text-white text-[9px] font-black rounded uppercase tracking-widest">Selected</span>
                                                            <div className="flex items-center gap-1 text-rose-600 text-[10px] font-black uppercase tracking-widest">
                                                                <IconAlert size={14} /> Wrong
                                                            </div>
                                                        </div>
                                                    );
                                                } else if (!isSelected && isCorrect) {
                                                    bgColor = 'bg-emerald-50';
                                                    borderColor = 'border-emerald-200';
                                                    badge = (
                                                        <div className="flex items-center gap-1 text-emerald-600 text-[10px] font-black uppercase tracking-widest">
                                                            <IconCheck size={14} /> Correct
                                                        </div>
                                                    );
                                                }

                                                return (
                                                    <div key={opt.optionKey} className={`group relative p-3 rounded-xl border transition-all flex justify-between items-center ${bgColor} ${borderColor}`}>
                                                        <div className="flex items-center gap-4">
                                                            <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-black uppercase transition-all ${isSelected ? 'bg-slate-900 border-slate-900 text-white' : 'border-slate-100 bg-slate-50 text-slate-400 group-hover:bg-slate-100'
                                                                }`}>
                                                                {opt.optionKey}
                                                            </div>
                                                            <span className="text-[12px] font-semibold leading-relaxed text-slate-900">{opt.text}</span>
                                                        </div>
                                                        {badge}
                                                    </div>
                                                );
                                            })}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                    {/* section: Executive Summary Verdict */}
                    {conclusion.length > 0 && (
                        <section className="pt-10">
                            <SectionHeader title="Final Executive Statement" icon={<IconSparkles />} />
                            <PointsList text={conclusion.join(' ')} background="bg-slate-50 border border-slate-200" />
                            <div className="mt-8 flex flex-wrap justify-center gap-4">
                                <button
                                    onClick={() => window.print()}
                                    className="px-10 py-4 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-xl font-black uppercase text-[11px] tracking-[0.25em] hover:shadow-lg hover:shadow-blue-500/20 active:scale-95 transition-all outline-none border border-white/10"
                                >
                                    Finalize & Export
                                </button>
                            </div>
                        </section>
                    )}
                </main>

                {/* Branded Official Footer */}
                <footer className="px-8 pb-12 pt-4 border-t border-slate-100 bg-slate-50/5 flex flex-col items-center gap-8">
                    <img src={logo1} alt="KAreerGrowth" className="h-14 w-auto object-contain opacity-90" />
                    <div className="flex flex-wrap justify-center gap-x-10 gap-y-4 text-[10px] font-bold text-slate-400 tracking-wider uppercase">
                        <span>Report Integrity Secured</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full mt-1.5"></div>
                        <span>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</span>
                        <div className="w-1 h-1 bg-slate-300 rounded-full mt-1.5"></div>
                        <span>V1.0.8-ALPHA</span>
                    </div>
                    <p className="text-[9px] font-semibold text-slate-300 text-center max-w-md leading-relaxed">
                        This document is strictly confidential and protected by KAreerGrowth AI Assessment Protocol. All insights are generated via neural mapping technology.
                    </p>
                </footer>
            </div>
        </div>
    );
};

export default CandidateReport;
