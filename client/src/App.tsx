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
  AdminSleepSessionPage
} from './pages';
import SignUpPage from './pages/SignUpPage';
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
