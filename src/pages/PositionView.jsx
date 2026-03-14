import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';

const PositionView = () => {
    const { positionId } = useParams();
    const navigate = useNavigate();
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [jdBlobUrl, setJdBlobUrl] = useState(null);
    const [jdLoading, setJdLoading] = useState(false);

    useEffect(() => {
        fetchPositionDetails();
    }, [positionId]);

    useEffect(() => {
        if (!position?.jobDescriptionDocumentPath) {
            setJdBlobUrl(null);
            return;
        }
        let cancelled = false;
        let blobUrl = null;
        setJdLoading(true);
        axios.get(`/admins/positions/${positionId}/job-description`, { responseType: 'blob' })
            .then((res) => {
                if (cancelled) return;
                blobUrl = URL.createObjectURL(res.data);
                setJdBlobUrl(blobUrl);
            })
            .catch(() => { if (!cancelled) setJdBlobUrl(null); })
            .finally(() => { if (!cancelled) setJdLoading(false); });
        return () => {
            cancelled = true;
            if (blobUrl) URL.revokeObjectURL(blobUrl);
            setJdBlobUrl(null);
        };
    }, [positionId, position?.jobDescriptionDocumentPath]);

    const fetchPositionDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/admins/positions/${positionId}`);
            if (response.data && response.data.data) {
                setPosition(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching position details:', err);
            toast.error('Failed to load position details');
        } finally {
            setLoading(false);
        }
    };

    const handleDownloadJd = () => {
        if (!jdBlobUrl || !position?.jobDescriptionDocumentFileName) return;
        const a = document.createElement('a');
        a.href = jdBlobUrl;
        a.download = position.jobDescriptionDocumentFileName || 'job-description.pdf';
        a.click();
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#FF6B00]"></div>
            </div>
        );
    }

    if (!position) {
        return (
            <div className="text-center py-20">
                <p className="text-slate-500">Position not found</p>
                <button onClick={() => navigate('/positions')} className="mt-4 text-[#FF6B00] font-bold">Back to Positions</button>
            </div>
        );
    }

    const mandatorySkills = Array.isArray(position.mandatorySkills) ? position.mandatorySkills : JSON.parse(position.mandatorySkills || '[]');
    const optionalSkills = Array.isArray(position.optionalSkills) ? position.optionalSkills : JSON.parse(position.optionalSkills || '[]');

    return (
        <div className="max-w-5xl mx-auto space-y-6 pb-12">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate('/positions')}
                        className="p-2 bg-white border border-slate-200 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                    </button>
                    <div>
                        <h1 className="text-xl font-bold text-slate-900">{position.title}</h1>
                        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">{position.code}</p>
                    </div>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => navigate(`/position/create?id=${position.id}`)}
                        className="px-5 py-2 bg-[#FF6B00] text-white text-xs font-bold rounded-lg hover:bg-[#FF4E00] shadow-md shadow-orange-500/10 transition-all"
                    >
                        Edit Position
                    </button>
                </div>
            </div>

            {/* Quick Info Cards */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Status', value: position.status, color: 'bg-green-50 text-green-600 border-green-100' },
                    { label: 'Domain', value: position.domainType, color: 'bg-blue-50 text-blue-600 border-blue-100' },
                    { label: 'Experience', value: `${position.minimumExperience}-${position.maximumExperience} Yrs`, color: 'bg-orange-50 text-orange-600 border-orange-100' },
                    { label: 'Positions', value: position.noOfPositions, color: 'bg-slate-50 text-slate-600 border-slate-100' }
                ].map((card, idx) => (
                    <div key={idx} className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex flex-col justify-between">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">{card.label}</span>
                        <span className={`mt-2 inline-block px-2 py-1 rounded-lg text-[11px] font-bold border w-fit ${card.color}`}>
                            {card.value}
                        </span>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-3 gap-6">
                {/* Left Column - Detailed Description */}
                <div className="col-span-2 space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30 flex items-center justify-between">
                            <h2 className="text-sm font-bold text-slate-800">Job Description</h2>
                            {position.jobDescriptionDocumentPath && (
                                <div className="flex items-center gap-2">
                                    {jdLoading && <span className="text-xs text-slate-400">Loading document…</span>}
                                    {jdBlobUrl && (
                                        <>
                                            <a href={jdBlobUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-medium text-[#FF6B00] hover:underline">
                                                View
                                            </a>
                                            <button type="button" onClick={handleDownloadJd} className="text-xs font-medium text-slate-600 hover:underline">
                                                Download
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>
                        <div className="p-6">
                            {position.jobDescriptionDocumentPath && jdBlobUrl && (
                                <div className="mb-4 rounded-lg border border-slate-100 overflow-hidden bg-slate-50">
                                    <iframe
                                        title="Job description document"
                                        src={jdBlobUrl}
                                        className="w-full h-[480px]"
                                    />
                                </div>
                            )}
                            <div className="prose prose-slate max-w-none">
                                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap">
                                    {position.jobDescriptionText || (position.jobDescriptionDocumentPath ? 'See document above.' : 'No detailed description provided.')}
                                </p>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right Column - Skills & Meta */}
                <div className="space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
                        <div className="px-6 py-4 border-b border-slate-50 bg-slate-50/30">
                            <h2 className="text-sm font-bold text-slate-800">Skills Required</h2>
                        </div>
                        <div className="p-6 space-y-5">
                            <div>
                                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Mandatory Skills</label>
                                <div className="flex flex-wrap gap-1.5">
                                    {mandatorySkills.map((skill, i) => (
                                        <span key={i} className="px-2.5 py-1 bg-slate-50 text-slate-600 border border-slate-100 rounded-md text-[11px] font-medium">
                                            {skill}
                                        </span>
                                    ))}
                                </div>
                            </div>
                            {optionalSkills.length > 0 && (
                                <div>
                                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-2 block">Optional Skills</label>
                                    <div className="flex flex-wrap gap-1.5">
                                        {optionalSkills.map((skill, i) => (
                                            <span key={i} className="px-2.5 py-1 bg-white text-slate-400 border border-slate-100 rounded-md text-[11px] font-medium">
                                                {skill}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Posted On</span>
                            <span className="text-slate-700 font-bold">{new Date(position.createdAt).toLocaleDateString()}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Deadline</span>
                            <span className="text-slate-700 font-bold">{position.applicationDeadline ? new Date(position.applicationDeadline).toLocaleDateString() : 'N/A'}</span>
                        </div>
                        <div className="flex justify-between items-center text-xs">
                            <span className="text-slate-400">Applicants</span>
                            <span className="text-slate-700 font-bold">{position.interviewInviteSent || 0}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default PositionView;
