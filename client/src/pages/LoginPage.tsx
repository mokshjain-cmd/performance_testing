
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Input, Card } from '../components/common';
import { Layout } from '../components/layout';
import { authService } from '../services/auth.service';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'email' | 'otp'>('email');
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

    setLoading(true);
    try {
      const result = await authService.requestLoginOTP(email);
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
      const result = await authService.verifyLoginOTP(email, otp);
      if (result.success) {
        alert('Login successful!');
        
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

  const handleBackToEmail = () => {
    setStep('email');
    setOtp('');
    setError('');
  };

  return (
    <Layout>
      <div className="flex items-center justify-center min-h-[calc(100vh-250px)]">
        <Card className="w-full max-w-md">
          <h2 className="text-3xl font-bold text-center mb-8 bg-gradient-to-r from-blue-600 to-blue-500 bg-clip-text text-transparent">
            Login
          </h2>

          {error && (
            <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-lg text-sm">
              {error}
            </div>
          )}

          {step === 'email' ? (
            <form onSubmit={handleRequestOTP} className="space-y-6">
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
                {loading ? 'Verifying...' : 'Verify & Login'}
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                size="lg"
                onClick={handleBackToEmail}
                disabled={loading}
              >
                Back to Email
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don't have an account?{' '}
              <button
                onClick={() => navigate('/signup')}
                className="text-blue-600 hover:text-blue-700 font-semibold"
              >
                Sign Up
              </button>
            </p>
          </div>
        </Card>
      </div>
    </Layout>
  );
}
