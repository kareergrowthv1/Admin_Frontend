import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';

const COUNT_OPTIONS = [1, 2, 3, 4];

const CrossQuestionSettings = () => {
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return {}; }
    })();

    const [crossQuestionCountGeneral, setCrossQuestionCountGeneral] = useState(2);
    const [crossQuestionCountPosition, setCrossQuestionCountPosition] = useState(2);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!user.organizationId) return;
        if (hasFetched.current) return;
        hasFetched.current = true;

        const load = async () => {
            try {
                const res = await authAPI.getCrossQuestionSettings(user.organizationId);
                if (res.data?.success && res.data?.data) {
                    const d = res.data.data;
                    setCrossQuestionCountGeneral(Math.min(4, Math.max(1, Number(d.crossQuestionCountGeneral) || 2)));
                    setCrossQuestionCountPosition(Math.min(4, Math.max(1, Number(d.crossQuestionCountPosition) || 2)));
                }
            } catch (err) {
                if (err?.response?.status !== 404) console.error('Failed to load Cross Question settings', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user.organizationId]);

    const handleSave = async () => {
        if (!user.organizationId) return;
        setSaving(true);
        try {
            await authAPI.updateCrossQuestionSettings(user.organizationId, {
                crossQuestionCountGeneral,
                crossQuestionCountPosition,
            });
            toast.success('Cross question settings saved!');
        } catch (err) {
            toast.error('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#FF6B00] border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h2 className="text-lg font-bold text-slate-800">Cross Question</h2>
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-6 py-2.5 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                    {saving ? (
                        <>
                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                            </svg>
                            Saving...
                        </>
                    ) : (
                        <>
                            Save
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </>
                    )}
                </button>
            </div>

            <p className="text-sm text-slate-600">
                These settings apply only when the interview mode is <strong>Conversational</strong>. They define how many follow-up (cross) questions to generate per main question, based on the candidate&apos;s answer.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* General (Round 1) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-1">General (Round 1)</h3>
                    <p className="text-xs text-slate-500 mb-3">Number of cross questions per general main question</p>
                    <div className="flex items-center gap-2">
                        <label htmlFor="cross-general" className="text-sm text-slate-700 shrink-0">Count:</label>
                        <select
                            id="cross-general"
                            value={crossQuestionCountGeneral}
                            onChange={(e) => setCrossQuestionCountGeneral(Number(e.target.value))}
                            className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                        >
                            {COUNT_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>

                {/* Position (Round 2) */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-1">Position (Round 2)</h3>
                    <p className="text-xs text-slate-500 mb-3">Number of cross questions per position-specific main question</p>
                    <div className="flex items-center gap-2">
                        <label htmlFor="cross-position" className="text-sm text-slate-700 shrink-0">Count:</label>
                        <select
                            id="cross-position"
                            value={crossQuestionCountPosition}
                            onChange={(e) => setCrossQuestionCountPosition(Number(e.target.value))}
                            className="w-24 px-3 py-2 text-sm border border-slate-300 rounded-lg focus:ring-2 focus:ring-[#FF6B00] focus:border-[#FF6B00]"
                        >
                            {COUNT_OPTIONS.map((n) => (
                                <option key={n} value={n}>{n}</option>
                            ))}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default CrossQuestionSettings;
