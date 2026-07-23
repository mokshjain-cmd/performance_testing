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
  AdminActivityDashboardPage,
  SkinTempOverviewPage,
  SkinTempSessionPage,
  AdminSkinTempDashboardPage
} from './pages';
import SignUpPage from './pages/SignUpPage';
import FirmwareConfigPage from './pages/FirmwareConfigPage';
import UserEngagementDashboardPage from './pages/UserEngagementDashboardPage';
import FitnessAgePage from './pages/FitnessAgePage';
import AdminFitnessAgeDashboardPage from './pages/AdminFitnessAgeDashboardPage';
import HrvOverviewPage from './pages/HrvOverviewPage';
import HrvSessionPage from './pages/HrvSessionPage';
import ManualHrvFormPage from './pages/ManualHrvFormPage';
import { ProtectedRoute, AdminRoute, TesterRoute } from './components/common';
import ManualSleepFormPage from './pages/ManualSleepFormPage';
import ManualActivityFormPage from './pages/ManualActivityFormPage';
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
        
        {/* Admin SkinTemp Dashboard - Only accessible by admins */}
        <Route path="/admin/skintemp" element={
          <AdminRoute>
            <AdminSkinTempDashboardPage />
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

        {/* Admin Fitness Age Dashboard - Only accessible by admins */}
        <Route path="/admin/fitness-age" element={
          <AdminRoute>
            <AdminFitnessAgeDashboardPage />
          </AdminRoute>
        } />

        {/* Fitness Age - Available to any authenticated user (their own profile) */}
        <Route path="/fitness-age" element={
          <ProtectedRoute>
            <FitnessAgePage />
          </ProtectedRoute>
        } />

        {/* User HRV Overview - Available to authenticated users */}
        <Route path="/hrv" element={
          <ProtectedRoute>
            <HrvOverviewPage />
          </ProtectedRoute>
        } />

        {/* User HRV Session - Available to authenticated users */}
        <Route path="/hrv/session/:sessionId" element={
          <ProtectedRoute>
            <HrvSessionPage />
          </ProtectedRoute>
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
        
        {/* User SkinTemp Overview - Available to authenticated users */}
        <Route path="/skintemp" element={
          <ProtectedRoute>
            <SkinTempOverviewPage />
          </ProtectedRoute>
        } />
        
        {/* User SkinTemp Session - Available to authenticated users */}
        <Route path="/skintemp/session/:sessionId" element={
          <ProtectedRoute>
            <SkinTempSessionPage />
          </ProtectedRoute>
        } />
        <Route path="/sessions/manual-sleep" element={<ManualSleepFormPage />} />
        <Route
          path="/sessions/manual-activity"
          element={<ManualActivityFormPage />}
        />
        <Route path="/sessions/manual-hrv" element={<ManualHrvFormPage />} />
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
