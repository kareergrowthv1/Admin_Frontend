import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import Field from '../../components/form/Field';
import { Save, GraduationCap } from 'lucide-react';
import PermissionWrapper from '../../components/common/PermissionWrapper';

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
                <div className="h-8 w-8 animate-spin rounded-full border-2 border-blue-600 border-t-transparent" />
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="space-y-2">
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="College Name" id="collegeName" value={college.collegeName} onChange={setC('collegeName')} placeholder="eg. ABC Institute of Technology" required={true} />
                    <Field label="College Email" id="collegeEmail" type="email" value={college.collegeEmail} onChange={setC('collegeEmail')} placeholder="admin@college.edu" required={true} />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="University" id="university" value={college.university} onChange={setC('university')} placeholder="eg. Visvesvaraya Technological University" required={true} />
                    <Field label="Website URL" id="websiteUrl" value={college.websiteUrl} onChange={setC('websiteUrl')} placeholder="https://college.edu" />
                </div>
                <Field label="Address" id="address" type="textarea" value={college.address} onChange={setC('address')} placeholder="Full address of the college…" required={true} />
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="City" id="city" value={college.city} onChange={setC('city')} placeholder="Bangalore" required={true} />
                    <Field label="State" id="state" value={college.state} onChange={setC('state')} placeholder="Karnataka" required={true} />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="Country" id="country" value={college.country} onChange={setC('country')} placeholder="India" required={true} />
                    <Field label="Pincode" id="pincode" value={college.pincode} onChange={setC('pincode')} placeholder="560001" required={true} />
                </div>
                <div className="pt-2">
                    <Field label="About Us" id="cAbout" type="textarea" value={college.aboutUs} onChange={setC('aboutUs')} placeholder="Brief description about your college…" />
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
                        <Save size={14} /> {saving ? 'Saving...' : 'Save College Details'}
                    </button>
                </div>
            </PermissionWrapper>
        </div>
    );
};

export default CollegeDetailsSettings;
