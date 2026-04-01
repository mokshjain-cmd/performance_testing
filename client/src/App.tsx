import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { 
  HomePage, 
  DashboardPage, 
  AdminDashboardPage, 
  LoginPage, 
  SessionFormPage,
  SleepOverviewPage,
  SleepSessionPage,
  AdminSleepDashboardPage,
  AdminSleepSessionPage,
  ActivityOverviewPage,
  AdminActivityDashboardPage
} from './pages';
import SignUpPage from './pages/SignUpPage';
import FirmwareConfigPage from './pages/FirmwareConfigPage';
import UserEngagementDashboardPage from './pages/UserEngagementDashboardPage';
import { ProtectedRoute, AdminRoute, TesterRoute } from './components/common';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        
        {/* Admin Dashboard - Only accessible by admins */}
        <Route path="/admin/dashboard" element={
          <AdminRoute>
            <AdminDashboardPage />
          </AdminRoute>
        } />
        
        {/* Admin Sleep Dashboard - Only accessible by admins */}
        <Route path="/admin/sleep" element={
          <AdminRoute>
            <AdminSleepDashboardPage />
          </AdminRoute>
        } />
        
        {/* Admin Sleep Session Detail - Only accessible by admins */}
        <Route path="/admin/sleep/session/:sessionId" element={
          <AdminRoute>
            <AdminSleepSessionPage />
          </AdminRoute>
        } />
        
        {/* Admin Activity Dashboard - Only accessible by admins */}
        <Route path="/admin/activity" element={
          <AdminRoute>
            <AdminActivityDashboardPage />
          </AdminRoute>
        } />
        
        {/* Admin Firmware Configuration - Only accessible by admins */}
        <Route path="/admin/firmware-config" element={
          <AdminRoute>
            <FirmwareConfigPage />
          </AdminRoute>
        } />
        
        {/* Admin User Engagement Monitoring - Only accessible by admins */}
        <Route path="/admin/engagement" element={
          <AdminRoute>
            <UserEngagementDashboardPage />
          </AdminRoute>
        } />
        
        {/* Tester Dashboard - Only accessible by testers */}
        <Route path="/dashboard" element={
          <TesterRoute>
            <DashboardPage />
          </TesterRoute>
        } />
        
        {/* User Sleep Overview - Available to authenticated users */}
        <Route path="/sleep" element={
          <ProtectedRoute>
            <SleepOverviewPage />
          </ProtectedRoute>
        } />
        
        {/* User Sleep Session - Available to authenticated users */}
        <Route path="/sleep/session/:sessionId" element={
          <ProtectedRoute>
            <SleepSessionPage />
          </ProtectedRoute>
        } />
        
        {/* User Activity Overview - Available to authenticated users */}
        <Route path="/activity" element={
          <ProtectedRoute>
            <ActivityOverviewPage />
          </ProtectedRoute>
        } />
        
        {/* Session creation - Available to both roles */}
        <Route path="/session/new" element={
          <ProtectedRoute>
            <SessionFormPage />
          </ProtectedRoute>
        } />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
