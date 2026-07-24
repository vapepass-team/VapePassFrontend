'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Mail, ArrowLeft } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import GuestGuard from '@/components/GuestGuard';
import Button from '@/components/ui/Button';
import { Input, FormField, InputGroup, InputIcon } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { forgotPassword } from '@/lib/auth-api';
import { ApiError, fieldErrorsToMap } from '@/lib/api';

function ForgotPasswordForm() {
  const { user, isAuthenticated } = useAuth();
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resetToken, setResetToken] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (user?.email) setEmail(user.email);
  }, [user?.email]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim()) {
      setError('Email is required');
      return;
    }
    if (!/^\S+@\S+\.\S+$/.test(email)) {
      setError('Enter a valid email address');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const data = await forgotPassword(email.trim());
      if (data?.resetToken) setResetToken(data.resetToken);
      setSent(true);
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = fieldErrorsToMap(err.errors);
        setError(fieldErrors.email || err.message);
      } else {
        setError('Unable to send reset link. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title="Forgot password?"
      subtitle="Enter your email and we'll send you a reset link"
    >
      {sent ? (
        <div className="text-center space-y-6">
          <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
            <Mail size={24} className="text-brand-600" aria-hidden="true" />
          </div>
          <div>
            <p className="font-semibold text-ink mb-2">Password reset email sent</p>
            <p className="text-sm text-body">
              If an account exists for <span className="font-medium text-ink">{email}</span>,
              you&apos;ll receive a password reset link shortly. The link expires in one hour.
            </p>
          </div>
          {resetToken && (
            <div className="text-left bg-canvas border border-line rounded-xl p-4 text-sm">
              <p className="text-muted text-xs mb-2">Development reset link:</p>
              <Link
                href={`/reset-password?token=${resetToken}`}
                className="text-brand-600 hover:text-brand-700 font-medium break-all"
              >
                Reset your password
              </Link>
            </div>
          )}
          <Link
            href={isAuthenticated ? '/settings?tab=security' : '/login'}
            className="inline-flex items-center gap-2 text-sm font-medium text-brand-600 hover:text-brand-700"
          >
            <ArrowLeft size={14} />
            {isAuthenticated ? 'Back to security settings' : 'Back to sign in'}
          </Link>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <FormField label="Email" htmlFor="email" error={error} required>
            <InputGroup>
              <InputIcon>
                <Mail size={16} />
              </InputIcon>
              <Input
                id="email"
                type="email"
                autoComplete="email"
                placeholder="you@store.com"
                className="pl-10"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                error={Boolean(error)}
                readOnly={Boolean(isAuthenticated && user?.email)}
              />
            </InputGroup>
          </FormField>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? 'Sending…' : 'Send Reset Link'}
          </Button>

          <p className="text-center text-sm text-body">
            <Link
              href={isAuthenticated ? '/settings?tab=security' : '/login'}
              className="inline-flex items-center gap-1.5 font-medium text-brand-600 hover:text-brand-700"
            >
              <ArrowLeft size={14} />
              {isAuthenticated ? 'Back to security settings' : 'Back to sign in'}
            </Link>
          </p>
        </form>
      )}
    </AuthLayout>
  );
}

export default function ForgotPassword() {
  return (
    <GuestGuard allowAuthenticated>
      <ForgotPasswordForm />
    </GuestGuard>
  );
}
