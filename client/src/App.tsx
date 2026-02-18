import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, DashboardPage, AdminDashboardPage, LoginPage, SessionFormPage } from './pages';
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
        
        {/* Tester Dashboard - Only accessible by testers */}
        <Route path="/dashboard" element={
          <TesterRoute>
            <DashboardPage />
          </TesterRoute>
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
