'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, setToken } from '@/lib/api';
import * as authApi from '@/lib/auth-api';
import * as storeApi from '@/lib/store-api';
import { withResolvedStoreMedia } from '@/lib/media';

const AuthContext = createContext(null);

function isStoreDocument(value) {
  return (
    Boolean(value) &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    value.subscriptionStatus != null
  );
}

function commitStore(setter, store) {
  setter(withResolvedStoreMedia(store));
}

export function AuthProvider({ children }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [store, setStore] = useState(null);
  const [loading, setLoading] = useState(true);
  /** True while a store-owner session exists but store/subscription has not been resolved yet */
  const [storeLoading, setStoreLoading] = useState(false);
  /** Set when store/subscription fetch fails — do not treat as inactive */
  const [storeError, setStoreError] = useState(null);

  const resolveStoreForUser = useCallback(async (profile, preferredStore = null) => {
    if (!profile || profile.role === 'admin') {
      return null;
    }

    // Always prefer GET /store so subscriptionStatus comes from the database.
    try {
      return await storeApi.getStore();
    } catch (err) {
      if (isStoreDocument(preferredStore)) {
        return preferredStore;
      }
      if (isStoreDocument(profile.storeId)) {
        return profile.storeId;
      }
      throw err;
    }
  }, []);

  const loadSession = useCallback(async () => {
    const token = getToken();
    if (!token) {
      setUser(null);
      setStore(null);
      setStoreError(null);
      setStoreLoading(false);
      setLoading(false);
      return;
    }

    setStoreError(null);
    try {
      const profile = await authApi.getProfile();
      setUser(profile);

      if (profile.role === 'admin') {
        setStore(null);
        setStoreLoading(false);
      } else {
        setStoreLoading(true);
        try {
          const storeData = await resolveStoreForUser(profile);
          commitStore(setStore, storeData);
          setStoreError(null);
        } catch (err) {
          setStore(null);
          setStoreError(
            err?.message || 'Unable to verify subscription status. Please try again.'
          );
        } finally {
          setStoreLoading(false);
        }
      }
    } catch {
      setToken(null);
      setUser(null);
      setStore(null);
      setStoreError(null);
      setStoreLoading(false);
    } finally {
      setLoading(false);
    }
  }, [resolveStoreForUser]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const applyAuth = useCallback((data) => {
    if (data.accessToken) setToken(data.accessToken);
    if (data.user) setUser(data.user);
    if (data.store) commitStore(setStore, data.store);
  }, []);

  const login = useCallback(async (email, password) => {
    const data = await authApi.loginUser(email, password);

    // Persist token first so subsequent store fetch is authenticated
    if (data.accessToken) setToken(data.accessToken);

    let storeData = null;
    setStoreError(null);

    if (data.user?.role !== 'admin') {
      setStoreLoading(true);
      try {
        storeData = await resolveStoreForUser(data.user, data.store);
      } catch (err) {
        setStoreLoading(false);
        setStoreError(
          err?.message || 'Unable to verify subscription status. Please try again.'
        );
        // Do not leave a half-authenticated session that Guests treat as unpaid
        setToken(null);
        setUser(null);
        setStore(null);
        throw err;
      } finally {
        setStoreLoading(false);
      }
    }

    // Set user + store together so guards never see auth without subscription status
    setUser(data.user);
    commitStore(setStore, storeData);
    setStoreError(null);

    return { ...data, store: storeData };
  }, [resolveStoreForUser]);

  const register = useCallback(async (payload) => {
    const data = await authApi.registerUser(payload);
    applyAuth(data);
    setStoreError(null);
    setStoreLoading(false);
    return data;
  }, [applyAuth]);

  const logout = useCallback(async (redirectTo) => {
    const destination =
      redirectTo ?? (user?.role === 'admin' ? '/admin/login' : '/login');

    try {
      await authApi.logoutUser();
    } catch {
      // Clear local session even if API call fails
    }
    setToken(null);
    setUser(null);
    setStore(null);
    setStoreError(null);
    setStoreLoading(false);
    router.push(destination);
  }, [router, user]);

  const refreshStore = useCallback(async () => {
    setStoreLoading(true);
    setStoreError(null);
    try {
      const storeData = await storeApi.getStore();
      commitStore(setStore, storeData);
      return withResolvedStoreMedia(storeData);
    } catch (err) {
      setStoreError(
        err?.message || 'Unable to verify subscription status. Please try again.'
      );
      throw err;
    } finally {
      setStoreLoading(false);
    }
  }, []);

  const updateStore = useCallback(async (payload, logoFile = null) => {
    const updated = await storeApi.updateStoreSettings(payload, logoFile);
    const resolved = withResolvedStoreMedia(updated);
    commitStore(setStore, resolved);
    return resolved;
  }, []);

  const updateProfile = useCallback(async (payload) => {
    const updated = await authApi.updateProfile(payload);
    setUser(updated);
    return updated;
  }, []);

  const value = useMemo(
    () => ({
      user,
      store,
      loading,
      storeLoading,
      storeError,
      isAuthenticated: Boolean(user),
      login,
      register,
      logout,
      refreshStore,
      updateStore,
      updateProfile,
      reloadSession: loadSession,
    }),
    [
      user,
      store,
      loading,
      storeLoading,
      storeError,
      login,
      register,
      logout,
      refreshStore,
      updateStore,
      updateProfile,
      loadSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
