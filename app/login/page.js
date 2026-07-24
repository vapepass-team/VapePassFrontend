'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Mail, Lock, CheckCircle, Eye, EyeOff } from 'lucide-react';
import LoginLayout from '@/components/LoginLayout';
import GuestGuard from '@/components/GuestGuard';
import { Input, FormField, InputGroup, InputIcon, InputToggle } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fieldErrorsToMap } from '@/lib/api';
import { canAccessDashboard } from '@/lib/subscription';
import { needsEmailVerification } from '@/lib/email-verification';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const resetSuccess = searchParams.get('reset') === 'success';

  const validate = () => {
    const next = {};
    if (!email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(email)) next.email = 'Enter a valid email address';
    if (!password) next.password = 'Password is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      const data = await login(email.trim(), password);

      if (data.user?.role === 'admin') {
        router.replace('/admin');
        return;
      }

      if (needsEmailVerification(data.user)) {
        router.replace('/verify-email');
        return;
      }

      // Route only after subscription status was loaded from the backend/DB
      const status = data.store?.subscriptionStatus;
      if (!data.store || status == null) {
        setErrors({
          _form:
            'Signed in, but subscription status could not be verified. Please try again.',
        });
        return;
      }

      router.replace(canAccessDashboard(status) ? '/dashboard' : '/subscribe');
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = fieldErrorsToMap(err.errors);
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        else setErrors({ _form: err.message });
      } else {
        setErrors({
          _form:
            err?.message ||
            'Unable to sign in or verify subscription. Please try again.',
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <LoginLayout
      footer={
        <p className="text-sm text-body">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
          >
            Create account
          </Link>
        </p>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5" noValidate>
        {resetSuccess && (
          <p
            className="text-sm text-success-700 bg-success-50 border border-green-200 rounded-xl px-4 py-3 flex items-start gap-2"
            role="status"
          >
            <CheckCircle size={16} className="mt-0.5 shrink-0" aria-hidden="true" />
            <span>Password updated successfully. Sign in with your new password.</span>
          </p>
        )}

        {errors._form && (
          <p
            className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
            role="alert"
          >
            {errors._form}
          </p>
        )}

        <FormField
          label="Email"
          htmlFor="email"
          error={errors.email}
          required
          className="[&_label]:font-semibold [&_label]:text-ink"
        >
          <InputGroup>
            <InputIcon>
              <Mail size={16} />
            </InputIcon>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              className="pl-10 h-12 rounded-xl"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              error={Boolean(errors.email)}
            />
          </InputGroup>
        </FormField>

        <FormField
          label="Password"
          htmlFor="password"
          error={errors.password}
          required
          className="[&_label]:font-semibold [&_label]:text-ink"
        >
          <InputGroup>
            <InputIcon>
              <Lock size={16} />
            </InputIcon>
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              placeholder="••••••••"
              className="pl-10 pr-10 h-12 rounded-xl"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              error={Boolean(errors.password)}
            />
            <InputToggle
              label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword((v) => !v)}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </InputToggle>
          </InputGroup>
        </FormField>

        <div className="flex justify-end -mt-1">
          <Link
            href="/forgot-password"
            className="text-sm font-medium text-brand-600 hover:text-brand-700 transition-colors"
          >
            Forgot password?
          </Link>
        </div>

        <button
          type="submit"
          disabled={loading}
          className={[
            'w-full h-12 mt-1 text-[15px] font-semibold text-white rounded-xl',
            'bg-brand-600 hover:bg-brand-700 transition-all duration-200',
            'shadow-[0_8px_20px_rgba(124,58,237,0.28)] hover:shadow-[0_10px_24px_rgba(124,58,237,0.35)]',
            'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/30',
            'disabled:opacity-60 disabled:pointer-events-none disabled:shadow-none',
            'select-none touch-manipulation',
          ].join(' ')}
        >
          {loading ? 'Signing in…' : 'Sign in'}
        </button>
      </form>
    </LoginLayout>
  );
}

export default function Login() {
  return (
    <GuestGuard>
      <Suspense fallback={null}>
        <LoginForm />
      </Suspense>
    </GuestGuard>
  );
}
