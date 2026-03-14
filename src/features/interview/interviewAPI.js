import axios, { gatewayApi } from '../../config/axios';

/**
 * Interview API — all calls go through API Gateway at localhost:9000
 * Route: /api/admin/question-sets, /api/admin/question-sections, /api/admin/assessment-instructions
 * AI routes use gatewayApi → VITE_AI_SERVICE_URL (Streaming AI backend)
 */
export const interviewAPI = {
    // Question Set APIs
    createQuestionSet: (data) => axios.post('/admins/question-sets', data),
    getQuestionSets: (params) => axios.get('/admins/question-sets', { params }),
    getQuestionSetById: (id) => axios.get(`/admins/question-sets/${id}`),
    updateQuestionSet: (id, data) => axios.put(`/admins/question-sets/${id}`, data),

    // Question Section APIs
    createQuestionSection: (questionSetId, data) =>
        axios.post(`/admins/question-sections?questionSetId=${questionSetId}`, data),
    getQuestionSectionById: (id) => axios.get(`/admins/question-sections/${id}`),
    getSectionsByQuestionSetId: (questionSetId) =>
        axios.get(`/admins/question-sections/question-set/${questionSetId}`),
    updateQuestionSection: (id, data) => axios.put(`/admins/question-sections/${id}`, data),
    deleteQuestionSection: (id) => axios.delete(`/admins/question-sections/${id}`),

    // Assessment Instructions APIs
    saveInstructions: (data) => axios.post('/admins/assessment-instructions', data),
    getInstructionsById: (id) => axios.get(`/admins/assessment-instructions/${id}`),
    getInstructionsByQuestionSetId: (questionSetId) =>
        axios.get(`/admins/assessment-instructions/question-set/${questionSetId}`),
    updateInstructionsByQuestionSetId: (questionSetId, data) =>
        axios.put(`/admins/assessment-instructions/question-set/${questionSetId}`, data),

    // AI Question Generator (Streaming AI backend → VITE_AI_SERVICE_URL)
    // Generates ONLY conversational/speech-type questions — no coding, no MCQ.
    generateInterviewQuestions: (data) =>
        gatewayApi.post('/ai/generate-interview-questions', data),
};
