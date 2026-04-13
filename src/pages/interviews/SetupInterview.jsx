import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, useSearchParams } from 'react-router-dom';
import axios from '../../config/axios';
import { useSelector } from 'react-redux';
import { toast } from 'react-hot-toast';
import { interviewAPI } from '../../features/interview/interviewAPI';
import PermissionWrapper from '../../components/common/PermissionWrapper';

const SetupInterview = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const [searchParams] = useSearchParams();
    const { user } = useSelector(state => state.auth);
    const positionData = location.state?.position || {};
    const positionIdFromUrl = searchParams.get('positionId');
    const [isUpdate, setIsUpdate] = useState(false);
    const [existingSetId, setExistingSetId] = useState(null);
    const isCollege = localStorage.getItem('isCollege') === 'true';

    const [loading, setLoading] = useState(false);
    const [showInstructions, setShowInstructions] = useState(false);
    const [expandedSectionId, setExpandedSectionId] = useState(1);
    const [drafts, setDrafts] = useState({}); // To track unsaved question text per section
    const [aiGenerating, setAiGenerating] = useState(null); // section id currently generating

    const [form, setForm] = useState({
        positionTitle: positionData.title || '',
        questionSetCode: positionData.code || `#POS${Math.floor(Math.random() * 100000).toString().padStart(5, '0')}`,
        interviewType: '',
        platformType: '',
        instructions: `Technical Setup\n\nRequired Equipment:\nLaptop or desktop computer with webcam and microphone\nStable high-speed internet connection\nLatest version of Google Chrome\nQuiet, well-lit private room\n\nNot Permitted:\nMobile phones or tablets for taking the test\nMultiple monitors or external devices\nAny other people in the room during assessment\n\nAssessment Rules\n\nStrictly Prohibited:\nOpening new browser tabs, windows, or applications\nUsing books, notes, or any reference materials\nAccessing websites, search engines, or online resources\nUsing communication apps (WhatsApp, email, chat, etc.)\nGetting help from others or using AI tools\nRecording or sharing assessment content\n\nTechnical Support\n\nIf you experience technical difficulties during the assessment, contact our support team immediately using the contact information provided in your invitation email.\n\nImportant: Any violation of these rules may result in immediate disqualification from the selection process.\n\nWe wish you the best of luck with your assessment.\n\nBest regards,\n[Organization Name]\nRecruitment Team`,
        sections: [
            {
                id: 1,
                name: 'General Questions',
                count: 2,
                duration: '04:20',
                questions: [
                    { id: 10001, text: 'Tell me about yourself?', prepareTime: '10 secs', answerTime: '2 mins' },
                    { id: 10002, text: 'Why are you interested in this position?', prepareTime: '10 secs', answerTime: '2 mins' }
                ]
            },
            {
                id: 2,
                name: 'Position Specific',
                count: 0,
                duration: '00:00',
                questions: []
            },
            {
                id: 3,
                name: 'Coding Questions',
                count: 0,
                duration: '00:00',
                questions: []
            },
            {
                id: 4,
                name: 'Aptitude',
                count: 0,
                duration: '00:00',
                questions: []
            }
        ]
    });

    useEffect(() => {
        const pid = positionData.id || positionIdFromUrl;
        if (!pid) return;

        const loadExistingSet = async () => {
            setLoading(true);
            try {
                // Fetch position details if not in state
                if (!positionData.id) {
                    const posRes = await axios.get(`/admins/positions/${pid}`);
                    if (posRes.data?.data) {
                        setForm(prev => ({ ...prev, positionTitle: posRes.data.data.title }));
                    }
                }

                // Check for existing question set
                // Use the correct endpoint for filtered question sets
                const setsRes = await axios.get('/admins/question-sets', {
                    params: { positionId: pid }
                });
                const setsData = setsRes.data?.content || setsRes.data?.data || setsRes.data || [];
                const sets = Array.isArray(setsData) ? setsData : (setsData.content || []);
                const existingSet = sets.length > 0 ? sets[0] : null;

                if (existingSet) {
                    setIsUpdate(true);
                    setExistingSetId(existingSet.id);

                    // If saved-question-sets returns sectionsData directly, use it. Otherwise fetch separately.
                    let sectionsData = existingSet;
                    if (!sectionsData.generalQuestions && !sectionsData.positionSpecificQuestions) {
                        try {
                            const sectionsRes = await interviewAPI.getSectionsByQuestionSetId(existingSet.id);
                            const data = sectionsRes.data?.data || sectionsRes.data;
                            sectionsData = Array.isArray(data) ? (data[0] || {}) : (data || {});
                        } catch (err) {
                            console.error('Error fetching separate sections:', err);
                        }
                    }

                    // Fetch instructions
                    const instRes = await interviewAPI.getInstructionsByQuestionSetId(existingSet.id);
                    const instData = instRes.data?.data || instRes.data || [];
                    const instructions = instData.length > 0 ? instData[0].content : form.instructions;

                    // Map backend data to frontend form
                    const mappedSections = [
                        {
                            id: 1,
                            name: 'General Questions',
                            count: sectionsData.generalQuestions?.questions?.length || 0,
                            questions: (sectionsData.generalQuestions?.questions || []).map((q, idx) => ({
                                id: idx + 100,
                                text: q.question,
                                prepareTime: String(q.prepareTime || q.prepare_time || 5).includes('sec') ? (q.prepareTime || q.prepare_time) : `${q.prepareTime || q.prepare_time || 5} secs`,
                                answerTime: (function () {
                                    const val = q.answerTime || q.answer_time || 2;
                                    if (String(val).includes('min') || String(val).includes('sec')) return val;
                                    if (Number(val) >= 60) return `${Math.floor(Number(val) / 60)} mins`;
                                    return `${val} mins`; // Default to mins for answerTime if numeric
                                })()
                            }))
                        },
                        {
                            id: 2,
                            name: 'Position Specific',
                            count: sectionsData.positionSpecificQuestions?.questions?.length || 0,
                            questions: (sectionsData.positionSpecificQuestions?.questions || []).map((q, idx) => ({
                                id: idx + 200,
                                text: q.question,
                                prepareTime: String(q.prepareTime || q.prepare_time || 5).includes('sec') ? (q.prepareTime || q.prepare_time) : `${q.prepareTime || q.prepare_time || 5} secs`,
                                answerTime: (function () {
                                    const val = q.answerTime || q.answer_time || 2;
                                    if (String(val).includes('min') || String(val).includes('sec')) return val;
                                    if (Number(val) >= 60) return `${Math.floor(Number(val) / 60)} mins`;
                                    return `${val} mins`; // Default to mins for answerTime if numeric
                                })()
                            }))
                        },
                        {
                            id: 3,
                            name: 'Coding Questions',
                            count: sectionsData.codingQuestions?.length || 0,
                            questions: (sectionsData.codingQuestions || []).map((q, idx) => ({
                                id: idx + 300,
                                text: q.question,
                                language: q.language || 'javascript',
                                difficulty: q.difficulty || 'MEDIUM',
                                duration: String(q.duration || 15).includes('min') ? q.duration : `${q.duration || 15} mins`
                            }))
                        },
                        {
                            id: 4,
                            name: 'Aptitude',
                            count: sectionsData.aptitudeQuestions?.length || 0,
                            questions: (sectionsData.aptitudeQuestions || []).map((q, idx) => ({
                                id: idx + 400,
                                text: q.question,
                                type: q.type || 'MCQ',
                                topics: q.topics?.[0] || '',
                                difficulty: q.difficulty || 'MEDIUM',
                                count: q.count || 5,
                                timePerQ: String(q.timePerQ || q.duration || 1).includes('min') ? (q.timePerQ || q.duration) : `${Math.floor((q.duration || 5) / (q.count || 5))} min/Q`
                            }))
                        }
                    ];

                    setForm(prev => ({
                        ...prev,
                        positionTitle: (existingSet.positionTitle || existingSet.title) || prev.positionTitle,
                        questionSetCode: existingSet.question_set_code || existingSet.questionSetCode || positionData.code || prev.questionSetCode,
                        interviewType: (existingSet.interviewMode || existingSet.interview_mode) === 'CONVERSATIONAL' ? 'Conversational' : 'Non-Conversational',
                        platformType: 'Browser',
                        duration: existingSet.totalDuration || existingSet.total_duration || '30 mins',
                        complexity: existingSet.complexityLevel || existingSet.complexity_level || 'Mid-level',
                        instructions,
                        sections: mappedSections
                    }));
                } else {
                    // Reset to defaults if no existing set
                    setIsUpdate(false);
                    setExistingSetId(null);
                    setForm(prev => ({
                        ...prev,
                        interviewType: '',
                        platformType: '',
                        sections: prev.sections.map(s => {
                            if (s.id === 1) {
                                return {
                                    ...s,
                                    count: 2,
                                    duration: '04:20',
                                    questions: [
                                        { id: 10001, text: 'Tell me about yourself?', prepareTime: '10 secs', answerTime: '2 mins' },
                                        { id: 10002, text: 'Why are you interested in this position?', prepareTime: '10 secs', answerTime: '2 mins' }
                                    ]
                                };
                            }
                            return { ...s, count: 0, questions: [] };
                        })
                    }));
                }
            } catch (error) {
                console.error('Error loading existing interview setup:', error);
                toast.error('Failed to load existing interview setup');
            } finally {
                setLoading(false);
            }
        };

        loadExistingSet();
    }, [positionData.id, positionIdFromUrl]);

    const interviewTypes = [
        'Conversational',
        'Non-Conversational'
    ];

    const prepareTimeOptions = [
        '5 secs',
        '10 secs',
        '15 secs',
        '30 secs',
        '1 min'
    ];

    const answerTimeOptions = [
        '1 min',
        '2 mins',
        '3 mins',
        '5 mins',
        '10 mins'
    ];

    const platformTypes = [
        'Browser'
    ];

    const questionSourceOptions = ['Coding Library', 'Custom Question'];
    const programmingLanguageOptions = ['Javascript', 'Python', 'Java', 'C++', 'Go', 'Ruby'];
    const difficultyOptions = ['Easy', 'Medium', 'Hard'];
    const codeDurationOptions = ['15 mins', '30 mins', '45 mins', '60 mins'];
    const mcqTypeOptions = ['Topic Wise', 'Level Wise'];
    const aptitudeTopicsOptions = ['Logical Reasoning', 'Quantitative Aptitude', 'Verbal Ability', 'Data Interpretation'];
    const noOfQuestionsOptions = ['5', '10', '15', '20'];
    const timePerQuestionOptions = ['1 min/Q', '2 mins/Q', '3 mins/Q'];

    const handleInputChange = (field, value) => {
        setForm(prev => ({ ...prev, [field]: value }));
    };

    /**
     * Call the Streaming AI backend to generate conversational interview questions
     * for the given section (1 = General, 2 = Position Specific).
     * Only speech/verbal questions are returned — never coding or written tasks.
     */
    const handleAIGenerate = async (sectionId) => {
        if (aiGenerating) return; // already generating
        setAiGenerating(sectionId);
        try {
            const section = sectionId === 1 ? 'general' : 'position_specific';
            const pid = positionData.id || positionIdFromUrl;
            let currentPos = positionData;

            if (!currentPos.id && pid) {
                const res = await axios.get(`/admins/positions/${pid}`);
                currentPos = res.data?.data || {};
            }

            const mandatorySkills = Array.isArray(currentPos.mandatorySkills)
                ? currentPos.mandatorySkills
                : JSON.parse(currentPos.mandatorySkills || '[]');
            const optionalSkills = Array.isArray(currentPos.optionalSkills)
                ? currentPos.optionalSkills
                : JSON.parse(currentPos.optionalSkills || '[]');

            const payload = {
                position: currentPos.title || form.positionTitle || 'Software Engineer',
                minExperience: currentPos.minimumExperience || 0,
                maxExperience: currentPos.maximumExperience || 0,
                mandatorySkills,
                optionalSkills,
                section,
                count: 1,
            };

            const response = await interviewAPI.generateInterviewQuestions(payload);
            const questions = response.data?.questions || [];

            if (!questions.length) {
                toast.error('AI did not return any questions. Please try again.');
                return;
            }

            // Add all generated questions to the section
            setForm(prev => ({
                ...prev,
                sections: prev.sections.map(sec => {
                    if (sec.id === sectionId) {
                        const newQuestions = questions.map(q => ({
                            id: Date.now() + Math.random(),
                            text: q.text,
                            prepareTime: q.prepareTime || '5 secs',
                            answerTime: q.answerTime || '2 mins',
                        }));
                        const updated = [...sec.questions, ...newQuestions];
                        return { ...sec, questions: updated, count: updated.length };
                    }
                    return sec;
                }),
            }));
            toast.success('AI question generated!');
        } catch (error) {
            console.error('AI generate error:', error);
            toast.error(error.response?.data?.detail || error.response?.data?.message || 'Failed to generate AI questions. Please try again.');
        } finally {
            setAiGenerating(null);
        }
    };

    const toggleSection = (id) => {
        setExpandedSectionId(expandedSectionId === id ? null : id);
    };

    const handleAddQuestion = (sectionId, text = '', extraProps = {}) => {
        const newQuestion = {
            id: Date.now(),
            text: text,
            prepareTime: '5 secs',
            answerTime: '2 mins',
            ...extraProps
        };

        setForm(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        questions: [...section.questions, newQuestion],
                        count: section.questions.length + 1
                    };
                }
                return section;
            })
        }));
    };

    const handleRemoveQuestion = (sectionId, questionId) => {
        setForm(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id === sectionId) {
                    const updated = section.questions.filter(q => q.id !== questionId);
                    return { ...section, questions: updated, count: updated.length };
                }
                return section;
            })
        }));
    };

    const handleQuestionChange = (sectionId, questionId, field, value) => {
        setForm(prev => ({
            ...prev,
            sections: prev.sections.map(section => {
                if (section.id === sectionId) {
                    return {
                        ...section,
                        questions: section.questions.map(q =>
                            q.id === questionId ? { ...q, [field]: value } : q
                        )
                    };
                }
                return section;
            })
        }));
    };

    const calculateSectionDuration = (questions, sectionId) => {
        if (sectionId === 3) {
            // Coding: each question has duration in minutes
            const parseMins = (str) => {
                if (!str) return 15;
                const m = String(str).match(/(\d+)/);
                return m ? parseInt(m[1], 10) : 15;
            };
            return questions.reduce((sec, q) => sec + parseMins(q.duration) * 60, 0);
        }
        if (sectionId === 4) {
            // Aptitude: each block has count and timePerQ (e.g. "1 min/Q", "2 mins/Q")
            const parseMinsPerQ = (str) => {
                if (!str) return 1;
                const m = String(str).match(/(\d+)/);
                return m ? parseInt(m[1], 10) : 1;
            };
            return questions.reduce((sec, q) => {
                const count = Number(q.count) || 1;
                const minsPerQ = parseMinsPerQ(q.timePerQ);
                return sec + count * minsPerQ * 60;
            }, 0);
        }
        // General & Position: prepareTime (secs) + answerTime (mins or secs)
        let totalSeconds = 0;
        questions.forEach(q => {
            const prepMatch = q.prepareTime && String(q.prepareTime).match(/(\d+)/);
            if (prepMatch) totalSeconds += parseInt(prepMatch[1], 10);
            const ansMatch = q.answerTime && String(q.answerTime).match(/(\d+)/);
            if (ansMatch) {
                if (String(q.answerTime).includes('min')) totalSeconds += parseInt(ansMatch[1], 10) * 60;
                else totalSeconds += parseInt(ansMatch[1], 10);
            }
        });
        return totalSeconds;
    };

    const getSectionDurationDisplay = (questions, sectionId) => {
        const totalSeconds = calculateSectionDuration(questions, sectionId);
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const calculateTotalDuration = () => {
        let totalSeconds = 0;
        form.sections.forEach(sec => {
            totalSeconds += calculateSectionDuration(sec.questions, sec.id);
        });
        const mins = Math.floor(totalSeconds / 60);
        const secs = totalSeconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    const handleSectionDurationChange = (sectionId, value) => {
        setForm(prev => ({
            ...prev,
            sections: prev.sections.map(section =>
                section.id === sectionId ? { ...section, duration: value } : section
            )
        }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!form.interviewType || !form.platformType) {
            toast.error('Please select Interview Type and Platform Type');
            return;
        }

        setLoading(true);
        try {
            // Mapping frontend labels to backend ENUMs
            const platformMap = {
                'Online Assessment': 'BROWSER',
                'Live Coding': 'BROWSER',
                'Video Interview': 'BROWSER',
                'Multiple Choice': 'BROWSER'
            };

            const modeMap = {
                'Technical Interview': 'CONVERSATIONAL',
                'HR Interview': 'CONVERSATIONAL',
                'Managerial Interview': 'CONVERSATIONAL',
                'Aptitude Test': 'NON_CONVERSATIONAL'
            };

            // 1. Create Question Set (include general, position, coding, and aptitude durations)
            const totalSeconds = form.sections.reduce(
                (acc, sec) => acc + calculateSectionDuration(sec.questions, sec.id),
                0
            );

            const questionSetPayload = {
                positionId: positionData.id || positionIdFromUrl,
                totalQuestions: form.sections.reduce((acc, sec) => acc + sec.questions.length, 0),
                totalDuration: `${Math.ceil(totalSeconds / 60)} mins`,
                interviewPlatform: platformMap[form.platformType] || 'BROWSER',
                interviewMode: modeMap[form.interviewType] || 'CONVERSATIONAL',
                createdBy: user?.firstName || user?.name || 'ADMIN',
                complexityLevel: 'INTERMEDIATE',
                generalQuestionsCount: form.sections[0].questions.length,
                positionSpecificQuestionsCount: form.sections[1].questions.length,
                codingQuestionsCount: form.sections[2].questions.length,
                aptitudeQuestionsCount: form.sections[3].questions.length,
                status: 'PUBLISHED'
            };

            let questionSetId = existingSetId;
            if (isUpdate) {
                await interviewAPI.updateQuestionSet(existingSetId, questionSetPayload);
            } else {
                const setResponse = await interviewAPI.createQuestionSet(questionSetPayload);
                const newQuestionSet = setResponse.data?.data || setResponse.data;
                questionSetId = newQuestionSet.id;
            }

            // 2. Create/Update Question Sections
            const sectionPayload = {
                questionSetCode: form.questionSetCode,
                generalQuestions: {
                    shuffleConfig: { shuffle: true, count: form.sections[0].questions.length },
                    questions: form.sections[0].questions.map(q => ({
                        question: q.text,
                        prepareTime: parseInt(q.prepareTime),
                        answerTime: q.answerTime.includes('min') ? parseInt(q.answerTime) * 60 : parseInt(q.answerTime)
                    }))
                },
                positionSpecificQuestions: {
                    shuffleConfig: { shuffle: true, count: form.sections[1].questions.length },
                    questions: form.sections[1].questions.map(q => ({
                        question: q.text,
                        prepareTime: parseInt(q.prepareTime),
                        answerTime: q.answerTime.includes('min') ? parseInt(q.answerTime) * 60 : parseInt(q.answerTime)
                    }))
                },
                codingQuestions: form.sections[2].questions.map(q => ({
                    question: q.text,
                    language: q.language || 'javascript',
                    difficulty: q.difficulty || 'MEDIUM',
                    duration: parseInt(q.duration) || 30
                })),
                aptitudeQuestions: form.sections[3].questions.map(q => {
                    const parseMins = (str) => {
                        if (!str) return 1;
                        const m = String(str).match(/(\d+)/);
                        return m ? parseInt(m[1], 10) : 1;
                    };
                    const count = Number(q.count) || 1;
                    const minsPerQ = parseMins(q.timePerQ);
                    return {
                        question: q.text,
                        type: q.type || 'MCQ',
                        topics: q.topics ? [q.topics] : [],
                        difficulty: q.difficulty || 'MEDIUM',
                        count,
                        duration: count * minsPerQ
                    };
                })
            };

            await interviewAPI.createQuestionSection(questionSetId, sectionPayload);

            // 3. Save Instructions
            const instructionsPayload = {
                questionSetId: questionSetId,
                positionId: positionData.id || positionIdFromUrl,
                contentType: 'TEXT',
                content: form.instructions,
                isActive: 1
            };

            if (isUpdate) {
                await interviewAPI.updateInstructionsByQuestionSetId(questionSetId, instructionsPayload);
            } else {
                await interviewAPI.saveInstructions(instructionsPayload);
            }

            toast.success(isUpdate ? 'Interview Setup updated successfully!' : 'Interview Setup finalized successfully!');
            
            if (isCollege) {
                navigate('/candidates/add', { 
                    state: { 
                        position: {
                            ...positionData,
                            id: positionData.id || positionIdFromUrl,
                            title: positionData.title || form.positionTitle
                        } 
                    } 
                });
            } else {
                navigate(-1);
            }
        } catch (error) {
            console.error('Error saving interview setup:', error);
            toast.error(error.response?.data?.message || 'Failed to save interview setup');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-0">
            {/* Top Navigation / Breadcrumb */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-2 text-[11px] font-semibold text-slate-400">
                    <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                    </svg>
                    <span className="hover:text-black cursor-pointer" onClick={() => navigate(-1)}>Back</span>
                    <span className="mx-1 text-slate-200">•</span>
                    {localStorage.getItem('isCollege') === 'true' ? (
                        <>
                            <span className="hover:text-black cursor-pointer" onClick={() => navigate('/positions')}>Position List</span>
                            <span className="mx-1 text-slate-200">/</span>
                            <span className="hover:text-black cursor-pointer" onClick={() => navigate('/position/create')}>Create Position</span>
                        </>
                    ) : (
                        <>
                            <span className="hover:text-black cursor-pointer" onClick={() => navigate('/jobs')}>Job List</span>
                            <span className="mx-1 text-slate-200">/</span>
                            <span className="hover:text-black cursor-pointer" onClick={() => navigate('/jobs/create')}>Create Job</span>
                        </>
                    )}
                    <span className="mx-1 text-slate-200">/</span>
                    <span className="text-slate-800 font-bold tracking-wider">{isUpdate ? 'Edit Interview' : 'Setup Interview'}</span>
                </div>
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => setShowInstructions(true)}
                        className="px-5 py-2 text-xs font-bold rounded-lg border border-slate-200 text-black hover:bg-slate-50 transition-colors flex items-center gap-2"
                    >
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 011 .293l5.414 5.414a1 1 0 01.293 1V19a2 2 0 01-2 2z" />
                        </svg>
                        Interview Instructions
                    </button>
                    <PermissionWrapper feature="positions" permission="update">
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-2 text-xs font-bold rounded-lg bg-gradient-to-b from-blue-600 to-blue-700 text-white hover:brightness-110 shadow-lg shadow-blue-500/20 transition-all disabled:opacity-50"
                        >
                            {loading ? 'Saving...' : 'Save & Finalize'}
                        </button>
                    </PermissionWrapper>
                </div>
            </div>

            {/* Top Bar - Basic Info */}
            <div className="mb-10">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    <div>
                        <label className="text-[12px] font-normal text-black mb-1.5 ml-2 block">
                            {isCollege ? 'Position Title' : 'Job Title'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.positionTitle}
                            readOnly
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-normal text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-not-allowed focus:outline-none"
                            placeholder={isCollege ? 'Position Title' : 'Job Title'}
                        />
                    </div>

                    <div>
                        <label className="text-[12px] font-normal text-black mb-1.5 ml-2 block">
                            {isCollege ? 'Question Set Code' : 'Job Code'} <span className="text-red-500">*</span>
                        </label>
                        <input
                            type="text"
                            value={form.questionSetCode}
                            readOnly
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg text-sm font-normal text-black shadow-[0_1px_2px_rgba(0,0,0,0.02)] focus:outline-none"
                        />
                    </div>

                    <div>
                        <label className="text-[12px] font-normal text-black mb-1.5 ml-2 block">
                            Interview Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.interviewType}
                            onChange={(e) => handleInputChange('interviewType', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                        >
                            <option value="">Select Interview Type...</option>
                            {interviewTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>

                    <div>
                        <label className="text-[12px] font-normal text-black mb-1.5 ml-2 block">
                            Platform Type <span className="text-red-500">*</span>
                        </label>
                        <select
                            value={form.platformType}
                            onChange={(e) => handleInputChange('platformType', e.target.value)}
                            className="w-full px-4 py-2.5 bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 text-sm appearance-none cursor-pointer shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                        >
                            <option value="">Select Platform Type...</option>
                            {platformTypes.map(t => <option key={t} value={t}>{t}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            {/* Main Content - Full Width Sections */}
            <div className="space-y-8">
                {/* Sections Configuration */}
                <div className="w-full pb-6">
                    <div>
                        <div className="pt-8 pb-4 flex items-center justify-between">
                            <div>
                                <h3 className="text-sm font-normal text-black capitalize">{isUpdate ? 'Edit Interview Sections' : 'Configure Interview Sections'}</h3>
                            </div>
                            <div className="flex gap-4">
                                <div className="text-right">
                                    <p className="text-[9px] font-bold text-black uppercase tracking-tighter">Total Duration</p>
                                    <p className="text-sm font-black text-black">{calculateTotalDuration()}</p>
                                </div>
                                <div className="text-right">
                                    <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider mb-0.5">Total Questions</p>
                                    <p className="text-sm font-black text-blue-600">{form.sections.reduce((acc, sec) => acc + sec.questions.length, 0).toString().padStart(2, '0')}</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            {form.sections.map((section, index) => {
                                const isExpanded = expandedSectionId === section.id;

                                return (
                                    <div
                                        key={section.id}
                                        className={`rounded-xl border transition-all duration-300 overflow-hidden ${isExpanded ? 'border-slate-300 shadow-sm' : 'border-slate-200 hover:border-slate-300'}`}
                                    >
                                        {/* Header */}
                                        <div
                                            onClick={() => toggleSection(section.id)}
                                            className={`p-4 cursor-pointer flex items-center justify-between gap-4 select-none ${isExpanded ? 'bg-slate-50/30' : ''}`}
                                        >
                                            <div className="flex items-center gap-3">
                                                <div>
                                                    <h4 className="text-[13px] font-bold text-black transition-colors">Section {index + 1}. {section.name}</h4>
                                                </div>
                                            </div>

                                            <div className="flex items-center gap-8">
                                                <div className="flex items-center gap-6">
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-bold text-black uppercase tracking-wider">Duration</p>
                                                        <p className="text-[11px] font-bold text-black">
                                                            {getSectionDurationDisplay(section.questions, section.id)}
                                                        </p>
                                                    </div>
                                                    <div className="text-right">
                                                        <p className="text-[8px] font-bold text-black uppercase tracking-wider">Questions</p>
                                                        <p className="text-[11px] font-bold text-black">{section.count.toString().padStart(2, '0')}</p>
                                                    </div>
                                                </div>
                                                <svg
                                                    className={`w-5 h-5 text-slate-300 transition-transform duration-300 ${isExpanded ? 'rotate-180 text-black' : ''}`}
                                                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                                                >
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                                </svg>
                                            </div>
                                        </div>

                                        {/* Expanded Content */}
                                        {isExpanded && (
                                            <div className="px-6 pb-3 space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                                                {section.questions.map((q, qIdx) => (
                                                    <div key={q.id} className={`grid ${section.id >= 3 ? 'grid-cols-[32px_1fr_auto_32px]' : 'grid-cols-[32px_1fr_auto_auto_32px]'} items-stretch gap-3 animate-in fade-in slide-in-from-top-1 duration-200`}>
                                                        {/* Number badge */}
                                                        <div className="flex items-center justify-center">
                                                            <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center border border-blue-100/50">
                                                                <span className="text-[12px] font-bold text-blue-600">{qIdx + 1}</span>
                                                            </div>
                                                        </div>
                                                        {/* Question textarea */}
                                                        <textarea
                                                            value={q.text}
                                                            rows={Math.max(1, Math.min(6, Math.ceil((q.text.length || 0) / 85)))}
                                                            onChange={(e) => handleQuestionChange(section.id, q.id, 'text', e.target.value)}
                                                            placeholder="Enter your question here..."
                                                            className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 resize-none overflow-hidden min-h-[46px] leading-relaxed shadow-[0_1px_2px_rgba(0,0,0,0.02)] transition-all"
                                                        />
                                                        {/* Preparing/Answering for Conversational (Section 1 & 2) */}
                                                        {section.id <= 2 && (
                                                            <>
                                                                {/* Preparing label on top + select below */}
                                                                <div className="flex flex-col items-center justify-center gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Preparing</span>
                                                                    <select
                                                                        value={q.prepareTime}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'prepareTime', e.target.value)}
                                                                        className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {prepareTimeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                {/* Answering label on top + select below */}
                                                                <div className="flex flex-col items-center justify-center gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Answering</span>
                                                                    <select
                                                                        value={q.answerTime}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'answerTime', e.target.value)}
                                                                        className="w-20 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {answerTimeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                            </>
                                                        )}

                                                        {/* Specialized fields for Coding (Section 3) */}
                                                        {section.id === 3 && (
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Language</span>
                                                                    <select
                                                                        value={q.language}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'language', e.target.value)}
                                                                        className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {programmingLanguageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Difficulty</span>
                                                                    <select
                                                                        value={q.difficulty}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'difficulty', e.target.value)}
                                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Duration</span>
                                                                    <select
                                                                        value={q.duration}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'duration', e.target.value)}
                                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {codeDurationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}

                                                        {/* Specialized fields for Aptitude (Section 4) */}
                                                        {section.id === 4 && (
                                                            <div className="flex items-center gap-3">
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Type</span>
                                                                    <select
                                                                        value={q.type}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'type', e.target.value)}
                                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {mcqTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Topics</span>
                                                                    <select
                                                                        value={q.topics}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'topics', e.target.value)}
                                                                        className="w-28 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {aptitudeTopicsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Difficulty</span>
                                                                    <select
                                                                        value={q.difficulty}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'difficulty', e.target.value)}
                                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Count</span>
                                                                    <select
                                                                        value={q.count}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'count', e.target.value)}
                                                                        className="w-16 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {noOfQuestionsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                                <div className="flex flex-col gap-1">
                                                                    <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wide whitespace-nowrap">Time/Q</span>
                                                                    <select
                                                                        value={q.timePerQ}
                                                                        onChange={(e) => handleQuestionChange(section.id, q.id, 'timePerQ', e.target.value)}
                                                                        className="w-24 bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-semibold text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)] cursor-pointer appearance-none text-center"
                                                                    >
                                                                        {timePerQuestionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                    </select>
                                                                </div>
                                                            </div>
                                                        )}
                                                        {/* Delete */}
                                                        <PermissionWrapper feature="position" permission="update">
                                                            <button
                                                                onClick={() => handleRemoveQuestion(section.id, q.id)}
                                                                className="text-red-400 hover:text-red-600 transition-colors p-1 flex items-center justify-center self-center"
                                                            >
                                                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                                                </svg>
                                                            </button>
                                                        </PermissionWrapper>
                                                    </div>
                                                ))}

                                                {/* Specialized Drafting Row - Coding */}
                                                {section.id === 3 && (
                                                    <div className="flex items-center gap-4 py-3 border-t border-slate-50 mt-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                                                            <span className="text-[12px] font-bold text-blue-300">+</span>
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-4 gap-3">
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Question Source</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.source || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], source: e.target.value } }))}
                                                                >
                                                                    {questionSourceOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Programming Language</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.language || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], language: e.target.value } }))}
                                                                >
                                                                    <option value="">Search Language...</option>
                                                                    {programmingLanguageOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Difficulty Level</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.difficulty || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], difficulty: e.target.value } }))}
                                                                >
                                                                    {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Code Duration</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.duration || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], duration: e.target.value } }))}
                                                                >
                                                                    {codeDurationOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <PermissionWrapper feature="position" permission="update">
                                                            <button
                                                                className="h-10 px-6 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-1.5 self-end"
                                                                onClick={() => {
                                                                    const draft = drafts[section.id] || {};
                                                                    handleAddQuestion(section.id, 'Coding Challenge', {
                                                                        language: draft.language || 'Javascript',
                                                                        difficulty: (draft.difficulty || 'Easy').toUpperCase(),
                                                                        duration: parseInt(draft.duration) || 15
                                                                    });
                                                                    setDrafts(prev => ({ ...prev, [section.id]: {} }));
                                                                }}
                                                            >
                                                                <span className="text-lg">+</span> Add
                                                            </button>
                                                        </PermissionWrapper>
                                                    </div>
                                                )}

                                                {/* Specialized Drafting Row - Aptitude */}
                                                {section.id === 4 && (
                                                    <div className="flex items-center gap-4 py-3 border-t border-slate-50 mt-2">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                                                            <span className="text-[12px] font-bold text-blue-300">+</span>
                                                        </div>
                                                        <div className="flex-1 grid grid-cols-5 gap-3">
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">MCQ Type</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.type || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], type: e.target.value } }))}
                                                                >
                                                                    {mcqTypeOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Select Topics</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.topics || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], topics: e.target.value } }))}
                                                                >
                                                                    <option value="">Select Topic...</option>
                                                                    {aptitudeTopicsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Difficulty Level</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.difficulty || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], difficulty: e.target.value } }))}
                                                                >
                                                                    {difficultyOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">No. of Questions</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.count || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], count: e.target.value } }))}
                                                                >
                                                                    {noOfQuestionsOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                            <div className="flex flex-col">
                                                                <label className="text-[10px] font-bold text-black uppercase mb-1">Time per Question</label>
                                                                <select
                                                                    className="bg-white border border-slate-200 rounded-lg px-2 py-2 text-xs font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500 transition-all appearance-none cursor-pointer"
                                                                    value={drafts[section.id]?.timePerQ || ''}
                                                                    onChange={(e) => setDrafts(prev => ({ ...prev, [section.id]: { ...prev[section.id], timePerQ: e.target.value } }))}
                                                                >
                                                                    {timePerQuestionOptions.map(opt => <option key={opt} value={opt}>{opt}</option>)}
                                                                </select>
                                                            </div>
                                                        </div>
                                                        <PermissionWrapper feature="position" permission="update">
                                                            <button
                                                                className="h-10 px-6 bg-blue-600 text-white rounded-lg text-xs font-bold hover:bg-blue-700 transition-all shadow-md shadow-blue-100 flex items-center gap-1.5 self-end"
                                                                onClick={() => {
                                                                    const draft = drafts[section.id] || {};
                                                                    handleAddQuestion(section.id, 'MCQ Assessment Block', {
                                                                        type: draft.type || 'Topic Wise',
                                                                        topics: draft.topics || '',
                                                                        difficulty: (draft.difficulty || 'Easy').toUpperCase(),
                                                                        count: parseInt(draft.count) || 5,
                                                                        timePerQ: draft.timePerQ || '1 min/Q'
                                                                    });
                                                                    setDrafts(prev => ({ ...prev, [section.id]: {} }));
                                                                }}
                                                            >
                                                                <span className="text-lg">+</span> Add
                                                            </button>
                                                        </PermissionWrapper>
                                                    </div>
                                                )}

                                                {/* Standard Drafting Row - General & Position Specific */}
                                                {(section.id === 1 || section.id === 2) && (
                                                    <div className="flex items-center gap-5 py-1.5">
                                                        <div className="w-8 h-8 rounded-full bg-blue-50 flex items-center justify-center shrink-0 border border-blue-100/50">
                                                            <span className="text-[12px] font-bold text-blue-300">+</span>
                                                        </div>
                                                        <div className="flex-1">
                                                            <textarea
                                                                value={drafts[section.id] || ''}
                                                                onChange={(e) => {
                                                                    setDrafts(prev => ({ ...prev, [section.id]: e.target.value }));
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = `${e.target.scrollHeight + 2}px`;
                                                                }}
                                                                onFocus={(e) => {
                                                                    e.target.style.height = 'auto';
                                                                    e.target.style.height = `${e.target.scrollHeight + 2}px`;
                                                                }}
                                                                placeholder="Type a new question here..."
                                                                rows="1"
                                                                className="w-full bg-white border border-slate-200 rounded-lg px-4 py-2.5 text-sm font-normal text-black focus:outline-none focus:ring-1 focus:ring-blue-500/20 focus:border-blue-500 resize-none overflow-hidden min-h-[46px] leading-relaxed transition-all shadow-[0_1px_2px_rgba(0,0,0,0.02)]"
                                                            />
                                                        </div>
                                                        <div className="flex items-center gap-2 shrink-0">
                                                            <PermissionWrapper feature="position" permission="update">
                                                                <button
                                                                    onClick={() => {
                                                                        if (drafts[section.id]?.trim()) {
                                                                            handleAddQuestion(section.id, drafts[section.id]);
                                                                            setDrafts(prev => ({ ...prev, [section.id]: '' }));
                                                                        }
                                                                    }}
                                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-blue-600 px-4 h-9 rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                                                                >
                                                                    Add
                                                                </button>
                                                            </PermissionWrapper>
                                                            <PermissionWrapper feature="position" permission="update">
                                                                <button
                                                                    onClick={() => handleAIGenerate(section.id)}
                                                                    disabled={!!aiGenerating}
                                                                    className="flex items-center gap-1.5 text-[11px] font-bold text-white bg-gradient-to-b from-blue-600 to-blue-700 px-4 h-9 rounded-lg hover:brightness-110 shadow-md shadow-blue-500/10 disabled:opacity-60 disabled:cursor-not-allowed"
                                                                >
                                                                    {aiGenerating === section.id ? (
                                                                        <>
                                                                            <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                                                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                                                                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8z" />
                                                                            </svg>
                                                                            Generating...
                                                                        </>
                                                                    ) : (
                                                                        <>
                                                                            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.003 3.003 0 01-.635.929H8.63a3.002 3.002 0 01-.635-.93l-.347-.346z" />
                                                                            </svg>
                                                                            AI Generate
                                                                        </>
                                                                    )}
                                                                </button>
                                                            </PermissionWrapper>
                                                        </div>
                                                    </div>
                                                )}
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* Instructions Modal */}
            {showInstructions && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-10">
                    <div
                        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
                        onClick={() => setShowInstructions(false)}
                    />
                    <div className="relative w-full max-w-5xl bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in duration-200 flex flex-col max-h-full">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                            <h3 className="text-base font-bold text-black">Preview & Edit Instructions</h3>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="p-2 hover:bg-slate-50 rounded-full transition-colors"
                            >
                                <svg className="w-5 h-5 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto">
                            <textarea
                                rows="20"
                                value={form.instructions}
                                onChange={(e) => handleInputChange('instructions', e.target.value)}
                                className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl text-xs leading-relaxed text-black focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all resize-none"
                                placeholder="Provide clear guidelines..."
                            />
                        </div>
                        <div className="px-6 py-4 bg-slate-50/50 border-t border-slate-100 flex justify-end gap-3">
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="px-6 py-2 text-xs font-bold text-slate-600 hover:text-black transition-colors"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => setShowInstructions(false)}
                                className="px-8 py-2 text-xs font-bold bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all shadow-md"
                            >
                                Save Changes
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SetupInterview;
