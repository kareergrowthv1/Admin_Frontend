import React, { useState, useEffect } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import axios from '../../config/axios';
import { toast } from 'react-hot-toast';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const StudentCreate = () => {
    const navigate = useNavigate();
    const { id } = useParams();
    const location = useLocation();
    const isEditMode = !!id;
    const [loading, setLoading] = useState(false);
    const [organizationId, setOrganizationId] = useState(null);
    const [user, setUser] = useState(null);
    const [resumeFile, setResumeFile] = useState(null);
    const [existingResume, setExistingResume] = useState(null);
    const [departmentsList, setDepartmentsList] = useState([]);
    const [branchesList, setBranchesList] = useState([]);
    const [showVerificationModal, setShowVerificationModal] = useState(false);
    const [verificationMode, setVerificationMode] = useState('mobile'); // 'mobile' or 'otp'
    const [verificationMobile, setVerificationMobile] = useState('');
    const [verificationOtp, setVerificationOtp] = useState('');
    const [isVerifying, setIsVerifying] = useState(false);
    const [verificationError, setVerificationError] = useState('');

    const [form, setForm] = useState({
        candidate_name: '',
        email: '',
        mobile_number: '',
        register_no: '',
        dept_id: '',
        branch_id: '',
        department_name: '',
        semester: '',
        year_of_passing: '',
        status: 'Active',
        location: '',
        internal_notes: '',
    });

    useEffect(() => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            setUser(storedUser);
            const storedOrgId =
                storedUser?.organizationId ||
                storedUser?.organization?.organizationId ||
                localStorage.getItem('organizationId');
            if (storedOrgId) {
                setOrganizationId(storedOrgId);
                fetchDepartments(storedOrgId);
            }

            if (isEditMode) {
                fetchStudentData(id, storedOrgId);
            } else if (location.state) {
                // Pre-fill from navigation state
                setForm(prev => ({
                    ...prev,
                    candidate_name: location.state.candidate_name || prev.candidate_name,
                    email: location.state.email || prev.email,
                    mobile_number: location.state.mobile_number || prev.mobile_number
                }));
            }
        } catch (err) {
            console.error('Failed to read organization context:', err);
        }
    }, [id, isEditMode]);

    useEffect(() => {
        if (form.email && !isEditMode && organizationId) {
            // Only check if it's a fresh email (no name yet or from nav state)
            if (!form.candidate_name) {
                const timer = setTimeout(() => {
                    checkGlobalProfile(form.email);
                }, 800);
                return () => clearTimeout(timer);
            }
        }
    }, [form.email, organizationId, isEditMode]);

    const checkGlobalProfile = async (email) => {
        try {
            const res = await axios.get('/candidates/check-global', { 
                params: { email } 
            });
            if (res.data?.exists) {
                if (res.data.is_independent) {
                    toast.error('The candidate is already registered as an independent profile.', { duration: 5000 });
                } else {
                    toast.error(`The candidate is already registered in ${res.data.college_name}`, { duration: 5000 });
                }
                setShowVerificationModal(true);
            }
        } catch (err) {
            console.error('Error checking global profile:', err);
        }
    };

    const handleMobileVerify = async () => {
        if (!verificationMobile) return setVerificationError('Please enter mobile number');
        setVerificationError('');
        setIsVerifying(true);
        try {
            const res = await axios.post('/candidates/verify-global-mobile', {
                email: form.email,
                mobile_number: verificationMobile,
                organization_id: organizationId
            });
            if (res.data?.success && res.data?.data) {
                populateForm(res.data.data);
                setShowVerificationModal(false);
                toast.success('Profile verified and imported!');
            } else {
                setVerificationError(res.data?.message || 'Mobile number does not match our records');
            }
        } catch (err) {
            setVerificationError('Verification failed. Try OTP instead.');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleSendOTP = async () => {
        setIsVerifying(true);
        try {
            const res = await axios.post('/candidates/send-global-otp', { email: form.email });
            if (res.data?.success) {
                setVerificationMode('otp');
                toast.success('OTP sent to candidate email');
            }
        } catch (err) {
            toast.error('Failed to send OTP');
        } finally {
            setIsVerifying(false);
        }
    };

    const handleOtpVerify = async () => {
        if (!verificationOtp) return setVerificationError('Please enter OTP');
        setVerificationError('');
        setIsVerifying(true);
        try {
            const res = await axios.post('/candidates/verify-global-otp', {
                email: form.email,
                code: verificationOtp,
                organization_id: organizationId
            });
            if (res.data?.success && res.data?.data) {
                populateForm(res.data.data);
                setShowVerificationModal(false);
                toast.success('Profile verified and imported!');
            } else {
                setVerificationError(res.data?.message || 'Invalid OTP');
            }
        } catch (err) {
            setVerificationError('OTP verification failed');
        } finally {
            setIsVerifying(false);
        }
    };

    const populateForm = (data) => {
        setForm(prev => ({
            ...prev,
            candidate_name: data.candidate_name || '',
            mobile_number: data.mobile_number || '',
            register_no: data.register_no || '',
            dept_id: data.dept_id || '',
            branch_id: data.branch_id || '',
            department_name: data.department_name || '',
            semester: data.semester || '',
            year_of_passing: data.year_of_passing || '',
            location: data.location || '',
        }));
        if (data.dept_id) fetchBranches(data.dept_id);
    };

    const fetchDepartments = async (orgId) => {
        try {
            const response = await axios.get('/attendance/departments', {
                params: {}
            });
            setDepartmentsList(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching departments:', error);
        }
    };

    const fetchBranches = async (deptId) => {
        try {
            const response = await axios.get(`/attendance/branches/${deptId}`);
            setBranchesList(response.data?.data || []);
        } catch (error) {
            console.error('Error fetching branches:', error);
        }
    };

    const fetchStudentData = async (studentId, orgId) => {
        if (!orgId) return;
        setLoading(true);
        try {
            const response = await axios.get(`/candidates/${studentId}`, {
                params: {}
            });
            const data = response.data?.data || response.data;
            if (data) {
                setForm({
                    candidate_name: data.candidate_name || data.candidateName || '',
                    email: data.email || data.candidateEmail || '',
                    mobile_number: data.mobile_number || data.candidateMobileNumber || '',
                    register_no: data.register_no || data.registerNo || '',
                    dept_id: data.dept_id || '',
                    branch_id: data.branch_id || '',
                    department_name: data.department_name || data.department || '',
                    semester: data.semester || '',
                    year_of_passing: data.year_of_passing || '',
                    status: data.status || 'Active',
                    location: data.location || '',
                    internal_notes: data.internal_notes || '',
                });
                if (data.dept_id) {
                    fetchBranches(data.dept_id);
                }
                if (data.resume_filename || data.resume_url) {
                    setExistingResume({
                        name: data.resume_filename || 'Existing Resume',
                        url: data.resume_url
                    });
                }
            }
        } catch (error) {
            console.error('Error fetching student data:', error);
            toast.error('Failed to fetch student details');
        } finally {
            setLoading(false);
        }
    };

    const handleInputChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    const handleFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;
        const validTypes = [
            'application/pdf',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        ];
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
        setResumeFile(file);
        setExistingResume(null);
    };

    const handleSubmit = async (e) => {
        e?.preventDefault();

        if (!form.candidate_name.trim()) {
            toast.error('Please enter student full name');
            return;
        }
        if (!form.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!form.mobile_number.trim() || !/^\d{10}$/.test(form.mobile_number)) {
            toast.error('Please enter a valid 10-digit mobile number');
            return;
        }
        if (!form.dept_id) {
            toast.error('Please select a department');
            return;
        }
        if (!form.branch_id) {
            toast.error('Please select a branch');
            return;
        }
        if (!organizationId) {
            toast.error('Organization context missing. Please log in again.');
            return;
        }

        setLoading(true);
        try {
            const userId =
                user?.id ||
                localStorage.getItem('userId') ||
                localStorage.getItem('id') ||
                '';

            const formData = new FormData();
            formData.append('candidate_name', form.candidate_name.trim());
            formData.append('email', form.email.trim());
            formData.append('mobile_number', form.mobile_number.trim());
            if (form.register_no.trim()) formData.append('register_no', form.register_no.trim());
            if (form.dept_id) formData.append('dept_id', form.dept_id);
            if (form.branch_id) formData.append('branch_id', form.branch_id);
            if (form.department_name) formData.append('department_name', form.department_name);
            if (form.semester) formData.append('semester', parseInt(form.semester, 10));
            if (form.year_of_passing) formData.append('year_of_passing', parseInt(form.year_of_passing, 10));
            formData.append('status', form.status || 'Active');
            if (form.location.trim()) formData.append('location', form.location.trim());
            if (form.internal_notes.trim()) formData.append('internal_notes', form.internal_notes.trim());
            formData.append('organization_id', organizationId);
            formData.append('candidate_created_by', userId);

            if (resumeFile) {
                formData.append('resumeFile', resumeFile);
            }

            if (isEditMode) {
                await axios.put(`/candidates/${id}`, formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Student updated successfully!');
            } else {
                await axios.post('/candidates', formData, {
                    headers: { 'Content-Type': 'multipart/form-data' },
                });
                toast.success('Student added successfully!');
            }

            if (location.state?.fromAddCandidate) {
                navigate('/candidates/add', { 
                    state: { 
                        ...location.state.originalFormData, 
                        newlyAddedEmail: form.email 
                    } 
                });
            } else {
                navigate('/students');
            }
        } catch (error) {
            const msg =
                error.response?.data?.message ||
                error.response?.data?.error ||
                error.message ||
                `Failed to ${isEditMode ? 'update' : 'add'} student`;
            toast.error(msg);
            console.error(`Error ${isEditMode ? 'updating' : 'adding'} student:`, error);
        } finally {
            setLoading(false);
        }
    };

    const handleReset = () => {
        setForm({
            candidate_name: '',
            email: '',
            mobile_number: '',
            register_no: '',
            dept_id: '',
            branch_id: '',
            department_name: '',
            semester: '',
            year_of_passing: '',
            status: 'Active',
            location: '',
            internal_notes: '',
        });
        setResumeFile(null);
        setExistingResume(null);
    };

    return (
        <div className="space-y-0">
            {/* Top breadcrumb + action buttons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/students')}>Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/students')}>Students List</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-800 font-bold">{isEditMode ? 'Edit Student' : 'Add Student'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={handleReset}
                        className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors"
                    >
                        Reset
                    </button>
                    <PermissionWrapper feature="students" permission="write">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (isEditMode ? 'Saving Changes...' : 'Adding Student...') : (isEditMode ? 'Save Changes' : 'Add Student')}
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            {/* Main form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Personal Information */}
                <div>
                    <h3 className="text-[13px] font-bold text-slate-800 mb-4">Personal Information</h3>

                    {/* Full Name + Email in one row */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Full Name <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Arun Kumar"
                                value={form.candidate_name}
                                onChange={(e) => handleInputChange('candidate_name', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Email Address <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="email"
                                placeholder="e.g., student@college.edu"
                                value={form.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                    </div>

                    {/* Mobile + Location in one row */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Mobile Number <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="tel"
                                placeholder="10-digit mobile number"
                                value={form.mobile_number}
                                maxLength={10}
                                onChange={(e) => handleInputChange('mobile_number', e.target.value.replace(/\D/g, ''))}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Location / City
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., Bangalore, Karnataka"
                                value={form.location}
                                onChange={(e) => handleInputChange('location', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                    </div>
                </div>

                {/* Academic Information */}
                <div>
                    <h3 className="text-[13px] font-bold text-slate-800 mb-4">Academic Information</h3>

                    {/* Row 1: Register Number + Department */}
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Register Number / Roll No
                            </label>
                            <input
                                type="text"
                                placeholder="e.g., 21CS001"
                                value={form.register_no}
                                onChange={(e) => handleInputChange('register_no', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            />
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Department <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.dept_id}
                                onChange={(e) => {
                                    const deptId = e.target.value;
                                    const dept = departmentsList.find(d => d.id === deptId);
                                    handleInputChange('dept_id', deptId);
                                    handleInputChange('department_name', dept?.name || '');
                                    handleInputChange('branch_id', ''); // Reset branch
                                    if (deptId) fetchBranches(deptId);
                                }}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            >
                                <option value="">Select Department</option>
                                {departmentsList.map(d => (
                                    <option key={d.id} value={d.id}>{d.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Row 2: Branch + Semester + Year of Passing */}
                    <div className="grid grid-cols-3 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Branch / Batch <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={form.branch_id}
                                disabled={!form.dept_id}
                                onChange={(e) => {
                                    const branchId = e.target.value;
                                    const branch = branchesList.find(b => b.id === branchId);
                                    handleInputChange('branch_id', branchId);
                                    if (branch && branch.end_year) {
                                        handleInputChange('year_of_passing', branch.end_year.toString());
                                    }
                                }}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] disabled:bg-slate-50 disabled:cursor-not-allowed"
                            >
                                <option value="">Select Branch</option>
                                {branchesList.map(b => (
                                    <option key={b.id} value={b.id}>{b.name} ({b.start_year}-{b.end_year})</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Semester
                            </label>
                            <select
                                value={form.semester}
                                onChange={(e) => handleInputChange('semester', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            >
                                <option value="">Select Semester</option>
                                {[1, 2, 3, 4, 5, 6, 7, 8].map(s => (
                                    <option key={s} value={s}>Semester {s}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Year of Passing
                            </label>
                            <select
                                value={form.year_of_passing}
                                onChange={(e) => handleInputChange('year_of_passing', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            >
                                <option value="">Select Year</option>
                                {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                                    <option key={y} value={y}>{y}</option>
                                ))}
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Status
                            </label>
                            <select
                                value={form.status}
                                onChange={(e) => handleInputChange('status', e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            >
                                <option value="Active">Active</option>
                                <option value="Inactive">Inactive</option>
                            </select>
                        </div>
                    </div>
                </div>

                {/* Resume Upload */}
                <div>
                    <h3 className="text-[13px] font-bold text-slate-800 mb-4">Resume / CV</h3>
                    <div className="border-2 border-dashed border-slate-300 rounded-lg px-6 py-4 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition">
                        <input
                            type="file"
                            accept=".pdf,.docx"
                            onChange={handleFileChange}
                            className="hidden"
                            id="resumeFile"
                        />
                        <label htmlFor="resumeFile" className="cursor-pointer flex items-center justify-center gap-3">
                            {resumeFile || existingResume ? (
                                <>
                                    <svg className="w-5 h-5 text-green-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                    </svg>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-green-600 truncate max-w-[200px]">
                                            {resumeFile ? resumeFile.name : existingResume.name}
                                        </p>
                                        <p className="text-xs text-slate-400">
                                            {resumeFile ? 'Click to choose a different file' : (
                                                <span className="flex items-center gap-2">
                                                    Already uploaded • <a href={existingResume.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" onClick={(e) => e.stopPropagation()}>View Resume</a>
                                                </span>
                                            )}
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <svg className="w-5 h-5 text-slate-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                                    </svg>
                                    <div className="text-left">
                                        <p className="text-sm font-medium text-slate-700">Click to upload or drag and drop</p>
                                        <p className="text-xs text-slate-400">PDF or DOCX files only (Max 5MB)</p>
                                    </div>
                                </>
                            )}
                        </label>
                    </div>
                </div>

                {/* Internal Notes */}
                <div>
                    <h3 className="text-[13px] font-bold text-slate-800 mb-4">Additional Notes</h3>
                    <div className="mb-5">
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                            Internal Notes
                        </label>
                        <textarea
                            rows={3}
                            placeholder="Any internal remarks about this student..."
                            value={form.internal_notes}
                            onChange={(e) => handleInputChange('internal_notes', e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm resize-none shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                        />
                    </div>
                </div>
            </form>

            {/* Global Verification Modal */}
            {showVerificationModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all border border-slate-100">
                        <div className="p-8 text-center">
                            <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-6">
                                <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                                </svg>
                            </div>
                            <h3 className="text-xl font-bold text-slate-800 mb-2">Profile Already Registered</h3>
                            <p className="text-slate-500 text-[14px] leading-relaxed mb-8">
                                This candidate is already registered in our system. Please verify their identity to import their existing details.
                            </p>

                            {verificationMode === 'mobile' ? (
                                <div className="space-y-4">
                                    <div className="text-left">
                                        <label className="text-xs font-bold text-slate-700 mb-1.5 block">Mobile Number</label>
                                        <input
                                            type="text"
                                            placeholder="Enter registered mobile number"
                                            value={verificationMobile}
                                            onChange={(e) => {
                                                setVerificationMobile(e.target.value);
                                                setVerificationError('');
                                            }}
                                            className={`w-full px-4 py-3 border ${verificationError ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:ring-2 focus:ring-blue-500 text-sm`}
                                        />
                                        {verificationError && (
                                            <p className="text-red-500 text-[11px] mt-1.5 font-medium ml-1">
                                                {verificationError}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleMobileVerify}
                                        disabled={isVerifying}
                                        className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {isVerifying ? 'Verifying...' : 'Verify Mobile'}
                                    </button>
                                    <p className="text-[13px] text-slate-500">
                                        Don't have the mobile number? 
                                        <button 
                                            onClick={() => {
                                                handleSendOTP();
                                                setVerificationError('');
                                            }}
                                            className="text-blue-600 font-bold ml-1 hover:underline"
                                        >
                                            Verify via Email OTP
                                        </button>
                                    </p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="text-left">
                                        <label className="text-xs font-bold text-slate-700 mb-1.5 block">Email OTP</label>
                                        <input
                                            type="text"
                                            placeholder="Enter 6-digit code"
                                            value={verificationOtp}
                                            onChange={(e) => {
                                                setVerificationOtp(e.target.value);
                                                setVerificationError('');
                                            }}
                                            className={`w-full px-4 py-3 border ${verificationError ? 'border-red-500' : 'border-slate-300'} rounded-xl focus:ring-2 focus:ring-blue-500 text-sm tracking-[0.5em] text-center font-bold`}
                                            maxLength={6}
                                        />
                                        {verificationError && (
                                            <p className="text-red-500 text-[11px] mt-1.5 font-medium text-center">
                                                {verificationError}
                                            </p>
                                        )}
                                    </div>
                                    <button
                                        onClick={handleOtpVerify}
                                        disabled={isVerifying}
                                        className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all disabled:opacity-50"
                                    >
                                        {isVerifying ? 'Verifying...' : 'Confirm OTP'}
                                    </button>
                                    <button 
                                        onClick={() => {
                                            setVerificationMode('mobile');
                                            setVerificationError('');
                                        }}
                                        className="text-[13px] text-blue-600 font-bold hover:underline"
                                    >
                                        Back to Mobile Verification
                                    </button>
                                </div>
                            )}

                            <div className="mt-8 pt-6 border-t border-slate-100">
                                <button
                                    onClick={() => setShowVerificationModal(false)}
                                    className="text-slate-400 font-medium hover:text-slate-600 transition-all text-sm"
                                >
                                    I'll enter details manually
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default StudentCreate;
