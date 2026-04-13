import React, { useState, useEffect } from 'react';
import axios, { gatewayApi } from '../../config/axios';
import { toast } from 'react-hot-toast';
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';

const MassEmail = () => {
    const navigate = useNavigate();
    const { user } = useSelector(state => state.auth);
    const organizationId = user?.organizationId || user?.organization_id;

    // Academic Metadata
    const [metadata, setMetadata] = useState({ departments: [], branches: [], subjects: [] });
    const [filters, setFilters] = useState({ dept_id: '', branch_id: '', subject_id: '', search: '' });

    // Recipients
    const [recipients, setRecipients] = useState([]);
    const [selectedIds, setSelectedIds] = useState([]);
    const [loading, setLoading] = useState(false);
    const [page, setPage] = useState(0);
    const [totalRecipients, setTotalRecipients] = useState(0);
    const [templates, setTemplates] = useState([]);
    const [selectedTemplateId, setSelectedTemplateId] = useState('');
    const [positions, setPositions] = useState([]);
    const [selectedPositionId, setSelectedPositionId] = useState('');

    // Email Composition
    const [emailData, setEmailData] = useState({
        subject: '',
        cc: '',
        body: '',
        templateId: '',
        templateName: ''
    });
    const [sending, setSending] = useState(false);
    const [aiLoading, setAiLoading] = useState(false);

    // Fetch initial metadata
    useEffect(() => {
        const fetchMetadata = async () => {
            try {
                const res = await axios.get('/candidates/academic-metadata');
                if (res.data?.success) {
                    setMetadata(res.data.data);
                }
            } catch (err) {
                console.error('Error fetching metadata:', err);
            }
        };
        fetchMetadata();
    }, []);

    useEffect(() => {
        const fetchTemplates = async () => {
            try {
                const response = await axios.get('/candidates/email-templates');
                if (response.data.success) {
                    setTemplates(response.data.data);
                }
            } catch (error) {
                console.error('Error fetching templates:', error);
            }
        };

        const fetchPositions = async () => {
            try {
                const response = await axios.get('/admins/positions', { params: { status: 'ACTIVE', size: 100 } });
                if (response.data.content) {
                    setPositions(response.data.content);
                }
            } catch (error) {
                console.error('Error fetching positions:', error);
            }
        };

        fetchTemplates();
        fetchPositions();
    }, []);

    // Fetch filtered recipients
    useEffect(() => {
        const fetchRecipients = async () => {
            // Only fetch if at least one filter is active
            if (!filters.dept_id && !filters.branch_id && !filters.semester && !filters.search) {
                setRecipients([]);
                setTotalRecipients(0);
                setLoading(false);
                return;
            }

            setLoading(true);
            try {
                const params = {
                    organizationId,
                    ...filters,
                    limit: 25,
                    offset: page * 25
                };
                const res = await axios.get('/candidates/bulk-email/recipients', { params });
                if (res.data?.success) {
                    if (page === 0) {
                        setRecipients(res.data.data);
                    } else {
                        setRecipients(prev => [...prev, ...res.data.data]);
                    }
                    setTotalRecipients(res.data.total);
                }
            } catch (err) {
                console.error('Error fetching recipients:', err);
                toast.error('Failed to fetch recipients');
            } finally {
                setLoading(false);
            }
        };
        if (organizationId) fetchRecipients();
    }, [filters, organizationId, page]);

    // Reset page when filters change
    useEffect(() => {
        setPage(0);
    }, [filters]);

    const handleSelectAll = (e) => {
        if (e.target.checked) {
            setSelectedIds(recipients.map(r => r.id));
        } else {
            setSelectedIds([]);
        }
    };

    const toggleRecipient = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        );
    };

    const handleTemplateChange = (e) => {
        const templateId = e.target.value;
        setSelectedTemplateId(templateId);
        const template = templates.find(t => t.id === templateId);
        if (template) {
            setEmailData({
                subject: template.subject,
                body: template.body,
                cc: template.cc || '',
                templateName: template.name // Add this to emailData
            });
        } else {
            setEmailData(prev => ({ ...prev, templateName: '' }));
        }
    };

    const handleAiAssist = async () => {
        const promptText = emailData.body.trim();
        if (!promptText) {
            toast.error("Please enter a prompt or starting text in the body message first.");
            return;
        }

        setAiLoading(true);
        try {
            const mode = promptText.split(' ').length < 15 ? 'generate' : 'refine';
            const vars = [
                '{candidate_name}', '{Position_title}', '{manager_name}', 
                '{reg_number}', '{public_link}', '{date}', '{jd_link}', 
                '{company_name}', '{mobile_number}', '{department}', '{branch}'
            ];
            
            const response = await gatewayApi.post('/ai/generate-email-template', {
                mode,
                prompt: mode === 'generate' ? promptText : 'Professionalize and improve this email.',
                currentBody: mode === 'refine' ? promptText : '',
                variables: vars
            });

            if (response.data.success) {
                setEmailData(prev => ({ 
                    ...prev, 
                    body: response.data.body || prev.body,
                    subject: response.data.subject || prev.subject
                }));
                toast.success(mode === 'generate' ? "Email generated!" : "Email refined!");
            }
        } catch (error) {
            console.error("AI Assist error:", error);
            toast.error("AI assistance failed. Please try again.");
        } finally {
            setAiLoading(false);
        }
    };

    const handleCsvUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target.result;
            const lines = text.split(/\r?\n/).filter(line => line.trim() !== '');
            const newRecipients = [];
            const newSelectedIds = [...selectedIds];

            // Simple CSV parser: Name, Email or just Email
            lines.forEach((line, index) => {
                if (index === 0 && line.toLowerCase().includes('email')) return; // Skip header

                const parts = line.split(',').map(p => p.trim());
                let name = '';
                let email = '';

                if (parts.length >= 2) {
                    name = parts[0];
                    email = parts[1];
                } else {
                    email = parts[0];
                    name = email.split('@')[0];
                }

                // Basic email validation
                if (email.includes('@') && email.includes('.')) {
                    const id = `csv-${email}`;
                    if (!recipients.some(r => r.id === id)) {
                        newRecipients.push({ 
                            id, 
                            name, 
                            email, 
                            isExternal: true 
                        });
                        newSelectedIds.push(id);
                    }
                }
            });

            if (newRecipients.length > 0) {
                setRecipients(prev => [...newRecipients, ...prev]);
                setSelectedIds(newSelectedIds);
                toast.success(`Imported ${newRecipients.length} recipients from CSV`);
            } else {
                toast.error('No valid emails found in CSV');
            }
            e.target.value = ''; // Reset input
        };
        reader.onerror = () => toast.error('Failed to read CSV file');
        reader.readAsText(file);
    };

    const handleSend = async () => {
        if (selectedIds.length === 0) {
            toast.error('Please select at least one recipient');
            return;
        }
        if (!emailData.subject || !emailData.body) {
            toast.error('Subject and Body are required');
            return;
        }

        // Validate public link existence if used in the template
        if (emailData.body.includes('{public_link}') || emailData.body.includes('{Public_link}') || emailData.body.includes('{PUBLIC_LINK}')) {
            if (!selectedPositionId) {
                toast.error('Please select a Target Position to include a public link');
                return;
            }
            try {
                const checkRes = await axios.get(`/candidates/public-link/check/${selectedPositionId}`);
                if (!checkRes.data?.exists) {
                    toast.error('There is no public link generated for this position');
                    return;
                }
            } catch (err) {
                console.error('Error checking public link:', err);
                toast.error('Failed to verify public link status');
                return;
            }
        }

        setSending(true);
        const toastId = toast.loading('Sending emails...');
        try {
            const selectedRecipients = recipients.filter(r => selectedIds.includes(r.id));

            const selectedPos = positions.find(p => p.id === selectedPositionId);
            
            const res = await axios.post('/candidates/bulk-email/send', {
                recipients: selectedRecipients.map(r => ({
                    email: r.email,
                    name: r.name || r.candidate_name,
                    mobile: r.mobile_number || r.mobile,
                    department: r.department_name || r.department,
                    branch: r.branch_name || r.branch_id || r.branch,
                    semester: r.semester,
                    reg_number: r.registerNo || r.register_no || r.reg_number,
                    subjects: r.subjects || '',
                    position_code: selectedPos?.code || '',
                    position_title: selectedPos?.title || '',
                    job_description: selectedPos?.jobDescriptionText || '',
                    jd_link: selectedPos?.jobDescriptionDocumentPath ? `${window.location.origin.replace(':5173', ':8002')}/admins/positions/${selectedPos.id}/job-description` : '',
                    public_link: selectedPos ? `${window.location.origin.replace(':5173', ':4003')}/career/${organizationId}/${selectedPos.id}` : '',
                    link_expires: selectedPos?.applicationDeadline 
                        ? new Date(selectedPos.applicationDeadline).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }) 
                        : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }),
                    manager_name: user?.name || user?.fullName || '',
                    manager_email: user?.email || '',
                    manager_phone: user?.mobile || user?.mobile_number || '',
                    company_name: selectedPos?.companyName || '',
                    date: new Date().toLocaleDateString(),
                    time: new Date().toLocaleTimeString(),
                    location: r.location || r.interview_location || '',
                    id: r.id,
                    position_id: selectedPositionId
                })),
                subject: emailData.subject,
                body: emailData.body,
                cc: emailData.cc,
                templateName: templates.find(t => t.id === selectedTemplateId)?.name || 'Custom Bulk Email',
                templateId: selectedTemplateId
            });

            if (res.data?.success) {
                toast.dismiss(toastId);
                toast.success(res.data.message || 'Mass email process started! Check Inbox for progress.');
                setEmailData({ subject: '', cc: '', body: '', templateId: '', templateName: '' });
                setSelectedIds([]);
                setSelectedTemplateId('');
            }
        } catch (err) {
            toast.dismiss(toastId);
            console.error('Error sending bulk email:', err);
            toast.error(err.response?.data?.message || 'Failed to send bulk email');
        } finally {
            setSending(false);
        }
    };

    return (
        <div className="flex flex-col h-[calc(100vh-120px)] overflow-hidden px-0">
            <div className="flex flex-1 gap-4 overflow-hidden pb-4">
                {/* Left Column: Recipients */}
                <div className="w-[40%] flex flex-col bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="p-5 space-y-4 border-b border-slate-100">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2 text-slate-800">
                                <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                <span className="font-bold text-sm">Recipients</span>
                            </div>
                            <div className="flex items-center gap-2">
                                <input
                                    type="file"
                                    id="csv-upload"
                                    accept=".csv"
                                    className="hidden"
                                    onChange={handleCsvUpload}
                                />
                                <label
                                    htmlFor="csv-upload"
                                    className="px-2.5 py-1 bg-slate-100 text-slate-600 text-[9px] font-bold rounded-full uppercase tracking-wider cursor-pointer hover:bg-slate-200 transition-all"
                                >
                                    Upload CSV
                                </label>
                                <span className="px-2.5 py-1 bg-blue-100 text-blue-600 text-[10px] font-bold rounded-full uppercase tracking-wider">
                                    {selectedIds.length} selected
                                </span>
                            </div>
                        </div>

                        {/* Search */}
                        <div className="relative">
                            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                            </svg>
                            <input
                                type="text"
                                placeholder="Search candidates..."
                                className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-100 rounded-xl text-sm focus:bg-white focus:ring-2 focus:ring-purple-100 transition-all outline-none"
                                value={filters.search}
                                onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                            />
                        </div>

                        {/* Advanced Filters (Dept, Branch, Subject) */}
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 outline-none focus:bg-white transition-all"
                                value={filters.dept_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, dept_id: e.target.value, branch_id: '', subject_id: '' }))}
                            >
                                <option value="">All Departments</option>
                                {metadata.departments.map(dept => (
                                    <option key={dept.id} value={dept.id}>{dept.name}</option>
                                ))}
                            </select>
                            <select
                                className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 outline-none focus:bg-white transition-all"
                                value={filters.branch_id}
                                onChange={(e) => setFilters(prev => ({ ...prev, branch_id: e.target.value, subject_id: '' }))}
                                disabled={!filters.dept_id}
                            >
                                <option value="">All Branches</option>
                                {metadata.branches.filter(b => b.department_id === filters.dept_id).map(branch => (
                                    <option key={branch.id} value={branch.id}>{branch.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <select
                                className="px-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-xs text-slate-600 outline-none focus:bg-white transition-all"
                                value={filters.semester}
                                onChange={(e) => setFilters(prev => ({ ...prev, semester: e.target.value }))}
                            >
                                <option value="">All Semesters</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(sem => (
                                    <option key={sem} value={sem}>Semester {sem}</option>
                                ))}
                            </select>
                            <div className="flex items-center gap-3 px-1">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                                        onChange={handleSelectAll}
                                        checked={selectedIds.length === recipients.length && recipients.length > 0}
                                    />
                                    <span className="text-xs text-slate-600 font-medium">Select All</span>
                                </label>
                            </div>
                        </div>
                    </div>

                    {/* Candidate List */}
                    <div className="flex-1 overflow-y-auto no-scrollbar p-3 space-y-2 bg-slate-50/30">
                        {loading && page === 0 ? (
                            <div className="flex items-center justify-center py-10">
                                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                            </div>
                        ) : recipients.length === 0 ? (
                            <div className="text-center py-10 px-4">
                                <p className="text-slate-400 text-sm italic mb-2">
                                    {!filters.dept_id && !filters.branch_id && !filters.semester && !filters.search 
                                        ? "Apply a filter or search to list candidates" 
                                        : "No candidates found matching criteria"}
                                </p>
                                <p className="text-[10px] text-slate-300">Select department or branch to begin</p>
                            </div>
                        ) : (
                            <>
                                {recipients.map(recipient => (
                                    <div
                                        key={recipient.id}
                                        onClick={() => toggleRecipient(recipient.id)}
                                        className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center gap-4 ${selectedIds.includes(recipient.id) ? 'bg-blue-50 border-blue-200' : 'bg-white border-slate-100 hover:border-slate-200'}`}
                                    >
                                        <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-all ${selectedIds.includes(recipient.id) ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`}>
                                            {selectedIds.includes(recipient.id) && (
                                                <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                </svg>
                                            )}
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-bold text-slate-800 truncate">{recipient.name}</p>
                                            <div className="flex items-center gap-2">
                                                <p className="text-xs text-slate-500 truncate">{recipient.email}</p>
                                                {recipient.semester && (
                                                    <span className="px-1.5 py-0.5 bg-blue-50 text-blue-600 text-[8px] font-bold rounded-md uppercase">Sem {recipient.semester}</span>
                                                )}
                                                {recipient.isExternal && (
                                                    <span className="px-1.5 py-0.5 bg-purple-100 text-purple-600 text-[8px] font-bold rounded-md uppercase">CSV</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                                
                                {recipients.length < totalRecipients && (
                                    <div className="py-4 flex justify-center">
                                        <button
                                            onClick={() => setPage(prev => prev + 1)}
                                            disabled={loading}
                                            className="px-4 py-2 bg-white border border-slate-200 text-blue-600 text-[10px] font-bold rounded-xl hover:bg-blue-50 transition-all disabled:opacity-50"
                                        >
                                            {loading ? "Loading..." : `Load More (${totalRecipients - recipients.length} remaining)`}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>

                {/* Right Column: Compose */}
                <div className="flex-1 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-col p-6 overflow-y-auto no-scrollbar">
                    <div className="flex items-center gap-2 text-slate-800 mb-6">
                        <svg className="w-5 h-5 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                        <span className="font-bold text-sm">Compose Email</span>
                    </div>

                    <div className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Email Template</label>
                                <select 
                                    value={selectedTemplateId}
                                    onChange={handleTemplateChange}
                                    className="w-full h-10 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                >
                                    <option value="">Select a template</option>
                                    {templates.map(t => (
                                        <option key={t.id} value={t.id}>{t.name}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="flex flex-col gap-2">
                                <label className="text-[10px] font-bold text-slate-500 uppercase ml-1">Target Position (Optional)</label>
                                <select 
                                    className="w-full h-10 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all appearance-none cursor-pointer"
                                    value={selectedPositionId}
                                    onChange={(e) => {
                                        const posId = e.target.value;
                                        setSelectedPositionId(posId);
                                        const pos = positions.find(p => p.id === posId);
                                        if (pos && (!emailData.subject || emailData.subject === '')) {
                                            setEmailData(prev => ({
                                                ...prev,
                                                subject: `You have been selected for {Position_title} Role`
                                            }));
                                        }
                                    }}
                                >
                                    <option value="">Select a Position to link details</option>
                                    {positions.map(p => (
                                        <option key={p.id} value={p.id}>{p.code} - {p.title}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">Subject <span className="text-red-500">*</span></label>
                            <input
                                type="text"
                                placeholder="Email subject"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                                value={emailData.subject}
                                onChange={(e) => setEmailData(prev => ({ ...prev, subject: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5">
                            <label className="text-xs font-bold text-slate-600 ml-1">CC (Carbon Copy)</label>
                            <input
                                type="text"
                                placeholder="email1@example.com, email2@example.com"
                                className="w-full px-4 py-2.5 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all"
                                value={emailData.cc}
                                onChange={(e) => setEmailData(prev => ({ ...prev, cc: e.target.value }))}
                            />
                        </div>

                        <div className="space-y-1.5 relative group">
                            <label className="text-xs font-bold text-slate-600 ml-1">Email Body <span className="text-red-500">*</span></label>
                            <div className="relative">
                                <textarea
                                    placeholder="Email body (use {candidate_name} for placeholders)"
                                    className="w-full h-44 px-4 py-3 bg-slate-50 border border-slate-100 rounded-xl text-sm outline-none focus:bg-white focus:ring-2 focus:ring-blue-100 transition-all resize-none pr-12"
                                    value={emailData.body}
                                    onChange={(e) => setEmailData(prev => ({ ...prev, body: e.target.value }))}
                                />
                                <button
                                    type="button"
                                    onClick={handleAiAssist}
                                    disabled={aiLoading}
                                    className="absolute bottom-3 right-3 p-2 bg-gradient-to-tr from-blue-600 to-indigo-600 text-white rounded-lg shadow-lg hover:shadow-indigo-200 hover:scale-110 active:scale-95 transition-all disabled:opacity-50"
                                    title="AI Refine"
                                >
                                    {aiLoading ? (
                                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    ) : (
                                        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                                            <path d="M12,2L14.85,9.21L22,12L14.85,14.79L12,22L9.15,14.79L2,12L9.15,9.21L12,2M12,17.27L16.27,13L12,8.73L7.73,13L12,17.27M12,14.47L10.53,13L12,11.53L13.47,13L12,14.47Z" />
                                        </svg>
                                    )}
                                </button>
                            </div>
                            <p className="text-[10px] text-slate-400 mt-1 ml-1 font-medium italic">
                                Available variables: <code className="text-blue-600 font-bold">{"{candidate_name}"}</code>, <code className="text-blue-600 font-bold">{"{Position_title}"}</code>, <code className="text-blue-600 font-bold">{"{job_description}"}</code>, <code className="text-blue-600 font-bold">{"{jd_link}"}</code>, <code className="text-blue-600 font-bold">{"{public_link}"}</code>, <code className="text-blue-600 font-bold">{"{date}"}</code>
                            </p>
                        </div>
                    </div>

                    <div className="mt-auto flex items-center justify-end gap-4">
                        <button
                            disabled={sending}
                            onClick={handleSend}
                            className={`flex-1 flex items-center justify-center gap-2 py-3 bg-blue-600 text-white rounded-xl text-sm font-bold shadow-lg shadow-blue-200 hover:bg-blue-700 active:scale-[0.98] transition-all ${sending ? 'opacity-70 cursor-wait' : ''}`}
                        >
                            {sending ? (
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                            ) : (
                                <svg className="w-4 h-4 translate-y-[-1px] rotate-[-10deg]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                                </svg>
                            )}
                            {sending ? 'Sending...' : `Send to ${selectedIds.length} recipient(s)`}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default MassEmail;
