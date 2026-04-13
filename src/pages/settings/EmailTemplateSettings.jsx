import React, { useState, useEffect } from 'react';
import axios, { gatewayApi } from '../../config/axios';
import { toast } from 'react-hot-toast';

const EmailTemplateSettings = () => {
    const [templates, setTemplates] = useState([]);
    const [loading, setLoading] = useState(true);
    const [aiLoading, setAiLoading] = useState(false);
    const [showModal, setShowModal] = useState(false);
    const [editingTemplate, setEditingTemplate] = useState(null);
    const [formData, setFormData] = useState({
        name: '',
        to_field: '',
        subject: '',
        body: '',
        cc: '' // Current input value
    });
    const [ccList, setCcList] = useState([]);

    const [lastFocusedField, setLastFocusedField] = useState('body'); // Track which field to insert variable into

    const variables = [
        { key: '{candidate_name}', label: 'Candidate Name' },
        { key: '{candidate_email}', label: 'Candidate Email' },
        { key: '{mobile_number}', label: 'Mobile Number' },
        { key: '{reg_number}', label: 'Register Number' },
        { key: '{department}', label: 'Department' },
        { key: '{branch}', label: 'Branch' },
        { key: '{semester}', label: 'Semester' },
        { key: '{subjects}', label: 'Subjects' },
        
        { key: '{Position_title}', label: 'Position Title' },
        { key: '{position_code}', label: 'Position Code' },
        { key: '{jd_link}', label: 'JD File Link' },
        { key: '{public_link}', label: 'Public Link' },
        { key: '{link_expires}', label: 'Link Expiry' },
        
        { key: '{company_name}', label: 'Company Name' },
        { key: '{date}', label: 'Date' },
        { key: '{time}', label: 'Time' },
        { key: '{interview_location}', label: 'Location' },
        
        { key: '{manager_name}', label: 'Manager Name' },
        { key: '{manager_email}', label: 'Manager Email' },
        { key: '{manager_phone}', label: 'Manager Phone' }
    ];

    useEffect(() => {
        fetchTemplates();
    }, []);

    const fetchTemplates = async () => {
        try {
            const response = await axios.get('/admins/email-templates');

            if (response.data.success) {
                setTemplates(response.data.data);
            }
        } catch (error) {
            console.error('Error fetching templates:', error);
            toast.error('Failed to load email templates');
        } finally {
            setLoading(false);
        }
    };

    const handleAiAssist = async () => {
        const promptText = formData.body.trim();
        if (!promptText) {
            toast.error("Please enter a prompt or starting text in the body message first.");
            return;
        }

        setAiLoading(true);
        try {
            // mode: 'generate' if body is short/instruction-like, 'refine' if it looks like an email
            const mode = promptText.split(' ').length < 15 ? 'generate' : 'refine';
            
            const response = await gatewayApi.post('/ai/generate-email-template', {
                mode,
                prompt: mode === 'generate' ? promptText : 'Professionalize and improve this email body.',
                currentBody: mode === 'refine' ? promptText : '',
                variables: variables.map(v => v.key)
            });

            if (response.data.success) {
                setFormData(prev => ({ 
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

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const url = editingTemplate 
                ? `/admins/email-templates/${editingTemplate.id}`
                : `/admins/email-templates`;

            
            const method = editingTemplate ? 'put' : 'post';
            
            // Merge tags if input has value
            let finalCcList = [...ccList];
            if (formData.cc && !finalCcList.includes(formData.cc)) {
                finalCcList.push(formData.cc);
            }
            const finalCc = finalCcList.join(', ');

            const response = await axios[method](url, { ...formData, cc: finalCc });

            if (response.data.success) {
                toast.success(editingTemplate ? 'Template updated' : 'Template created');
                setShowModal(false);
                setEditingTemplate(null);
                setFormData({ name: '', to_field: '', subject: '', body: '', cc: '' });
                setCcList([]);
                fetchTemplates();
            }
        } catch (error) {
            toast.error(error.response?.data?.message || 'Failed to save template');
        }
    };

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this template?')) return;
        try {
            const response = await axios.delete(`/admins/email-templates/${id}`);

            if (response.data.success) {
                toast.success('Template deleted');
                fetchTemplates();
            }
        } catch (error) {
            toast.error('Failed to delete template');
        }
    };

    const openEdit = (template) => {
        setEditingTemplate(template);
        setFormData({
            name: template.name,
            to_field: template.to_field || '',
            subject: template.subject,
            body: template.body,
            cc: ''
        });
        setCcList(template.cc ? template.cc.split(',').map(s => s.trim()).filter(s => s) : []);
        setLastFocusedField('body');
        setShowModal(true);
    };

    const insertVariable = (variable) => {
        const inputId = `template-${lastFocusedField}`;
        const input = document.getElementById(inputId);
        
        if (input) {
            const start = input.selectionStart;
            const end = input.selectionEnd;
            const text = formData[lastFocusedField] || '';
            const before = text.substring(0, start);
            const after = text.substring(end, text.length);
            
            setFormData(prev => ({
                ...prev,
                [lastFocusedField]: before + variable + after
            }));
            
            // Refocus the input after insertion
            setTimeout(() => {
                input.focus();
                const newPos = start + variable.length;
                input.setSelectionRange(newPos, newPos);
            }, 0);
        } else {
            setFormData(prev => ({
                ...prev,
                [lastFocusedField]: (prev[lastFocusedField] || '') + variable
            }));
        }
    };

    const addCcTag = () => {
        if (formData.cc && !ccList.includes(formData.cc)) {
            setCcList([...ccList, formData.cc]);
            setFormData({ ...formData, cc: '' });
        }
    };

    const removeCcTag = (tag) => {
        setCcList(ccList.filter(t => t !== tag));
    };

    return (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-xl font-bold text-slate-800">Email Templates</h2>
                    <p className="text-xs text-slate-500">Manage reusable templates for all communications.</p>
                </div>
                <button 
                    onClick={() => {
                        setEditingTemplate(null);
                        setFormData({ name: '', to_field: '', subject: '', body: '', cc: '' });
                        setCcList([]);
                        setShowModal(true);
                    }}
                    className="px-4 py-2 bg-[#9B8CFF] text-white text-[13px] font-bold rounded-xl hover:bg-[#8A7BEF] transition-all flex items-center gap-2 shadow-lg shadow-purple-500/10"
                >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                    </svg>
                    Create Template
                </button>
            </div>

            {/* Templates List */}
            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#9B8CFF]" />
                </div>
            ) : templates.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border-2 border-dashed border-slate-100">
                    <p className="text-slate-400 text-sm">No templates found. Create your first one!</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {templates.map(template => (
                        <div key={template.id} className="group p-5 bg-white rounded-3xl border border-slate-100 hover:border-purple-100 hover:shadow-xl hover:shadow-purple-500/5 transition-all flex flex-col h-full border-b-[3px] border-b-purple-50">
                            <div className="flex justify-between items-start mb-3">
                                <div className="space-y-0.5">
                                    <h3 className="font-bold text-slate-800 text-[15px]">{template.name}</h3>
                                    <p className="text-[10px] text-slate-400 truncate max-w-[150px]">To: {template.to_field || 'N/A'}</p>
                                </div>
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                    <button onClick={() => openEdit(template)} className="p-1.5 text-slate-400 hover:text-purple-600 hover:bg-purple-50 rounded-lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                                        </svg>
                                    </button>
                                    <button onClick={() => handleDelete(template.id)} className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg">
                                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            </div>
                            <div className="space-y-2 mb-4 flex-grow">
                                <div className="p-3 bg-slate-50/50 rounded-2xl border border-slate-100 italic">
                                    <p className="text-[13px] text-slate-700 line-clamp-1">{template.subject}</p>
                                </div>
                            </div>
                            <div className="flex items-center justify-between pt-3 border-t border-slate-50">
                                <span className="text-[9px] text-slate-400 font-medium">{new Date(template.updated_at).toLocaleDateString()}</span>
                                <button onClick={() => openEdit(template)} className="text-[10px] text-purple-600 font-bold hover:underline">Edit Template</button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Create/Edit Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-6 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
                    <div className="bg-white rounded-[24px] shadow-2xl w-full max-w-4xl max-h-[85vh] overflow-hidden animate-in zoom-in-95 duration-200 flex flex-col my-8">
                        <div className="px-8 pt-4 pb-2 flex items-center justify-between">
                            <h3 className="text-lg font-bold text-slate-800">{editingTemplate ? 'Edit Email Template' : 'Create Email Template'}</h3>
                            <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 transition-all">
                                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        
                        <div className="flex-grow overflow-y-auto px-8 py-4 custom-scrollbar">
                            {/* Available Variables Guide */}
                            <div className="p-5 bg-[#F8F9FD] rounded-2xl border border-[#EDF1F9] space-y-3">
                                <span className="text-[11px] font-bold text-slate-500 uppercase tracking-tight ml-0.5">Available Variables (Click to insert)</span>
                                <div className="flex flex-wrap gap-2">
                                    {variables.map(v => (
                                        <button 
                                            key={v.key}
                                            type="button"
                                            onClick={() => insertVariable(v.key)}
                                            className="px-3.5 py-1.5 bg-white border border-[#E2E8F3] text-slate-700 text-[12px] font-medium rounded-xl hover:border-purple-300 hover:text-purple-600 hover:shadow-md transition-all"
                                        >
                                            {v.key}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase ml-1">Template Name <span className="text-red-500">*</span></label>
                                    <input 
                                        id="template-name"
                                        type="text"
                                        required
                                        value={formData.name}
                                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                                        onFocus={() => setLastFocusedField('name')}
                                        className="w-full px-5 py-2.5 bg-white border border-[#E2E8F3] rounded-2xl text-[13px] focus:outline-none focus:border-purple-300 transition-all placeholder:text-slate-300 shadow-sm"
                                        placeholder="New Template"
                                    />
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase ml-1">To <span className="text-red-500">*</span></label>
                                    <input 
                                        id="template-to_field"
                                        type="text"
                                        required
                                        value={formData.to_field}
                                        onChange={(e) => setFormData({...formData, to_field: e.target.value})}
                                        onFocus={() => setLastFocusedField('to_field')}
                                        className="w-full px-5 py-2.5 bg-white border border-[#E2E8F4] rounded-2xl text-[13px] focus:outline-none focus:border-purple-300 transition-all placeholder:text-slate-300 shadow-sm"
                                        placeholder="e.g., {candidate_email} or candidate@example.com"
                                    />
                                    <p className="text-[10px] text-slate-400 ml-1">Use variables like {'{candidate_email}'} or enter a specific email address</p>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase ml-1">Subject <span className="text-red-500">*</span></label>
                                    <input 
                                        id="template-subject"
                                        type="text"
                                        required
                                        value={formData.subject}
                                        onChange={(e) => setFormData({...formData, subject: e.target.value})}
                                        onFocus={() => setLastFocusedField('subject')}
                                        className="w-full px-5 py-2.5 bg-white border border-[#E2E8F3] rounded-2xl text-[13px] focus:outline-none focus:border-purple-300 transition-all placeholder:text-slate-300 shadow-sm"
                                        placeholder="e.g., Interview Invitation for {position}"
                                    />
                                </div>

                                <div className="space-y-1.5 relative">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase ml-1">Body <span className="text-red-500">*</span></label>
                                    <div className="relative group">
                                        <textarea 
                                            id="template-body"
                                            required
                                            rows={6}
                                            value={formData.body}
                                            onChange={(e) => setFormData({...formData, body: e.target.value})}
                                            onFocus={() => setLastFocusedField('body')}
                                            className="w-full px-5 py-3 bg-white border border-[#E2E8F3] rounded-2xl text-[13px] focus:outline-none focus:border-purple-300 transition-all resize-none placeholder:text-slate-300 shadow-sm leading-relaxed pr-12"
                                            placeholder="Enter email body content or a prompt for AI (e.g., 'Write a follow-up email')."
                                        />
                                        <button 
                                            type="button"
                                            onClick={handleAiAssist}
                                            disabled={aiLoading}
                                            className={`absolute bottom-3 right-3 p-2.5 rounded-xl transition-all ${aiLoading ? 'bg-purple-100 text-purple-400' : 'bg-purple-50 text-purple-600 hover:bg-purple-600 hover:text-white hover:shadow-lg hover:shadow-purple-200'} border border-purple-100 group-hover:scale-105 active:scale-95`}
                                            title="AI Content Assistant"
                                        >
                                            {aiLoading ? (
                                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                                </svg>
                                            ) : (
                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-6.857 2.286L12 21l-2.286-6.857L3 12l6.857-2.286L12 3z" />
                                                </svg>
                                            )}
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1.5">
                                    <label className="block text-[11px] font-bold text-slate-600 uppercase ml-1">CC Recipients (Optional)</label>
                                    
                                    {/* CC Tags Display */}
                                    {ccList.length > 0 && (
                                        <div className="flex flex-wrap gap-2 mb-2 p-2.5 bg-purple-50/20 rounded-xl border border-purple-100/50">
                                            {ccList.map(tag => (
                                                <span key={tag} className="flex items-center gap-1.5 px-2.5 py-1 bg-white border border-purple-100 text-purple-600 text-[11px] font-bold rounded-lg shadow-sm animate-in zoom-in-90">
                                                    <svg className="w-3 h-3 opacity-60" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                                                    </svg>
                                                    {tag}
                                                    <button type="button" onClick={() => removeCcTag(tag)} className="ml-1 hover:text-red-500 transition-all">&times;</button>
                                                </span>
                                            ))}
                                        </div>
                                    )}

                                    <div className="flex gap-2">
                                        <input 
                                            id="template-cc"
                                            type="text"
                                            value={formData.cc}
                                            onChange={(e) => setFormData({...formData, cc: e.target.value})}
                                            onFocus={() => setLastFocusedField('cc')}
                                            onKeyPress={(e) => e.key === 'Enter' && (e.preventDefault(), addCcTag())}
                                            className="flex-grow px-5 py-2.5 bg-white border border-[#E2E8F3] rounded-2xl text-[13px] focus:outline-none focus:border-purple-300 transition-all placeholder:text-slate-300 shadow-sm"
                                            placeholder="Enter CC email (e.g., hr@company.com or {manager_email})"
                                        />
                                        <button 
                                            type="button" 
                                            onClick={addCcTag}
                                            className="px-4 bg-[#9B8CFF] text-white rounded-2xl hover:bg-[#8A7BEF] transition-all shadow-md shadow-purple-500/20"
                                        >
                                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            </form>
                        </div>
                        
                        <div className="px-8 py-5 flex items-center justify-end gap-3 bg-white">
                            <button 
                                type="button" 
                                onClick={() => setShowModal(false)}
                                className="px-6 py-2 bg-white border border-slate-200 text-slate-600 text-[13px] font-bold rounded-xl hover:bg-slate-50 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                type="button"
                                onClick={handleSubmit}
                                className="px-8 py-2 bg-[#9B8CFF] text-white text-[13px] font-bold rounded-xl hover:bg-[#8A7BEF] shadow-lg shadow-purple-500/10 active:scale-[0.98] transition-all"
                            >
                                {editingTemplate ? 'Update Template' : 'Save Template'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default EmailTemplateSettings;
