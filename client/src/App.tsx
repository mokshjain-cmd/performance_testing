import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { HomePage, DashboardPage, LoginPage, SessionFormPage } from './pages';
import SignUpPage from './pages/SignUpPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignUpPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/session/new" element={<SessionFormPage />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
