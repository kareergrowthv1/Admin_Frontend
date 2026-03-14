
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'react-hot-toast';

const PublicRegistration = () => {
    const { linkId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    const [linkData, setLinkData] = useState(null);
    const [loadingLink, setLoadingLink] = useState(true);
    const [positionDetails, setPositionDetails] = useState(null);
    const apiBaseUrl = import.meta.env.VITE_ADMIN_API_URL;

    const [formData, setFormData] = useState({
        candidate_name: '',
        candidate_email: '',
        mobile_number: '',
        country_code: '+91',
        register_no: '',
        department: '',
        semester: '',
        location: '',
        address: '',
        birthdate: '',
        resume_file: null
    });

    useEffect(() => {
        if (linkId) {
            fetchLinkDetails();
        }
    }, [linkId]);

    const fetchLinkDetails = async () => {
        try {
            const response = await axios.get(`${apiBaseUrl}/candidates/public-link/${linkId}`);
            const data = response.data.data;
            setLinkData(data);

            // Fetch more position details
            if (data.position_id && data.org_id) {
                fetchPositionDetails(data.position_id, data.org_id);
            }
        } catch (error) {
            console.error('Error fetching link details:', error);
            toast.error('Invalid or expired link');
        } finally {
            setLoadingLink(false);
        }
    };

    const fetchPositionDetails = async (posId, orgId) => {
        try {
            const response = await axios.get(`${apiBaseUrl}/candidates/public-position/${posId}/${orgId}`);
            setPositionDetails(response.data.data);
        } catch (error) {
            console.error('Error fetching position details:', error);
        }
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file) {
            const validTypes = ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
            if (!validTypes.includes(file.type)) {
                toast.error('Only PDF and Word (.docx) files are allowed');
                e.target.value = '';
                return;
            }
            if (file.size > 5 * 1024 * 1024) {
                toast.error('File size should not exceed 5MB');
                e.target.value = '';
                return;
            }
            setFormData({ ...formData, resume_file: file });
        }
    };

    const validateForm = () => {
        if (!formData.candidate_name) {
            toast.error('Please enter your name');
            return false;
        }
        if (!formData.candidate_email) {
            toast.error('Please enter your email');
            return false;
        }
        if (!formData.mobile_number || !/^\d{10}$/.test(formData.mobile_number)) {
            toast.error('Please enter a valid 10-digit mobile number');
            return false;
        }
        if (!formData.register_no) {
            toast.error('Please enter your registration number');
            return false;
        }
        if (!formData.department) {
            toast.error('Please enter your department');
            return false;
        }
        if (!formData.semester) {
            toast.error('Please enter your semester');
            return false;
        }
        if (!formData.location) {
            toast.error('Please enter your location');
            return false;
        }
        if (!formData.address) {
            toast.error('Please enter your address');
            return false;
        }
        if (!formData.birthdate) {
            toast.error('Please select your birthdate');
            return false;
        }
        if (!formData.resume_file) {
            toast.error('Please upload your resume');
            return false;
        }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        setLoading(true);
        try {
            const formDataToSend = new FormData();
            formDataToSend.append('link_id', linkId);
            formDataToSend.append('candidate_name', formData.candidate_name);
            formDataToSend.append('candidate_email', formData.candidate_email);
            formDataToSend.append('mobile_number', formData.country_code + formData.mobile_number);
            formDataToSend.append('register_no', formData.register_no);
            formDataToSend.append('department', formData.department);
            formDataToSend.append('semester', formData.semester);
            formDataToSend.append('location', formData.location);
            formDataToSend.append('address', formData.address);
            formDataToSend.append('birthdate', formData.birthdate);
            formDataToSend.append('question_set_id', linkData.question_set_id);
            formDataToSend.append('position_id', linkData.position_id);
            formDataToSend.append('organization_id', linkData.client_id);

            if (formData.resume_file) {
                formDataToSend.append('resume', formData.resume_file);
            }

            await axios.post(`${apiBaseUrl}/candidates/public-register`, formDataToSend, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            toast.success('Registration successful! Check your email for assessment link.');
            // Redirect to a success page or show success message
            setFormData({
                candidate_name: '',
                candidate_email: '',
                mobile_number: '',
                country_code: '+91',
                register_no: '',
                department: '',
                semester: '',
                location: '',
                address: '',
                birthdate: '',
                resume_file: null
            });
        } catch (error) {
            console.error('Error registering:', error);
            toast.error(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    if (loadingLink) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-slate-50">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-600 mx-auto"></div>
                    <p className="mt-4 text-slate-600">Loading...</p>
                </div>
            </div>
        );
    }

    if (!linkData) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-orange-50 to-slate-50">
                <div className="text-center bg-white p-8 rounded-xl shadow-lg max-w-md">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <svg className="w-8 h-8 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </div>
                    <h2 className="text-xl font-bold text-slate-800 mb-2">Invalid Link</h2>
                    <p className="text-slate-600">This assessment link is invalid or has expired.</p>
                </div>
            </div>
        );
    }

    // --- UI MATCH ADMIN LOGIN ---
    return (
        <>
            <div className="flex min-h-screen font-['Inter',sans-serif]">
                {/* LEFT PANEL: Position/Company Details */}
                <div className="relative hidden lg:flex lg:w-[52%] flex-col justify-between overflow-hidden bg-gradient-to-br from-[#A63200] via-[#B83800] to-[#CC4E00] px-14 py-12 text-white">
                    {/* animated gradient orbs */}
                    <div className="pointer-events-none absolute inset-0 mix-blend-overlay opacity-60">
                        <div className="absolute -top-20 -left-20 h-96 w-96 rounded-full bg-red-600/40 blur-[100px]" />
                        <div className="absolute top-1/2 right-0 h-80 w-80 rounded-full bg-gradient-to-r from-red-500 to-amber-400/30 blur-[80px]" />
                        <div className="absolute bottom-0 left-1/3 h-72 w-72 rounded-full bg-orange-600/40 blur-[90px]" />
                    </div>
                    {/* diagonal line pattern overlay */}
                    <div className="pointer-events-none absolute inset-0 opacity-15"
                        style={{ backgroundImage: 'repeating-linear-gradient(45deg, transparent, transparent 4px, rgba(255,255,255,0.8) 4px, rgba(255,255,255,0.8) 5px)' }} />
                    {/* top logo */}
                    <div className="relative z-10 flex items-center gap-3">
                        <div className="grid h-10 w-10 place-items-center rounded-xl bg-white/20 shadow-lg shadow-orange-900/20 text-sm font-extrabold backdrop-blur-md border border-white/20">
                            KG
                        </div>
                        <span className="text-sm font-semibold tracking-widest uppercase text-white/90">KareerGrowth</span>
                    </div>
                    {/* centre hero copy */}
                    <div className="relative z-10 space-y-6 mt-10">
                        <div className="inline-flex items-center gap-2 rounded-full border border-white/30 bg-white/10 px-4 py-1.5 text-xs font-medium text-white backdrop-blur-md">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            Public Registration — Assessment
                        </div>
                        <h1 className="font-['Space_Grotesk',sans-serif] text-3xl font-bold leading-tight tracking-tight text-white drop-shadow-md">
                            {positionDetails?.title || linkData.position_name || 'Assessment'}
                        </h1>
                        <div className="max-w-sm text-sm leading-relaxed text-white/80 space-y-2">
                            <div><span className="font-semibold">Company:</span> {linkData.organization_name || 'N/A'}</div>
                            {positionDetails && (
                                <>
                                    <div><span className="font-semibold">Experience:</span> {positionDetails.minimumExperience}-{positionDetails.maximumExperience} Years</div>
                                    <div><span className="font-semibold">Skills:</span> {positionDetails.mandatorySkills?.join(', ')}</div>
                                </>
                            )}
                            <div><span className="font-semibold">Question Set:</span> {linkData.question_set_name || 'Standard Set'}</div>
                            <div><span className="font-semibold">Link Valid Till:</span> {linkData.expire_at ? new Date(linkData.expire_at).toLocaleString() : 'Not specified'}</div>
                        </div>
                    </div>
                    {/* bottom footer */}
                    <p className="relative z-10 text-xs text-white/60 mt-10">
                        © {new Date().getFullYear()} KareerGrowth · All rights reserved.
                    </p>
                    {/* decorative arc */}
                    <svg className="pointer-events-none absolute right-0 top-0 h-full w-24 text-white/10" viewBox="0 0 100 800" preserveAspectRatio="none">
                        <path d="M100 0 Q0 400 100 800" fill="none" stroke="currentColor" strokeWidth="1.5" />
                    </svg>
                </div>
                {/* RIGHT PANEL: Registration Form */}
                <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16">
                    <div className="w-full max-w-4xl">
                        {/* mobile logo */}
                        <div className="mb-8 flex items-center gap-3 lg:hidden">
                            <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-[#D94200] to-[#DD7000] text-xs font-extrabold text-white shadow-md">KG</div>
                            <span className="text-sm font-semibold tracking-widest uppercase text-[#D94200]">KareerGrowth</span>
                        </div>
                        {/* heading */}
                        <div className="mb-8">
                            <h2 className="font-['Space_Grotesk',sans-serif] text-2xl font-bold text-slate-900 text-center md:text-left">
                                {positionDetails?.title || linkData?.position_name || 'Assessment Registration'}
                            </h2>
                            <p className="mt-1.5 text-sm text-slate-500 text-center md:text-left">
                                {linkData?.organization_name
                                    ? `Register for an assessment hosted by ${linkData.organization_name}.`
                                    : 'Fill in your details to register for the assessment.'}
                            </p>
                        </div>
                        {/* form */}
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
                                {/* Candidate Name */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Full Name <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.candidate_name}
                                        onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                        placeholder="Enter your full name"
                                        required
                                    />
                                </div>

                                {/* Email */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Email Address <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="email"
                                        value={formData.candidate_email}
                                        onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                        placeholder="your.email@example.com"
                                        required
                                    />
                                </div>

                                {/* Mobile Number */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Mobile Number <span className="text-red-500">*</span>
                                    </label>
                                    <div className="flex gap-2">
                                        <select
                                            value={formData.country_code}
                                            onChange={(e) => setFormData({ ...formData, country_code: e.target.value })}
                                            className="w-24 px-2 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all bg-white"
                                        >
                                            <option value="+91">🇮🇳 +91</option>
                                            <option value="+1">🇺🇸 +1</option>
                                            <option value="+44">🇬🇧 +44</option>
                                            <option value="+971">🇦🇪 +971</option>
                                        </select>
                                        <input
                                            type="tel"
                                            value={formData.mobile_number}
                                            onChange={(e) => setFormData({ ...formData, mobile_number: e.target.value.replace(/\D/g, '') })}
                                            className="flex-1 px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                            placeholder="10 digit mobile"
                                            maxLength="10"
                                            required
                                        />
                                    </div>
                                </div>

                                {/* Birthdate */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Birthdate <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="date"
                                        value={formData.birthdate}
                                        onChange={(e) => setFormData({ ...formData, birthdate: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all"
                                        required
                                    />
                                </div>

                                {/* Registration Number */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Registration Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.register_no}
                                        onChange={(e) => setFormData({ ...formData, register_no: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                        placeholder="Enter registration number"
                                        required
                                    />
                                </div>

                                {/* Department */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Department <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.department}
                                        onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                        placeholder="Enter your department"
                                        required
                                    />
                                </div>

                                {/* Semester */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Semester <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="12"
                                        value={formData.semester}
                                        onChange={(e) => setFormData({ ...formData, semester: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                        placeholder="Current semester"
                                        required
                                    />
                                </div>

                                {/* Location */}
                                <div>
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Location <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text"
                                        value={formData.location}
                                        onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all placeholder:text-slate-400"
                                        placeholder="City, Province"
                                        required
                                    />
                                </div>

                                {/* Address */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Detailed Address <span className="text-red-500">*</span>
                                    </label>
                                    <textarea
                                        value={formData.address}
                                        onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all resize-none placeholder:text-slate-400"
                                        placeholder="Enter your complete address"
                                        rows="2"
                                        required
                                    />
                                </div>

                                {/* Resume Upload */}
                                <div className="md:col-span-2">
                                    <label className="block text-xs font-medium text-slate-900 mb-1.5">
                                        Upload Resume (PDF or Word) <span className="text-red-500">*</span>
                                    </label>
                                    <div className="relative">
                                        <input
                                            type="file"
                                            onChange={handleFileChange}
                                            accept=".pdf,.docx"
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm text-slate-900 focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all file:mr-4 file:py-1.5 file:px-4 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-orange-50 file:text-orange-700 hover:file:bg-orange-100 cursor-pointer"
                                            required
                                        />
                                    </div>
                                    {formData.resume_file && (
                                        <p className="text-xs text-emerald-600 mt-2 flex items-center gap-1.5 font-medium">
                                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                            </svg>
                                            {formData.resume_file.name}
                                        </p>
                                    )}
                                    <p className="text-[10px] text-slate-400 mt-1.5 italic">Maximum file size: 5MB (PDF/DOCX only)</p>
                                </div>
                            </div>

                            {/* Submit Button */}
                            <div className="pt-2">
                                <button
                                    type="submit"
                                    disabled={loading}
                                    className="relative w-full overflow-hidden rounded-full bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] py-3.5 text-sm font-semibold text-white shadow-lg shadow-orange-500/30 ring-1 ring-inset ring-white/20 transition hover:-translate-y-0.5 hover:shadow-orange-500/40 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-60"
                                >
                                    {loading ? (
                                        <span className="flex items-center justify-center gap-2">
                                            <svg className="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
                                                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" strokeLinecap="round" />
                                            </svg>
                                            Registering…
                                        </span>
                                    ) : (
                                        'Register for Assessment →'
                                    )}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </>
    );
};

export default PublicRegistration;
