import React, { useState, useEffect, useRef } from 'react';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import Field from '../../components/form/Field';
import { Save, Bot } from 'lucide-react';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const DEFAULT_STATE = {
    resume: {
        weightage: { skills: 30, experience: 25, education: 20, certifications: 15, projects: 10 },
        rejection: { notSelected: 50 }
    },
    screening: { recommended: 70, cautiouslyRecommended: 50, notRecommended: 0 },
    assessment: { recommended: 70, cautiouslyRecommended: 50, notRecommended: 0 }
};

const AiScoringSettings = () => {
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return {}; }
    })();

    const [data, setData] = useState(DEFAULT_STATE);
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);
    const hasFetched = useRef(false);

    useEffect(() => {
        if (!user.organizationId) return;
        if (hasFetched.current) return;
        hasFetched.current = true;

        const load = async () => {
            try {
                const res = await authAPI.getAiScoringSettings(user.organizationId);
                if (res.data?.success && res.data?.data) {
                    const d = res.data.data;
                    setData({
                        resume: {
                            weightage: {
                                skills: d.resume?.weightage?.skills ?? 30,
                                experience: d.resume?.weightage?.experience ?? 25,
                                education: d.resume?.weightage?.education ?? 20,
                                certifications: d.resume?.weightage?.certifications ?? 15,
                                projects: d.resume?.weightage?.projects ?? 10
                            },
                            rejection: {
                                notSelected: d.resume?.rejection?.notSelected ?? 50
                            }
                        },
                        screening: {
                            recommended: d.screening?.recommended ?? 70,
                            cautiouslyRecommended: d.screening?.cautiouslyRecommended ?? 50,
                            notRecommended: d.screening?.notRecommended ?? 0
                        },
                        assessment: {
                            recommended: d.assessment?.recommended ?? 70,
                            cautiouslyRecommended: d.assessment?.cautiouslyRecommended ?? 50,
                            notRecommended: d.assessment?.notRecommended ?? 0
                        }
                    });
                }
            } catch (err) {
                if (err?.response?.status !== 404) console.error('Failed to load AI Scoring settings', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user.organizationId]);

    const setResumeWeightage = (key) => (val) =>
        setData(prev => ({
            ...prev,
            resume: {
                ...prev.resume,
                weightage: { ...prev.resume.weightage, [key]: val }
            }
        }));

    const setResumeRejectionMinScore = (val) => {
        const num = typeof val === 'number' ? val : (parseInt(String(val), 10) || 50);
        setData(prev => ({
            ...prev,
            resume: {
                ...prev.resume,
                rejection: { notSelected: num }
            }
        }));
    };

    const setScreening = (key) => (val) =>
        setData(prev => ({ ...prev, screening: { ...prev.screening, [key]: val } }));

    const setAssessment = (key) => (val) =>
        setData(prev => ({ ...prev, assessment: { ...prev.assessment, [key]: val } }));

    const handleSave = async () => {
        if (!user.organizationId) return;
        const w = data.resume.weightage;
        const sum = (w.skills || 0) + (w.experience || 0) + (w.education || 0) + (w.certifications || 0) + (w.projects || 0);
        if (sum !== 100) {
            toast.error('Resume Score Weightage must total 100%');
            return;
        }
        setSaving(true);
        try {
            await authAPI.updateAiScoringSettings(user.organizationId, data);
            toast.success('AI Scoring settings saved!');
        } catch (err) {
            toast.error('Failed to save. Please try again.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-16">
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    const w = data.resume.weightage;
    const minInviteScore = data.resume.rejection?.notSelected ?? 50;
    const total = (w.skills || 0) + (w.experience || 0) + (w.education || 0) + (w.certifications || 0) + (w.projects || 0);

    return (
        <div className="space-y-2">
            <div className="space-y-2">
                {/* Resume Score Weightage */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Resume Score Weightage</h3>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                        <Field label="Skills %" id="weightageSkills" type="number" value={w.skills} onChange={setResumeWeightage('skills')} placeholder="30" />
                        <Field label="Experience %" id="weightageExperience" type="number" value={w.experience} onChange={setResumeWeightage('experience')} placeholder="25" />
                        <Field label="Education %" id="weightageEducation" type="number" value={w.education} onChange={setResumeWeightage('education')} placeholder="20" />
                        <Field label="Certifications %" id="weightageCertifications" type="number" value={w.certifications} onChange={setResumeWeightage('certifications')} placeholder="15" />
                        <Field label="Projects %" id="weightageProjects" type="number" value={w.projects} onChange={setResumeWeightage('projects')} placeholder="10" />
                    </div>
                    <p className="text-xs text-slate-500 mt-2">Total: {total}%</p>
                </div>

                {/* Resume Rejection Score: below this = rejected, >= this = invited */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Resume Rejection Score</h3>

                    <div className="grid grid-cols-1 md:grid-cols-1 gap-4">
                        <Field label="Minimum score to invite (&ge;)" id="thresholdNotSelected" type="number" value={minInviteScore} onChange={setResumeRejectionMinScore} placeholder="50" />
                    </div>
                </div>

                {/* Short Screening Status */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-2">Short Screening Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Recommended &gt;" id="thresholdRecommended" type="number" value={data.screening.recommended} onChange={setScreening('recommended')} placeholder="70" />
                        <Field label="Cautiously Recommended &gt;" id="thresholdCautiouslyRecommended" type="number" value={data.screening.cautiouslyRecommended} onChange={setScreening('cautiouslyRecommended')} placeholder="50" />
                        <Field label="Not Recommended &gt;" id="thresholdNotRecommended" type="number" value={data.screening.notRecommended} onChange={setScreening('notRecommended')} placeholder="0" />
                    </div>
                </div>

                {/* AI Assessment Status */}
                <div className="p-4 bg-white rounded-xl border border-slate-200">
                    <h3 className="text-sm font-bold text-slate-800 mb-2">AI Assessment Status</h3>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <Field label="Recommended &gt;" id="thresholdRecommendedAi" type="number" value={data.assessment.recommended} onChange={setAssessment('recommended')} placeholder="70" />
                        <Field label="Cautiously Recommended &gt;" id="thresholdCautiouslyRecommendedAi" type="number" value={data.assessment.cautiouslyRecommended} onChange={setAssessment('cautiouslyRecommended')} placeholder="50" />
                        <Field label="Not Recommended &gt;" id="thresholdNotRecommendedAi" type="number" value={data.assessment.notRecommended} onChange={setAssessment('notRecommended')} placeholder="0" />
                    </div>
                </div>
            </div>

            {/* Bottom Save Button */}
            <PermissionWrapper feature="settings" permission="update">
                <div className="flex justify-end border-t border-slate-100 pt-2">
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="inline-flex items-center gap-2 px-6 py-2.5 bg-blue-600 text-white rounded-lg shadow-md transition hover:bg-blue-700 disabled:opacity-50 text-xs font-bold shrink-0"
                    >
                        <Save size={14} /> {saving ? 'Saving...' : 'Save AI Scoring'}
                    </button>
                </div>
            </PermissionWrapper>
        </div>
    );
};

export default AiScoringSettings;
