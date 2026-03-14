import axios from 'axios';

/**
 * Credits API — AdminFrontend
 * Direct call to SuperadminBackend (from .env).
 */
const superadminBaseURL = import.meta.env.VITE_SUPERADMIN_API_URL;
const superadminAxios = axios.create({
    baseURL: superadminBaseURL,
    timeout: 10000,
    withCredentials: true,
    headers: { 'Content-Type': 'application/json' },
});

export const creditsAPI = {
    /**
     * Check if admin has available position credits BEFORE creating a position
     */
    checkPositionCredits: async (adminId) => {
        try {
            const response = await superadminAxios.get(`/credits/check/${adminId}/position`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('[CreditsAPI] checkPositionCredits failed:', error.message);
            // Fail open — don't block if the credit service is unreachable
            return { canCreate: true, reason: 'CHECK_FAILED' };
        }
    },

    /**
     * Check if admin has available interview credits BEFORE scheduling
     */
    checkInterviewCredits: async (adminId) => {
        try {
            const response = await superadminAxios.get(`/credits/check/${adminId}/interview`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('[CreditsAPI] checkInterviewCredits failed:', error.message);
            return { canCreate: true, reason: 'CHECK_FAILED' };
        }
    },

    /**
     * Consume a position credit AFTER successful position creation
     * Mirrors Java: POST /credits/organization/:id/add-position-credit
     */
    consumePositionCredit: async (adminId) => {
        try {
            const response = await superadminAxios.post(`/credits/consume/${adminId}/position`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('[CreditsAPI] consumePositionCredit failed:', error.message);
            throw error;
        }
    },

    /**
     * Consume an interview credit AFTER interview is conducted
     * Mirrors Java: POST /credits/organization/:id/add-interview-credit
     */
    consumeInterviewCredit: async (adminId) => {
        try {
            const response = await superadminAxios.post(`/credits/consume/${adminId}/interview`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('[CreditsAPI] consumeInterviewCredit failed:', error.message);
            throw error;
        }
    },

    /**
     * Get current credit summary for an admin
     */
    getCredits: async (adminId) => {
        try {
            const response = await superadminAxios.get(`/credits/admin/${adminId}`);
            return response.data?.data || response.data;
        } catch (error) {
            console.error('[CreditsAPI] getCredits failed:', error.message);
            return null;
        }
    },
};
