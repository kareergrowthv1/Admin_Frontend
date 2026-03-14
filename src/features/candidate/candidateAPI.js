import axios from '../../config/axios';
import { creditsAPI } from './creditsAPI';

/**
 * Candidate API — all calls go through API Gateway at localhost:9000
 * Route: /api/admin/candidates (gateway → AdminBackend on port 8002)
 *
 * Credit gate pattern mirrors Java PositionServiceImpl:
 *   1. Check credits BEFORE creation → throw if none
 *   2. Consume credit AFTER successful creation
 */
export const candidateAPI = {
  getCandidates: () => axios.get('/admin/candidates'),
  getCandidateById: (id) => axios.get(`/admin/candidates/${id}`),

  /**
   * Create a candidate WITH credit gate check
   * Mirrors Java: PositionServiceImpl checks findFirstActiveCreditsWithAvailablePositionCredits()
   * Here we check interview credits before allowing candidate/interview creation
   */
  createCandidate: async (data) => {
    // Credit gate: check interview credits BEFORE creating
    const adminId = localStorage.getItem('adminId') || localStorage.getItem('organizationId') || localStorage.getItem('ID');
    if (adminId) {
      const creditCheck = await creditsAPI.checkInterviewCredits(adminId);
      if (creditCheck && !creditCheck.canCreate) {
        const error = new Error(creditCheck.message || 'No interview credits available. Please contact your administrator.');
        error.creditData = creditCheck;
        error.isCreditError = true;
        throw error;
      }
    }

    // Proceed with creation
    const response = await axios.post('/admin/candidates', data);

    // Consume 1 interview credit on success
    if (adminId) {
      try {
        await creditsAPI.consumeInterviewCredit(adminId);
      } catch (err) {
        console.warn('[candidateAPI] Candidate created but credit consume failed:', err.message);
      }
    }

    return response;
  },

  updateCandidate: (id, data) => axios.put(`/admin/candidates/${id}`, data),
  deleteCandidate: (id) => axios.delete(`/admin/candidates/${id}`),
};
