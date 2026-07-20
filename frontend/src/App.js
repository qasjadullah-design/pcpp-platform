import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';

// Layouts
import PublicLayout from './components/layout/PublicLayout';
import DashboardLayout from './components/layout/DashboardLayout';

// Public Pages
import HomePage from './pages/public/HomePage';
import ProjectsPage from './pages/public/ProjectsPage';
import ProjectDetailPage from './pages/public/ProjectDetailPage';
import SearchResultsPage from './pages/public/SearchResultsPage';
import InvestPage from './pages/public/InvestPage';
import SectorPage from './pages/public/SectorPage';
import ExecutiveAnalyticsPage from './pages/public/ExecutiveAnalyticsPage';
import LoginPage from './pages/public/LoginPage';
import RegisterPage from './pages/public/RegisterPage';

// Dashboard Pages
import DashboardHome from './pages/dashboard/DashboardHome';
import MyProjectsPage from './pages/dashboard/MyProjectsPage';
import MyInterestsPage from './pages/dashboard/MyInterestsPage';
import SavedProjectsPage from './pages/dashboard/SavedProjectsPage';
import NotificationsPage from './pages/dashboard/NotificationsPage';
import SettingsPage from './pages/dashboard/SettingsPage';
import SubmitProjectPage from './pages/dashboard/SubmitProjectPage';
import AnalyticsPage from './pages/dashboard/AnalyticsPage';

// Admin Pages
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminReviewPage from './pages/admin/AdminReviewPage';
import AdminProjectsPage from './pages/admin/AdminProjectsPage';
import AdminUsersPage from './pages/admin/AdminUsersPage';

import Spinner from './components/common/Spinner';

const getRoleHome = (role) => ['admin', 'superadmin'].includes(role) ? '/admin' : '/dashboard';

const ProtectedRoute = ({ children, adminOnly = false }) => {
  const { user, loading } = useAuth();
  if (loading) return <Spinner size="lg"/>;
  if (!user) return <Navigate to="/login" replace/>;
  if (adminOnly && !['admin', 'superadmin'].includes(user.role)) return <Navigate to="/dashboard" replace/>;
  return children;
};

const AppRoutes = () => {
  const { user } = useAuth();
  return (
    <Routes>
      {/* Public Routes */}
      <Route path="/" element={<PublicLayout><HomePage/></PublicLayout>}/>
      <Route path="/projects" element={<PublicLayout><ProjectsPage/></PublicLayout>}/>
      <Route path="/projects/:id" element={<PublicLayout><ProjectDetailPage/></PublicLayout>}/>
      <Route path="/search" element={<PublicLayout><SearchResultsPage/></PublicLayout>}/>
      <Route path="/invest" element={<PublicLayout><InvestPage/></PublicLayout>}/>
      <Route path="/invest/sector/:sector" element={<PublicLayout><SectorPage/></PublicLayout>}/>
      <Route path="/analytics" element={<PublicLayout><ExecutiveAnalyticsPage/></PublicLayout>}/>
      <Route path="/login" element={user ? <Navigate to={getRoleHome(user.role)} replace/> : <LoginPage/>}/>
      <Route path="/register" element={user ? <Navigate to={getRoleHome(user.role)} replace/> : <RegisterPage/>}/>

      {/* Dashboard Routes */}
      <Route path="/dashboard" element={<ProtectedRoute><DashboardLayout><DashboardHome/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/projects" element={<ProtectedRoute><DashboardLayout><MyProjectsPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/interests" element={<ProtectedRoute><DashboardLayout><MyInterestsPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/saved" element={<ProtectedRoute><DashboardLayout><SavedProjectsPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/notifications" element={<ProtectedRoute><DashboardLayout><NotificationsPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/submit" element={<ProtectedRoute><DashboardLayout><SubmitProjectPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/analytics" element={<ProtectedRoute><DashboardLayout><AnalyticsPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/dashboard/settings" element={<ProtectedRoute><DashboardLayout><SettingsPage/></DashboardLayout></ProtectedRoute>}/>

      {/* Admin Routes */}
      <Route path="/admin" element={<ProtectedRoute adminOnly><DashboardLayout><AdminDashboard/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/admin/review" element={<ProtectedRoute adminOnly><DashboardLayout><AdminReviewPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/admin/projects" element={<ProtectedRoute adminOnly><DashboardLayout><AdminProjectsPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/admin/users" element={<ProtectedRoute adminOnly><DashboardLayout><AdminUsersPage/></DashboardLayout></ProtectedRoute>}/>
      <Route path="/admin/analytics" element={<ProtectedRoute adminOnly><DashboardLayout><AnalyticsPage/></DashboardLayout></ProtectedRoute>}/>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace/>}/>
    </Routes>
  );
};

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster position="top-right" toastOptions={{ duration: 4000, style: { borderRadius: '12px', fontSize: '14px' } }}/>
        <AppRoutes/>
      </AuthProvider>
    </BrowserRouter>
  );
}
