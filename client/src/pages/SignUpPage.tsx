import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';
import { Layout } from '../components/layout';

export default function SignUpPage() {
  const [form, setForm] = useState({ name: '', email: '' });
  const navigate = useNavigate();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('http://localhost:3000/api/users/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Signup failed');
      alert('Signup successful! Please login.');
      navigate('/login');
    } catch {
      alert('Signup failed.');
    }
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
        <Card className="w-full max-w-md">
        <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">Sign Up</h2>
        <form onSubmit={handleSignUp} className="space-y-6">
          <Input
            type="text"
            label="Name"
            name="name"
            value={form.name}
            onChange={handleChange}
            placeholder="Enter your name"
            required
          />
          <Input
            type="email"
            label="Email"
            name="email"
            value={form.email}
            onChange={handleChange}
            placeholder="Enter your email"
            required
          />
          <Button type="submit" variant="primary" className="w-full" size="lg">
            Sign Up
          </Button>
        </form>
        </Card>
      </div>
    </Layout>
  );
}
