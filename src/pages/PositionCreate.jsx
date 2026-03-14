import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios, { gatewayApi } from '../config/axios';
import { toast } from 'react-hot-toast';
import { jsPDF } from 'jspdf';

const PositionCreate = () => {
    const navigate = useNavigate();
    const [searchParams] = useSearchParams();
    const positionId = searchParams.get('id');
    const { user } = useSelector(state => state.auth);
    const [loading, setLoading] = useState(false);
    const [jdFile, setJdFile] = useState(null);
    const [position, setPosition] = useState(null);
    const [isAISkillsLoading, setIsAISkillsLoading] = useState(false);
    const [isJDLoading, setIsJDLoading] = useState(false);
    const [showJDSidebar, setShowJDSidebar] = useState(false);
    const [jdPanelData, setJdPanelData] = useState(null);
    const [isEditingJD, setIsEditingJD] = useState(false);
    const [form, setForm] = useState({
        jobTitle: '',
        domain: '',
        experienceFrom: 0,
        experienceTo: 0,
        noOfPositions: 1,
        validTill: '',
        mandatorySkills: [],
        optionalSkills: [],
        jobDescription: '',
        useCustomJD: false,
        generateAISkills: false,
    });

    React.useEffect(() => {
        if (positionId) {
            fetchPositionDetails();
        }
    }, [positionId]);

    const fetchPositionDetails = async () => {
        try {
            setLoading(true);
            const response = await axios.get(`/admins/positions/${positionId}`);
            if (response.data && response.data.data) {
                const data = response.data.data;
                setPosition(data);
                setForm({
                    jobTitle: data.title || '',
                    domain: data.domainType || '',
                    experienceFrom: data.minimumExperience || 0,
                    experienceTo: data.maximumExperience || 0,
                    noOfPositions: data.noOfPositions || 1,
                    validTill: data.applicationDeadline ? data.applicationDeadline.split('T')[0] : '',
                    mandatorySkills: Array.isArray(data.mandatorySkills) ? data.mandatorySkills : JSON.parse(data.mandatorySkills || '[]'),
                    optionalSkills: Array.isArray(data.optionalSkills) ? data.optionalSkills : JSON.parse(data.optionalSkills || '[]'),
                    jobDescription: data.jobDescriptionText || '',
                    useCustomJD: !!data.jobDescriptionText,
                    generateAISkills: false
                });
            }
        } catch (err) {
            console.error('Error fetching position details:', err);
            toast.error('Failed to load position details');
        } finally {
            setLoading(false);
        }
    };

    const handleViewCurrentJd = async () => {
        if (!positionId || !position?.jobDescriptionDocumentPath) return;
        try {
            const res = await axios.get(`/admins/positions/${positionId}/job-description`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            window.open(url, '_blank');
            setTimeout(() => URL.revokeObjectURL(url), 60000);
        } catch (e) {
            toast.error('Failed to load document');
        }
    };

    const handleDownloadCurrentJd = async () => {
        if (!positionId || !position?.jobDescriptionDocumentFileName) return;
        try {
            const res = await axios.get(`/admins/positions/${positionId}/job-description`, { responseType: 'blob' });
            const url = URL.createObjectURL(res.data);
            const a = document.createElement('a');
            a.href = url;
            a.download = position.jobDescriptionDocumentFileName || 'job-description.pdf';
            a.click();
            URL.revokeObjectURL(url);
        } catch (e) {
            toast.error('Failed to download document');
        }
    };
    const [skillInput, setSkillInput] = useState('');
    const [optionalSkillInput, setOptionalSkillInput] = useState('');

    const domains = [
        'IT',
        'NON-IT'
    ];

    const handleInputChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleAddSkill = () => {
        const trimmed = skillInput.trim();
        if (trimmed && form.mandatorySkills.length < 10 && !form.mandatorySkills.includes(trimmed)) {
            setForm(prev => ({
                ...prev,
                mandatorySkills: [...prev.mandatorySkills, trimmed]
            }));
            setSkillInput('');
        }
    };

    const handleRemoveSkill = (index) => {
        setForm(prev => ({
            ...prev,
            mandatorySkills: prev.mandatorySkills.filter((_, i) => i !== index)
        }));
    };

    const handleAddOptionalSkill = () => {
        const trimmed = optionalSkillInput.trim();
        if (trimmed && form.optionalSkills.length < 10 && !form.optionalSkills.includes(trimmed)) {
            setForm(prev => ({
                ...prev,
                optionalSkills: [...prev.optionalSkills, trimmed]
            }));
            setOptionalSkillInput('');
        }
    };

    const handleRemoveOptionalSkill = (index) => {
        setForm(prev => ({
            ...prev,
            optionalSkills: prev.optionalSkills.filter((_, i) => i !== index)
        }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (file && ['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'].includes(file.type)) {
            setJdFile(file);
        }
    };

    const handleGenerateAISkills = async () => {
        const { jobTitle, domain, experienceFrom, experienceTo } = form;
        if (!jobTitle || !jobTitle.trim()) {
            toast.error('Please enter Job Title before generating AI skills.');
            return;
        }
        if (!domain || !domain.trim()) {
            toast.error('Please select Domain before generating AI skills.');
            return;
        }
        if (experienceFrom === '' || experienceFrom == null) {
            toast.error('Please enter Experience From (years) before generating AI skills.');
            return;
        }
        if (experienceTo === '' || experienceTo == null) {
            toast.error('Please enter Experience To (years) before generating AI skills.');
            return;
        }
        setIsAISkillsLoading(true);
        try {
            const payload = {
                jobTitle: jobTitle.trim(),
                domain: domain.trim(),
                minExperience: parseInt(experienceFrom, 10) || 0,
                maxExperience: parseInt(experienceTo, 10) || 0,
            };
            const response = await gatewayApi.post('/ai/generate-skills', payload, {
                headers: { Accept: 'text/plain' },
                responseType: 'text',
            });
            const raw = response.data;
            let manSkills = [];
            let optSkills = [];
            if (typeof raw === 'object' && (raw.manSkills || raw.optSkills)) {
                manSkills = raw.manSkills || [];
                optSkills = raw.optSkills || [];
            } else if (typeof raw === 'string') {
                const parts = raw.split(',,');
                const mandatoryStr = parts[0] || '';
                const optionalStr = parts[1] || '';
                manSkills = mandatoryStr.split(',').map(s => s.trim()).filter(Boolean);
                optSkills = optionalStr.split(',').map(s => s.trim()).filter(Boolean);
            }
            setForm(prev => ({
                ...prev,
                mandatorySkills: manSkills,
                optionalSkills: optSkills,
            }));
            toast.success(`Generated ${manSkills.length} mandatory and ${optSkills.length} optional skills.`);
        } catch (err) {
            console.error('AI skills generation failed:', err);
            const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
            toast.error(msg || 'Failed to generate AI skills.');
        } finally {
            setIsAISkillsLoading(false);
        }
    };

    const handleGenerateJD = async (regenerate = false) => {
        const { jobTitle, domain, experienceFrom, experienceTo, mandatorySkills, optionalSkills } = form;
        if (!jobTitle || !jobTitle.trim()) {
            toast.error('Please enter Job Title before generating JD.');
            return;
        }
        if (!domain || !domain.trim()) {
            toast.error('Please select Domain before generating JD.');
            return;
        }
        if (experienceFrom === '' || experienceFrom == null) {
            toast.error('Please enter Experience From before generating JD.');
            return;
        }
        if (experienceTo === '' || experienceTo == null) {
            toast.error('Please enter Experience To before generating JD.');
            return;
        }
        if (!mandatorySkills || mandatorySkills.length < 1) {
            toast.error('Please add at least one mandatory skill (or generate AI skills) before generating JD.');
            return;
        }
        if (jdPanelData && !regenerate) {
            setShowJDSidebar(true);
            setIsEditingJD(false);
            return;
        }
        setIsJDLoading(true);
        setShowJDSidebar(true);
        setIsEditingJD(false);
        try {
            const payload = {
                position: jobTitle.trim(),
                minExperience: parseInt(experienceFrom, 10) || 0,
                maxExperience: parseInt(experienceTo, 10) || 0,
                manSkills: mandatorySkills,
                optSkills: optionalSkills || [],
            };
            const response = await gatewayApi.post('/ai/generate-job-description', payload);
            const data = response.data?.jobDescription ?? response.data?.data ?? response.data?.description ?? response.data;
            setJdPanelData(typeof data === 'string' ? data : (data ? JSON.stringify(data, null, 2) : ''));
        } catch (err) {
            console.error('JD generation failed:', err);
            setJdPanelData(null);
            const msg = err.response?.data?.message || err.response?.data?.detail || err.message;
            toast.error(msg || 'Failed to generate JD.');
        } finally {
            setIsJDLoading(false);
        }
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

    const handleUseThisJDAsPDF = () => {
        const content = typeof jdPanelData === 'string' ? jdPanelData : (jdPanelData ? JSON.stringify(jdPanelData, null, 2) : '');
        if (!content) {
            toast.error('No JD content to use.');
            return;
        }
        const blob = convertJDToPDF(content);
        const fileName = `${(form.jobTitle || 'JD').replace(/[^a-zA-Z0-9]/g, '_').substring(0, 30)}_JD.pdf`;
        const file = new File([blob], fileName, { type: 'application/pdf' });
        setJdFile(file);
        setShowJDSidebar(false);
        toast.success('Generated JD set as Job Description file. You can submit the form.');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.jobTitle) {
            toast.error('Please enter a Job Title');
            return;
        }
        if (!form.domain) {
            toast.error('Please select a Domain');
            return;
        }
        if (form.mandatorySkills.length < 2) {
            toast.error('Minimum 2 mandatory skills required');
            return;
        }

        setLoading(true);
        try {
            const payload = {
                title: form.jobTitle,
                domainType: form.domain,
                minimumExperience: form.experienceFrom,
                maximumExperience: form.experienceTo,
                noOfPositions: form.noOfPositions,
                mandatorySkills: form.mandatorySkills,
                optionalSkills: form.optionalSkills,
                jobDescriptionFileName: jdFile?.name || null,
                jobDescriptionPath: null,
                expectedStartDate: form.validTill || null,
                applicationDeadline: form.validTill || null,
                jobDescriptionText: form.useCustomJD ? form.jobDescription : null,
                createdBy: user?.id || 'SYSTEM'
            };

            if (positionId) {
                const response = await axios.put(`/admins/positions/${positionId}`, payload);
                if (response.data.success) {
                    let positionToUse = response.data.data;
                    if (jdFile) {
                        try {
                            const fd = new FormData();
                            fd.append('file', jdFile);
                            fd.append('organizationId', localStorage.getItem('organizationId') || user?.organizationId || '');
                            const token = localStorage.getItem('token');
                            const client = localStorage.getItem('client');
                            const headers = {};
                            if (token) headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
                            if (client) headers['X-Tenant-Id'] = client;
                            const uploadRes = await axios.post(`/admins/positions/${positionId}/job-description`, fd, { headers });
                            const pathData = uploadRes.data?.data;
                            if (pathData?.jobDescriptionDocumentPath) {
                                const getRes = await axios.get(`/admins/positions/${positionId}`);
                                const current = getRes.data?.data;
                                if (current) {
                                    const putPayload = {
                                        ...current,
                                        jobDescriptionDocumentPath: pathData.jobDescriptionDocumentPath,
                                        jobDescriptionDocumentFileName: pathData.jobDescriptionDocumentFileName || jdFile.name
                                    };
                                    delete putPayload.createdAt;
                                    delete putPayload.updatedAt;
                                    const putRes = await axios.put(`/admins/positions/${positionId}`, putPayload);
                                    if (putRes.data?.data) positionToUse = putRes.data.data;
                                }
                            }
                            if (pathData?.jdExtracted) {
                                toast.success(`Keywords extracted (${pathData.keywordsCount ?? 0} keywords).`);
                            }
                        } catch (e) {
                            console.warn('JD upload failed:', e?.response?.data?.message || e.message);
                            toast.error('Position saved but JD upload failed. You can upload JD from Edit.');
                        }
                    }
                    toast.success('Position updated successfully!');
                    navigate('/admins/positions/setup-interview', { state: { position: positionToUse } });
                }
            } else {
                // Ref flow: 1) POST position 2) POST JD to blob 3) PUT position with path if needed
                const response = await axios.post('/admins/positions', payload);
                if (response.data.success) {
                    let positionToUse = response.data.data;
                    if (jdFile && positionToUse?.id) {
                        try {
                            const fd = new FormData();
                            fd.append('file', jdFile);
                            fd.append('organizationId', localStorage.getItem('organizationId') || user?.organizationId || '');
                            const token = localStorage.getItem('token');
                            const client = localStorage.getItem('client');
                            const headers = {};
                            if (token) headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
                            if (client) headers['X-Tenant-Id'] = client;
                            const uploadRes = await axios.post(`/admins/positions/${positionToUse.id}/job-description`, fd, { headers });
                            const pathData = uploadRes.data?.data;
                            if (pathData?.jobDescriptionDocumentPath) {
                                const getRes = await axios.get(`/admins/positions/${positionToUse.id}`);
                                const current = getRes.data?.data;
                                if (current) {
                                    const putPayload = {
                                        ...current,
                                        jobDescriptionDocumentPath: pathData.jobDescriptionDocumentPath,
                                        jobDescriptionDocumentFileName: pathData.jobDescriptionDocumentFileName || jdFile.name
                                    };
                                    delete putPayload.createdAt;
                                    delete putPayload.updatedAt;
                                    const putRes = await axios.put(`/admins/positions/${positionToUse.id}`, putPayload);
                                    if (putRes.data?.data) positionToUse = putRes.data.data;
                                }
                            }
                            if (pathData?.jdExtracted) {
                                toast.success(`JD uploaded. Keywords extracted (${pathData.keywordsCount ?? 0} keywords).`);
                            }
                        } catch (e) {
                            console.warn('JD upload failed:', e?.response?.data?.message || e.message);
                            toast.error('Position created but JD upload failed. You can upload JD from Edit.');
                        }
                    }
                    toast.success('Position created successfully!');
                    navigate('/admins/positions/setup-interview', { state: { position: positionToUse } });
                }
            }
        } catch (error) {
            if (error.response?.status === 402) {
                // Handle credit error
                toast.error('❌ Credits Over! You have no position credits left. Please purchase more credits to create a new position.');
            } else {
                toast.error(error.response?.data?.message || 'Failed to create position');
            }
            console.error('Error:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setForm({
            jobTitle: '',
            domain: '',
            experienceFrom: 0,
            experienceTo: 0,
            noOfPositions: 1,
            mandatorySkills: [],
            optionalSkills: [],
            useCustomJD: false,
            generateAISkills: false,
        });
        setJdFile(null);
        setSkillInput('');
        setOptionalSkillInput('');
        setJdPanelData(null);
        setShowJDSidebar(false);
        setIsEditingJD(false);
    };

    return (
        <div className="space-y-0">
            {/* Top breadcrumb + action buttons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/positions')}>Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/positions')}>Position List</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-800 font-bold">{positionId ? 'Edit Position' : 'Create Position'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                    </button>
                    <button className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors">
                        Save as Draft
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        {loading ? (positionId ? 'Updating...' : 'Creating...') : (positionId ? 'Update Position' : 'Create Position & Setup Interview')}
                    </button>
                </div>
            </div>

            {/* Main form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Position Details Section */}
                <div>
                    {/* Job Title */}
                    <div className="mb-5">
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                            Job Title <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            placeholder="e.g., Software Engineer, Product Manager"
                            value={form.jobTitle}
                            onChange={(e) => handleInputChange('jobTitle', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                        />
                    </div>

                    {/* Domain, Experience From, Experience To */}
                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Domain <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.domain}
                                onChange={(e) => handleInputChange('domain', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            >
                                <option value="">Select Domain</option>
                                {domains.map(d => (
                                    <option key={d} value={d}>{d}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Experience From (Years) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.experienceFrom}
                                onChange={(e) => handleInputChange('experienceFrom', parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Experience To (Years) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="0"
                                value={form.experienceTo}
                                onChange={(e) => handleInputChange('experienceTo', parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                    </div>

                    {/* No of Positions and Valid Till */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                No of Positions <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                value={form.noOfPositions}
                                onChange={(e) => handleInputChange('noOfPositions', parseInt(e.target.value))}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Valid Till <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="date"
                                value={form.validTill}
                                onChange={(e) => handleInputChange('validTill', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                    </div>

                    {/* AI Buttons */}
                    <div className="flex gap-3 mb-5">
                        <button
                            type="button"
                            onClick={handleGenerateAISkills}
                            disabled={isAISkillsLoading}
                            className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isAISkillsLoading ? (
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                </svg>
                            )}
                            {isAISkillsLoading ? 'Generating Skills...' : 'Generate AI Skills'}
                        </button>
                        <button
                            type="button"
                            onClick={() => jdPanelData ? (setShowJDSidebar(true), setIsEditingJD(false)) : handleGenerateJD()}
                            disabled={isJDLoading}
                            className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 transition-all flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                            {isJDLoading ? (
                                <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                            ) : (
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                </svg>
                            )}
                            {isJDLoading ? 'Generating...' : jdPanelData ? 'View generated JD' : 'Generate AI JD'}
                        </button>
                        
                    </div>

                    {/* Skills Section - same row, full-width boxes; tags wrap within each box (as many per line as fit) */}
                    <div className="grid grid-cols-2 gap-6 mb-5">
                        {/* Mandatory Skills */}
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
                                Mandatory Skills (Min. 2) <span className="text-red-500">*</span>
                            </label>
                            <div
                                className="w-full min-h-[36px] px-2 py-1.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent bg-white shadow-[inset_0_0_2px_rgba(0,0,0,0.06)]"
                            >
                                <div className="flex flex-wrap gap-0.5 mb-1 w-full">
                                    {form.mandatorySkills.map((skill, idx) => (
                                        <div key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded w-fit max-w-full min-w-0">
                                            <span className="text-xs font-medium text-slate-700 truncate">{skill}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveSkill(idx)}
                                                className="text-slate-600 hover:text-slate-800 text-[10px] font-bold leading-none shrink-0"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g., Java, React, AWS... (press Enter to add)"
                                    value={skillInput}
                                    onChange={(e) => setSkillInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddSkill())}
                                    className="w-full text-[12px] py-0 border-0 focus:outline-none focus:ring-0 placeholder:text-slate-400"
                                />
                                {form.mandatorySkills.length < 2 && (
                                    <p className="text-[11px] text-orange-600 font-medium mt-0.5">Add at least 2 mandatory skills</p>
                                )}
                            </div>
                        </div>

                        {/* Optional Skills */}
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1 block">
                                Optional Skills
                            </label>
                            <div
                                className="w-full min-h-[36px] px-2 py-1.5 border border-slate-300 rounded-lg focus-within:ring-2 focus-within:ring-orange-500 focus-within:border-transparent bg-white shadow-[inset_0_0_2px_rgba(0,0,0,0.06)]"
                            >
                                <div className="flex flex-wrap gap-0.5 mb-1 w-full">
                                    {form.optionalSkills.map((skill, idx) => (
                                        <div key={idx} className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-100 border border-slate-300 rounded w-fit max-w-full min-w-0">
                                            <span className="text-xs font-medium text-slate-700 truncate">{skill}</span>
                                            <button
                                                type="button"
                                                onClick={() => handleRemoveOptionalSkill(idx)}
                                                className="text-slate-600 hover:text-slate-800 text-[10px] font-bold leading-none shrink-0"
                                            >
                                                ×
                                            </button>
                                        </div>
                                    ))}
                                </div>
                                <input
                                    type="text"
                                    placeholder="e.g., Docker, Kubernetes... (press Enter to add)"
                                    value={optionalSkillInput}
                                    onChange={(e) => setOptionalSkillInput(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddOptionalSkill())}
                                    className="w-full text-[12px] py-0 border-0 focus:outline-none focus:ring-0 placeholder:text-slate-400"
                                />
                            </div>
                        </div>
                    </div>

                    {/* Job Description Upload Section */}
                    <div className="mb-5">
                        <div className="flex items-center justify-between gap-2 mb-1.5">
                            <label className="text-[12px] font-semibold text-slate-400" htmlFor="jdFile">
                                Job Description <span className="text-red-500">*</span>
                            </label>
                            {positionId && position?.jobDescriptionDocumentPath && (
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={handleViewCurrentJd} className="text-xs font-medium text-[#FF6B00] hover:underline">
                                        View
                                    </button>
                                    <button type="button" onClick={handleDownloadCurrentJd} className="text-xs font-medium text-slate-600 hover:underline">
                                        Download
                                    </button>
                                </div>
                            )}
                        </div>
                        <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition">
                            <input
                                type="file"
                                accept=".pdf,.docx"
                                onChange={handleFileChange}
                                className="hidden"
                                id="jdFile"
                            />
                            <label htmlFor="jdFile" className="cursor-pointer block">
                                {jdFile ? (
                                    <div className="flex flex-col items-center justify-center gap-2 text-green-600">
                                        <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-medium text-sm">{jdFile.name}</span>
                                        <p className="text-xs text-slate-500">Click to choose a different file</p>
                                    </div>
                                ) : positionId && position?.jobDescriptionDocumentFileName ? (
                                    <div className="flex flex-col items-center justify-center gap-2 text-slate-700">
                                        <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                        </svg>
                                        <span className="font-medium text-sm">{position.jobDescriptionDocumentFileName}</span>
                                        <p className="text-xs text-slate-500">Click to choose a different file</p>
                                    </div>
                                ) : (
                                    <>
                                        <svg className="w-12 h-12 text-slate-300 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                        </svg>
                                        <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                                        <p className="text-xs text-slate-500 mt-1">PDF or DOCX files only (Max 5MB)</p>
                                    </>
                                )}
                            </label>
                        </div>
                    </div>
                </div>
            </form>

            {/* Generated JD Sidebar (ref: same as ref frontend) */}
            {showJDSidebar && (
                <div className="fixed top-0 right-0 h-full w-full sm:w-[520px] shadow-lg p-4 flex flex-col z-50 bg-white border-l border-slate-200">
                    <div className="flex justify-between items-center mb-2 shrink-0">
                        <h3 className="text-base font-semibold text-slate-800">Generated JD</h3>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => setIsEditingJD(!isEditingJD)}
                                className="text-[#FF6B00] text-xs font-medium hover:underline"
                            >
                                {isEditingJD ? 'Save' : 'Edit'}
                            </button>
                            <button
                                type="button"
                                onClick={() => { setShowJDSidebar(false); setIsEditingJD(false); }}
                                className="text-red-600 text-xs font-medium hover:underline"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                    {isJDLoading ? (
                        <div className="flex-1 min-h-0 overflow-hidden flex flex-col gap-2 p-3">
                            {[...Array(12)].map((_, i) => (
                                <div
                                    key={i}
                                    className="h-3 rounded bg-slate-200 animate-pulse"
                                    style={{ width: i % 4 === 0 ? '75%' : i % 4 === 1 ? '100%' : i % 4 === 2 ? '90%' : '60%' }}
                                />
                            ))}
                            <div className="h-4 rounded bg-slate-200 animate-pulse w-3/4 mt-2" />
                            {[...Array(8)].map((_, i) => (
                                <div
                                    key={`s${i}`}
                                    className="h-3 rounded bg-slate-200 animate-pulse"
                                    style={{ width: i % 3 === 0 ? '95%' : i % 3 === 1 ? '70%' : '85%' }}
                                />
                            ))}
                        </div>
                    ) : jdPanelData ? (
                        <>
                            <div className="flex-1 min-h-0 overflow-y-auto">
                                {isEditingJD ? (
                                    <textarea
                                        className="text-xs font-mono w-full h-full min-h-[200px] p-3 border border-slate-200 rounded-lg resize-none"
                                        value={typeof jdPanelData === 'string' ? jdPanelData : JSON.stringify(jdPanelData, null, 2)}
                                        onChange={(e) => setJdPanelData(e.target.value)}
                                    />
                                ) : (
                                    <pre
                                        className="text-xs whitespace-pre-wrap h-full min-h-[200px] overflow-y-auto bg-slate-50 p-3 rounded-lg cursor-pointer hover:bg-slate-100"
                                        onClick={() => setIsEditingJD(true)}
                                    >
                                        {typeof jdPanelData === 'string' ? jdPanelData : JSON.stringify(jdPanelData, null, 2)}
                                    </pre>
                                )}
                            </div>
                            <div className="flex flex-wrap gap-2 mt-1.5 pt-2 shrink-0 border-t border-slate-100">
                                <button
                                    type="button"
                                    onClick={() => handleGenerateJD(true)}
                                    className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                                >
                                    Regenerate
                                </button>
                                <button
                                    type="button"
                                    onClick={handleUseThisJDAsPDF}
                                    className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-[#FF6B00] to-[#FF4E00] text-white hover:brightness-110 shadow-lg shadow-orange-500/20 transition-all"
                                >
                                    Use this JD (as PDF)
                                </button>
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col items-center justify-center flex-1 min-h-0 text-slate-500 text-sm">
                            <p>No JD generated or an error occurred.</p>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default PositionCreate;
