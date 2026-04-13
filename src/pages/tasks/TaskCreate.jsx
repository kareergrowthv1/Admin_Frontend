import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import { 
  ChevronLeft, 
  Save, 
  Plus, 
  X, 
  Paperclip, 
  Link as LinkIcon, 
  Layout, 
  BookOpen, 
  GraduationCap, 
  User, 
  Calendar, 
  AlertCircle,
  FileText,
  Upload,
  Send
} from 'lucide-react';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const TaskCreate = () => {
    const navigate = useNavigate();
    const { id: taskId } = useParams();
    const { user } = useSelector(state => state.auth);
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [form, setForm] = useState({
        title: '',
        short_description: '',
        description: '',
        notes: '',
        links: [{ title: '', url: '' }],
        end_date: '',
        priority: 'Medium',
        dept_id: '',
        branch_id: '',
        subject_id: '',
        student_ids: [],
        is_all_students: false,
        is_dept_enabled: false,
        is_branch_enabled: false,
        is_student_enabled: false
    });
    const [attachments, setAttachments] = useState([]);
    const [existingAttachments, setExistingAttachments] = useState([]);

    // Candidate Search State
    const [studentSearch, setStudentSearch] = useState('');
    const [searchResults, setSearchResults] = useState([]);
    const [selectedStudents, setSelectedStudents] = useState([]);

    // Hierarchy Data (For Selection)
    const [departments, setDepartments] = useState([]);
    const [branches, setBranches] = useState([]);
    const [subjects, setSubjects] = useState([]);
    const [students, setStudents] = useState([]);

    useEffect(() => {
        fetchDepartments();
        if (taskId) {
            fetchTaskDetails();
        }
    }, [taskId]);

    // Async Candidate Search
    useEffect(() => {
        const delayDebounceFn = setTimeout(() => {
            if (studentSearch.length >= 2) {
                searchCandidates(studentSearch);
            } else {
                setSearchResults([]);
            }
        }, 300);

        return () => clearTimeout(delayDebounceFn);
    }, [studentSearch]);

    const searchCandidates = async (query) => {
        try {
            const res = await axios.get(`/attendance/search-candidates?query=${query}`);
            setSearchResults(res.data.data || []);
        } catch (err) {
            console.error('Search failed:', err);
        }
    };

    const handleAddStudent = async (student) => {
        if (!selectedStudents.find(s => s.id === student.id)) {
            setSelectedStudents(prev => [...prev, student]);
            setForm(prev => ({ 
                ...prev, 
                student_ids: [...prev.student_ids, student.id],
                is_student_enabled: true,
                // Auto-fill Dept and Branch if not already set or if explicitly selecting a student
                dept_id: student.dept_id || prev.dept_id,
                branch_id: student.branch_id || prev.branch_id
            }));
            
            // Fetch related data if auto-filled
            if (student.dept_id) fetchBranches(student.dept_id);
            if (student.branch_id) fetchSubjects(student.branch_id);
        }
        setStudentSearch('');
        setSearchResults([]);
    };

    const handleRemoveStudent = (id) => {
        setSelectedStudents(prev => prev.filter(s => s.id !== id));
        setForm(prev => ({ ...prev, student_ids: prev.student_ids.filter(sid => sid !== id) }));
    };

    const fetchDepartments = async () => {
        try {
            const res = await axios.get('/attendance/departments');
            setDepartments(res.data.data || []);
        } catch (err) { console.error('Failed to fetch departments:', err); }
    };

    const fetchBranches = async (deptId) => {
        try {
            const res = await axios.get(`/attendance/branches/${deptId}`);
            setBranches(res.data.data || []);
        } catch (err) { console.error('Failed to fetch branches:', err); }
    };

    const fetchSubjects = async (branchId) => {
        try {
            const res = await axios.get(`/attendance/subjects/${branchId}`);
            setSubjects(res.data.data || []);
        } catch (err) { console.error('Failed to fetch subjects:', err); }
    };

    const fetchStudentsForAssign = async (branchId) => {
        try {
            const res = await axios.get(`/attendance/students/${branchId}`);
            setStudents(res.data.data || []);
        } catch (err) { console.error('Failed to fetch students:', err); }
    };

    const fetchTaskDetails = async () => {
        try {
            setLoading(true);
            const res = await axios.get(`/tasks/${taskId}`);
            if (res.data.success) {
                const data = res.data.data;
                
                // Determine assignment toggles based on existing data
                const isDept = !!data.dept_id && !data.branch_id;
                const isBranch = !!data.branch_id && !data.subject_id;
                const isSubject = !!data.subject_id;
                const isStudent = data.assignments?.length > 0 && !data.is_all_students && !data.dept_id;

                setForm({
                    title: data.title || '',
                    short_description: data.short_description || '',
                    description: data.description || '',
                    notes: data.notes || '',
                    links: data.links || [{ title: '', url: '' }],
                    end_date: data.end_date ? data.end_date.split('T')[0] : '',
                    priority: data.priority || 'Medium',
                    dept_id: data.dept_id || '',
                    branch_id: data.branch_id || '',
                    subject_id: data.subject_id || '',
                    student_ids: data.assignments?.map(a => a.student_id) || [],
                    is_all_students: data.is_all_students || false,
                    is_dept_enabled: isDept,
                    is_branch_enabled: isBranch,
                    is_subject_enabled: isSubject,
                    is_student_enabled: isStudent
                });

                // If specific students, populating chips
                if (isStudent && data.assignments) {
                    setSelectedStudents(data.assignments.map(a => ({
                        id: a.student_id,
                        name: a.student_name || 'Student',
                        register_no: a.student_code
                    })));
                }

                setExistingAttachments(data.attachments || []);
                if (data.dept_id) fetchBranches(data.dept_id);
                if (data.branch_id) {
                    fetchStudentsForAssign(data.branch_id);
                    fetchSubjects(data.branch_id);
                }
            }
        } catch (err) {
            toast.error('Failed to load task details');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        // Hierarchy Logic: Dept > Branch > Subject > Student
        if (field === 'is_dept_enabled' && value) {
            setForm(prev => ({ 
                ...prev, 
                is_dept_enabled: true, 
                is_branch_enabled: false, 
                is_subject_enabled: false,
                is_student_enabled: false, 
                is_all_students: false,
                // Clear lower level specific IDs but keep dept
                branch_id: '',
                subject_id: '',
                student_ids: []
            }));
        } else if (field === 'is_branch_enabled' && value) {
            setForm(prev => ({ 
                ...prev, 
                is_dept_enabled: false, 
                is_branch_enabled: true, 
                is_subject_enabled: false,
                is_student_enabled: false, 
                is_all_students: false,
                subject_id: '',
                student_ids: []
            }));
        } else if (field === 'is_subject_enabled' && value) {
            setForm(prev => ({ 
                ...prev, 
                is_dept_enabled: false, 
                is_branch_enabled: false, 
                is_subject_enabled: true,
                is_student_enabled: false, 
                is_all_students: false,
                student_ids: []
            }));
        } else if (field === 'is_student_enabled' && value) {
            setForm(prev => ({ 
                ...prev, 
                is_dept_enabled: false, 
                is_branch_enabled: false, 
                is_subject_enabled: false,
                is_student_enabled: true, 
                is_all_students: false
                // Keep IDs for student selection context
            }));
        } else if (field === 'is_all_students' && value) {
            setForm(prev => ({ ...prev, is_dept_enabled: false, is_branch_enabled: false, is_subject_enabled: false, is_student_enabled: false, is_all_students: true, dept_id: '', branch_id: '', subject_id: '', student_ids: [] }));
        } else {
            setForm(prev => ({ ...prev, [field]: value }));
        }
    };

    // Custom Switch UI Component
    const Switch = ({ enabled, onChange }) => (
        <div 
            onClick={() => onChange(!enabled)}
            className={`w-11 h-6 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${enabled ? 'bg-blue-600' : 'bg-slate-300'}`}
        >
            <div className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ${enabled ? 'translate-x-5' : 'translate-x-0'}`} />
        </div>
    );

    const handleAddLink = () => {
        setForm(prev => ({ ...prev, links: [...prev.links, { title: '', url: '' }] }));
    };

    const handleLinkChange = (index, field, value) => {
        const newLinks = [...form.links];
        newLinks[index][field] = value;
        setForm(prev => ({ ...prev, links: newLinks }));
    };

    const handleRemoveLink = (index) => {
        setForm(prev => ({ ...prev, links: prev.links.filter((_, i) => i !== index) }));
    };

    const handleFileChange = (e) => {
        const files = Array.from(e.target.files);
        setAttachments(prev => [...prev, ...files]);
    };

    const handleRemoveAttachment = (index) => {
        setAttachments(prev => prev.filter((_, i) => i !== index));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!form.title) return toast.error('Title is required');
        
        // Validation for assignments
        const anyEnabled = form.is_all_students || form.is_dept_enabled || form.is_branch_enabled || form.is_subject_enabled || form.is_student_enabled;
        if (!anyEnabled) {
            return toast.error('Please enable at least one assignment option (Dept, Branch, Subject, or Students)', { position: 'top-center' });
        }

        if (form.is_dept_enabled && !form.dept_id) return toast.error('Please select a department', { position: 'top-center' });
        if (form.is_branch_enabled && !form.branch_id) return toast.error('Please select a branch', { position: 'top-center' });
        if (form.is_subject_enabled && !form.subject_id) return toast.error('Please select a subject', { position: 'top-center' });
        if (form.is_student_enabled && form.student_ids.length === 0) return toast.error('Please search and add at least one student', { position: 'top-center' });

        setLoading(true);
        const formData = new FormData();
        
        // Clean up data for submission
        const submissionData = { ...form };
        
        // Final sanity check on IDs based on toggles
        if (!form.is_dept_enabled && !form.is_branch_enabled && !form.is_student_enabled && !form.is_all_students) {
            // Should not happen due to validation above
        }

        Object.entries(submissionData).forEach(([key, value]) => {
            if (['links', 'student_ids'].includes(key)) formData.append(key, JSON.stringify(value));
            else formData.append(key, value);
        });
        attachments.forEach(file => formData.append('attachments', file));

        try {
            if (taskId) {
                await axios.put(`/tasks/${taskId}`, formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Task updated successfully!');
            } else {
                await axios.post('/tasks', formData, { headers: { 'Content-Type': 'multipart/form-data' } });
                toast.success('Task created successfully!');
            }
            navigate('/tasks');
        } catch (err) {
            toast.error(err.response?.data?.message || 'Failed to save task');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-0 text-black pr-6">
            {/* Top breadcrumb + action buttons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/tasks')}>Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/tasks')}>Task List</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-800 font-bold">{taskId ? 'Edit Task' : 'Create Task'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={() => navigate('/tasks')}
                        className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Cancel
                    </button>
                    <PermissionWrapper feature="tasks" permission={taskId ? "update" : "write"}>
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? (taskId ? 'Updating...' : 'Creating...') : (taskId ? 'Update Task' : 'Create & Publish Task')}
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-8 pb-20">
                {/* Section: General */}
                <div>
                    <h3 className="text-[13px] font-bold text-slate-800 mb-4">General Information</h3>
                    
                    {/* Row 1: Task Title */}
                    <div className="mb-5 pr-8">
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">Task Title <span className="text-red-500">*</span></label>
                        <input
                            required
                            type="text"
                            placeholder="e.g., Complete Project Module 1, Mid-term Evaluation"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] transition-all duration-200"
                            value={form.title}
                            onChange={(e) => handleInputChange('title', e.target.value)}
                        />
                    </div>

                    {/* Row 2: Priority & Deadline */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-5 pr-8">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">Priority</label>
                            <select
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] appearance-none cursor-pointer bg-white"
                                value={form.priority}
                                onChange={(e) => handleInputChange('priority', e.target.value)}
                            >
                                <option value="High">High</option>
                                <option value="Medium">Medium</option>
                                <option value="Low">Low</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">Deadline</label>
                            <input
                                type="date"
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] bg-white"
                                value={form.end_date}
                                onChange={(e) => handleInputChange('end_date', e.target.value)}
                            />
                        </div>
                    </div>

                    {/* Row 3: Short Summary */}
                    <div className="mb-5 pr-8">
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">Short Summary</label>
                        <input
                            type="text"
                            placeholder="A brief overview of the task"
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            value={form.short_description}
                            onChange={(e) => handleInputChange('short_description', e.target.value)}
                        />
                    </div>

                    {/* Row 4: Detailed Instructions */}
                    <div className="mb-5 pr-8">
                        <label className="text-[12px] font-semibold text-slate-700 block mb-1.5">Detailed Instructions</label>
                        <textarea
                            rows={6}
                            placeholder="Describe the task in detail, including steps, requirements, and evaluation criteria..."
                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] resize-none leading-relaxed transition-all duration-200"
                            value={form.description}
                            onChange={(e) => handleInputChange('description', e.target.value)}
                        />
                    </div>
                </div>

                {/* Section: Task Assignment (Flattened 2-column Grid) */}
                {/* Section: Task Assignment */}
                <div className="mb-5 pr-8">
                    <label className="text-[12px] font-semibold text-slate-700 block mb-4">Task Assignment Target</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-5">
                        {/* Department Item */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[12px] font-semibold text-slate-700">Target Department / Program {form.is_all_students ? '' : <span className="text-red-500">*</span>}</label>
                                <Switch enabled={form.is_dept_enabled} onChange={(val) => handleInputChange('is_dept_enabled', val)} />
                            </div>
                            <select
                                className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-[inset_0_0_2px_rgba(0,0,0,0.05)] ${!form.is_dept_enabled ? 'opacity-50 grayscale bg-slate-100' : 'bg-white'}`}
                                value={form.dept_id}
                                disabled={!form.is_dept_enabled}
                                onChange={(e) => { 
                                    handleInputChange('dept_id', e.target.value);
                                    if (e.target.value) fetchBranches(e.target.value);
                                }}
                            >
                                <option value="">Select Department</option>
                                {departments.map(d => <option key={d.id} value={d.id}>{d.name}</option>)}
                            </select>
                        </div>

                        {/* Branch Item */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[12px] font-semibold text-slate-700">Target Branch / Batch {form.is_branch_enabled && <span className="text-red-500">*</span>}</label>
                                <Switch enabled={form.is_branch_enabled} onChange={(val) => handleInputChange('is_branch_enabled', val)} />
                            </div>
                            <select
                                disabled={!form.is_branch_enabled || !form.dept_id}
                                className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-[inset_0_0_2px_rgba(0,0,0,0.05)] ${(!form.is_branch_enabled || !form.dept_id) ? 'opacity-50 grayscale bg-slate-100' : 'bg-white'}`}
                                value={form.branch_id}
                                onChange={(e) => {
                                    handleInputChange('branch_id', e.target.value);
                                    if (e.target.value) fetchSubjects(e.target.value);
                                }}
                            >
                                <option value="">Select Branch</option>
                                {branches.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                            </select>
                        </div>

                        {/* Subject Item */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[12px] font-semibold text-slate-700">Target Subject / Module {form.is_subject_enabled && <span className="text-red-500">*</span>}</label>
                                <Switch enabled={form.is_subject_enabled} onChange={(val) => handleInputChange('is_subject_enabled', val)} />
                            </div>
                            <select
                                disabled={!form.is_subject_enabled || !form.branch_id}
                                className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-[inset_0_0_2px_rgba(0,0,0,0.05)] ${(!form.is_subject_enabled || !form.branch_id) ? 'opacity-50 grayscale bg-slate-100' : 'bg-white'}`}
                                value={form.subject_id}
                                onChange={(e) => handleInputChange('subject_id', e.target.value)}
                            >
                                <option value="">Select Subject</option>
                                {subjects.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                            </select>
                        </div>

                        {/* Specific Candidates Item */}
                        <div>
                            <div className="flex items-center justify-between mb-2">
                                <label className="text-[12px] font-semibold text-slate-700">Particular Candidates Only {form.is_student_enabled && <span className="text-red-500">*</span>}</label>
                                <Switch enabled={form.is_student_enabled} onChange={(val) => handleInputChange('is_student_enabled', val)} />
                            </div>
                            <div className={`relative ${!form.is_student_enabled ? 'opacity-50 pointer-events-none' : ''}`}>
                                <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                <input
                                    type="text"
                                    placeholder="Search by Name, Reg No..."
                                    className="w-full pl-12 pr-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-[inset_0_0_2px_rgba(0,0,0,0.05)] bg-white"
                                    value={studentSearch}
                                    onChange={(e) => setStudentSearch(e.target.value)}
                                />
                                {searchResults.length > 0 && (
                                    <div className="absolute z-50 w-full mt-1 bg-white border border-slate-200 rounded-lg shadow-xl max-h-60 overflow-y-auto">
                                        {searchResults.map(s => (
                                            <div
                                                key={s.id}
                                                className="p-3 hover:bg-slate-50 cursor-pointer border-b border-slate-100 last:border-0"
                                                onClick={() => handleAddStudent(s)}
                                            >
                                                <div className="font-semibold text-sm text-slate-800">{s.name}</div>
                                                <div className="text-xs text-slate-500 flex justify-between">
                                                    <span>{s.register_no}</span>
                                                    <span>{s.dept_name} • {s.branch_name}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Selected Chips Area */}
                    {selectedStudents.length > 0 && form.is_student_enabled && (
                        <div className="flex flex-wrap gap-2 mt-4 px-1">
                            {selectedStudents.map(s => (
                                <div key={s.id} className="flex items-center gap-2 bg-blue-50 text-blue-700 px-3 py-1.5 rounded-full text-xs font-semibold border border-blue-100 shadow-sm transition-all duration-200">
                                    <span>{s.name} ({s.register_no})</span>
                                    <button type="button" onClick={() => handleRemoveStudent(s.id)} className="hover:text-blue-900 transition-colors">
                                        <X size={14} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Section: Resources & Attachments (Moved to Bottom) */}
                {/* Section: Resources & Attachments */}
                <div className="mb-5 pr-8">
                    <label className="text-[12px] font-semibold text-slate-700 block mb-4">Resources & Attachments</label>
                    <div className="grid grid-cols-1 gap-4">
                        <div
                            onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-blue-500', 'bg-blue-50/50'); }}
                            onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50'); }}
                            onDrop={(e) => {
                                e.preventDefault();
                                e.currentTarget.classList.remove('border-blue-500', 'bg-blue-50/50');
                                const files = Array.from(e.dataTransfer.files);
                                setAttachments(prev => [...prev, ...files]);
                            }}
                            className="border-2 border-dashed border-slate-300 rounded-xl p-8 flex flex-col items-center justify-center bg-white hover:border-blue-500 hover:bg-blue-50/30 transition-all cursor-pointer group relative shadow-sm"
                            onClick={() => document.getElementById('file-upload').click()}
                        >
                            <input
                                id="file-upload"
                                type="file"
                                multiple
                                className="hidden"
                                onChange={handleFileChange}
                            />
                            <div className="p-4 bg-slate-50 rounded-full mb-4 group-hover:scale-110 transition-transform duration-300">
                                <Upload className="text-slate-400 group-hover:text-blue-500" size={32} />
                            </div>
                            <p className="text-sm font-semibold text-slate-700 mb-1">Click or drag files to upload</p>
                            <p className="text-xs text-slate-400">PDF, DOCX, Images, or ZIP (Max 10MB each)</p>
                        </div>

                        {/* File Preview Grid */}
                        {(attachments.length > 0 || existingAttachments.length > 0) && (
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
                                {existingAttachments.map((f, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                        <div className="p-2 bg-blue-50 rounded text-blue-500"><Paperclip size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{f.filename}</p>
                                            <p className="text-[10px] text-slate-400 uppercase">Existing File</p>
                                        </div>
                                    </div>
                                ))}
                                {attachments.map((file, idx) => (
                                    <div key={idx} className="flex items-center gap-3 p-3 bg-white border border-blue-100 rounded-lg shadow-sm group animate-in fade-in zoom-in duration-200">
                                        <div className="p-2 bg-blue-50 rounded text-blue-500"><Paperclip size={18} /></div>
                                        <div className="flex-1 min-w-0">
                                            <p className="text-xs font-semibold text-slate-700 truncate">{file.name}</p>
                                            <p className="text-[10px] text-slate-400 uppercase">{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                        </div>
                                        <button onClick={(e) => { e.stopPropagation(); handleRemoveAttachment(idx); }} className="p-1 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <X size={16} />
                                        </button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Reference Links - Moved to Bottom (Last) */}
                {/* Section: Reference Links */}
                <div className="mb-5 pr-8">
                    <div className="flex items-center justify-between mb-4">
                        <label className="text-[12px] font-semibold text-slate-700">Reference Links</label>
                        <button
                            type="button"
                            onClick={handleAddLink}
                            className="text-blue-600 hover:text-blue-700 text-xs font-bold flex items-center gap-1.5 px-3 py-1 rounded-md hover:bg-blue-50 transition-all border border-blue-100"
                        >
                            <Plus size={14} /> Add Link
                        </button>
                    </div>
                    <div className="space-y-3">
                        {form.links.map((link, index) => (
                            <div key={index} className="flex gap-3 animate-in slide-in-from-left-2 duration-200">
                                <div className="flex-1">
                                    <input
                                        type="text"
                                        placeholder="Link Title (e.g., Documentation)"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-[inset_0_0_2px_rgba(0,0,0,0.05)] bg-white"
                                        value={link.title}
                                        onChange={(e) => handleLinkChange(index, 'title', e.target.value)}
                                    />
                                </div>
                                <div className="flex-[2]">
                                    <input
                                        type="url"
                                        placeholder="URL (https://...)"
                                        className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm shadow-[inset_0_0_2px_rgba(0,0,0,0.05)] bg-white"
                                        value={link.url}
                                        onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                                    />
                                </div>
                                <button
                                    type="button"
                                    onClick={() => handleRemoveLink(index)}
                                    className="p-2.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>
                        ))}
                    </div>
                </div>
            </form>
        </div>
    );
};

export default TaskCreate;
