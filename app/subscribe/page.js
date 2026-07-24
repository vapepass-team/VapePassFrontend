'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Lock,
  Code2,
  Sparkles,
} from 'lucide-react';
import AuthGuard from '@/components/AuthGuard';
import SubscribeLayout from '@/components/SubscribeLayout';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Spinner from '@/components/ui/Spinner';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import {
  createCheckoutSession,
  createBillingPortal,
  getBillingInfo,
  confirmCheckoutSession,
} from '@/lib/billing-api';
import {
  getSubscriptionStatusLabel,
  isSubscriptionActive,
  canAccessDashboard,
} from '@/lib/subscription';
import { ApiError } from '@/lib/api';
import { markWelcomePending } from '@/lib/onboarding';
import { needsEmailVerification } from '@/lib/email-verification';

const PLAN_PERKS = [
  { icon: Lock, label: 'Dashboard unlock after payment' },
  { icon: Code2, label: 'Secure embed script for your website' },
  { icon: Sparkles, label: 'AI flavor recommendations for customers' },
];

export default function SubscribePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { store, user, refreshStore, logout, storeLoading, storeError } = useAuth();
  const [billingInfo, setBillingInfo] = useState(null);
  const [loading, setLoading] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState('');
  const [successNote, setSuccessNote] = useState('');
  const confirmedRef = useRef(false);

  const status = store?.subscriptionStatus;
  const active = isSubscriptionActive(status);
  const hasDashboardAccess = Boolean(store) && canAccessDashboard(status);
  const billingFlag = searchParams.get('billing');
  const sessionId = searchParams.get('session_id');
  const checkingStatus = storeLoading || (!store && !storeError);

  useEffect(() => {
    if (needsEmailVerification(user)) {
      router.replace('/verify-email');
    }
  }, [user, router]);

  useEffect(() => {
    getBillingInfo()
      .then(setBillingInfo)
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (billingFlag !== 'success' || confirmedRef.current) return undefined;

    confirmedRef.current = true;
    setConfirming(true);
    setSuccessNote('Payment received. Unlocking your dashboard…');
    setError('');

    let cancelled = false;

    const confirm = async () => {
      try {
        // Stripe may need a brief moment after redirect before session is fully queryable
        await new Promise((resolve) => setTimeout(resolve, 800));
        await confirmCheckoutSession(sessionId || undefined);
        if (cancelled) return;
        const storeData = await refreshStore();
        if (storeData?._id) markWelcomePending(storeData._id);
        setSuccessNote('Subscription activated. Opening dashboard…');
      } catch (err) {
        if (cancelled) return;
        // Retry once without session id (looks up customer subscriptions)
        try {
          await confirmCheckoutSession();
          const storeData = await refreshStore();
          if (storeData?._id) markWelcomePending(storeData._id);
          setSuccessNote('Subscription activated. Opening dashboard…');
        } catch (retryErr) {
          setError(
            retryErr instanceof ApiError
              ? retryErr.message
              : err instanceof ApiError
                ? err.message
                : 'Payment succeeded, but activation is still pending. Click “Unlock dashboard” below.'
          );
          setSuccessNote('');
          confirmedRef.current = false;
        }
      } finally {
        if (!cancelled) setConfirming(false);
      }
    };

    confirm();
    return () => {
      cancelled = true;
    };
  }, [billingFlag, sessionId, refreshStore]);

  useEffect(() => {
    if (hasDashboardAccess) {
      // Stripe return path — ensure pending flag exists even if confirm raced ahead
      if (billingFlag === 'success' && store?._id) {
        markWelcomePending(store._id);
      }
      router.replace('/dashboard');
    }
  }, [hasDashboardAccess, router, billingFlag, store?._id]);

  const startCheckout = async () => {
    setLoading(true);
    setError('');
    try {
      const { url } = await createCheckoutSession();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to start checkout');
    } finally {
      setLoading(false);
    }
  };

  const unlockAfterPayment = async () => {
    setConfirming(true);
    setError('');
    try {
      await confirmCheckoutSession(sessionId || undefined);
      const storeData = await refreshStore();
      if (storeData?._id) markWelcomePending(storeData._id);
      setSuccessNote('Subscription activated. Opening dashboard…');
    } catch (err) {
      setError(
        err instanceof ApiError
          ? err.message
          : 'Unable to activate subscription yet. Wait a few seconds and try again.'
      );
    } finally {
      setConfirming(false);
    }
  };

  const openPortal = async () => {
    setLoading(true);
    setError('');
    try {
      const { url } = await createBillingPortal();
      if (url) window.location.href = url;
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to open billing portal');
    } finally {
      setLoading(false);
    }
  };

  const price = billingInfo?.monthlyPrice ?? 99;

  const signOutFooter = (
    <button
      type="button"
      onClick={() => logout('/login')}
      className="text-sm font-semibold text-brand-600 hover:text-brand-700"
    >
      Sign out
    </button>
  );

  if (checkingStatus || needsEmailVerification(user)) {
    return (
      <AuthGuard>
        <div className="register-page login-page flex min-h-screen flex-col items-center justify-center gap-4 bg-[#f6f7fb] px-4">
          <Logo showText variant="sparkle" landing size={40} />
          <Spinner size="lg" />
          <p className="text-sm text-body">
            {needsEmailVerification(user)
              ? 'Redirecting to email verification…'
              : 'Checking subscription status…'}
          </p>
        </div>
      </AuthGuard>
    );
  }

  if (storeError && !store) {
    return (
      <AuthGuard>
        <SubscribeLayout
          title="Unable to verify subscription"
          subtitle="We could not load your billing status from the server"
          footer={signOutFooter}
        >
          <div className="space-y-4">
            <p
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-danger-50 px-4 py-3 text-sm text-danger-600"
              role="alert"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {storeError}
            </p>
            <Button
              className="w-full"
              onClick={() => {
                refreshStore().catch(() => {});
              }}
            >
              Retry
            </Button>
          </div>
        </SubscribeLayout>
      </AuthGuard>
    );
  }

  return (
    <AuthGuard>
      <SubscribeLayout footer={signOutFooter}>
        <div className="space-y-5">
          {successNote && (
            <p className="flex items-start gap-2 rounded-xl border border-green-200 bg-success-50 px-4 py-3 text-sm text-success-700">
              <CheckCircle2 size={16} className="mt-0.5 flex-shrink-0" />
              {successNote}
            </p>
          )}

          {error && (
            <p
              className="flex items-start gap-2 rounded-xl border border-red-200 bg-danger-50 px-4 py-3 text-sm text-danger-600"
              role="alert"
            >
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" />
              {error}
            </p>
          )}

          <div className="space-y-4 rounded-2xl border border-brand-100 bg-gradient-to-br from-brand-50/80 via-white to-violet-50/40 p-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.8)]">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-brand-600">
                  Store
                </p>
                <p className="truncate font-display text-lg font-semibold tracking-tight text-ink">
                  {store?.name || 'Your store'}
                </p>
                <p className="mt-1 truncate text-sm text-muted">{user?.email}</p>
              </div>
              <Badge variant={active ? 'success' : status === 'paused' ? 'danger' : 'warning'}>
                {getSubscriptionStatusLabel(status)}
              </Badge>
            </div>

            <div className="rounded-xl border border-line-subtle bg-white p-4 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl gradient-brand text-white shadow-brand">
                  <CreditCard size={18} aria-hidden="true" />
                </div>
                <div>
                  <p className="font-display font-semibold tracking-tight text-ink">VapePass Pro</p>
                  <p className="text-sm text-muted">${price}/month · recurring billing</p>
                </div>
              </div>
            </div>

            <ul className="space-y-2.5">
              {PLAN_PERKS.map(({ icon: Icon, label }) => (
                <li key={label} className="flex items-center gap-2.5 text-sm text-body">
                  <span className="inline-flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                    <Icon size={14} aria-hidden="true" />
                  </span>
                  {label}
                </li>
              ))}
            </ul>
          </div>

          {(billingFlag === 'success' || store?.stripeCustomerId) && !active && (
            <Button onClick={unlockAfterPayment} disabled={confirming || loading} className="w-full">
              {confirming ? 'Unlocking…' : 'Unlock dashboard'}
            </Button>
          )}

          {!active && (
            <Button
              onClick={startCheckout}
              disabled={loading || confirming}
              variant={billingFlag === 'success' ? 'secondary' : 'primary'}
              className="w-full shadow-brand"
            >
              {loading ? 'Redirecting…' : billingFlag === 'success' ? 'Retry checkout' : `Subscribe — $${price}/mo`}
            </Button>
          )}

          {(status === 'past_due' || status === 'paused' || store?.stripeCustomerId) && (
            <Button variant="secondary" onClick={openPortal} disabled={loading || confirming} className="w-full">
              Update payment method
            </Button>
          )}
        </div>
      </SubscribeLayout>
    </AuthGuard>
  );
}
