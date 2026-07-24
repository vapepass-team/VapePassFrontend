'use client';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import DashboardLayout from '@/components/DashboardLayout';
import PageHeader from '@/components/ui/PageHeader';
import { Card, CardTitle } from '@/components/ui/Card';
import Tabs from '@/components/ui/Tabs';
import Button from '@/components/ui/Button';
import Badge from '@/components/ui/Badge';
import Avatar from '@/components/ui/Avatar';
import { Input, FormField } from '@/components/ui/Input';
import { ContentReveal } from '@/components/ui/Skeleton';
import SettingsSkeleton, { BillingSkeleton } from '@/components/skeletons/SettingsSkeleton';
import { Save, CheckCircle, CreditCard, Zap, AlertTriangle, RefreshCw, KeyRound, Mail } from 'lucide-react';
import { useToast } from '@/components/ui/Toast';
import { useAuth } from '@/context/AuthContext';
import { storeToForm, CANADIAN_PROVINCES, COUNTRY_OPTIONS } from '@/lib/store-utils';
import { ApiError, fieldErrorsToMap } from '@/lib/api';
import { forgotPassword } from '@/lib/auth-api';
import Link from 'next/link';
import {
  getBillingInfo,
  createCheckoutSession,
  createBillingPortal,
  retryPayment,
} from '@/lib/billing-api';
import { getSubscriptionBadgeVariant, getSubscriptionStatusLabel, canAccessDashboard } from '@/lib/subscription';
import AutoSubscriptionSettings from '@/components/settings/AutoSubscriptionSettings';
import ChangePasswordCard from '@/components/settings/ChangePasswordCard';
import { resolveMediaUrl } from '@/lib/media';

export default function Settings() {
  const { toast } = useToast();
  const searchParams = useSearchParams();
  const {
    user,
    store,
    updateStore,
    updateProfile,
    refreshStore,
    loading: authLoading,
    storeLoading,
  } = useAuth();
  const tabParam = searchParams.get('tab');
  const initialTab =
    tabParam === 'billing' || tabParam === 'security' ? tabParam : 'profile';
  const [tab, setTab] = useState(initialTab);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [resetSending, setResetSending] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const [resetError, setResetError] = useState('');
  const [profile, setProfile] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    city: '',
    websiteUrl: '',
    country: 'CA',
    province: '',
  });
  const [logoFile, setLogoFile] = useState(null);
  const [logoPreview, setLogoPreview] = useState(null);
  const [logoUploading, setLogoUploading] = useState(false);
  /** Stored logos can 404 if the file is missing — fall back to initials */
  const [logoBroken, setLogoBroken] = useState(false);
  const [billingInfo, setBillingInfo] = useState(null);
  const [billingLoading, setBillingLoading] = useState(false);
  const [billingFetching, setBillingFetching] = useState(false);
  const [retryingPayment, setRetryingPayment] = useState(false);
  const [retryError, setRetryError] = useState('');

  const pageLoading = authLoading || storeLoading || !store || !user;
  const storeForm = storeToForm(store);

  const loadBillingInfo = async () => {
    const info = await getBillingInfo();
    setBillingInfo(info);
    return info;
  };

  useEffect(() => {
    if (store && user) {
      setProfile({
        name: store.name || '',
        email: user.email || '',
        phone: user.phone || '',
        address: store.address || '',
        city: store.city || '',
        websiteUrl: store.websiteUrl || store.productPageUrl || '',
        country: store.country || 'CA',
        province: store.province || '',
      });
    }
  }, [store, user]);

  useEffect(() => {
    setLogoBroken(false);
    if (!logoFile) {
      setLogoPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(logoFile);
    setLogoPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [logoFile]);

  useEffect(() => {
    setLogoBroken(false);
  }, [storeForm.logo]);

  const handleLogoSelect = async (event) => {
    const file = event.target.files?.[0];
    event.target.value = '';
    if (!file) return;

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      toast('Please choose a JPEG, PNG, WebP, or GIF image', 'error');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast('Logo must be smaller than 5 MB', 'error');
      return;
    }

    setLogoFile(file);
    setLogoUploading(true);
    try {
      await updateStore(
        {
          name: profile.name || store?.name,
        },
        file
      );
      setLogoFile(null);
      toast('Logo updated successfully', 'success');
    } catch (err) {
      toast(
        err instanceof ApiError ? err.message : 'Failed to upload logo. Please try again.',
        'error'
      );
    } finally {
      setLogoUploading(false);
    }
  };
  useEffect(() => {
    if (tab !== 'billing') return undefined;

    let cancelled = false;
    setBillingFetching(true);
    setRetryError('');
    loadBillingInfo()
      .catch(() => {
        if (!cancelled) setBillingInfo(null);
      })
      .finally(() => {
        if (!cancelled) setBillingFetching(false);
      });

    return () => {
      cancelled = true;
    };
  }, [tab]);

  const startCheckout = async () => {
    setBillingLoading(true);
    try {
      const { url } = await createCheckoutSession();
      if (url) window.location.href = url;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Unable to start checkout', 'error');
    } finally {
      setBillingLoading(false);
    }
  };

  const openPortal = async () => {
    setBillingLoading(true);
    try {
      const { url } = await createBillingPortal();
      if (url) window.location.href = url;
    } catch (err) {
      toast(err instanceof ApiError ? err.message : 'Unable to open billing portal', 'error');
    } finally {
      setBillingLoading(false);
    }
  };

  const handleRetryPayment = async () => {
    setRetryingPayment(true);
    setRetryError('');
    try {
      const result = await retryPayment();
      if (result.billing) setBillingInfo(result.billing);
      else await loadBillingInfo();
      await refreshStore().catch(() => {});
      toast(
        result.message || 'Payment successful. Your subscription is active again.',
        'success'
      );
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : 'We could not process your payment. Please try again or update your payment method.';
      setRetryError(message);
      toast(message, 'error');
      try {
        await loadBillingInfo();
        await refreshStore();
      } catch {
        /* ignore refresh errors */
      }
    } finally {
      setRetryingPayment(false);
    }
  };

  const saveProfile = async () => {
    setSaving(true);
    try {
      await Promise.all([
        updateStore({
          name: profile.name,
          address: profile.address,
          city: profile.city,
          websiteUrl: profile.websiteUrl,
          productPageUrl: profile.websiteUrl,
          country: profile.country,
          province: profile.province,
        }, logoFile),
        updateProfile({ phone: profile.phone }),
      ]);
      setLogoFile(null);
      setSaved(true);
      toast('Settings saved successfully', 'success');
      setTimeout(() => setSaved(false), 2500);
    } catch (err) {
      const message = err instanceof ApiError
        ? fieldErrorsToMap(err.errors).name || fieldErrorsToMap(err.errors).phone || err.message
        : 'Failed to save settings';
      toast(message, 'error');
    } finally {
      setSaving(false);
    }
  };

  const save = () => {
    if (tab === 'profile') {
      saveProfile();
      return;
    }
    setSaved(true);
    toast('Settings saved successfully', 'success');
    setTimeout(() => setSaved(false), 2500);
  };

  const tabs = [
    { id: 'profile', label: 'Business Profile' },
    { id: 'billing', label: 'Billing' },
    { id: 'security', label: 'Security' },
  ];

  const subscriptionStatus = billingInfo?.subscriptionStatus || store?.subscriptionStatus;
  const paymentFailed =
    Boolean(billingInfo?.paymentFailed) ||
    subscriptionStatus === 'past_due' ||
    subscriptionStatus === 'paused';
  /** Active / past_due already have a plan — do not offer new checkout (retry uses existing sub) */
  const showSubscribeButton =
    !canAccessDashboard(subscriptionStatus) && subscriptionStatus !== 'paused';
  const showManageSubscription =
    Boolean(billingInfo?.hasStripeSubscription) ||
    Boolean(store?.stripeCustomerId) ||
    Boolean(billingInfo?.billingProvider && billingInfo.billingProvider !== 'Not Available') ||
    canAccessDashboard(subscriptionStatus) ||
    paymentFailed;
  const canRetryPayment =
    paymentFailed &&
    (billingInfo
      ? Boolean(billingInfo.canRetryPayment)
      : Boolean(store?.stripeSubscriptionId || store?.stripeCustomerId));

  if (pageLoading) {
    return (
      <DashboardLayout>
        <SettingsSkeleton tab={tab} />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <ContentReveal>
      <PageHeader
        title="Business Settings"
        description="Manage your store account, plan, and preferences"
      />

      <Tabs tabs={tabs} active={tab} onChange={setTab} className="mb-8" />

      <div className="max-w-2xl">
        {tab === 'profile' && (
          <Card className="animate-fade-in space-y-6">
            <div className="flex items-center gap-4 pb-6 border-b border-line-subtle">
              <div className="relative flex-shrink-0">
                {(logoPreview || storeForm.logo) && !logoBroken ? (
                  <img
                    src={logoPreview || resolveMediaUrl(storeForm.logo)}
                    alt={`${profile.name || 'Store'} logo`}
                    className="w-16 h-16 rounded-2xl object-cover border border-line-subtle shadow-sm"
                    onError={() => setLogoBroken(true)}
                  />
                ) : (
                  <Avatar name={profile.name} size="xl" />
                )}
                {logoUploading && (
                  <div
                    className="absolute inset-0 rounded-2xl bg-ink/45 flex items-center justify-center"
                    aria-live="polite"
                  >
                    <RefreshCw size={18} className="text-white animate-spin" aria-hidden="true" />
                    <span className="sr-only">Uploading logo</span>
                  </div>
                )}
              </div>
              <div className="min-w-0">
                <p className="font-bold text-ink text-lg tracking-tight truncate">
                  {profile.name || 'Your Store'}
                </p>
                {/* Logo upload UI temporarily hidden
                <label className="mt-2 inline-block cursor-pointer">
                  <Button variant="secondary" size="sm" as="span" disabled={logoUploading || saving}>
                    {logoUploading ? 'Uploading…' : storeForm.logo || logoPreview ? 'Change Logo' : 'Upload Logo'}
                  </Button>
                  <input
                    type="file"
                    className="hidden"
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    aria-label="Upload logo"
                    disabled={logoUploading || saving}
                    onChange={handleLogoSelect}
                  />
                </label>
                <p className="text-xs text-muted mt-1.5">
                  JPEG, PNG, WebP, or GIF · max 5 MB
                  {logoFile ? ` · ${logoFile.name}` : ''}
                </p>
                */}
              </div>
            </div>

            <FormField label="Store Name" htmlFor="store-name">
              <Input
                id="store-name"
                value={profile.name}
                onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
              />
            </FormField>

            <FormField label="Email" htmlFor="email" hint="Account email — contact support to change">
              <Input id="email" type="email" value={profile.email} readOnly className="bg-canvas" />
            </FormField>

            <FormField label="Phone" htmlFor="phone" hint="Business contact phone">
              <Input
                id="phone"
                type="tel"
                value={profile.phone}
                onChange={(e) => setProfile((p) => ({ ...p, phone: e.target.value }))}
                placeholder="+1 604 555 0100"
              />
            </FormField>

            <FormField
              label="Website URL"
              htmlFor="websiteUrl"
              hint="Embed script is authorized for this domain only"
            >
              <Input
                id="websiteUrl"
                value={profile.websiteUrl}
                onChange={(e) => setProfile((p) => ({ ...p, websiteUrl: e.target.value }))}
                placeholder="https://yourstore.com"
              />
            </FormField>

            <FormField label="Address" htmlFor="address">
              <Input
                id="address"
                value={profile.address}
                onChange={(e) => setProfile((p) => ({ ...p, address: e.target.value }))}
                placeholder="1234 Main St"
              />
            </FormField>

            <FormField label="City" htmlFor="city">
              <Input
                id="city"
                value={profile.city}
                onChange={(e) => setProfile((p) => ({ ...p, city: e.target.value }))}
                placeholder="Vancouver"
              />
            </FormField>

            <FormField label="Country" htmlFor="country">
              <select
                id="country"
                value={profile.country}
                onChange={(e) => setProfile((p) => ({ ...p, country: e.target.value, province: '' }))}
                className="w-full h-11 px-3 rounded-xl border border-line-subtle bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
              >
                {COUNTRY_OPTIONS.map(({ code, label }) => (
                  <option key={code} value={code}>{label}</option>
                ))}
              </select>
            </FormField>

            {profile.country === 'CA' ? (
              <FormField label="Province / Region" htmlFor="province" hint="Used to determine the legal purchasing age for your AI assistant">
                <select
                  id="province"
                  value={profile.province}
                  onChange={(e) => setProfile((p) => ({ ...p, province: e.target.value }))}
                  className="w-full h-11 px-3 rounded-xl border border-line-subtle bg-white text-ink text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  <option value="">Select province…</option>
                  {CANADIAN_PROVINCES.map(({ code, label }) => (
                    <option key={code} value={code}>{label}</option>
                  ))}
                </select>
              </FormField>
            ) : (
              <FormField label="State / Region" htmlFor="province">
                <Input
                  id="province"
                  value={profile.province}
                  onChange={(e) => setProfile((p) => ({ ...p, province: e.target.value }))}
                  placeholder="Optional"
                />
              </FormField>
            )}

            {storeForm.legalAge && (
              <p className="text-xs text-muted bg-canvas border border-line-subtle rounded-xl px-4 py-3">
                Legal purchasing age at your location: <strong>{storeForm.legalAge}+</strong> (auto-calculated)
              </p>
            )}

            <Button onClick={save} className="w-full" disabled={saving}>
              {saving ? 'Saving…' : saved ? <><CheckCircle size={15} /> Saved</> : <><Save size={15} /> Save Changes</>}
            </Button>
          </Card>
        )}

        {tab === 'billing' && (
          <div className="space-y-5 animate-fade-in">
            {billingFetching && !billingInfo ? (
              <BillingSkeleton />
            ) : (
              <>
            {paymentFailed && (
              <Card className="border-amber-200 bg-amber-50 !p-5">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                    <AlertTriangle size={18} className="text-warning-700" aria-hidden="true" />
                  </div>
                  <div className="min-w-0 flex-1 space-y-3">
                    <div>
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <p className="font-bold text-ink">Payment Failed</p>
                        <Badge variant="warning">Payment Failed</Badge>
                      </div>
                      <p className="text-sm text-body leading-relaxed">
                        {billingInfo?.paymentFailureMessage ||
                          'We were unable to renew your subscription because your recent payment could not be processed. Please retry your payment to continue using VapePass without interruption.'}
                      </p>
                      {billingInfo?.openInvoice?.amountDue > 0 && (
                        <p className="text-xs text-muted mt-2">
                          Outstanding renewal:{' '}
                          <span className="font-semibold text-ink">
                            ${Number(billingInfo.openInvoice.amountDue).toFixed(2)}{' '}
                            {billingInfo.openInvoice.currency || 'USD'}
                          </span>
                        </p>
                      )}
                    </div>

                    {retryError && (
                      <p
                        className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-3 py-2.5"
                        role="alert"
                      >
                        {retryError}
                      </p>
                    )}

                    <div className="flex flex-wrap gap-2.5">
                      {canRetryPayment && (
                        <Button
                          size="sm"
                          onClick={handleRetryPayment}
                          disabled={retryingPayment || billingLoading}
                        >
                          <RefreshCw
                            size={14}
                            className={retryingPayment ? 'animate-spin' : ''}
                          />
                          {retryingPayment ? 'Retrying…' : 'Retry Payment'}
                        </Button>
                      )}
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={openPortal}
                        disabled={billingLoading || retryingPayment}
                      >
                        <CreditCard size={14} /> Update payment method
                      </Button>
                    </div>
                  </div>
                </div>
              </Card>
            )}

            <Card className="border-brand-200 ring-1 ring-brand-100">
              <div className="flex items-start justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl gradient-brand flex items-center justify-center shadow-sm">
                    <Zap size={20} className="text-white" />
                  </div>
                  <div>
                    <p className="font-bold text-ink">Pro Plan</p>
                    <p className="text-body text-sm">${billingInfo?.monthlyPrice ?? 99} / month</p>
                  </div>
                </div>
                <Badge variant={getSubscriptionBadgeVariant(subscriptionStatus)}>
                  {getSubscriptionStatusLabel(subscriptionStatus)}
                </Badge>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-6">
                {[
                  {
                    label: 'Payment status',
                    value: paymentFailed
                      ? 'Payment Failed'
                      : subscriptionStatus === 'active'
                        ? 'Paid'
                        : getSubscriptionStatusLabel(subscriptionStatus),
                  },
                  {
                    label: 'Billing provider',
                    value: billingInfo?.billingProvider || 'Not Available',
                  },
                  {
                    label: 'Status',
                    value: getSubscriptionStatusLabel(subscriptionStatus),
                  },
                  {
                    label: 'Subscription start',
                    value: billingInfo?.subscriptionStartDate || store?.subscriptionStartDate
                      ? new Date(
                          billingInfo?.subscriptionStartDate || store.subscriptionStartDate
                        ).toLocaleDateString()
                      : '—',
                  },
                  {
                    label: 'Renewal date',
                    value: billingInfo?.nextBillingDate || store?.nextBillingDate
                      ? new Date(billingInfo?.nextBillingDate || store.nextBillingDate).toLocaleDateString()
                      : '—',
                  },
                  {
                    label: 'Subscription end',
                    value: billingInfo?.subscriptionEndDate || store?.subscriptionEndDate
                      ? new Date(billingInfo?.subscriptionEndDate || store.subscriptionEndDate).toLocaleDateString()
                      : '—',
                  },
                  {
                    label: 'Auto Subscription',
                    value:
                      billingInfo?.autoRenew === false
                        ? 'Off'
                        : canAccessDashboard(subscriptionStatus)
                          ? 'On'
                          : '—',
                  },
                ].map(({ label, value }) => (
                  <div key={label} className="px-4 py-3.5 rounded-xl bg-canvas border border-line-subtle">
                    <p className="text-muted text-xs mb-1">{label}</p>
                    <p className="text-ink text-sm font-semibold">{value}</p>
                  </div>
                ))}
              </div>

              {(showSubscribeButton || showManageSubscription) && (
                <div className="flex flex-wrap gap-3">
                  {showSubscribeButton && (
                    <Button variant="secondary" size="sm" onClick={startCheckout} disabled={billingLoading}>
                      <CreditCard size={14} /> Subscribe — $99/mo
                    </Button>
                  )}
                  {showManageSubscription && (
                    <Button variant="secondary" size="sm" onClick={openPortal} disabled={billingLoading}>
                      Manage Subscription
                    </Button>
                  )}
                </div>
              )}
            </Card>

            <AutoSubscriptionSettings
              billingInfo={billingInfo}
              onUpdated={(result) => {
                setBillingInfo((prev) =>
                  prev
                    ? {
                        ...prev,
                        autoRenew: result.autoRenew !== false,
                        autoRenewUpdatedAt: result.autoRenewUpdatedAt || prev.autoRenewUpdatedAt,
                        nextBillingDate: result.nextBillingDate || prev.nextBillingDate,
                        subscriptionEndDate: result.subscriptionEndDate || prev.subscriptionEndDate,
                      }
                    : prev
                );
              }}
            />

            <Card>
              <CardTitle>Billing History</CardTitle>
              <p className="text-sm text-body mt-3">
                {canAccessDashboard(subscriptionStatus)
                  ? 'View invoices and update your payment method in the customer portal via Manage Subscription.'
                  : 'Invoice history is available in the customer portal after you subscribe.'}
              </p>
            </Card>
              </>
            )}
          </div>
        )}

        {tab === 'security' && (
          <div className="animate-fade-in space-y-5">
            <Card>
              <div className="rounded-xl border border-line bg-canvas/60 px-4 py-3 mb-5">
                <p className="text-xs text-muted mb-1">Registered email</p>
                <p className="text-sm font-medium text-ink flex items-center gap-2">
                  <Mail size={14} className="text-muted shrink-0" aria-hidden="true" />
                  {user?.email || '—'}
                </p>
              </div>

              <ChangePasswordCard onNotify={(message, variant) => toast(message, variant)} />
            </Card>

            <Card>
              <div className="flex items-start gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
                  <KeyRound size={18} className="text-brand-600" aria-hidden="true" />
                </div>
                <div>
                  <h3 className="font-semibold text-ink mb-1">Forgot password</h3>
                  <p className="text-body text-xs">
                    Don&apos;t remember your current password? We&apos;ll email a verification code
                    to your registered address so you can set a new one. The code expires in 10
                    minutes and can only be used once.
                  </p>
                </div>
              </div>

              {resetSent ? (
                <div className="rounded-xl border border-green-200 bg-success-50 px-4 py-3 space-y-2">
                  <p className="text-sm font-medium text-success-700">
                    Verification code sent successfully.
                  </p>
                  <p className="text-xs text-body">
                    Check your inbox, then{' '}
                    <Link
                      href="/forgot-password?step=otp"
                      className="text-brand-600 hover:text-brand-700 font-medium"
                    >
                      enter the code
                    </Link>{' '}
                    to choose a new password. If you don&apos;t see it, check spam or try again in a
                    few minutes.
                  </p>
                </div>
              ) : (
                <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                  <Button
                    type="button"
                    variant="secondary"
                    size="sm"
                    disabled={resetSending || !user?.email}
                    onClick={async () => {
                      if (!user?.email) return;
                      setResetError('');
                      setResetSending(true);
                      try {
                        await forgotPassword(user.email);
                        setResetSent(true);
                        toast('Verification code sent successfully', 'success');
                      } catch (err) {
                        const message =
                          err instanceof ApiError
                            ? err.message
                            : 'Unable to send verification code. Please try again.';
                        setResetError(message);
                        toast(message, 'error');
                      } finally {
                        setResetSending(false);
                      }
                    }}
                  >
                    {resetSending ? 'Sending…' : 'Email me a reset code'}
                  </Button>
                  <Link
                    href="/forgot-password"
                    className="text-sm font-medium text-brand-600 hover:text-brand-700"
                  >
                    Open forgot password page
                  </Link>
                </div>
              )}

              {resetError && (
                <p className="text-xs text-danger-600 mt-3" role="alert">
                  {resetError}
                </p>
              )}
            </Card>
          </div>
        )}
      </div>
      </ContentReveal>
    </DashboardLayout>
  );
}
