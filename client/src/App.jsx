import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from './store/authStore.js';
import { useProjectStore } from './store/projectStore.js';  // Fixed: useProjectStore (capital P)
import MainLayout from './components/Layout/MainLayout';
import LoginForm from './components/Auth/LoginForm';
import LandingPage from './components/LandingPage';
import { useEffect } from 'react';

function ProtectedRoute({ children }) {
  const { isAuthenticated, initializeAuth } = useAuthStore();
  
  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function PublicRoute({ children }) {
  const { isAuthenticated } = useAuthStore();
  
  if (isAuthenticated) {
    return <Navigate to="/app" replace />;
  }

  return children;
}

export default function App() {
  const { fetchProjects } = useProjectStore();

  useEffect(() => {
    const { isAuthenticated } = useAuthStore.getState();
    if (isAuthenticated) {
      fetchProjects();
    }
  }, [fetchProjects]);

  return (
    <Routes>
      <Route path="/" element={
        <PublicRoute>
          <LandingPage />
        </PublicRoute>
      } />
      
      <Route path="/login" element={
        <PublicRoute>
          <LoginForm />
        </PublicRoute>
      } />
      
      <Route path="/app/*" element={
        <ProtectedRoute>
          <MainLayout />
        </ProtectedRoute>
      } />
    </Routes>
  );
}
