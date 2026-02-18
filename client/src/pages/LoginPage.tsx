
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';
import { Layout } from '../components/layout';

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
      localStorage.setItem('userRole', data.data.role || 'tester');
      alert('Login successful!');
      
      // Redirect based on role
      if (data.data.role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/dashboard');
      }
    } catch {
      alert('User not found. Please sign up.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
        <Card className="w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Login</h2>
        <form onSubmit={handleLogin} className="space-y-6">
          <Input
            type="email"
            label="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            required
          />
          <Button type="submit" variant="primary" className="w-full" size="lg" disabled={loading}>
            {loading ? 'Logging in...' : 'Login'}
          </Button>
        </form>
        <div className="mt-6 text-center">
          <Button variant="secondary" className="w-full" size="lg" onClick={() => navigate('/signup')}>
            Sign Up
          </Button>
        </div>
        </Card>
      </div>
    </Layout>
  );
}
