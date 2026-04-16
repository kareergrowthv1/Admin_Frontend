const requireEnvBaseUrl = (key) => {
	const value = String(import.meta.env[key] || '').trim();
	if (!value) {
		throw new Error(`${key} is required in .env`);
	}
	return value.replace(/\/$/, '');
};

export const API_BASE_URL = requireEnvBaseUrl('VITE_ADMIN_API_URL');
export const AUTH_API_BASE_URL = requireEnvBaseUrl('VITE_AUTH_API_URL');
export const JAVA_AUTH_BASE_URL = requireEnvBaseUrl('VITE_AUTH_JAVA_BASE_URL');
export const CANDIDATE_API_BASE_URL = requireEnvBaseUrl('VITE_CANDIDATE_API_URL');
export const AI_SERVICE_BASE_URL = requireEnvBaseUrl('VITE_AI_SERVICE_URL');
export const TOKEN_KEY = 'auth_token';
export const USER_KEY = 'user_data';
