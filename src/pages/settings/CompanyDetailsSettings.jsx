import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../../features/auth/authAPI';
import { toast } from 'react-hot-toast';
import Field from '../../components/form/Field';
import { Save, Building2 } from 'lucide-react';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const CompanyDetailsSettings = () => {
    const navigate = useNavigate();
    const user = (() => {
        try { return JSON.parse(localStorage.getItem('admin_user')); } catch { return {}; }
    })();

    const [company, setCompany] = useState({
        companyName: '', companyEmail: '', address: '', country: '', state: '',
        city: '', pincode: '', industryType: '', foundedYear: '', websiteUrl: '',
        linkedinUrl: '', instagramUrl: '', facebookUrl: '', aboutUs: '',
    });
    const [saving, setSaving] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!user.organizationId) return;
        const load = async () => {
            try {
                const res = await authAPI.getCompanyDetails(user.organizationId);
                if (res.data?.success && res.data?.data) {
                    const d = res.data.data;
                    setCompany({
                        companyName: d.companyName,
                        companyEmail: d.companyEmail,
                        address: d.address,
                        country: d.country,
                        state: d.state,
                        city: d.city,
                        pincode: d.pincode,
                        industryType: d.industryType,
                        foundedYear: d.foundedYear,
                        websiteUrl: d.websiteUrl,
                        linkedinUrl: d.linkedinUrl,
                        instagramUrl: d.instagramUrl,
                        facebookUrl: d.facebookUrl,
                        aboutUs: d.aboutUs,
                    });
                }
            } catch (err) {
                if (err?.response?.status !== 404) console.error('Failed to load company details', err);
            } finally {
                setLoading(false);
            }
        };
        load();
    }, [user.organizationId]);

    const setP = (key) => (val) => setCompany((prev) => ({ ...prev, [key]: val }));

    const handleSave = async () => {
        if (!user.organizationId) return;
        const required = ['companyName', 'companyEmail', 'address', 'state', 'country', 'city', 'pincode'];
        const missing = required.filter(k => !company[k] || company[k].trim() === '');
        if (missing.length > 0) {
            toast.error('Please fill all mandatory fields marked with *');
            return;
        }
        setSaving(true);
        try {
            await authAPI.updateCompanyDetails(user.organizationId, company);
            toast.success('Company details saved successfully!');
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
                    <Field label="Company Name" id="companyName" value={company.companyName} onChange={setP('companyName')} placeholder="eg. QwikHire Corp" required={true} />
                    <Field label="Company Email" id="companyEmail" type="email" value={company.companyEmail} onChange={setP('companyEmail')} placeholder="hello@company.com" required={true} />
                </div>
                <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    <Field label="Industry Type" id="industry" value={company.industryType} onChange={setP('industryType')} placeholder="eg. IT/SaaS, Finance" />
                    <Field label="Founded Year" id="founded" type="number" value={company.foundedYear} onChange={setP('foundedYear')} placeholder="2020" />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="Website URL" id="compWebsite" value={company.websiteUrl} onChange={setP('websiteUrl')} placeholder="https://company.com" />
                    <Field label="LinkedIn URL" id="linkedin" value={company.linkedinUrl} onChange={setP('linkedinUrl')} placeholder="https://linkedin.com/company/..." />
                </div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                    <Field label="Instagram URL" id="instagram" value={company.instagramUrl} onChange={setP('instagramUrl')} placeholder="https://instagram.com/..." />
                    <Field label="Facebook URL" id="facebook" value={company.facebookUrl} onChange={setP('facebookUrl')} placeholder="https://facebook.com/..." />
                </div>
                <div className="pt-2">
                    <div className="mb-6">
                        <Field label="Address" id="pAddr" type="textarea" value={company.address} onChange={setP('address')} placeholder="123 Main Street" required={true} />
                    </div>
                    <div className="grid grid-cols-1 gap-2 md:grid-cols-2">
                        <Field label="City" id="pCity" value={company.city} onChange={setP('city')} placeholder="Bangalore" required={true} />
                        <Field label="State" id="pState" value={company.state} onChange={setP('state')} placeholder="Karnataka" required={true} />
                        <Field label="Country" id="pCountry" value={company.country} onChange={setP('country')} placeholder="India" required={true} />
                        <Field label="Pincode" id="pPin" value={company.pincode} onChange={setP('pincode')} placeholder="560001" required={true} />
                    </div>
                </div>
                <div className="pt-2">
                    <Field label="About Us" id="pAbout" type="textarea" value={company.aboutUs} onChange={setP('aboutUs')} placeholder="Brief description about your company..." />
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
                        <Save size={14} /> {saving ? 'Saving...' : 'Save Company Details'}
                    </button>
                </div>
            </PermissionWrapper>
        </div>
    );
};

export default CompanyDetailsSettings;
