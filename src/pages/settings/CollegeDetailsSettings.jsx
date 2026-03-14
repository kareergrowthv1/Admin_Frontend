import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import Field from '../../components/form/Field';

const CollegeDetailsSettings = () => {
    const navigate = useNavigate();
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return {}; }
    })();

    const [college, setCollege] = useState({
        collegeName: '', collegeEmail: '', address: '', country: '', state: '',
        city: '', pincode: '', university: '', websiteUrl: '', aboutUs: '',
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.organizationId) return;
        const load = async () => {
            try {
                const res = await authAPI.getCollegeDetails(user.organizationId);
                if (res.data?.success && res.data?.data) {
                    const d = res.data.data;
                    setCollege({
                        collegeName: d.collegeName,
                        collegeEmail: d.collegeEmail,
                        address: d.address,
                        country: d.country,
                        state: d.state,
                        city: d.city,
                        pincode: d.pincode,
                        university: d.university,
                        websiteUrl: d.websiteUrl,
                        aboutUs: d.aboutUs,
                    });
                }
            } catch (err) {
                if (err?.response?.status !== 404) console.error('Failed to load college details', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user.organizationId]);

    const setC = (key) => (val) => setCollege((prev) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!user.organizationId) return;
        const required = ['collegeName', 'collegeEmail', 'university', 'address', 'state', 'country', 'city', 'pincode'];
        const missing = required.filter(k => !college[k] || college[k].trim() === '');
        if (missing.length > 0) {
            toast.error('Please fill all mandatory fields marked with *');
            return;
        }
        setSaving(true);
        try {
            await authAPI.updateCollegeDetails(user.organizationId, college);
            toast.success('College details saved successfully!');
            setTimeout(() => navigate('/dashboard'), 1200);
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
                <h2 className="text-lg font-bold text-slate-800">College Details</h2>
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
                            Save College Details
                            <svg className="w-4 h-4 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                                <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                            </svg>
                        </>
                    )}
                </button>
            </div>

            <div className="space-y-6 pb-12">
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="College Name" id="collegeName" value={college.collegeName} onChange={setC('collegeName')} placeholder="eg. ABC Institute of Technology" required={true} />
                    <Field label="College Email" id="collegeEmail" type="email" value={college.collegeEmail} onChange={setC('collegeEmail')} placeholder="admin@college.edu" required={true} />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="University" id="university" value={college.university} onChange={setC('university')} placeholder="eg. VTU, Anna University" required={true} />
                    <Field label="Website URL" id="collegeWebsite" value={college.websiteUrl} onChange={setC('websiteUrl')} placeholder="https://college.edu" />
                </div>
                <div className="pt-2">
                    <div className="mb-6">
                        <Field label="Address" id="cAddr" type="textarea" value={college.address} onChange={setC('address')} placeholder="Enter your address" required={true} />
                    </div>
                    <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                        <Field label="City" id="cCity" value={college.city} onChange={setC('city')} placeholder="Bangalore" required={true} />
                        <Field label="State" id="cState" value={college.state} onChange={setC('state')} placeholder="Karnataka" required={true} />
                        <Field label="Country" id="cCountry" value={college.country} onChange={setC('country')} placeholder="India" required={true} />
                        <Field label="Pincode" id="cPin" value={college.pincode} onChange={setC('pincode')} placeholder="560001" required={true} />
                    </div>
                </div>
                <div className="pt-2">
                    <Field label="About Us" id="cAbout" type="textarea" value={college.aboutUs} onChange={setC('aboutUs')} placeholder="Brief description about your college…" />
                </div>
            </div>
        </div>
    );
};

export default CollegeDetailsSettings;
