import React, { useEffect } from 'react';
import { Provider, useDispatch } from 'react-redux';
import store from './app/store';
import AppRoutes from './routes/AppRoutes';
import { Toaster } from 'react-hot-toast';
import { rehydrateUser, clearUser } from './features/auth/authSlice';
import { clearAuthStorage } from './utils/authStorage';

// On startup: rehydrate user only if session is complete; clear broken/incomplete auth
function AppInit() {
  const dispatch = useDispatch();
  useEffect(() => {
    const token = localStorage.getItem('token');
    const organizationId = localStorage.getItem('organizationId');
    const adminUser = localStorage.getItem('admin_user');
    const hasToken = !!token && token !== 'null';
    const hasOrg = !!organizationId && organizationId !== 'null';
    const hasUser = !!adminUser && adminUser !== 'null';
    if (hasToken && (!hasOrg || !hasUser)) {
      clearAuthStorage();
      dispatch(clearUser());
    } else {
      dispatch(rehydrateUser());
    }
  }, [dispatch]);
  return null;
}

function App() {
  return (
    <Provider store={store}>
      <AppInit />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 4000,
          style: {
            background: '#363636',
            color: '#fff',
          },
          success: {
            duration: 3000,
            iconTheme: {
              primary: '#10B981',
              secondary: '#fff',
            },
          },
          error: {
            duration: 4000,
            iconTheme: {
              primary: '#EF4444',
              secondary: '#fff',
            },
          },
        }}
      />
      <AppRoutes />
    </Provider>
  );
}

export default App;
