import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const SparklesIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-[18px] h-[18px] text-purple-600 hover:text-purple-700 transition-transform hover:scale-110 cursor-pointer drop-shadow-sm">
    <path fillRule="evenodd" d="M9 4.5a.75.75 0 01.721.544l.813 2.846a3.75 3.75 0 002.576 2.576l2.846.813a.75.75 0 010 1.442l-2.846.813a3.75 3.75 0 00-2.576 2.576l-.813 2.846a.75.75 0 01-1.442 0l-.813-2.846a3.75 3.75 0 00-2.576-2.576l-2.846-.813a.75.75 0 010-1.442l2.846-.813A3.75 3.75 0 007.466 7.89l.813-2.846A.75.75 0 019 4.5zM18 1.5a.75.75 0 01.728.568l.258 1.036c.236.94.97 1.674 1.91 1.91l1.036.258a.75.75 0 010 1.456l-1.036.258c-.94.236-1.674.97-1.91 1.91l-.258 1.036a.75.75 0 01-1.456 0l-.258-1.036a2.625 2.625 0 00-1.91-1.91l-1.036-.258a.75.75 0 010-1.456l1.036-.258a2.625 2.625 0 001.91-1.91l.258-1.036A.75.75 0 0118 1.5zM16.5 15a.75.75 0 01.712.513l.394 1.183c.15.447.5.799.948.948l1.183.395a.75.75 0 010 1.422l-1.183.395c-.447.15-.799.5-.948.948l-.395 1.183a.75.75 0 01-1.422 0l-.395-1.183a1.5 1.5 0 00-.948-.948l-1.183-.395a.75.75 0 010-1.422l1.183-.395c.447-.15.799-.5.948-.948l.395-1.183A.75.75 0 0116.5 15z" clipRule="evenodd" />
  </svg>
)

const FieldWrapper = ({ label, required, fieldKey, children, actionNode, error, actionPosition = 'center-right', showVendorMode, showToVendor, toggleShowToVendor }) => {
    const isVendorVisible = showToVendor && fieldKey ? showToVendor[fieldKey] : false;
    return (
        <div className="flex flex-col gap-1.5 overflow-hidden">
            <div className="flex items-center gap-2">
                <label className="text-[12px] font-semibold text-slate-700 truncate">
                    {label} {required && <span className="text-red-500">*</span>}
                </label>
                {showVendorMode && (
                    <button
                        type="button"
                        onClick={() => toggleShowToVendor(fieldKey)}
                        title={isVendorVisible ? "Visible to Vendor" : "Hidden from Vendor"}
                        className={`p-0.5 rounded transition-colors ${isVendorVisible ? 'text-blue-500 hover:bg-blue-50' : 'text-slate-300 hover:text-slate-500 hover:bg-slate-50'}`}
                    >
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            {isVendorVisible ? (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                            ) : (
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                            )}
                        </svg>
                    </button>
                )}
            </div>
            <div className="relative">
                {children}
                {actionNode && (
                    <div className={`absolute z-10 ${actionPosition === 'bottom-right' ? 'bottom-3 right-3' : 'top-1/2 -translate-y-1/2 right-3'}`}>
                        {actionNode}
                    </div>
                )}
            </div>
            {error && <span className="text-[11px] font-semibold text-red-500 mt-0.5">{error}</span>}
        </div>
    );
};

const JobCreate = () => {
    const navigate = useNavigate();
    const [form, setForm] = useState({
        status: 'Active',
        client: '',
        noOfPositions: 1,
        offeredCtc: '',
        jobTitle: '',
        jobRole: '',
        experienceRequired: '',
        workLocation: '',
        salaryRange: '',
        jobType: 'Full-time',
        skillsRequired: [],
        optionalSkills: [],
        jobDescription: '',
        priorityLevel: '',
        managerDetails: '',
        spocName: '',
        spocEmail: '',
        spocPhone: '',
        applicationDeadline: '',
    });
    
    const [headerNode, setHeaderNode] = useState(null);

    useEffect(() => {
        setHeaderNode(document.getElementById('header-actions'));
    }, []);

    const [loading, setLoading] = useState(false);
    const [selectedVendors, setSelectedVendors] = useState([]);
    const [showToVendor, setShowToVendor] = useState({});
    const [showVendorMode, setShowVendorMode] = useState(false);
    const [clients, setClients] = useState([]);
    const [users, setUsers] = useState([]);

    useEffect(() => {
        const fetchClients = async () => {
            try {
                const res = await axios.get('/admins/jobs/clients');
                if (res.data.success) {
                    setClients(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch clients:', err);
            }
        };
        const fetchUsers = async () => {
            try {
                const orgId = localStorage.getItem('organizationId');
                if (!orgId) return;
                const res = await axios.get(`/admins/organizations/${orgId}/users`);
                if (res.data.success) {
                    setUsers(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch users:', err);
            }
        };
        fetchClients();
        fetchUsers();
    }, []);

    const [errors, setErrors] = useState({});

    const [generatingSkills, setGeneratingSkills] = useState(false);
    const [generatingJD, setGeneratingJD] = useState(false);
    const jdRef = useRef(null);

    // Auto-scroll JD textarea while generating
    useEffect(() => {
        if (generatingJD && jdRef.current) {
            jdRef.current.scrollTop = jdRef.current.scrollHeight;
        }
    }, [form.jobDescription, generatingJD]);
    
    const [skillInput, setSkillInput] = useState('');
    const [optionalSkillInput, setOptionalSkillInput] = useState('');

    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && form.skillsRequired.length < 25 && !form.skillsRequired.includes(trimmed)) {
            setForm(prev => ({ ...prev, skillsRequired: [...prev.skillsRequired, trimmed] }));
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (index) => {
        setForm(prev => ({ ...prev, skillsRequired: prev.skillsRequired.filter((_, i) => i !== index) }));
    };

    const handleAddOptionalSkill = () => {
        const trimmed = optionalSkillInput.trim();
        if (trimmed && form.optionalSkills.length < 25 && !form.optionalSkills.includes(trimmed)) {
            setForm(prev => ({ ...prev, optionalSkills: [...prev.optionalSkills, trimmed] }));
            setOptionalSkillInput('');
        }
    };

    const handleRemoveOptionalSkill = (index) => {
        setForm(prev => ({ ...prev, optionalSkills: prev.optionalSkills.filter((_, i) => i !== index) }));
    };

    const handleGenerateSkills = async () => {
        const newErrs = {};
        if (!form.jobTitle) newErrs.jobTitle = 'Job Title is required for AI generation.';
        if (!form.jobRole) newErrs.jobRole = 'Job Role is required for AI generation.';
        if (!form.experienceRequired) newErrs.experienceRequired = 'Experience is required for AI generation.';
        
        if (Object.keys(newErrs).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrs }));
            return;
        }
        
        let minEx = 0, maxEx = 3;
        const exMatch = form.experienceRequired.match(/(\d+)\s*-\s*(\d+)/);
        if (exMatch) {
            minEx = parseInt(exMatch[1]);
            maxEx = parseInt(exMatch[2]);
        } else {
            const singleMatch = form.experienceRequired.match(/(\d+)/);
            if (singleMatch) {
                minEx = parseInt(singleMatch[1]);
                maxEx = minEx + 3;
            }
        }

        setGeneratingSkills(true);
        try {
            const aiUrl = import.meta.env.VITE_AI_SERVICE_URL;
            const res = await axios.post(`${aiUrl}/ai/generate-skills`, {
                jobTitle: form.jobTitle,
                domain: form.jobRole || '',
                minExperience: minEx,
                maxExperience: maxEx
            });
            const text = res.data || '';
            const parts = text.split(",,");
            const mandatory = parts[0] ? parts[0] : '';
            const optional = parts[1] ? parts[1] : '';
            setForm(prev => ({
                ...prev,
                skillsRequired: mandatory.split(',').map(s=>s.trim()).filter(Boolean),
                optionalSkills: optional.split(',').map(s=>s.trim()).filter(Boolean)
            }));
            toast.success('Skills generated automatically!');
        } catch (error) {
            console.error('Skill generation failed:', error);
            toast.error('Failed to generate skills from AI');
        } finally {
            setGeneratingSkills(false);
        }
    };

    const handleGenerateJD = () => {
        const newErrs = {};
        if (!form.jobTitle) newErrs.jobTitle = 'Job Title is required for AI generation.';
        if (!form.jobRole) newErrs.jobRole = 'Job Role is required for AI generation.';
        if (!form.experienceRequired) newErrs.experienceRequired = 'Experience is required for AI generation.';
        if (!form.skillsRequired || form.skillsRequired.length === 0) newErrs.skillsRequired = 'Skills Required is needed for JD generation.';
        
        if (Object.keys(newErrs).length > 0) {
            setErrors(prev => ({ ...prev, ...newErrs }));
            return;
        }

        let minEx = 0, maxEx = 3;
        const exMatch = form.experienceRequired.match(/(\d+)\s*-\s*(\d+)/);
        if (exMatch) {
            minEx = parseInt(exMatch[1]);
            maxEx = parseInt(exMatch[2]);
        } else {
            const singleMatch = form.experienceRequired.match(/(\d+)/);
            if (singleMatch) {
                minEx = parseInt(singleMatch[1]);
                maxEx = minEx + 3;
            }
        }

        setGeneratingJD(true);
        setForm(prev => ({ ...prev, jobDescription: '' }));
        
        const aiUrl = import.meta.env.VITE_AI_SERVICE_URL;
        const wsUrl = aiUrl.replace('http', 'ws') + '/ai/ws/generate-job-description';
        const ws = new WebSocket(wsUrl);
        
        ws.onopen = () => {
            ws.send(JSON.stringify({
                position: form.jobTitle,
                domain: form.jobRole || '',
                minExperience: minEx,
                maxExperience: maxEx,
                manSkills: form.skillsRequired,
                optSkills: form.optionalSkills,
                jobType: form.jobType || '',
                location: form.workLocation || ''
            }));
        };
        
        ws.onmessage = (event) => {
            if (event.data === '[DONE]') {
                ws.close();
                return;
            }
            if (event.data.startsWith('\\n[Error:')) {
                toast.error('JD generation encountered an error.');
                ws.close();
                return;
            }
            setForm(prev => ({ ...prev, jobDescription: prev.jobDescription + event.data }));
        };
        
        ws.onclose = () => {
            setGeneratingJD(false);
        };
        ws.onerror = (e) => {
            console.error('WebSocket Error for JD Stream:', e);
            ws.close();
        };
    };

    const vendors = [
        { id: 1, company: 'Tech Solutions Inc', contact: 'John Smith' },
        { id: 2, company: 'Global Innovations Ltd', contact: 'Sarah Johnson' },
        { id: 3, company: 'Digital Dynamics Corp', contact: 'Michael Chen' },
        { id: 4, company: 'Cloud Services Group', contact: 'Emily Davis' },
        { id: 5, company: 'Enterprise Solutions LLC', contact: 'David Wilson' },
        { id: 6, company: 'NextGen Technologies', contact: 'Lisa Anderson' },
    ];


    const handleChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
        if (errors[field]) {
            setErrors(prev => {
                const newErrs = { ...prev };
                delete newErrs[field];
                return newErrs;
            });
        }
    };

    const toggleVendor = (id) => {
        setSelectedVendors(prev =>
            prev.includes(id) ? prev.filter(v => v !== id) : [...prev, id]
        );
    };


    const toggleShowToVendor = (field) => {
        setShowToVendor(prev => ({ ...prev, [field]: !prev[field] }));
    };


    const convertJDToPDF = (text) => {
        const doc = new jsPDF();
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(16);
        doc.text(form.jobTitle || 'Job Description', 20, 20);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(11);
        const margin = 20;
        const pageWidth = doc.internal.pageSize.getWidth();
        const usableWidth = pageWidth - 2 * margin;
        const lines = doc.splitTextToSize(text || '', usableWidth);
        let y = 30;
        const lineHeight = 6;
        lines.forEach((line) => {
            if (y + lineHeight > doc.internal.pageSize.getHeight() - margin) {
                doc.addPage();
                y = margin;
            }
            doc.text(line, margin, y);
            y += lineHeight;
        });
        return doc.output('blob');
    };

    const handleSubmit = async (e) => {
        if (e) e.preventDefault();
        
        // Basic validation
        const requiredFields = [
            'jobTitle', 'noOfPositions', 
            'client', 'priorityLevel', 'workLocation', 
            'jobType', 'skillsRequired', 'jobDescription', 'applicationDeadline'
        ];

        for (const field of requiredFields) {
            if (!form[field]) {
                toast.error(`${field.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())} is required`);
                return;
            }
        }


        setLoading(true);
        try {
            const formData = new FormData();
            
            // Map form fields to backend expectations
            // Backend expects clientId instead of client (assuming client is name/id)
            formData.append('jobTitle', form.jobTitle);
            formData.append('jobRole', form.jobRole);
            formData.append('jobDescription', form.jobDescription);
            formData.append('clientId', form.client);
            formData.append('priorityLevel', form.priorityLevel.toUpperCase());
            formData.append('noOfPositions', form.noOfPositions);
            formData.append('offeredCtc', form.offeredCtc);
            formData.append('salaryRange', form.salaryRange);
            formData.append('experienceRequired', form.experienceRequired);
            formData.append('location', form.workLocation);
            formData.append('jobType', form.jobType.toUpperCase().replace('-', '_'));
            formData.append('managerDetails', form.managerDetails);
            formData.append('spocName', form.spocName);
            formData.append('spocEmail', form.spocEmail);
            formData.append('spocPhone', form.spocPhone);
            formData.append('applicationDeadline', form.applicationDeadline);
            
            // Add jobDescriptionText for JSON storage
            formData.append('jobDescriptionText', form.jobDescription);
            formData.append('spocId', form.spocId || '');
            
            // Skills
            formData.append('mandatorySkills', JSON.stringify(form.skillsRequired));
            formData.append('optionalSkills', JSON.stringify(form.optionalSkills));


            // Other flags
            formData.append('showToVendor', form.visibility === 'Public' ? 1 : 0);

            const response = await axios.post('/admins/jobs', formData);
            
            if (response.data.success) {
                const positionId = response.data.data.id;
                
                // Automatically generate and upload PDF JD
                if (form.jobDescription) {
                    try {
                        const pdfBlob = convertJDToPDF(form.jobDescription);
                        const fileName = `${form.jobTitle.replace(/[^a-z0-9]/gi, '_')}_JD.pdf`;
                        const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
                        
                        const uploadData = new FormData();
                        uploadData.append('file', pdfFile);
                        uploadData.append('organizationId', localStorage.getItem('organizationId') || '');
                        
                        await axios.post(`/admins/jobs/${positionId}/job-description`, uploadData);
                        toast.success('Job created and JD PDF saved!');
                    } catch (pdfErr) {
                        console.error('PDF storage failed:', pdfErr);
                        toast.error('Job created but JD PDF storage failed');
                    }
                } else {
                    toast.success('Job created successfully!');
                }
                
                navigate('/jobs');
            }
        } catch (error) {
            console.error('[JobCreate] Submit error:', error);
            const msg = error.response?.data?.message || 'Failed to post job';
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    const inputClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] transition-all";
    const selectClass = "w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] transition-all bg-white bg-[url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A%2F%2Fwww.w3.org%2F2000%2Fsvg%22%20width%3D%2224%22%20height%3D%2224%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2364748b%22%20stroke-width%3D%222%22%20stroke-linecap%3D%22round%22%20stroke-linejoin%3D%22round%22%3E%3Cpolyline%20points%3D%226%209%2012%2015%2018%209%22%3E%3C%2Fpolyline%3E%3C%2Fsvg%3E')] bg-no-repeat bg-[position:right_1rem_center] bg-[length:1em] pr-10";
    const sectionCardClass = "rounded-2xl border border-slate-100 bg-white p-8 shadow-[0_1px_4px_rgba(0,0,0,0.1)] mb-8";

    return (
        <div className="space-y-6">
            {headerNode && createPortal(
                <div className="flex items-center gap-3">
                    <button type="button" className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                        Save as Draft
                    </button>
                    <button
                        type="button"
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? 'Posting...' : 'Post Job'}
                    </button>
                </div>,
                headerNode
            )}

            <div className={`space-y-10 ${sectionCardClass}`}>
                {/* Section: Job Details */}
                <div>
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50">
                        <h2 className="text-sm font-bold text-slate-800">Job Details</h2>
                        <div className="flex items-center gap-2">
                            <span className="text-[12px] font-semibold text-slate-800">Show to Vendor</span>
                            <button
                                type="button"
                                onClick={() => setShowVendorMode(prev => !prev)}
                                className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors duration-200 focus:outline-none ${showVendorMode ? 'bg-blue-600' : 'bg-slate-200'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-sm transition-transform duration-200 ${showVendorMode ? 'translate-x-4' : 'translate-x-0.5'}`} />
                            </button>
                        </div>
                    </div>
                    <div className="space-y-6">
                        <div>
                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Job Title" required fieldKey="jobTitle" error={errors.jobTitle}>
                                <input type="text" className={inputClass} placeholder="e.g., Senior Full Stack Developer" value={form.jobTitle} onChange={e => handleChange('jobTitle', e.target.value)} />
                            </FieldWrapper>
                        </div>

                        {/* Row 2: Job Role, Experience */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Job Role" required fieldKey="jobRole" error={errors.jobRole}>
                                <select className={selectClass} value={form.jobRole} onChange={e => handleChange('jobRole', e.target.value)}>
                                    <option value="">Select job role</option>
                                    <option value="IT">IT</option>
                                    <option value="NON IT">NON IT</option>
                                </select>
                            </FieldWrapper>

                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Experience Required" required fieldKey="experienceRequired" error={errors.experienceRequired}>
                                <input type="text" className={inputClass} placeholder="e.g., 3-5 years" value={form.experienceRequired} onChange={e => handleChange('experienceRequired', e.target.value)} />
                            </FieldWrapper>
                        </div>

                        {/* Row 3: Location, Salary Range, Job Type */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-x-8 gap-y-6">
                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Location" required fieldKey="workLocation">
                                <input type="text" className={inputClass} placeholder="e.g., San Francisco, CA or Remote" value={form.workLocation} onChange={e => handleChange('workLocation', e.target.value)} />
                            </FieldWrapper>

                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Salary Range" required fieldKey="salaryRange">
                                <input type="text" className={inputClass} placeholder="e.g., ₹10 Lacs - ₹15 Lacs" value={form.salaryRange} onChange={e => handleChange('salaryRange', e.target.value)} />
                            </FieldWrapper>

                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Job Type" required fieldKey="jobType">
                                <select className={selectClass} value={form.jobType} onChange={e => handleChange('jobType', e.target.value)}>
                                    <option value="Full-time">Full-time</option>
                                    <option value="Part-time">Part-time</option>
                                    <option value="Contract">Contract</option>
                                    <option value="Internship">Internship</option>
                                </select>
                            </FieldWrapper>
                        </div>

                        {/* Row 4: Skills Requirement */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-6">
                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} 
                                label="Skills Required" 
                                required 
                                fieldKey="skillsRequired"
                                error={errors.skillsRequired}
                                actionPosition="center-right"
                                actionNode={
                                    <button type="button" onClick={handleGenerateSkills} disabled={generatingSkills} title="Generate Skills with AI" className="p-1 rounded-md bg-purple-50 text-purple-600 transition-all hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-purple-200">
                                        {generatingSkills ? (
                                            <svg className="animate-spin h-4 w-4 text-purple-600 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                        ) : <SparklesIcon />}
                                    </button>
                                }
                            >
                                <div className="w-full min-h-[44px] px-2 py-2 pr-12 border border-slate-300 rounded-lg focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] transition-all">
                                    <div className="flex flex-wrap gap-1 mb-1 w-full">
                                        {form.skillsRequired.map((skill, idx) => (
                                            <div key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded w-fit max-w-full min-w-0">
                                                <span className="text-[13px] font-medium text-slate-700 truncate">{skill}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveSkill(idx)}
                                                    className="text-slate-500 hover:text-slate-800 text-[12px] font-bold leading-none shrink-0"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={form.skillsRequired.length === 0 ? "e.g., React, Node.js (press Enter)" : "Type & press Enter"}
                                        value={skillInput}
                                        onChange={(e) => setSkillInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                        className="w-full text-[13px] py-0.5 border-0 bg-transparent focus:outline-none focus:ring-0 placeholder:text-slate-400"
                                    />
                                </div>
                            </FieldWrapper>

                            <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Optional Skills" fieldKey="optionalSkills">
                                <div className="w-full min-h-[44px] px-2 py-2 border border-slate-300 rounded-lg focus-within:ring-1 focus-within:ring-blue-500 focus-within:border-blue-500 bg-white shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] transition-all">
                                    <div className="flex flex-wrap gap-1 mb-1 w-full">
                                        {form.optionalSkills.map((skill, idx) => (
                                            <div key={idx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 border border-slate-300 rounded w-fit max-w-full min-w-0">
                                                <span className="text-[13px] font-medium text-slate-700 truncate">{skill}</span>
                                                <button
                                                    type="button"
                                                    onClick={() => handleRemoveOptionalSkill(idx)}
                                                    className="text-slate-500 hover:text-slate-800 text-[12px] font-bold leading-none shrink-0"
                                                >
                                                    ×
                                                </button>
                                            </div>
                                        ))}
                                    </div>
                                    <input
                                        type="text"
                                        placeholder={form.optionalSkills.length === 0 ? "e.g., Docker, CI/CD (press Enter)" : "Type & press Enter"}
                                        value={optionalSkillInput}
                                        onChange={(e) => setOptionalSkillInput(e.target.value)}
                                        onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOptionalSkill())}
                                        className="w-full text-[13px] py-0.5 border-0 bg-transparent focus:outline-none focus:ring-0 placeholder:text-slate-400"
                                    />
                                </div>
                            </FieldWrapper>
                        </div>
                    </div>

                    <div className="mt-8">
                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} 
                            label="Job Description" 
                            required 
                            fieldKey="jobDescription"
                            actionPosition="bottom-right"
                            actionNode={
                                <button type="button" onClick={handleGenerateJD} disabled={generatingJD} title="Generate JD with AI" className="p-1.5 rounded-md bg-purple-50 text-purple-600 transition-all hover:bg-purple-100 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm border border-purple-200">
                                    {generatingJD ? (
                                        <svg className="animate-spin h-4 w-4 text-purple-600 pointer-events-none" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                                    ) : <SparklesIcon />}
                                </button>
                            }
                        >
                            <textarea
                                ref={jdRef}
                                className={`${inputClass} min-h-[160px] resize-y py-3 pb-12`}
                                placeholder="Describe the role, responsibilities, and what you're looking for..."
                                value={form.jobDescription}
                                onChange={e => handleChange('jobDescription', e.target.value)}
                                rows={6}
                            />
                        </FieldWrapper>
                    </div>
                </div>

                {/* Section: Requirement Details */}
                <div>
                    <div className="flex items-center justify-between mb-6 pb-2 border-b border-slate-50">
                        <h2 className="text-sm font-bold text-slate-800">Requirement Details</h2>
                        
                        {/* Visibility Toggle in Header */}
                        <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mr-2">Visibility:</span>
                            {['Private', 'Public'].map(v => (
                                <label key={v} className="flex items-center gap-1.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="visibility"
                                        value={v}
                                        checked={(form.visibility || 'Private') === v}
                                        onChange={() => handleChange('visibility', v)}
                                        className="accent-blue-600 h-3 w-3"
                                    />
                                    <span className={`text-[12px] font-bold transition-colors ${(form.visibility || 'Private') === v ? 'text-blue-600' : 'text-slate-800'}`}>{v}</span>
                                </label>
                            ))}
                        </div>

                        {/* Status Toggle in Header */}
                        <div className="flex items-center gap-4 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100 ml-4">
                            <span className="text-[11px] font-bold text-slate-800 uppercase tracking-wider mr-2">Status:</span>
                            {['Active', 'Inactive', 'Hold'].map(s => (
                                <label key={s} className="flex items-center gap-1.5 cursor-pointer group">
                                    <input
                                        type="radio"
                                        name="status"
                                        value={s}
                                        checked={form.status === s}
                                        onChange={() => handleChange('status', s)}
                                        className="accent-blue-600 h-3 w-3"
                                    />
                                    <span className={`text-[12px] font-bold transition-colors ${form.status === s ? 'text-blue-600' : 'text-slate-800'}`}>{s}</span>
                                </label>
                            ))}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-6">
                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Client" required fieldKey="client">
                            <select className={selectClass} value={form.client} onChange={e => handleChange('client', e.target.value)}>
                                <option value="">Select client</option>
                                {clients.map(c => (
                                    <option key={c.id} value={c.id}>{c.name}</option>
                                ))}
                            </select>
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="No. of Positions" required fieldKey="noOfPositions">
                            <input type="number" min="1" className={inputClass} value={form.noOfPositions} onChange={e => handleChange('noOfPositions', e.target.value)} />
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Offered CTC" required fieldKey="offeredCtc">
                            <input type="text" className={inputClass} placeholder="e.g., 10 (in Lacs)" value={form.offeredCtc} onChange={e => handleChange('offeredCtc', e.target.value)} />
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Priority Level" required fieldKey="priorityLevel">
                            <select className={selectClass} value={form.priorityLevel} onChange={e => handleChange('priorityLevel', e.target.value)}>
                                <option value="">Select priority</option>
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Manager Details" fieldKey="managerDetails">
                            <input type="text" className={inputClass} placeholder="Enter manager details" value={form.managerDetails} onChange={e => handleChange('managerDetails', e.target.value)} />
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="SPOC Name" fieldKey="spocName">
                            <select 
                                className={selectClass} 
                                value={users.find(u => `${u.first_name || ''} ${u.last_name || ''}`.trim() === form.spocName)?.id || ''} 
                                onChange={e => {
                                    const selected = users.find(u => u.id === e.target.value);
                                    if (selected) {
                                        setForm(prev => ({
                                            ...prev,
                                            spocId: selected.id,
                                            spocName: `${selected.first_name || ''} ${selected.last_name || ''}`.trim(),
                                            spocEmail: selected.email || '',
                                            spocPhone: selected.phone_number || ''
                                        }));
                                    } else {
                                        setForm(prev => ({
                                            ...prev,
                                            spocId: '',
                                            spocName: '',
                                            spocEmail: '',
                                            spocPhone: ''
                                        }));
                                    }
                                }}
                            >
                                <option value="">Select SPOC</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{`${u.first_name || ''} ${u.last_name || ''}`.trim() || u.email}</option>
                                ))}
                            </select>
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="SPOC Email ID" fieldKey="spocEmail">
                            <input type="email" className={inputClass} placeholder="spoc@example.com" value={form.spocEmail} onChange={e => handleChange('spocEmail', e.target.value)} />
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="SPOC Phone Number" fieldKey="spocPhone">
                            <input type="text" className={inputClass} placeholder="Enter phone number" value={form.spocPhone} onChange={e => handleChange('spocPhone', e.target.value)} />
                        </FieldWrapper>

                        <FieldWrapper showVendorMode={showVendorMode} showToVendor={showToVendor} toggleShowToVendor={toggleShowToVendor} label="Application Deadline" required fieldKey="applicationDeadline">
                            <input type="date" className={inputClass} value={form.applicationDeadline} onChange={e => handleChange('applicationDeadline', e.target.value)} />
                        </FieldWrapper>
                    </div>
                </div>


                {/* Section: Select Vendors */}
                {showVendorMode && (
                    <div>
                        <h2 className="text-sm font-bold text-slate-800 mb-6 pb-2 border-b border-slate-50">Select Preferred Vendors</h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {vendors.map(v => (
                                <label
                                    key={v.id}
                                    className={`flex items-center gap-3 rounded-xl border p-4 cursor-pointer transition-all ${selectedVendors.includes(v.id) ? 'border-blue-400 bg-blue-50 shadow-sm' : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50/50'}`}
                                >
                                    <input
                                        type="checkbox"
                                        checked={selectedVendors.includes(v.id)}
                                        onChange={() => toggleVendor(v.id)}
                                        className="accent-blue-600 h-4 w-4 rounded"
                                    />
                                    <div className="overflow-hidden">
                                        <p className="text-xs font-bold text-slate-700 truncate">{v.company}</p>
                                        <p className="text-[10px] text-slate-400 font-medium truncate">Contact: {v.contact}</p>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>
                )}



            </div>
        </div>
    );
};

export default JobCreate;
