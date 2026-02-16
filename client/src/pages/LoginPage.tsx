
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`http://localhost:3000/api/users/by-email?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!data.success) throw new Error('User not found');
      localStorage.setItem('userId', data.data._id);
      alert('Login successful!');
      navigate('/dashboard');
    } catch {
      alert('User not found. Please sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center">
      <Card className="w-full max-w-md">
        <h2 className="text-2xl font-bold text-center mb-6">Login</h2>
        <form onSubmit={handleLogin} className="space-y-4">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
          <Button type="submit" variant="primary" className="w-full" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className="mt-4 text-center">
          <Button variant="secondary" className="w-full" onClick={() => navigate('/signup')}>
            Sign Up
          </Button>
        </div>
      </Card>
    </div>
  );
}
