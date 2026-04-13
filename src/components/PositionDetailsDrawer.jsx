import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';

const PositionDetailsDrawer = ({ isOpen, onClose, positionId, onEdit }) => {
    const [creatorName, setCreatorName] = useState('Loading...');
    const [position, setPosition] = useState(null);
    const [loading, setLoading] = useState(true);
    const [candidates, setCandidates] = useState([]);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [loadingCandidates, setLoadingCandidates] = useState(false);

    useEffect(() => {
        if (isOpen && positionId) {
            fetchPositionDetails();
            fetchAssignedCandidates();
        }
    }, [isOpen, positionId]);

    const fetchCreatorName = async (userId) => {
        if (!userId || userId === 'SYSTEM' || userId === 'Administrator' || !userId.match(/^[0-9a-fA-F-]{36}$/)) {
            setCreatorName(userId || 'Administrator');
            return;
        }

        try {
            const response = await axios.get(`/auth/users/${userId}`);
            if (response.data && response.data.data && response.data.data.user) {
                const user = response.data.data.user;
                const first = user.first_name ?? user.firstName ?? '';
                const last = user.last_name ?? user.lastName ?? '';
                setCreatorName([first, last].filter(Boolean).join(' ') || userId);
            } else {
                setCreatorName(userId);
            }
        } catch (err) {
            console.error('Error fetching user name:', err);
            setCreatorName(userId);
        }
    };

    const fetchPositionDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/admins/positions/${positionId}`);
            if (response.data && response.data.data) {
                const fetchedPosition = response.data.data;
                setPosition(fetchedPosition);
                if (fetchedPosition.createdBy) {
                    fetchCreatorName(fetchedPosition.createdBy);
                }
            }
        } catch (err) {
            console.error('Error fetching position details:', err);
            toast.error('Failed to load position details');
        } finally {
            setLoading(false);
        }
    };

    const fetchAssignedCandidates = async () => {
        try {
            setLoadingCandidates(true);
            const response = await axios.get(`/admins/positions/${positionId}/candidates?limit=5`);
            if (response.data && response.data.data) {
                setCandidates(response.data.data.content);
                setTotalCandidates(response.data.data.totalElements);
            }
        } catch (err) {
            console.error('Error fetching assigned candidates:', err);
        } finally {
            setLoadingCandidates(false);
        }
    };

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

    if (!isOpen) return null;

    const getStatusColor = (status) => {
        const statusMap = {
            'ACTIVE': 'bg-green-50 text-green-600 border-green-100',
            'ON_HOLD': 'bg-blue-50 text-blue-600 border-blue-100',
            'CLOSED': 'bg-red-50 text-red-600 border-red-100',
            'DRAFT': 'bg-purple-50 text-purple-600 border-purple-100',
            'EXPIRED': 'bg-red-50 text-red-600 border-red-100',
            'INACTIVE': 'bg-yellow-50 text-yellow-600 border-yellow-100'
        };
        return statusMap[status] || 'bg-slate-50 text-slate-400 border-slate-100';
    };

    const content = (
        <div className="fixed top-0 left-0 right-0 bottom-0 z-[9999] flex justify-end">
            {/* Backdrop */}
            <div
                className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300 pointer-events-auto"
                onClick={onClose}
            />

            {/* Drawer */}
            <div className={`relative w-full max-w-4xl h-screen bg-white shadow-2xl animate-in slide-in-from-right duration-300 overflow-hidden flex flex-col pointer-events-auto`}>
                {/* Top Header */}
                <div className="bg-white px-8 py-4 border-b border-slate-100 flex items-center justify-between">
                    <div>
                        <h2 className="text-xl font-bold text-slate-800 uppercase tracking-tight">Position Details</h2>
                        <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-widest mt-0.5">Position ID: #{position?.code || positionId?.slice(0, 8)}</p>
                    </div>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onClose}
                            className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all"
                            title="Close (Esc)"
                        >
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 bg-slate-50/30">
                    {loading ? (
                        <div className="h-full flex items-center justify-center">
                            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                        </div>
                    ) : position ? (
                        <div className="flex flex-col gap-6">
                            {/* Top Section: Profile & Details Separated */}
                            <div className="flex gap-6">
                                {/* Position Profile Box */}
                                <div className="flex-1 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm">
                                    <div className="flex items-start gap-5">
                                        <div className="h-16 w-16 rounded-2xl bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
                                            <svg className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v11m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                                            </svg>
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 mb-1">
                                                <h1 className="text-2xl font-bold text-slate-900 truncate">{position.title}</h1>
                                                <span className={`px-2.5 py-0.5 rounded-lg text-[10px] font-normal border uppercase tracking-wider ${getStatusColor(position.status)}`}>
                                                    {position.status}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 text-black text-sm">
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                                                    {position.domainType}
                                                </span>
                                                <span className="flex items-center gap-1.5">
                                                    <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                    {position.minimumExperience}-{position.maximumExperience} Years Exp
                                                </span>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Quick Stats Grid */}
                                    <div className="grid grid-cols-4 gap-4 mt-8 px-4 py-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                                        {[
                                            { label: 'Positions', value: position.noOfPositions, icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 005.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z' },
                                            { label: 'Applications', value: position.candidatesLinked ?? position.interviewInviteSent ?? 0, icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
                                            { label: 'Question Sets', value: position.questionSetCount ?? 0, icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01' },
                                            { label: 'Interviews', value: position.completedInterviews || 0, icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' }
                                        ].map((stat, i) => (
                                            <div key={i} className="flex flex-col items-center justify-center border-r last:border-0 border-slate-200">
                                                <span className="text-[10px] font-normal text-black uppercase tracking-widest flex items-center gap-1">
                                                    <svg className="w-3.5 h-3.5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={stat.icon} /></svg>
                                                    {stat.label}
                                                </span>
                                                <span className="text-lg font-normal text-black mt-1">{stat.value}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>

                                {/* Additional Details Box */}
                                <div className="w-80 bg-white rounded-2xl border border-slate-100 p-6 shadow-sm flex flex-col space-y-5">
                                    <h3 className="text-sm font-normal text-black pb-3 border-b border-slate-50 mb-1 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" /></svg>
                                        Additional Skills
                                    </h3>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-normal text-black uppercase tracking-widest">Posted By</span>
                                        <span className="text-xs font-normal text-black">{creatorName}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-normal text-black uppercase tracking-widest">Position Created</span>
                                        <span className="text-xs font-normal text-black">{position.createdAt ? new Date(position.createdAt).toLocaleDateString() : 'N/A'}</span>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                        <span className="text-[10px] font-normal text-black uppercase tracking-widest">Deadline</span>
                                        <span className="text-xs font-normal text-black">{position.applicationDeadline ? new Date(position.applicationDeadline).toLocaleDateString() : 'No Deadline'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Center Section: Skills & Notes Side-by-Side */}
                            <div className="grid grid-cols-2 gap-6">
                                {/* Skills Box */}
                                <div className="bg-white rounded-2xl border border-slate-100 p-6 shadow-sm h-full flex flex-col">
                                    <h3 className="text-sm font-normal text-black pb-3 border-b border-slate-50 mb-6 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                        Skills Required
                                    </h3>
                                    <div className="space-y-6">
                                        <div>
                                            <h4 className="text-[10px] font-normal text-black uppercase tracking-widest mb-3">Mandatory Skills</h4>
                                            <div className="flex flex-wrap gap-2">
                                                {position.mandatorySkills?.map((skill, i) => (
                                                    <span key={i} className="px-3 py-1.5 bg-slate-50 text-black border border-slate-100 rounded-lg text-xs font-normal">
                                                        {skill}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                        {position.optionalSkills?.length > 0 && (
                                            <div>
                                                <h4 className="text-[10px] font-normal text-black uppercase tracking-widest mb-3">Optional Skills</h4>
                                                <div className="flex flex-wrap gap-2">
                                                    {position.optionalSkills?.map((skill, i) => (
                                                        <span key={i} className="px-3 py-1.5 bg-slate-50 text-black border border-slate-100 rounded-lg text-xs font-normal">
                                                            {skill}
                                                        </span>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                </div>

                                {/* Notes Section */}
                                <div className="flex flex-col h-full">
                                    <h3 className="text-sm font-normal text-black mb-4 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                        Internal Notes
                                    </h3>
                                    <div className="bg-blue-50 rounded-2xl border border-blue-200 p-6 shadow-[0_12px_30px_rgba(37,99,235,0.2)] relative overflow-hidden flex flex-col h-full min-h-[160px]">
                                        <div className="flex-grow relative z-10">
                                            <p className="text-xs text-blue-800 font-medium leading-relaxed">
                                                {position.internalNotes || "No internal notes provided for this position."}
                                            </p>
                                        </div>

                                        <div className="mt-6 flex justify-between items-center text-[10px] text-blue-700 font-semibold relative z-10 uppercase tracking-widest pt-4 border-t border-blue-200/20">
                                            <span>Notes by {creatorName || 'System'}</span>
                                            <span>{position.updatedAt ? new Date(position.updatedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Bottom Section: Assigned Candidates */}
                            <div>
                                <div className="flex items-center justify-between mb-6">
                                    <h3 className="text-sm font-normal text-black flex items-center gap-2">
                                        <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                        </svg>
                                        Candidates Assigned
                                        <span className="ml-1 px-2 py-0.5 bg-slate-100 text-[10px] font-medium rounded-full text-slate-500">{totalCandidates}</span>
                                    </h3>
                                    {totalCandidates > 0 && (
                                        <button
                                            onClick={() => window.location.href = `/positions/${positionId}/candidates`}
                                            className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider hover:opacity-80 transition-opacity"
                                        >
                                            View All Candidates
                                        </button>
                                    )}
                                </div>

                                {loadingCandidates ? (
                                    <div className="flex flex-col gap-4">
                                        {[1, 2, 3].map(i => (
                                            <div key={i} className="h-16 bg-slate-50 rounded-xl animate-pulse" />
                                        ))}
                                    </div>
                                ) : candidates.length > 0 ? (
                                    <div className="grid grid-cols-1 gap-3">
                                        {candidates.map((candidate) => (
                                            <div key={candidate.id} className="flex items-center justify-between p-4 bg-white border border-slate-100 rounded-2xl hover:border-slate-200 transition-colors shadow-sm">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 font-semibold text-xs border border-white">
                                                        {candidate.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                                    </div>
                                                    <div>
                                                        <h4 className="text-xs font-semibold text-black">{candidate.name}</h4>
                                                        <p className="text-[10px] text-slate-400 font-normal mt-0.5">{candidate.email}</p>
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className={`px-2.5 py-1 rounded-full text-[9px] font-semibold uppercase tracking-wider ${candidate.status === 'RECOMMENDED' ? 'bg-green-50 text-green-600' :
                                                        candidate.status === 'PENDING' ? 'bg-amber-50 text-amber-600' :
                                                            'bg-slate-50 text-slate-600'
                                                        }`}>
                                                        {candidate.status}
                                                    </span>
                                                    <button className="p-2 hover:bg-slate-50 rounded-lg text-slate-400">
                                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                                        </svg>
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="bg-slate-50 rounded-2xl p-8 border border-dashed border-slate-200 text-center">
                                        <p className="text-xs text-slate-400">No candidates have been assigned to this position yet.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="h-full flex items-center justify-center text-slate-400">Position data unavailable</div>
                    )}
                </div>

                {/* Action logic removed from bottom per user request - centralized in close button */}
            </div>
        </div>
    );

    return createPortal(content, document.body);
};

export default PositionDetailsDrawer;
