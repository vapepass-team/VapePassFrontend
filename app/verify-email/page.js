'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Mail, CheckCircle } from 'lucide-react';
import AuthLayout from '@/components/AuthLayout';
import AuthGuard from '@/components/AuthGuard';
import Button from '@/components/ui/Button';
import Spinner from '@/components/ui/Spinner';
import OtpInput from '@/components/ui/OtpInput';
import { useAuth } from '@/context/AuthContext';
import { verifyEmail, resendVerification } from '@/lib/auth-api';
import { ApiError } from '@/lib/api';
import { needsEmailVerification } from '@/lib/email-verification';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN_SEC = 60;

function VerifyEmailContent() {
  const router = useRouter();
  const { user, loading, reloadSession, logout } = useAuth();
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [info, setInfo] = useState('');
  const [verifying, setVerifying] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SEC);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (loading) return;
    if (!needsEmailVerification(user)) {
      router.replace('/subscribe');
    }
  }, [loading, user, router]);

  useEffect(() => {
    if (cooldown <= 0) return undefined;
    const id = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(id);
  }, [cooldown]);

  const handleVerify = useCallback(
    async (e) => {
      e?.preventDefault?.();
      if (otp.length !== OTP_LENGTH) {
        setError('Enter the 6-digit verification code');
        return;
      }

      setVerifying(true);
      setError('');
      setSuccess('');
      setInfo('');

      try {
        await verifyEmail(otp);
        setDone(true);
        setSuccess('Verification successful');
        await reloadSession();
        setTimeout(() => router.replace('/subscribe'), 1200);
      } catch (err) {
        setError(
          err instanceof ApiError
            ? err.message
            : 'Unable to verify code. Please try again.'
        );
      } finally {
        setVerifying(false);
      }
    },
    [otp, reloadSession, router]
  );

  const handleResend = async () => {
    if (cooldown > 0 || resending) return;

    setResending(true);
    setError('');
    setSuccess('');
    setInfo('');

    try {
      const data = await resendVerification();
      if (data?.alreadyVerified) {
        await reloadSession();
        router.replace('/subscribe');
        return;
      }
      setInfo('A new verification code has been sent.');
      setCooldown(data?.resendAvailableInSeconds || RESEND_COOLDOWN_SEC);
      setOtp('');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to resend code. Please try again.'
      );
    } finally {
      setResending(false);
    }
  };

  if (loading || !needsEmailVerification(user)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f9fafb]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <AuthLayout
      title="Verify your email"
      subtitle="Enter the code we sent to confirm your address"
    >
      {done ? (
        <div className="text-center space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-success-50 flex items-center justify-center mx-auto">
            <CheckCircle size={24} className="text-success-600" aria-hidden="true" />
          </div>
          <p className="font-semibold text-ink">Email verified</p>
          <p className="text-sm text-body">Continuing to subscription…</p>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-6" noValidate>
          <div className="text-center space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-brand-50 flex items-center justify-center mx-auto">
              <Mail size={24} className="text-brand-600" aria-hidden="true" />
            </div>
            <p className="text-sm text-body">
              We sent a 6-digit verification code to{' '}
              <span className="font-medium text-ink">{user?.email}</span>.
              The code expires in 10 minutes.
            </p>
          </div>

          {info && (
            <p
              className="text-sm text-success-700 bg-success-50 border border-green-200 rounded-xl px-4 py-3"
              role="status"
            >
              {info}
            </p>
          )}

          {success && (
            <p
              className="text-sm text-success-700 bg-success-50 border border-green-200 rounded-xl px-4 py-3"
              role="status"
            >
              {success}
            </p>
          )}

          {error && (
            <p
              className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
              role="alert"
            >
              {error}
            </p>
          )}

          <OtpInput
            value={otp}
            onChange={(next) => {
              setOtp(next);
              if (error) setError('');
            }}
            length={OTP_LENGTH}
            disabled={verifying}
            error={Boolean(error)}
            autoFocus
          />

          <Button
            type="submit"
            className="w-full"
            disabled={verifying || otp.length !== OTP_LENGTH}
          >
            {verifying ? 'Verifying…' : 'Verify email'}
          </Button>

          <div className="text-center space-y-3">
            <button
              type="button"
              onClick={handleResend}
              disabled={cooldown > 0 || resending}
              className="text-sm font-medium text-brand-600 hover:text-brand-700 disabled:text-muted disabled:pointer-events-none transition-colors"
            >
              {resending
                ? 'Sending…'
                : cooldown > 0
                  ? `Resend code in ${cooldown}s`
                  : 'Resend verification code'}
            </button>

            <p className="text-sm text-body">
              <button
                type="button"
                onClick={() => logout('/login')}
                className="font-medium text-brand-600 hover:text-brand-700"
              >
                Sign out
              </button>
            </p>
          </div>
        </form>
      )}
    </AuthLayout>
  );
}

export default function VerifyEmailPage() {
  return (
    <AuthGuard>
      <VerifyEmailContent />
    </AuthGuard>
  );
}
