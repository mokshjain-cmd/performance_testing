import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';
import { Layout } from '../components/layout';
import { authService } from '../services/auth.service';

export default function SignUpPage() {
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'tester' | 'admin'>('tester');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'details' | 'otp'>('details');
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleRequestOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    // Validate email domain
    if (!email.endsWith('@nexxbase.com')) {
      setError('Only @nexxbase.com email addresses are allowed');
      return;
    }

    if (!name.trim()) {
      setError('Name is required');
      return;
    }

    setLoading(true);
    try {
      const result = await authService.requestSignupOTP(email);
      if (result.success) {
        setStep('otp');
        alert('OTP sent to your email! Check your inbox (or Mailtrap if in dev mode)');
      } else {
        setError(result.message || 'Failed to send OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to send OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await authService.verifySignupOTP(email, otp, name, role);
      if (result.success) {
        alert('Signup successful! Welcome to the platform!');
        
        // Redirect based on role
        if (result.user.role === 'admin') {
          navigate('/admin/dashboard');
        } else {
          navigate('/dashboard');
        }
      } else {
        setError(result.message || 'Invalid OTP');
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Invalid or expired OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleBackToDetails = () => {
    setStep('details');
    setOtp('');
    setError('');
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
        <Card className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            Sign Up
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'details' ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
              <Input
                type="text"
                label="Full Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                required
              />
              <Input
                type="email"
                label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your.name@nexxbase.com"
                required
              />
              <p className="text-xs text-gray-500 -mt-4">
                Only @nexxbase.com email addresses are allowed
              </p>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role
                </label>
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="tester"
                      checked={role === 'tester'}
                      onChange={(e) => setRole(e.target.value as 'tester')}
                      className="mr-2"
                    />
                    <span className="text-sm">Tester</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      name="role"
                      value="admin"
                      checked={role === 'admin'}
                      onChange={(e) => setRole(e.target.value as 'admin')}
                      className="mr-2"
                    />
                    <span className="text-sm">Admin</span>
                  </label>
                </div>
              </div>

              <Button type="submit" variant="primary" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Sending OTP...' : 'Request OTP'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOTP} className="space-y-6">
              <div className="text-sm text-gray-600 mb-4">
                Enter the 6-digit OTP sent to <strong>{email}</strong>
              </div>
              <Input
                type="text"
                label="OTP"
                value={otp}
                onChange={(e) => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder="123456"
                maxLength={6}
                required
              />
              <Button type="submit" variant="primary" className="w-full" size="lg" disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Sign Up'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={handleBackToDetails}
                disabled={loading}
              >
                Back to Details
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Already have an account?{' '}
              <button
                onClick={() => navigate('/login')}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Login
              </button>
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
