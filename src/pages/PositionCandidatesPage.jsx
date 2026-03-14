import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from '../config/axios';
import { toast } from 'react-hot-toast';

const PositionCandidatesPage = () => {
    const { positionId } = useParams();
    const navigate = useNavigate();
    const [candidates, setCandidates] = useState([]);
    const [totalCandidates, setTotalCandidates] = useState(0);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [position, setPosition] = useState(null);
    const limit = 10;

    useEffect(() => {
        fetchPositionDetails();
        fetchAssignedCandidates();
    }, [positionId, page]);

    const fetchPositionDetails = async () => {
        try {
            const response = await axios.get(`/admins/positions/${positionId}`);
            if (response.data && response.data.data) {
                setPosition(response.data.data);
            }
        } catch (err) {
            console.error('Error fetching position details:', err);
        }
    };

    const fetchAssignedCandidates = async () => {
        try {
            setLoading(true);
            const offset = (page - 1) * limit;
            const response = await axios.get(`/admins/positions/${positionId}/candidates?limit=${limit}&offset=${offset}`);
            if (response.data && response.data.data) {
                setCandidates(response.data.data.content);
                setTotalCandidates(response.data.data.totalElements);
            }
        } catch (err) {
            console.error('Error fetching assigned candidates:', err);
            toast.error('Failed to load candidates');
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(totalCandidates / limit);

    return (
        <div className="p-8 space-y-6 max-w-7xl mx-auto">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span onClick={() => navigate('/positions')} className="hover:text-slate-600 cursor-pointer">Back to Positions</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="text-slate-900 font-bold uppercase">{position?.title || 'Position'}</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-900 font-bold uppercase tracking-wider">Assigned Candidates</span>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold text-slate-900 uppercase tracking-tight">Assigned Candidates</h1>
                    <p className="text-slate-500 mt-1">Reviewing {totalCandidates} students assigned to this position.</p>
                </div>
                <div className="flex gap-3">
                    <button
                        onClick={() => window.location.reload()}
                        className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors shadow-sm"
                    >
                        <svg className="w-4 h-4 text-slate-500" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-100 shadow-xl shadow-slate-200/50 overflow-hidden">
                <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-50/50">
                        <tr>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Candidate Detail</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Unique Code</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">Assigned On</th>
                            <th className="px-8 py-5 text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] text-center">Current Status</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {loading ? (
                            [1, 2, 3, 4, 5].map(i => (
                                <tr key={i}>
                                    <td colSpan="4" className="px-8 py-6">
                                        <div className="h-12 bg-slate-50 rounded-2xl animate-pulse" />
                                    </td>
                                </tr>
                            ))
                        ) : candidates.length > 0 ? (
                            candidates.map((candidate) => (
                                <tr key={candidate.id} className="group hover:bg-slate-50/80 transition-all duration-300">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-[#FF6B00]/10 text-[#FF6B00] flex items-center justify-center text-xs font-bold border border-white shadow-sm transition-transform group-hover:scale-105">
                                                {candidate.name?.split(' ').map(n => n[0]).join('').toUpperCase()}
                                            </div>
                                            <div>
                                                <div className="text-sm font-bold text-slate-900">{candidate.name}</div>
                                                <div className="text-[11px] text-slate-400 font-medium">{candidate.email}</div>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6">
                                        <span className="text-xs font-bold text-slate-700 font-mono bg-slate-100 px-3 py-1.5 rounded-xl border border-white shadow-sm">{candidate.code}</span>
                                    </td>
                                    <td className="px-8 py-6 text-xs text-slate-500 font-medium">
                                        {candidate.assignedAt ? new Date(candidate.assignedAt).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) : 'N/A'}
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className={`px-4 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-wider shadow-sm inline-block ${candidate.status === 'RECOMMENDED' ? 'bg-green-100 text-green-700 shadow-green-100/50' :
                                                candidate.status === 'PENDING' ? 'bg-amber-100 text-amber-700 shadow-amber-100/50' :
                                                    'bg-slate-100 text-slate-700 shadow-slate-100/50'
                                            }`}>
                                            {candidate.status}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        ) : (
                            <tr>
                                <td colSpan="4" className="px-8 py-20 text-center">
                                    <div className="flex flex-col items-center gap-3">
                                        <div className="p-4 bg-slate-50 rounded-full">
                                            <svg className="w-8 h-8 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                            </svg>
                                        </div>
                                        <p className="text-sm font-semibold text-slate-400">No candidates assigned to this position.</p>
                                    </div>
                                </td>
                            </tr>
                        )}
                    </tbody>
                </table>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="px-8 py-6 bg-slate-50/50 border-t border-slate-100 flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Showing {candidates.length} of {totalCandidates}</span>
                        <div className="flex items-center gap-3">
                            <button
                                onClick={() => setPage(p => Math.max(1, p - 1))}
                                disabled={page === 1}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                            >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" /></svg>
                                Previous
                            </button>
                            <button
                                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                                disabled={page === totalPages}
                                className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 rounded-xl text-[11px] font-bold text-slate-600 uppercase tracking-wider hover:bg-slate-50 disabled:opacity-50 transition-all shadow-sm"
                            >
                                Next
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" /></svg>
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PositionCandidatesPage;
