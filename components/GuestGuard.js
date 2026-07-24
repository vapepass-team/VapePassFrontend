'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { canAccessDashboard } from '@/lib/subscription';
import { needsEmailVerification } from '@/lib/email-verification';
import Spinner from '@/components/ui/Spinner';

/**
 * Redirect authenticated users away from guest-only pages (login/register).
 * Pass allowAuthenticated for flows that signed-in users may also use
 * (forgot/reset password).
 */
export default function GuestGuard({ children, redirectTo, allowAuthenticated = false }) {
  const { user, store, isAuthenticated, loading, storeLoading, storeError } = useAuth();
  const router = useRouter();

  const needsStore = isAuthenticated && user?.role !== 'admin';
  const awaitingStore = needsStore && !store && !storeError;

  useEffect(() => {
    if (allowAuthenticated) return;
    if (loading || storeLoading || awaitingStore) return;
    if (!isAuthenticated) return;

    // Do not route to /subscribe when subscription status failed to load
    if (needsStore && storeError) return;

    let destination = redirectTo;
    if (!destination) {
      if (user?.role === 'admin') destination = '/admin';
      else if (!store) return;
      else if (needsEmailVerification(user)) destination = '/verify-email';
      else if (!canAccessDashboard(store.subscriptionStatus)) destination = '/subscribe';
      else destination = '/dashboard';
    } else if (needsEmailVerification(user) && destination === '/subscribe') {
      destination = '/verify-email';
    }
    router.replace(destination);
  }, [
    allowAuthenticated,
    loading,
    storeLoading,
    awaitingStore,
    isAuthenticated,
    needsStore,
    user,
    store,
    storeError,
    router,
    redirectTo,
  ]);

  if (loading || (!allowAuthenticated && (storeLoading || awaitingStore))) {
    return (
      <div className="min-h-screen flex items-center justify-center gradient-mesh">
        <Spinner size="lg" />
      </div>
    );
  }

  if (!allowAuthenticated && isAuthenticated && !(needsStore && storeError)) return null;

  return children;
}
