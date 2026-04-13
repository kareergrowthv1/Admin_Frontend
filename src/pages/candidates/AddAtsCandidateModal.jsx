import React, { useState, useEffect } from 'react';
import axios from '../../config/axios';
import { clearApiCache } from '../../utils/apiCache';
import { toast } from 'react-hot-toast';
import { Upload, X, Briefcase, User, Mail, Phone, Calendar, MapPin, DollarSign, FileText } from 'lucide-react';
import { extractTextFromFile } from '../../utils/resumeExtractor';

const AddAtsCandidateModal = ({ isOpen, onClose, onRefresh, jobId: initialJobId }) => {
    const [loading, setLoading] = useState(false);
    const [positions, setPositions] = useState([]);
    const [atsMode, setAtsMode] = useState('selection'); // 'selection', 'uploading', 'manual'
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');
    const [organizationId, setOrganizationId] = useState(null);

    const [formData, setFormData] = useState({
        position_id: initialJobId || '',
        candidate_email: '',
        candidate_name: '',
        whatsapp_number: '',
        resume_file: null,
        internal_notes: '',
        total_experience: '',
        current_organization: '',
        current_location: '',
        current_ctc: '',
        expected_ctc: '',
        notice_period: '',
        linkedin_link: '',
        source: 'MANUAL' // Default to manual
    });

    useEffect(() => {
        if (isOpen) {
            const orgId = localStorage.getItem('organizationId');
            setOrganizationId(orgId);
            fetchPositions();
            
            // Always start with selection, but pre-fill job if available
            setAtsMode('selection');
            setFormData(prev => ({
                ...prev,
                position_id: initialJobId || '',
                candidate_email: '',
                candidate_name: '',
                whatsapp_number: '',
                resume_file: null,
                internal_notes: '',
                total_experience: '',
                current_organization: '',
                current_location: '',
                current_ctc: '',
                expected_ctc: '',
                notice_period: '',
                linkedin_link: '',
                source: 'MANUAL'
            }));
            setSkills([]);
        }
    }, [isOpen, initialJobId]);

    const fetchPositions = async () => {
        try {
            const response = await axios.get('/admins/jobs', {
                params: { page: 0, size: 1000 }
            });
            const responseData = response.data || {};
            const rawJobs = responseData.content || responseData.data || responseData.jobs || [];
            const normalized = rawJobs
                .map((job) => ({
                    id: job.id || job.job_id,
                    title: job.jobTitle || job.job_title || job.title,
                    code: job.jobCode || job.job_code || job.code,
                }))
                .filter((job) => job.id && job.title);
            setPositions(normalized);
        } catch (error) {
            console.error('Error fetching jobs:', error);
        }
    };

    const handleAtsFileUpload = async (selectedFile) => {
        if (!selectedFile) return;
        setAtsMode('uploading');
        try {
            // 1. Extract text on frontend (no "AI", just local dependency)
            let extractedText = null;
            try {
                extractedText = await extractTextFromFile(selectedFile);
            } catch (err) {
                console.warn('Frontend extraction failed, falling back to backend:', err.message);
                // We'll still upload and let the backend try if frontend fails
            }

            const fd = new FormData();
            fd.append('file', selectedFile);
            if (extractedText) {
                fd.append('extractedText', extractedText);
            }

            const uploadRes = await axios.post('/admins/ats-candidates/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data.success) {
                const extracted = uploadRes.data.data.extracted;
                
                // Store in sessionStorage as requested
                sessionStorage.setItem('ats_temp_resume_data', JSON.stringify(extracted));
                
                setFormData(prev => ({
                    ...prev,
                    candidate_name: extracted.name || '',
                    candidate_email: extracted.email || '',
                    whatsapp_number: extracted.mobile_number || '',
                    total_experience: extracted.total_experience || '',
                    current_organization: extracted.current_organization || '',
                    current_location: extracted.current_location || '',
                    notice_period: extracted.notice_period || '',
                    linkedin_link: extracted.linkedin_link || '',
                    resume_file: selectedFile,
                    source: 'RESUME'
                }));
                setSkills(extracted.skills || []);
                toast.success('Resume parsed successfully!');
                setAtsMode('manual');
            } else {
                toast.error('Failed to parse resume.');
                setAtsMode('selection');
            }
        } catch (error) {
            console.error('Error parsing resume:', error);
            toast.error('Error parsing resume');
            setAtsMode('selection');
        }
    };

    const handleAddSkill = (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            const val = e.target.value.trim();
            if (val && !skills.includes(val)) {
                setSkills(prev => [...prev, val]);
                e.target.value = '';
            }
        }
    };

    const removeSkill = (sk) => {
        setSkills(skills.filter(s => s !== sk));
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        if (!formData.position_id) { toast.error('Please select a job requirement'); return; }
        if (!formData.candidate_name) { toast.error('Candidate Name is required'); return; }
        if (!formData.candidate_email) { toast.error('Email ID is required'); return; }

        setLoading(true);
        try {
            const fd = new FormData();
            fd.append('name', formData.candidate_name);
            fd.append('email', formData.candidate_email);
            const digitsOnly = (formData.whatsapp_number || '').replace(/\D/g, '');
            fd.append('mobile_number', digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly);
            fd.append('job_id', formData.position_id);
            fd.append('total_experience', formData.total_experience);
            fd.append('current_organization', formData.current_organization);
            fd.append('current_location', formData.current_location);
            fd.append('current_ctc', formData.current_ctc);
            fd.append('expected_ctc', formData.expected_ctc);
            fd.append('notice_period', formData.notice_period);
            fd.append('linkedin_link', formData.linkedin_link);
            fd.append('skills', JSON.stringify(skills));
            fd.append('internal_notes', formData.internal_notes);
            
            if (formData.resume_file) {
                fd.append('resume', formData.resume_file);
            }
            fd.append('source', formData.source);

            // Include extracted data from sessionStorage
            const extractedRaw = sessionStorage.getItem('ats_temp_resume_data');
            if (extractedRaw) {
                fd.append('extracted_json', extractedRaw);
            }

            const res = await axios.post('/admins/ats-candidates', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                const newCandidateId = res.data.data?.id;
                toast.success('ATS Candidate added successfully!');
                sessionStorage.removeItem('ats_temp_resume_data'); // Clear on success
                clearApiCache();

                if (onRefresh) onRefresh();
                onClose();
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add ATS candidate';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        sessionStorage.removeItem('ats_temp_resume_data');
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-300">
            <div className={`bg-white rounded-3xl w-full ${atsMode === 'selection' ? 'max-w-xl' : 'max-w-5xl'} max-h-[90vh] overflow-hidden flex flex-col shadow-2xl animate-in fade-in zoom-in duration-200`}>
                
                {/* Header */}
                <div className="flex items-center justify-between px-10 pt-6 pb-2 shrink-0">
                    <h2 className="text-xl font-bold text-slate-800">
                        {atsMode === 'selection' ? 'New Candidate Addition' : 'Add New Candidate'}
                    </h2>
                    <button 
                        onClick={handleClose}
                        className="p-2 hover:bg-slate-100 rounded-xl text-slate-400 transition-colors"
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto overflow-x-hidden px-10 pb-6 pt-2 custom-scrollbar">
                    {atsMode === 'selection' ? (
                        <div className="flex flex-col items-center justify-center py-4 text-left">
                            <p className="text-slate-500 text-base leading-relaxed mb-6 mr-auto">
                                Do you want to add the candidate by uploading a resume or entering details manually? 
                                AI extraction is available for uploaded resumes.
                            </p>
                            <div className="flex items-center justify-end gap-4 w-full">
                                <button
                                    onClick={() => setAtsMode('manual')}
                                    className="px-8 py-3.5 border-2 border-slate-100 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-50 transition-all uppercase tracking-wider"
                                >
                                    Fill Manually
                                </button>
                                <label className="px-8 py-3.5 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-200 uppercase tracking-wider cursor-pointer">
                                    Upload Resume
                                    <input type="file" className="hidden" accept=".pdf,.doc,.docx" onChange={(e) => handleAtsFileUpload(e.target.files[0])} />
                                </label>
                            </div>
                        </div>
                    ) : atsMode === 'uploading' ? (
                        <div className="flex flex-col items-center justify-center py-24 space-y-5">
                            <div className="w-14 h-14 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                            <div className="text-center">
                                <h3 className="text-lg font-bold text-slate-900">Analyzing Resume...</h3>
                                <p className="text-[11px] text-slate-400 font-bold uppercase tracking-widest mt-1">Extraction in progress</p>
                            </div>
                        </div>
                    ) : atsMode === 'manual' ? (
                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                            Select Job Requirement <span className="text-red-500">*</span>
                                        </label>
                                        <select
                                            value={formData.position_id}
                                            onChange={(e) => setFormData({ ...formData, position_id: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium appearance-none cursor-pointer shadow-sm"
                                            required
                                        >
                                            <option value="">Select Requirement</option>
                                            {positions.map(p => (
                                                <option key={p.id} value={p.id}>
                                                    {p.code ? `${p.code} - ${p.title}` : p.title}
                                                </option>
                                            ))}
                                        </select>
                                    </div>

                                    <div className="space-y-1.5">
                                        <div className="flex items-center justify-between">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Candidate Name <span className="text-red-500">*</span>
                                            </label>
                                            {formData.candidate_name && (
                                                <div className="flex items-center gap-2 px-2 py-0.5 bg-slate-50 border border-slate-100 rounded-lg animate-in fade-in slide-in-from-right-2 duration-300">
                                                    <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tight">Avatar Preview</span>
                                                    <div className="w-5 h-5 rounded-full overflow-hidden border border-slate-200">
                                                        <img 
                                                            src={`https://api.dicebear.com/7.x/avataaars/svg?seed=${formData.candidate_name}&backgroundColor=f8fafc`} 
                                                            alt="Preview" 
                                                            className="w-full h-full object-cover"
                                                        />
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                        <input
                                            type="text"
                                            value={formData.candidate_name}
                                            onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                            placeholder="Enter full name"
                                            required
                                        />
                                    </div>
                                    
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Email Address <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="email"
                                                value={formData.candidate_email}
                                                onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="email@example.com"
                                                required
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Contact Number <span className="text-red-500">*</span>
                                            </label>
                                            <input
                                                type="tel"
                                                value={formData.whatsapp_number}
                                                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="+91 00000 00000"
                                                required
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Current Location
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.current_location}
                                                onChange={(e) => setFormData({ ...formData, current_location: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="City, State"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Total Experience (Years)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.total_experience}
                                                onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="e.g. 5"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Notice Period
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.notice_period}
                                                onChange={(e) => setFormData({ ...formData, notice_period: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="e.g. 30 Days"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                LinkedIn Profile URL
                                            </label>
                                            <input
                                                type="url"
                                                value={formData.linkedin_link}
                                                onChange={(e) => setFormData({ ...formData, linkedin_link: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="https://linkedin.com/in/..."
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="space-y-6">
                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                            Current Organization
                                        </label>
                                        <input
                                            type="text"
                                            value={formData.current_organization}
                                            onChange={(e) => setFormData({ ...formData, current_organization: e.target.value })}
                                            className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                            placeholder="Company Name"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Current CTC (LPA)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.current_ctc}
                                                onChange={(e) => setFormData({ ...formData, current_ctc: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="e.g. 12"
                                            />
                                        </div>
                                        <div className="space-y-1.5">
                                            <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                                Expected CTC (LPA)
                                            </label>
                                            <input
                                                type="text"
                                                value={formData.expected_ctc}
                                                onChange={(e) => setFormData({ ...formData, expected_ctc: e.target.value })}
                                                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm"
                                                placeholder="e.g. 15"
                                            />
                                        </div>
                                    </div>

                                    <div className="space-y-2.5">
                                        <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight flex items-center justify-between">
                                            Professional Skills
                                            <span className="text-[10px] text-slate-400 font-normal normal-case">Press Enter to add</span>
                                        </label>
                                        <div className="min-h-12 w-full p-2 bg-white border border-slate-200 rounded-xl focus-within:ring-4 focus-within:ring-blue-100 focus-within:border-blue-500 transition-all shadow-sm">
                                            <div className="flex flex-wrap gap-1.5">
                                                {skills.map((skill, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-700 rounded-lg text-xs font-bold border border-slate-200 animate-in fade-in zoom-in duration-200">
                                                        {skill}
                                                        <button onClick={() => removeSkill(skill)} type="button" className="hover:text-red-500 transition-colors">
                                                            <X size={10} strokeWidth={3} />
                                                        </button>
                                                    </span>
                                                ))}
                                                <input
                                                    type="text"
                                                    onKeyDown={handleAddSkill}
                                                    className="flex-1 min-w-[120px] bg-transparent border-none outline-none text-sm p-1 placeholder:text-slate-300"
                                                    placeholder={skills.length === 0 ? "e.g. React, Node.js" : ""}
                                                />
                                            </div>
                                        </div>
                                    </div>

                                    <div className="space-y-1.5">
                                        <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                            Resume Document
                                        </label>
                                        <div className="p-4 bg-slate-50 border border-dashed border-slate-200 rounded-xl flex items-center justify-between hover:bg-white hover:border-blue-200 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:scale-110 transition-transform">
                                                    <Upload size={18} className="text-slate-400 group-hover:text-blue-500" />
                                                </div>
                                                <div>
                                                    <p className="text-[11px] font-bold text-slate-600 truncate max-w-[200px]">
                                                        {formData.resume_file ? formData.resume_file.name : "No file uploaded"}
                                                    </p>
                                                    <p className="text-[10px] text-slate-400 font-medium tracking-tight">
                                                        {formData.resume_file ? "Document attached" : "Click to select or drag & drop"}
                                                    </p>
                                                </div>
                                            </div>
                                            <label className="relative cursor-pointer px-4 py-2 bg-white border border-slate-200 rounded-lg text-[10px] font-bold text-slate-600 hover:text-blue-600 hover:border-blue-500 transition-all shadow-sm">
                                                {formData.resume_file ? "Change" : "Upload"}
                                                <input
                                                    type="file"
                                                    className="absolute inset-0 opacity-0 cursor-pointer"
                                                    onChange={(e) => setFormData({ ...formData, resume_file: e.target.files[0] })}
                                                    accept=".pdf,.doc,.docx"
                                                />
                                            </label>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="space-y-1.5">
                                <label className="text-[12px] font-semibold text-slate-700 block text-uppercase tracking-tight">
                                    Internal Notes
                                </label>
                                <textarea
                                    value={formData.internal_notes}
                                    onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-4 focus:ring-blue-100 focus:border-blue-500 transition-all font-medium shadow-sm resize-none"
                                    placeholder="Enter any internal notes about this candidate"
                                    rows="3"
                                />
                            </div>
                        </form>
                    ) : null}
                </div>

                {atsMode === 'manual' && (
                    <div className="px-10 py-6 flex items-center justify-end gap-6 shrink-0">
                        <button onClick={onClose} className="text-[11px] font-bold text-slate-400 hover:text-slate-600 transition-all uppercase tracking-widest">
                            Cancel
                        </button>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-12 py-3 bg-blue-600 text-white rounded-xl text-[11px] font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100 uppercase tracking-widest disabled:opacity-50"
                        >
                            {loading ? 'Adding...' : 'Add Candidate'}
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AddAtsCandidateModal;
