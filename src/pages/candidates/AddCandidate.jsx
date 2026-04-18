import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import axios, { candidateApi } from '../../config/axios';
import { clearApiCache } from '../../utils/apiCache';
import { toast } from 'react-hot-toast';
import { Upload, User, X } from 'lucide-react';
import PermissionWrapper from '../../components/common/PermissionWrapper';
import { extractTextFromFile } from '../../utils/resumeExtractor';

const AddCandidate = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const preSelectedPosition = location.state?.position;
    const [loading, setLoading] = useState(false);
    const [positions, setPositions] = useState([]);
    const [questionSets, setQuestionSets] = useState([]);
    const [organizationId, setOrganizationId] = useState(null);
    const [user, setUser] = useState(null);
    const [generatedLink, setGeneratedLink] = useState('');
    const [showQuestionSetDropdown, setShowQuestionSetDropdown] = useState(false);
    const [questionSetDisplayCode, setQuestionSetDisplayCode] = useState('');
    const [linkValidityType, setLinkValidityType] = useState('DAYS'); // DAYS or CUSTOM
    const [showPublicLinkModal, setShowPublicLinkModal] = useState(false);
    const [isWhatsAppUsed, setIsWhatsAppUsed] = useState(false);
    const [isFetchingEmail, setIsFetchingEmail] = useState(false);
    const [existingCandidateId, setExistingCandidateId] = useState(null);
    const [candidateNotFound, setCandidateNotFound] = useState(false);
    const [emailChecked, setEmailChecked] = useState(false);
    const [showNotFoundModal, setShowNotFoundModal] = useState(false);

    const questionSetDropdownRef = useRef(null);
    const emailTimeoutRef = useRef(null);
    const isMounted = useRef(true);
    const [isCollegeUser, setIsCollegeUser] = useState(true);
    const [skills, setSkills] = useState([]);
    const [skillInput, setSkillInput] = useState('');


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



    const [formData, setFormData] = useState({
        position_id: preSelectedPosition?.id || '',
        position_name: preSelectedPosition?.title || '',
        question_set_id: '',
        link_validity_days: 7,
        link_start_datetime: '',
        link_end_datetime: '',
        // Private link fields
        candidate_email: '',
        candidate_name: '',
        internal_notes: '',
        resume_url: '',
        resume_filename: '',
        whatsapp_number: '',
        register_no: '',
        department: '',
        semester: '',
        year_of_passing: '',
        location: '',
        total_experience: '',
        current_organization: '',
        current_location: '',
        current_ctc: '',
        expected_ctc: '',
        academic_year: 'Final Year',
        extracted_raw_text: ''
    });

    const [collegeName, setCollegeName] = useState('');

    useEffect(() => {
        isMounted.current = true;
        try {
            const storedOrgId = localStorage.getItem('organizationId');
            if (storedOrgId) {
                setOrganizationId(storedOrgId);
                fetchOrgDetails(storedOrgId);
            }
            const storedUser = localStorage.getItem('admin_user');
            if (storedUser) {
                const parsedUser = JSON.parse(storedUser);
                setUser(parsedUser);
                setIsCollegeUser(parsedUser.isCollege === true);
            }
        } catch (err) {
            console.error('Failed to read organization ID:', err);
        }
        return () => {
            isMounted.current = false;
            if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
        };
    }, []);

    // Handle return state from StudentCreate
    useEffect(() => {
        if (location.state?.newlyAddedEmail) {
            const email = location.state.newlyAddedEmail;
            setFormData(prev => ({
                ...prev,
                candidate_email: email,
                position_id: location.state.position_id || prev.position_id,
                position_name: location.state.position_name || prev.position_name,
                question_set_id: location.state.question_set_id || prev.question_set_id,
                link_validity_days: location.state.link_validity_days || prev.link_validity_days,
                internal_notes: location.state.internal_notes || prev.internal_notes
            }));
            autoFetchCandidate(email);
        }
    }, [location.state]);

    const fetchOrgDetails = async (orgId) => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const isCollege = storedUser.isCollege === true;
            const endpoint = isCollege ? `/admins/college-details/${orgId}` : `/admins/company-details/${orgId}`;
            
            const response = await axios.get(endpoint);
            if (response.data?.success && response.data?.data) {
                const details = response.data.data;
                setCollegeName(details.collegeName || details.companyName);
            }
        } catch (error) {
            console.warn('Failed to fetch organization details:', error);
        }
    };

    useEffect(() => {
        if (organizationId) {
            fetchPositions();
        }
    }, [organizationId]);



    useEffect(() => {
        if (preSelectedPosition?.id) {
            fetchQuestionSets(preSelectedPosition.id);
        }
    }, [preSelectedPosition]);

    // Close dropdown when clicking outside or pressing ESC
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (questionSetDropdownRef.current && !questionSetDropdownRef.current.contains(event.target)) {
                setShowQuestionSetDropdown(false);
            }
        };

        const handleEscKey = (event) => {
            if (event.key === 'Escape') {
                setShowQuestionSetDropdown(false);
            }
        };

        if (showQuestionSetDropdown) {
            document.addEventListener('mousedown', handleClickOutside);
            document.addEventListener('keydown', handleEscKey);
        }

        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
            document.removeEventListener('keydown', handleEscKey);
        };
    }, [showQuestionSetDropdown]);

    const fetchPositions = async () => {
        try {
            const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
            const isCollege = storedUser.isCollege === true;
            
            if (isCollege) {
                const response = await axios.get('/admins/positions', {
                    params: { page: 0, size: 1000 }
                });
                const responseData = response.data || {};
                const rawPositions = responseData.content || responseData.data || responseData.positions || [];
                const normalized = rawPositions
                    .map((position) => ({
                        id: position.id || position.position_id,
                        title: position.title || position.position_name,
                        code: position.code || position.position_code,
                        createdAt: position.createdAt || position.created_at,
                        questionSetCount: position.questionSetCount ?? 0
                    }))
                    .filter((position) => position.id && position.title && (position.questionSetCount || 0) > 0);
    
                normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                setPositions(normalized);
            } else {
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
                        questionSetCount: 1 // Default to allow selection
                    }))
                    .filter((job) => job.id && job.title);
    
                normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
                setPositions(normalized);
            }
        } catch (error) {
            console.error('Error fetching jobs/positions:', error);
            toast.error('Failed to load requirement details');
        }
    };
    const fetchQuestionSets = async (positionId) => {
        try {
            const response = await axios.get('/admins/question-sets', {
                params: {
                    positionId,
                    page: 0,
                    size: 1000
                }
            });
            const responseData = response.data || {};
            const rawSets = responseData.content || responseData.data || [];
            const normalized = rawSets
                .map((qs) => ({
                    id: qs.id || qs.question_set_id,
                    code: qs.question_set_code || qs.questionSetCode,
                    createdAt: qs.created_at || qs.createdAt
                }))
                .filter((qs) => qs.id);

            normalized.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
            setQuestionSets(normalized);

            // Auto-select the latest question set (first one after sorting)
            if (normalized.length > 0) {
                const latestQSet = normalized[0];
                setFormData(prev => ({ ...prev, question_set_id: latestQSet.id }));
                setQuestionSetDisplayCode(latestQSet.code || latestQSet.id);
            } else {
                setFormData(prev => ({ ...prev, question_set_id: '' }));
                setQuestionSetDisplayCode('');
                const backendMessage = responseData.message || 'No question sets found for this position';
                toast.error(backendMessage);
            }
        } catch (error) {
            console.error('Error fetching question sets:', error);
            toast.error('Failed to load question sets');
        }
    };

    const handlePositionChange = (e) => {
        const selectedPosition = positions.find(p => p.id === e.target.value);
        setFormData({
            ...formData,
            position_id: e.target.value,
            position_name: selectedPosition?.title || '',
            question_set_id: ''
        });
        if (e.target.value) {
            fetchQuestionSets(e.target.value);
        } else {
            setQuestionSets([]);
        }
    };

    const handleFileChange = async (e) => {
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

            // Frontend Extraction (Properly done in React)
            let extractedRawText = '';
            try {
                extractedRawText = await extractTextFromFile(file);
                console.log(`[AddCandidate] Frontend extracted ${extractedRawText.length} characters`);
            } catch (err) {
                console.warn('[AddCandidate] Frontend extraction failed:', err);
            }

            setFormData({ ...formData, resume_file: file, extracted_raw_text: extractedRawText });
        }
    };

    const autoFetchCandidate = async (email) => {
        if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
            toast.error('Please enter a valid email address');
            return;
        }
        if (!organizationId) {
            console.error('Organization ID missing in autoFetchCandidate');
            return;
        }

        setIsFetchingEmail(true);
        try {
            const response = await axios.get(`/candidates/auto-fetch/${email}`, {
                params: { organization_id: organizationId }
            });

            if (isMounted.current && response.data.success && response.data.data) {
                const candidate = response.data.data;
                const cid = candidate.candidate_id || candidate.id;
                if (cid) setExistingCandidateId(cid);
                setCandidateNotFound(false);
                setEmailChecked(true);
                setShowNotFoundModal(false);
                const raw = (candidate.mobile_number || '').replace(/\D/g, '');
                const tenDigits = raw.length >= 10 ? raw.slice(-10) : raw;
                setFormData(prev => ({
                    ...prev,
                    candidate_name: candidate.candidate_name || prev.candidate_name,
                    candidate_email: candidate.email || prev.candidate_email,
                    whatsapp_number: tenDigits || prev.whatsapp_number,
                    internal_notes: candidate.internal_notes || prev.internal_notes,
                    resume_url: candidate.resume_url || '',
                    resume_filename: candidate.resume_filename || ''
                }));
                toast.success('Candidate details fetched from records.');

                if (tenDigits.length === 10) {
                    checkWhatsApp(tenDigits, cid);
                }
            } else if (isMounted.current) {
                setExistingCandidateId(null);
                setCandidateNotFound(true);
                setEmailChecked(true);
                setShowNotFoundModal(true);
            }
        } catch (error) {
            console.error('Error auto-fetching candidate:', error);
            if (isMounted.current) {
                setExistingCandidateId(null);
                setCandidateNotFound(true);
                setEmailChecked(true);
                setShowNotFoundModal(true);
            }
        } finally {
            if (isMounted.current) {
                setIsFetchingEmail(false);
            }
        }
    };

    const getResumeUrl = (cId) => {
        if (!cId) return '';
        const orgId = organizationId || localStorage.getItem('organizationId');
        return `${import.meta.env.VITE_CANDIDATE_API_URL}/candidates/${cId}/resume/download?organization_id=${orgId}`;
    };

    const checkWhatsApp = async (whatsapp, candidateIdOverride = null) => {
        if (!whatsapp || whatsapp.length !== 10) {
            setIsWhatsAppUsed(false);
            return;
        }
        if (!organizationId) return;

        try {
            const params = {};
            const cid = candidateIdOverride ?? existingCandidateId;
            if (cid) params.candidate_id = cid;
            const response = await axios.get(`/candidates/check-whatsapp/${whatsapp}`, { params });

            if (response.data.success) {
                setIsWhatsAppUsed(!response.data.available);
                if (!response.data.available) {
                    toast.error('WhatsApp number already assigned to another candidate.');
                }
            }
        } catch (error) {
            console.error('Error checking WhatsApp availability:', error);
        }
    };

    const validateForm = () => {
        const storedUser = JSON.parse(localStorage.getItem('admin_user') || '{}');
        const isCollege = storedUser.isCollege === true;

        if (!formData.position_id) {
            toast.error(isCollege ? 'Please select a position' : 'Please select a job');
            return false;
        }

        if (isCollege) {
            if (!formData.question_set_id) {
                if (questionSets.length === 0) {
                    toast.error('No question sets available. Please create a question set for this position first.');
                } else {
                    toast.error('Please select a question set');
                }
                return false;
            }
            if (!formData.link_validity_days || formData.link_validity_days < 1) {
                toast.error('Please enter valid link validity days');
                return false;
            }
            if (!formData.candidate_email) {
                toast.error('Please enter candidate email');
                return false;
            }
            if (!formData.candidate_name) {
                toast.error('Please enter candidate name');
                return false;
            }
            if (!formData.whatsapp_number) {
                toast.error('Please enter WhatsApp number');
                return false;
            }
            if (!/^\d{10}$/.test(String(formData.whatsapp_number).replace(/\D/g, ''))) {
                toast.error('Please enter a valid 10-digit WhatsApp number');
                return false;
            }
            if (!formData.resume_file && !existingCandidateId) {
                toast.error('Please upload candidate resume');
                return false;
            }
        } else {
            // ATS Validations
            if (!formData.candidate_name) { toast.error('Applicant Name is required'); return false; }
            if (!formData.candidate_email) { toast.error('Email ID is required'); return false; }
            if (!formData.whatsapp_number || !/^\d{10}$/.test(String(formData.whatsapp_number).replace(/\D/g, ''))) {
                toast.error('A valid 10-digit Phone Number is required'); return false;
            }
            if (!formData.total_experience) { toast.error('Relevant Experience is required'); return false; }
            if (!formData.current_organization) { toast.error('Present Company is required'); return false; }
            if (!formData.current_location) { toast.error('Current Location is required'); return false; }
            if (!formData.current_ctc) { toast.error('Current CTC is required'); return false; }
            if (!formData.expected_ctc) { toast.error('Expected CTC is required'); return false; }
        }

        return true;
    };

    const handleGeneratePublicLink = async () => {
        if (!formData.position_id || !formData.question_set_id) {
            toast.error('Please select position and question set first');
            return;
        }

        setLoading(true);
        try {
            // Get tenantId from localStorage (as seen in user screenshot)
            const tenantDb = localStorage.getItem('tenantDb');

            // Generate public link with token
            const response = await axios.post('/candidates/public-link', {
                tenant_id: tenantDb, // Pass explicit tenant database
                position_id: formData.position_id,
                question_set_id: formData.question_set_id,
                link_validity_days: linkValidityType === 'DAYS' ? formData.link_validity_days : null,
                link_start_datetime: linkValidityType === 'CUSTOM' ? formData.link_start_datetime : null,
                link_end_datetime: linkValidityType === 'CUSTOM' ? formData.link_end_datetime : null
            });

            const link = response.data.data.public_link || response.data.data.link;
            setGeneratedLink(link);
            setShowPublicLinkModal(true);
            toast.success('Public link generated successfully!');
        } catch (error) {
            console.error('Error generating public link:', error);
            toast.error(error.response?.data?.message || 'Failed to generate public link');
        } finally {
            setLoading(false);
        }
    };

    const copyToClipboard = () => {
        navigator.clipboard.writeText(generatedLink);
        toast.success('Link copied to clipboard!');
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validateForm()) return;

        if (!organizationId) {
            toast.error('Organization context is required. Please log in again or refresh.');
            return;
        }

        setLoading(true);



        let candidateId = null;

        // ──────────────────────────────────────────────────────────────────
        // Check if candidate already exists: GET /candidates/auto-fetch/:email (AdminBackend)
        // If found, use candidate_id and skip POST /candidates/add.
        // ──────────────────────────────────────────────────────────────────
        try {
            const emailTrim = (formData.candidate_email || '').trim();
            if (emailTrim && organizationId) {
                const autoRes = await axios.get(`/candidates/auto-fetch/${encodeURIComponent(emailTrim)}`, {
                    params: { organization_id: organizationId }
                });
                if (autoRes.data?.success && autoRes.data?.data?.candidate_id) {
                    candidateId = autoRes.data.data.candidate_id;
                    console.log('✅ Candidate already exists (auto-fetch), using existing id:', candidateId);
                }
            }
        } catch (e) {
            // 404 or error: no existing candidate, proceed to add
            console.warn('Auto-fetch: no existing candidate or error', e?.response?.data?.message || e.message);
        }

        // ──────────────────────────────────────────────────────────────────
        // STEP 1 (only if new): POST /candidates (Admin Backend Port 8002)
        // If candidateId set from auto-fetch, skip this and go to position-candidate linking.
        // ──────────────────────────────────────────────────────────────────
        if (!candidateId) {
            try {
                const formDataToSend = new FormData();
                const userId = localStorage.getItem('userId') || localStorage.getItem('id') || localStorage.getItem('ID') || '';
                const digitsOnly = (formData.whatsapp_number || '').replace(/\D/g, '');

                formDataToSend.append('candidate_name', formData.candidate_name);
                formDataToSend.append('email', formData.candidate_email);
                formDataToSend.append('mobile_number', digitsOnly.length >= 10 ? digitsOnly.slice(-10) : digitsOnly);
                formDataToSend.append('candidate_created_by', userId);
                formDataToSend.append('organization_id', organizationId || '');
                formDataToSend.append('position_name', formData.position_name || '');
                // Add fields that may be initialized in formData but are required for college_candidates creation if any
                formDataToSend.append('department_name', '');
                formDataToSend.append('dept_id', '');
                formDataToSend.append('branch_id', '');
                formDataToSend.append('register_no', '');

                if (formData.resume_file) {
                    formDataToSend.append('resumeFile', formData.resume_file);
                }
                if (formData.extracted_raw_text) {
                    formDataToSend.append('extractedText', formData.extracted_raw_text);
                }

                const step1Res = await axios.post('/candidates', formDataToSend, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                const step1Data = step1Res.data;
                // /candidates returns { success, message, data: { candidateId: '...', ... } } or similar
                candidateId = step1Data?.data?.id || step1Data?.data?.candidate_id || step1Data?.data?.candidateId || step1Data?.candidate_id || step1Data?.id;
                if (!candidateId) {
                    throw new Error('Response missing candidate id');
                }
                console.log('✅ Step 1 (candidates) OK:', JSON.stringify({ candidateId }));
            } catch (err) {
                const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to add candidate';
                toast.error(msg, { duration: 6000 });
                setLoading(false);
                return;
            }
        }

        // ──────────────────────────────────────────────────────────────────
        // Compute link validity window (shared for Steps 2 & 3)
        // ──────────────────────────────────────────────────────────────────
        const now = new Date();
        let linkActiveAt, linkExpiresAt;

        if (linkValidityType === 'CUSTOM' && formData.link_start_datetime && formData.link_end_datetime) {
            linkActiveAt = new Date(formData.link_start_datetime).toISOString();
            linkExpiresAt = new Date(formData.link_end_datetime).toISOString();
        } else {
            linkActiveAt = now.toISOString();
            const expiry = new Date(now);
            expiry.setDate(expiry.getDate() + (formData.link_validity_days || 7));
            expiry.setHours(23, 29, 59, 999);
            linkExpiresAt = expiry.toISOString();
        }

        const userId = localStorage.getItem('userId') || localStorage.getItem('id') || localStorage.getItem('ID');

        // ──────────────────────────────────────────────────────────────────
        // STEP 2: POST /position-candidates/add
        // Creates the tenant-specific mapping (candidate ↔ position)
        // ──────────────────────────────────────────────────────────────────
        let positionCandidateId = null;
        try {
            const step2Payload = {
                positionId: formData.position_id,
                candidateId: candidateId,
                questionSetId: formData.question_set_id,
                linkActiveAt: linkActiveAt,
                linkExpiresAt: linkExpiresAt,
                interviewScheduledBy: userId,
                createdBy: userId,
                recommendationStatus: 'INVITED',
                positionTitle: formData.position_name || null,
                organizationId: organizationId || localStorage.getItem('organizationId') || null,
                actorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin'
            };
            const step2Res = await axios.post('/position-candidates/add', step2Payload);
            positionCandidateId = step2Res.data?.data?.id;
            console.log('✅ Step 2 (position-candidates) OK:', JSON.stringify({ positionCandidateId }));

            if (formData.resume_file && organizationId) {
                try {
                    const extractFd = new FormData();
                    extractFd.append('file', formData.resume_file);
                    extractFd.append('candidateId', candidateId);
                    extractFd.append('positionId', formData.position_id);
                    extractFd.append('organizationId', organizationId);
                    if (formData.extracted_raw_text) {
                        extractFd.append('extractedText', formData.extracted_raw_text);
                    }
                    const token = localStorage.getItem('token');
                    const client = localStorage.getItem('client');
                    const headers = {};
                    if (token) headers.Authorization = `Bearer ${token.replace(/"/g, '')}`;
                    if (client) headers['X-Tenant-Id'] = client;
                    await axios.post('/extract/resume', extractFd, { headers });
                } catch (e) {
                    console.warn('Resume extract failed:', e?.response?.data?.message || e.message);
                }
            }
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to link candidate to position';
            if (err.response?.status === 409) {
                toast.error('Candidate is already linked to this position.');
            } else if (err.response?.status === 402 || err.response?.data?.creditError) {
                toast.error('Insufficient interview credits. Please purchase more credits to add candidates.');
            } else {
                toast.error(msg, { duration: 6000 });
            }
            setLoading(false);
            return;
        }

        // ──────────────────────────────────────────────────────────────────
        // STEP 2.5: POST /position-candidates/score-resume (Resume ATS)
        // Saves score, sets status from AI thresholds (INVITED / RESUME_REJECTED), creates private link if INVITED.
        // Show score and status in UI immediately (no wait).
        // ──────────────────────────────────────────────────────────────────
        let recommendationStatus = 'INVITED';
        try {
            const scoreRes = await axios.post('/position-candidates/score-resume', {
                positionCandidateId,
                candidateId,
                positionId: formData.position_id,
                organizationId: organizationId || undefined,
                companyName: collegeName || undefined,
                positionName: formData.position_name || undefined,
                candidateName: formData.candidate_name || undefined,
                actorName: `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'Admin',
                resumeText: formData.extracted_raw_text || undefined
            });
            const data = scoreRes.data?.data || {};
            recommendationStatus = data.recommendationStatus || 'INVITED';
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Resume scoring skipped';
            toast.error(msg, { duration: 5000 });
            // Continue to step 3 – candidate is already linked; score can be retried later
        }

        // ──────────────────────────────────────────────────────────────────
        // STEP 3: POST /ai-assistant/schedule-interview (only if INVITED — private link already saved by backend)
        // Reference: same as ref; invite email / link sent only when status is INVITED.
        // ──────────────────────────────────────────────────────────────────
        if (recommendationStatus === 'INVITED') {
            try {
                const clientId = localStorage.getItem('client') || '';
                const step3Payload = {
                    candidateId,
                    email: formData.candidate_email,
                    positionId: formData.position_id,
                    questionSetId: formData.question_set_id,
                    clientId,
                    interviewPlatform: 'BROWSER',
                    linkActiveAt,
                    linkExpiresAt,
                    createdBy: userId,
                    sendInviteBy: 'EMAIL',
                    candidateName: formData.candidate_name,
                    companyName: collegeName,
                    organizationId,
                    positionName: formData.position_name
                };
                await axios.post('/ai-assistant/schedule-interview', step3Payload);
                console.log('✅ Step 3 (schedule-interview) OK');
            } catch (err) {
                const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to schedule interview';
                toast.error(msg, { duration: 6000 });
                setLoading(false);
                return;
            }
        }

        // ──────────────────────────────────────────────────────────────────
        // STEP 4: POST /candidates/assessment-summaries
        // Round 1 = General, Round 2 = Position, Round 3 = Coding, Round 4 = Aptitude (from question section)
        // ──────────────────────────────────────────────────────────────────
        try {
            let round1Assigned = false;
            let round2Assigned = false;
            let round3Assigned = false;
            let round4Assigned = false;
            let totalDuration = '26:30';

            try {
                const sectionRes = await axios.get(`/admins/question-sections/question-set/${formData.question_set_id}`);
                const sections = Array.isArray(sectionRes.data) ? sectionRes.data : (sectionRes.data?.data || sectionRes.data?.content || []);
                const section = Array.isArray(sections) && sections.length > 0 ? sections[0] : null;
                if (section) {
                    const gen = section.generalQuestions || {};
                    const pos = section.positionSpecificQuestions || {};
                    const genList = gen.questions || [];
                    const posList = pos.questions || [];
                    const codingList = section.codingQuestions || [];
                    const aptitudeList = section.aptitudeQuestions || [];
                    round1Assigned = genList.length > 0;
                    round2Assigned = posList.length > 0;
                    round3Assigned = codingList.length > 0;
                    round4Assigned = aptitudeList.length > 0;
                    if (section.totalDuration) totalDuration = section.totalDuration;
                }
            } catch (_) {}

            const totalRounds = [round1Assigned, round2Assigned, round3Assigned, round4Assigned].filter(Boolean).length;

            const step4Payload = {
                positionId: formData.position_id,
                candidateId: candidateId,
                questionId: formData.question_set_id,
                totalRoundsAssigned: totalRounds || 1,
                totalRoundsCompleted: 0,
                round1Assigned: round1Assigned,
                round1Completed: false,
                round2Assigned: round2Assigned,
                round2Completed: false,
                round3Assigned: round3Assigned,
                round3Completed: false,
                round4Assigned: round4Assigned,
                round4Completed: false,
                isAssessmentCompleted: false,
                isReportGenerated: false,
                totalInterviewTime: totalDuration
            };
            const step4Res = await axios.post('/candidates/assessment-summaries', step4Payload);
            console.log('✅ Step 4 (candidates/assessment-summaries) OK:', JSON.stringify({ id: step4Res.data?.data?.id }));
        } catch (err) {
            const msg = err.response?.data?.message || err.response?.data?.error || err.message || 'Failed to create assessment summary';
            toast.error(msg, { duration: 6000 });
            setLoading(false);
            return;
        }

        setLoading(false);
        toast.success('Candidate invited successfully. All steps completed.');
        clearApiCache();
        navigate('/candidates');
    };

    const handleQuickAddSubmit = async (e) => {
        e.preventDefault();
        if (!quickAddForm.candidate_name || !quickAddForm.email || !quickAddForm.mobile_number || !quickAddForm.dept_id || !quickAddForm.branch_id) {
            toast.error('Please fill all required fields');
            return;
        }

        setQuickAddLoading(true);
        try {
            const userId = localStorage.getItem('userId') || localStorage.getItem('id') || '';
            const payload = {
                ...quickAddForm,
                candidate_created_by: userId,
                status: 'Active'
            };

            await axios.post('/candidates', payload);
            toast.success('Student added to organization successfully!');
            setShowQuickAddModal(false);
            // Re-fetch details to populate main form
            autoFetchCandidate(quickAddForm.email);
        } catch (error) {
            console.error('Error adding student:', error);
            toast.error(error.response?.data?.message || 'Failed to add student');
        } finally {
            // No-op
        }
    };

    return (
        <>
            <div className="space-y-0">
                {/* Top breadcrumb + action buttons */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/candidates')}>Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    <span className="hover:text-slate-600 cursor-pointer" onClick={() => navigate('/candidates')}>Candidates List</span>
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-800 font-bold">
                    {formData.position_name ? `Add Candidate for ${formData.position_name}` : 'Add Candidate'}
                </span>
                </div>
                <div className="flex items-center gap-3">
                    <button className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-slate-400 hover:bg-slate-50 transition-colors">
                        <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h.01M12 12h.01M19 12h.01M6 12a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0zm7 0a1 1 0 11-2 0 1 1 0 012 0z" />
                        </svg>
                    </button>
                    <PermissionWrapper feature="candidates" permission="write">
                        <button
                            type="button"
                            onClick={handleGeneratePublicLink}
                            disabled={loading || !formData.position_id || !formData.question_set_id}
                            className="px-6 py-2 text-xs font-bold rounded-lg bg-white border border-slate-200 text-[#475569] hover:bg-slate-50 shadow-sm transition-all disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-white"
                        >
                            {loading ? 'Loading...' : 'Generate Public Link'}
                        </button>
                    </PermissionWrapper>
                    <PermissionWrapper feature="candidates" permission="write">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className={`px-6 py-2 text-xs font-bold rounded-lg transition-all ${
                                emailChecked && candidateNotFound
                                    ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-lg shadow-amber-500/20'
                                    : 'bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-lg shadow-blue-500/20'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                        >
                            {loading ? 'Adding Candidate...' : 'Add Candidate'}
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            {/* Main form */}
            <form onSubmit={handleSubmit} className="space-y-8">
                {/* Assessment Configuration Title */}
                <h3 className="text-[13px] font-bold text-slate-800 mb-4">Assessment Configuration</h3>

                {/* Position and Question Set - Same Row */}
                <div className="grid grid-cols-2 gap-4 mb-5">
                    <div>
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                            Select Position <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={formData.position_id}
                            onChange={handlePositionChange}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            required
                        >
                            <option value="">Select position</option>
                            {positions.map(position => (
                                <option key={position.id} value={position.id}>
                                    {position.code ? `${position.code} - ${position.title}` : position.title}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="relative" ref={questionSetDropdownRef}>
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                            Question Set Code <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={questionSetDisplayCode}
                            onClick={() => formData.position_id && questionSets.length > 0 && setShowQuestionSetDropdown(!showQuestionSetDropdown)}
                            onChange={(e) => setQuestionSetDisplayCode(e.target.value)}
                            className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                            placeholder={
                                !formData.position_id
                                    ? 'Select Position First'
                                    : questionSets.length === 0
                                        ? 'No question sets found'
                                        : 'Click to select question set'
                            }
                            required
                            disabled={!formData.position_id || questionSets.length === 0}
                            readOnly
                        />
                        {showQuestionSetDropdown && questionSets.length > 0 && (
                            <div className="absolute z-10 w-full mt-1 bg-white border border-slate-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {questionSets.map(qs => (
                                    <div
                                        key={qs.id}
                                        onClick={() => {
                                            setFormData({ ...formData, question_set_id: qs.id });
                                            setQuestionSetDisplayCode(qs.code || qs.id);
                                            setShowQuestionSetDropdown(false);
                                        }}
                                        className={`px-4 py-2.5 text-sm cursor-pointer hover:bg-blue-50 transition-colors ${formData.question_set_id === qs.id ? 'bg-blue-100 font-semibold' : ''
                                            }`}
                                    >
                                        {qs.code || qs.id}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {/* Link Validity */}
                {linkValidityType === 'DAYS' ? (
                    <div className="grid grid-cols-2 gap-4 mb-5">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Link Validity <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={linkValidityType}
                                onChange={(e) => setLinkValidityType(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                required
                            >
                                <option value="DAYS">Days</option>
                                <option value="CUSTOM">Custom Date</option>
                            </select>
                        </div>
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Link Expires In (Days) <span className="text-red-500">*</span>
                            </label>
                            <input
                                type="number"
                                min="1"
                                max="365"
                                value={formData.link_validity_days}
                                onChange={(e) => setFormData({ ...formData, link_validity_days: parseInt(e.target.value) })}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                placeholder="7"
                                required
                            />
                        </div>
                    </div>
                ) : (
                    <>
                        <div className="mb-5">
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Link Validity <span className="text-red-500">*</span>
                            </label>
                            <select
                                value={linkValidityType}
                                onChange={(e) => setLinkValidityType(e.target.value)}
                                className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm appearance-none cursor-pointer shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                required
                            >
                                <option value="DAYS">Days</option>
                                <option value="CUSTOM">Custom Date</option>
                            </select>
                        </div>
                        <div className="grid grid-cols-2 gap-4 mb-5">
                            <div>
                                <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                    Start Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.link_start_datetime}
                                    onChange={(e) => setFormData({ ...formData, link_start_datetime: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                    required={linkValidityType === 'CUSTOM'}
                                />
                            </div>
                            <div>
                                <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                    End Date <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="datetime-local"
                                    value={formData.link_end_datetime}
                                    onChange={(e) => setFormData({ ...formData, link_end_datetime: e.target.value })}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                    required={linkValidityType === 'CUSTOM'}
                                />
                            </div>
                        </div>
                    </>
                )}

                {/* Candidate Details Fields */}
                <div className="space-y-5">
                    <h3 className="text-[13px] font-bold text-slate-800 mb-4">Candidate Details</h3>

                    {/* COLLEGE Candidate Details */}
                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                Candidate Email <span className="text-red-500">*</span>
                            </label>
                            <div className="relative group">
                                <input
                                    type="email"
                                    value={formData.candidate_email}
                                    onChange={(e) => {
                                        setFormData({ ...formData, candidate_email: e.target.value });
                                        setExistingCandidateId(null);
                                        setCandidateNotFound(false);
                                        setEmailChecked(false);
                                        if (emailTimeoutRef.current) clearTimeout(emailTimeoutRef.current);
                                    }}
                                    onBlur={(e) => {
                                        const emailValue = e.target.value.trim();
                                        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                                        if (emailValue && emailRegex.test(emailValue) && !emailChecked) {
                                            autoFetchCandidate(emailValue);
                                        }
                                    }}
                                    className="w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-600 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] pr-16"
                                    placeholder="Enter candidate email"
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => autoFetchCandidate(formData.candidate_email)}
                                    disabled={isFetchingEmail || !formData.candidate_email}
                                    className="absolute right-2 top-1/2 -translate-y-1/2 px-2 py-1 text-[10px] font-bold bg-slate-100 text-slate-600 rounded hover:bg-blue-600 hover:text-white transition-all disabled:opacity-50"
                                >
                                    {isFetchingEmail ? '...' : emailChecked ? 'Checked' : 'Verify'}
                                </button>
                            </div>
                                </div>
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
                            </div>



                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                        WhatsApp Number <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="tel"
                                        value={formData.whatsapp_number}
                                        onChange={(e) => {
                                            const value = e.target.value.replace(/\D/g, '');
                                            setFormData({ ...formData, whatsapp_number: value });
                                            if (value.length === 10) {
                                                checkWhatsApp(value);
                                            } else {
                                                setIsWhatsAppUsed(false);
                                            }
                                        }}
                                        className={`w-full px-4 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm shadow-[inset_0_0_3px_rgba(0,0,0,0.1)] ${isWhatsAppUsed ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                                        placeholder="Enter 10-digit WhatsApp number"
                                        maxLength="10"
                                        required
                                    />
                                    {isWhatsAppUsed && (
                                        <p className="text-[10px] font-bold text-red-500 mt-1">Already Used</p>
                                    )}
                                </div>

                                <div>
                                    <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
                                        Upload Resume (PDF, Word) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="file"
                                        onChange={handleFileChange}
                                        accept=".pdf,.docx"
                                        className="w-full pl-3 pr-3 py-2.5 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm file:mr-4 file:py-0.5 file:pl-0.5 file:pr-2 file:rounded-md file:border-0 file:text-xs file:font-normal file:bg-gray-300 file:text-black hover:file:bg-gray-400 shadow-[inset_0_0_3px_rgba(0,0,0,0.1)]"
                                        required={!existingCandidateId && !formData.resume_url}
                                    />
                                    {formData.resume_file ? (
                                        <p className="text-xs text-emerald-600 mt-1">✓ {formData.resume_file.name}</p>
                                    ) : existingCandidateId && formData.resume_url ? (
                                        <div className="mt-2 flex items-center gap-2">
                                            <p className="text-xs text-blue-600 font-medium">
                                                Current Resume: {formData.resume_filename || 'Available'}
                                            </p>
                                            <a 
                                                href={getResumeUrl(existingCandidateId)}
                                                target="_blank" 
                                                rel="noopener noreferrer"
                                                className="text-[10px] bg-blue-50 text-blue-600 px-2 py-0.5 rounded hover:bg-blue-100 transition-colors"
                                            >
                                                View
                                            </a>
                                        </div>
                                    ) : null}
                                </div>
                            </div>

                    {/* Internal Notes */}
                    <div className="mt-4">
                        <label className="text-[12px] font-semibold text-slate-700 mb-1.5 block">
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
                </div>
            </form>


            {/* Public Link Modal */}
            {showPublicLinkModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowPublicLinkModal(false)}>
                    <div className="bg-white rounded-xl shadow-2xl p-6 max-w-2xl w-full mx-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-lg font-bold text-slate-800">Public Assessment Link</h3>
                            <button
                                onClick={() => setShowPublicLinkModal(false)}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <p className="text-sm text-slate-600 mb-4">
                            Share this link with candidates to allow them to self-register and take the assessment.
                        </p>
                        <div className="mb-4">
                            <label className="text-xs font-semibold text-slate-700 mb-2 block">
                                Generated Public Link
                            </label>
                            <div className="flex gap-2">
                                <input
                                    type="text"
                                    value={generatedLink}
                                    readOnly
                                    className="flex-1 px-4 py-3 border border-slate-300 rounded-lg bg-slate-50 text-sm font-mono text-slate-700"
                                />
                                <button
                                    type="button"
                                    onClick={copyToClipboard}
                                    className="px-6 py-3 bg-gradient-to-b from-emerald-600 to-emerald-700 text-white rounded-lg hover:brightness-110 transition-all text-sm font-semibold shadow-lg shadow-emerald-500/20"
                                >
                                    Copy
                                </button>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-emerald-600 bg-emerald-50 p-3 rounded-lg">
                            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <p className="text-sm font-medium">
                                Link is ready to share
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Candidate Not Found / Quick Add Modal */}
            {showNotFoundModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full mx-4 text-center animate-in zoom-in duration-200">
                        <div className="w-16 h-16 bg-amber-50 rounded-full flex items-center justify-center mx-auto mb-6">
                            <svg className="w-8 h-8 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                        </div>
                        <h3 className="text-xl font-bold text-slate-800 mb-2">{isCollegeUser ? 'Student' : 'Candidate'} Not Found</h3>
                        <p className="text-slate-500 text-sm leading-relaxed mb-8">
                            We couldn't find a {isCollegeUser ? 'student' : 'candidate'} with the email <span className="font-bold text-slate-700 tracking-tight">{formData.candidate_email}</span> in your organization database.
                        </p>
                        
                        <div className="flex flex-col gap-3">
                            <button
                                onClick={() => {
                                    setShowNotFoundModal(false);
                                    navigate('/students/add', {
                                        state: {
                                            fromAddCandidate: true,
                                            email: formData.candidate_email,
                                            candidate_name: formData.candidate_name,
                                            mobile_number: formData.whatsapp_number,
                                            originalFormData: formData
                                        }
                                    });
                                }}
                                className="w-full py-3.5 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-500/20 hover:bg-blue-700 transition-all active:scale-95"
                            >
                                Add Now
                            </button>
                            <button
                                onClick={() => {
                                    setShowNotFoundModal(false);
                                    // Keep error state but allow user to edit email
                                }}
                                className="w-full py-3 text-slate-500 font-semibold hover:text-slate-700 transition-colors"
                            >
                                Cancel
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
        </>
    );
};

export default AddCandidate;
