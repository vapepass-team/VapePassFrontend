'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessDashboard } from '@/lib/subscription';
import { needsEmailVerification } from '@/lib/email-verification';
import Spinner from '@/components/ui/Spinner';
import Button from '@/components/ui/Button';

/**
 * Locks the retailer dashboard until billing allows access.
 * Active and Payment Failed (past_due / retry window) may enter the dashboard.
 * Unverified email → /verify-email. Trial / Paused / Expired → /subscribe.
 *
 * Missing store or a failed status fetch must NOT be treated as inactive.
 */
export default function SubscriptionGuard({ children }) {
  const {
    user,
    store,
    loading,
    storeLoading,
    storeError,
    isAuthenticated,
    refreshStore,
  } = useAuth();
  const router = useRouter();

  const awaitingStore =
    isAuthenticated &&
    user?.role !== 'admin' &&
    !store &&
    !storeError &&
    (loading || storeLoading);

  const needsVerify = isAuthenticated && needsEmailVerification(user);

  const needsSubscription =
    isAuthenticated &&
    user?.role !== 'admin' &&
    store &&
    !needsVerify &&
    !canAccessDashboard(store.subscriptionStatus);

  useEffect(() => {
    if (loading || storeLoading || awaitingStore || storeError) return;
    if (needsVerify) {
      router.replace('/verify-email');
      return;
    }
    if (needsSubscription) {
      router.replace('/subscribe');
    }
  }, [
    loading,
    storeLoading,
    awaitingStore,
    storeError,
    needsVerify,
    needsSubscription,
    router,
  ]);

  if (loading || awaitingStore || storeLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isAuthenticated && user?.role !== 'admin' && storeError) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-canvas px-4">
        <div className="max-w-md w-full text-center space-y-4">
          <p className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3" role="alert">
            {storeError}
          </p>
          <Button
            type="button"
            onClick={() => {
              refreshStore().catch(() => {});
            }}
          >
            Retry
          </Button>
        </div>
      </div>
    );
  }

  if (needsVerify || needsSubscription) return null;

  return children;
}
