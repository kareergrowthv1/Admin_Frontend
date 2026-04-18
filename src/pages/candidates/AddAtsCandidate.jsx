import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios from '../../config/axios';
import { clearApiCache } from '../../utils/apiCache';
import { toast } from 'react-hot-toast';
import { Upload, User, X, FileText, CheckCircle2 } from 'lucide-react';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import { extractTextFromFile } from '../../utils/resumeExtractor';

const AddAtsCandidate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const preSelectedPosition = location.state?.position;
    
    const [loading, setLoading] = useState(false);
    const [positions, setPositions] = useState([]);
    const [organizationId, setOrganizationId] = useState(null);
    const [atsMode, setAtsMode] = useState('selection'); // 'selection', 'uploading', 'manual'
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');

    const [formData, setFormData] = useState({
        position_id: preSelectedPosition?.id || '',
        position_name: preSelectedPosition?.title || '',
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
        extracted_raw_text: ''
    });

    useEffect(() => {
        try {
            const storedOrgId = localStorage.getItem('organizationId');
            if (storedOrgId) {
                setOrganizationId(storedOrgId);
                fetchPositions();
            }
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
    }, [organizationId]);

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
                    createdAt: job.createdAt || job.created_at,
                }))
                .filter((job) => job.id && job.title);

            normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setPositions(normalized);
        } catch (error) {
            console.error('Error fetching jobs:', error);
            toast.error('Failed to load requirement details');
        }
    };

    const handlePositionChange = (e) => {
        const selectedPosition = positions.find(p => p.id === e.target.value);
        setFormData({
            ...formData,
            position_id: e.target.value,
            position_name: selectedPosition?.title || ''
        });
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

    const handleAtsFileUpload = async (selectedFile) => {
        if (!selectedFile) return;
        
        setAtsMode('uploading');
        try {
            // Step 1: Frontend Extraction (Properly done in React)
            let extractedRawText = '';
            try {
                extractedRawText = await extractTextFromFile(selectedFile);
                console.log(`[AddAtsCandidate] Frontend extracted ${extractedRawText.length} characters`);
            } catch (err) {
                console.warn('[AddAtsCandidate] Frontend extraction failed, falling back to backend:', err);
            }

            const fd = new FormData();
            fd.append('file', selectedFile);
            if (extractedRawText) {
                fd.append('extractedText', extractedRawText);
            }

            const uploadRes = await axios.post('/admins/ats-candidates/upload', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });

            if (uploadRes.data.success) {
                const extracted = uploadRes.data.data.extracted;
                setFormData(prev => ({
                    ...prev,
                    candidate_name: extracted.name || '',
                    candidate_email: extracted.email || '',
                    whatsapp_number: extracted.mobile_number || '',
                    total_experience: extracted.total_experience || '',
                    current_organization: extracted.current_organization || '',
                    current_location: extracted.current_location || '',
                    extracted_raw_text: extractedRawText || extracted.raw_text || '',
                    resume_file: selectedFile
                }));
                setSkills(extracted.skills || []);
                toast.success('Resume parsed successfully! Please review and fill any missing details.', { duration: 4000 });
            } else {
                toast.error('Failed to parse resume.');
            }
        } catch (error) {
            console.error('Error parsing resume:', error);
            toast.error(error.response?.data?.message || 'Error occurred while parsing resume');
        } finally {
            setAtsMode('manual');
        }
    };

    const addSkill = (e) => {
        e.preventDefault();
        if (skillInput.trim() && !skills.includes(skillInput.trim())) {
            setSkills([...skills, skillInput.trim()]);
        }
        setSkillInput('');
    };

    const removeSkill = (sk) => {
        setSkills(skills.filter(s => s !== sk));
    };

    const validateForm = () => {
        if (!formData.position_id) { toast.error('Please select a job requirement'); return false; }
        if (!formData.candidate_name) { toast.error('Candidate Name is required'); return false; }
        if (!formData.candidate_email) { toast.error('Email ID is required'); return false; }
        if (!formData.whatsapp_number || !/^\d{10}$/.test(formData.whatsapp_number.replace(/\D/g, ''))) {
            toast.error('A valid 10-digit WhatsApp Number is required'); return false;
        }
        if (!formData.total_experience && formData.total_experience !== 0) { toast.error('Relevant Experience is required'); return false; }
        return true;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateForm()) return;
        if (!organizationId) {
            toast.error('Organization context is required. Please log in again or refresh.');
            return;
        }

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
            fd.append('skills', JSON.stringify(skills));
            
            // Send the extracted text in extracted_json so backend scoring has it immediately
            if (formData.extracted_raw_text) {
                fd.append('extracted_json', JSON.stringify({
                    raw_text: formData.extracted_raw_text,
                    skills: skills,
                    extracted_at: new Date().toISOString()
                }));
            }

            if (formData.resume_file) {
                fd.append('resume', formData.resume_file);
            }

            const res = await axios.post('/admins/ats-candidates', fd, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            
            if (res.data.success) {
                const newCandidateId = res.data.data?.id;
                toast.success('ATS Candidate added successfully!');
                clearApiCache();

                navigate('/admins/ats-candidates'); 
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add ATS candidate';
            toast.error(msg, { duration: 6000 });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            {atsMode !== 'manual' && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-4 bg-slate-900/10 backdrop-blur-[2px] animate-in fade-in duration-300">
                    <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col p-6 relative animate-in zoom-in-95 duration-300 border border-slate-100">
                        <button onClick={() => setAtsMode('manual')} className="absolute top-4 right-4 p-1.5 hover:bg-slate-100 rounded-lg text-slate-400 transition-colors">
                            <X size={18} />
                        </button>
                        
                        {atsMode === 'selection' && (
                            <div className="flex flex-col">
                                <div className="mb-8">
                                    <h3 className="text-lg font-bold text-slate-800 mb-2">New Candidate Addition</h3>
                                    <p className="text-sm text-slate-500 leading-relaxed">
                                        Do you want to add the candidate by uploading a resume or entering details manually? 
                                        AI extraction is available for uploaded resumes.
                                    </p>
                                </div>
                                
                                <div className="flex justify-end items-center gap-3">
                                    <button 
                                        onClick={() => setAtsMode('manual')}
                                        className="px-5 py-2.5 text-[11px] font-bold tracking-wide rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-all uppercase"
                                    >
                                        Fill Manually
                                    </button>
                                    <label className="px-5 py-2.5 text-[11px] font-bold tracking-wide rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-blue-200 uppercase">
                                        Upload Resume
                                        <input 
                                            type="file" 
                                            className="hidden" 
                                            accept=".pdf,.doc,.docx" 
                                            onChange={(e) => handleAtsFileUpload(e.target.files[0])} 
                                        />
                                    </label>
                                </div>
                            </div>
                        )}

                        {atsMode === 'uploading' && (
                            <div className="flex flex-col items-center justify-center py-10 space-y-4">
                                <div className="w-10 h-10 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                <div className="text-center">
                                    <h3 className="text-sm font-bold text-slate-700">Analyzing Resume...</h3>
                                    <p className="text-[10px] text-slate-400 font-medium tracking-widest uppercase mt-1">Extraction in progress</p>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
            
            <div className="space-y-0 pb-12">
                <div className="flex items-center justify-between mb-8">
                    <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                        </svg>
                        <span className="hover:text-slate-600 cursor-pointer transition-colors" onClick={() => navigate('/admins/ats-candidates')}>Back</span>
                        <span className="mx-1 text-slate-200">•</span>
                        <span className="hover:text-slate-600 cursor-pointer transition-colors" onClick={() => navigate('/admins/ats-candidates')}>ATS Candidates List</span>
                        <span className="mx-1 text-slate-200">/</span>
                        <span className="text-slate-800 font-bold">Add ATS Candidate</span>
                    </div>
                    <div className="flex items-center gap-3">
                        <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                            </svg>
                        </button>
                        <PermissionWrapper feature="candidates" permission="write">
                            <button
                                onClick={handleSubmit}
                                disabled={loading}
                                className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                {loading ? 'Adding Candidate...' : 'Add Candidate'}
                            </button>
                        </PermissionWrapper>
                    </div>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Select Job Requirement <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={formData.position_id}
                                onChange={handlePositionChange}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] bg-white"
                                required
                            >
                                <option value="">Select Requirement</option>
                                {positions.map(position => (
                                    <option key={position.id} value={position.id}>
                                        {position.code ? `${position.code} - ${position.title}` : position.title}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Candidate Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                value={formData.candidate_name}
                                onChange={(e) => setFormData({ ...formData, candidate_name: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="Enter candidate name"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Email ID <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                value={formData.candidate_email}
                                onChange={(e) => setFormData({ ...formData, candidate_email: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="Enter candidate email"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                WhatsApp Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                value={formData.whatsapp_number}
                                onChange={(e) => setFormData({ ...formData, whatsapp_number: e.target.value.replace(/\D/g, '') })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="Enter 10-digit WhatsApp number"
                                maxLength="10"
                                required
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Relevant Experience (Years) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                value={formData.total_experience}
                                onChange={(e) => setFormData({ ...formData, total_experience: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="0"
                                min="0"
                                step="0.5"
                                required
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Current CTC (LPA)
                            </label>
                            <input
                                type="number"
                                value={formData.current_ctc}
                                onChange={(e) => setFormData({ ...formData, current_ctc: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="e.g. 8.5"
                                step="0.1"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Expected CTC (LPA)
                            </label>
                            <input
                                type="number"
                                value={formData.expected_ctc}
                                onChange={(e) => setFormData({ ...formData, expected_ctc: e.target.value })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="e.g. 12.0"
                                step="0.1"
                            />
                        </div>
                    </div>

                    <div className="space-y-1.5">
                            <label className="text-[12px] font-semibold text-slate-700 block">
                            Required Skills <span className="text-red-500">*</span>
                        </label>
                        <div className="p-3 bg-slate-50/50 border border-slate-200 rounded-lg transition-all">
                            <div className="flex flex-wrap gap-2 mb-2">
                                {skills.map((s, i) => (
                                    <span key={i} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-bold bg-blue-100 text-blue-700 border border-blue-200">
                                        {s}
                                        <button type="button" onClick={() => removeSkill(s)} className="text-blue-500 hover:text-blue-800 transition-colors">
                                            <X size={12} />
                                        </button>
                                    </span>
                                ))}
                            </div>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={skillInput}
                                    onChange={e => setSkillInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' ? addSkill(e) : null}
                                    className="flex-1 bg-transparent border-none text-sm focus:outline-none font-medium placeholder-slate-400"
                                    placeholder="Type a skill and press Enter"
                                />
                                <button type="button" onClick={addSkill} className="text-xs font-bold text-blue-600 hover:text-blue-800 px-2 uppercase tracking-wide">Add</button>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Upload Resume (PDF, Word)
                            </label>
                            <input
                                type="file"
                                onChange={handleFileChange}
                                accept=".pdf,.docx"
                                className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm file:mr-4 file:py-0.5 file:pl-0.5 file:pr-2 file:rounded-md file:border-0 file:text-xs file:font-normal file:bg-gray-200 file:text-black hover:file:bg-gray-300 shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] transition-all"
                            />
                            {formData.resume_file && (
                                <p className="text-xs text-emerald-600 mt-1 font-bold italic">✓ {formData.resume_file.name}</p>
                            )}
                        </div>
                    </div>

                    <div className="space-y-1.5">
                        <label className="text-[12px] font-semibold text-slate-700 block">
                            Internal Notes
                        </label>
                        <textarea
                            value={formData.internal_notes}
                            onChange={(e) => setFormData({ ...formData, internal_notes: e.target.value })}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] resize-none"
                            placeholder="Enter any internal notes about this candidate"
                            rows="4"
                        />
                    </div>
                </form>
            </div>
        </>
    );
};

export default AddAtsCandidate;

