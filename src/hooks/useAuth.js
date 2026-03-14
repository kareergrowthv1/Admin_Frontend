import { useSelector, useDispatch } from 'react-redux';
import { setUser, clearUser } from '../features/auth/authSlice';
import { authAPI } from '../features/auth/authAPI';
import { clearAuthStorage } from '../utils/authStorage';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector((state) => state.auth.user);

  const login = async (credentials) => {
    const response = await authAPI.login(credentials);
    const payload = response?.data?.data || {};
    const accessToken = payload.accessToken || null;
    const userData = payload.user || null;

    if (accessToken) {
      localStorage.setItem('token', accessToken);
    }

    if (userData) {
      localStorage.setItem('admin_user', JSON.stringify(userData));
      dispatch(setUser(userData));
    }

    return response;
  };

  const logout = async () => {
    try {
      await authAPI.logout();
    } finally {
      clearAuthStorage();
      dispatch(clearUser());
    }
  };

  return { user, login, logout };
};
