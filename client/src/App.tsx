import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, DashboardPage, LoginPage, SessionFormPage } from './pages';
import SignUpPage from './pages/SignUpPage';
import { ProtectedRoute } from './components/common';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        } />
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
