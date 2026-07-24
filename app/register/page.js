'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Mail, Lock, Store, User, Phone, Globe, MapPin, Eye, EyeOff } from 'lucide-react';
import RegisterLayout from '@/components/RegisterLayout';
import GuestGuard from '@/components/GuestGuard';
import { Input, FormField, InputGroup, InputIcon, InputToggle } from '@/components/ui/Input';
import { useAuth } from '@/context/AuthContext';
import { ApiError, fieldErrorsToMap } from '@/lib/api';
import { CANADIAN_PROVINCES, COUNTRY_OPTIONS } from '@/lib/store-utils';

const PASSWORD_RULE = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;

const INITIAL = {
  storeName: '',
  ownerName: '',
  phone: '',
  email: '',
  websiteUrl: '',
  country: 'CA',
  province: 'BC',
  city: '',
  address: '',
  subscriptionPlan: 'pro',
  password: '',
  confirmPassword: '',
};

const selectClassName =
  'w-full h-11 rounded-xl border border-line bg-white px-3.5 text-sm text-ink transition-all duration-[var(--duration-fast)] focus:outline-none focus:ring-[3px] focus:border-brand-500 focus:ring-brand-500/15';

export default function Register() {
  const router = useRouter();
  const { register } = useAuth();
  const [form, setForm] = useState(INITIAL);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const validate = () => {
    const next = {};
    if (!form.storeName.trim()) next.storeName = 'Store name is required';
    if (!form.ownerName.trim()) next.ownerName = 'Owner name is required';
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    if (!form.email.trim()) next.email = 'Email is required';
    else if (!/^\S+@\S+\.\S+$/.test(form.email)) next.email = 'Enter a valid email address';
    if (!form.websiteUrl.trim()) next.websiteUrl = 'Website URL is required';
    if (!form.country.trim()) next.country = 'Country is required';
    if (form.country === 'CA' && !form.province.trim()) next.province = 'Province is required';
    if (!form.city.trim()) next.city = 'City is required';
    if (!form.address.trim()) next.address = 'Address is required';
    if (!form.password) next.password = 'Password is required';
    else if (form.password.length < 8) next.password = 'Password must be at least 8 characters';
    else if (!PASSWORD_RULE.test(form.password)) {
      next.password = 'Password must contain uppercase, lowercase, and a number';
    }
    if (!form.confirmPassword) next.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) next.confirmPassword = 'Passwords do not match';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    try {
      await register({
        storeName: form.storeName.trim(),
        ownerName: form.ownerName.trim(),
        phone: form.phone.trim(),
        email: form.email.trim(),
        websiteUrl: form.websiteUrl.trim(),
        country: form.country,
        province: form.country === 'CA' ? form.province : null,
        city: form.city.trim(),
        address: form.address.trim(),
        subscriptionPlan: form.subscriptionPlan,
        password: form.password,
      });

      router.push('/verify-email');
    } catch (err) {
      if (err instanceof ApiError) {
        const fieldErrors = fieldErrorsToMap(err.errors);
        if (Object.keys(fieldErrors).length) setErrors(fieldErrors);
        else setErrors({ _form: err.message });
      } else {
        setErrors({ _form: 'Registration failed. Please try again.' });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <GuestGuard>
      <RegisterLayout
        footer={
          <p className="text-sm text-body">
            Already have an account?{' '}
            <Link
              href="/login"
              className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
            >
              Sign in
            </Link>
          </p>
        }
      >
        <form onSubmit={handleSubmit} className="flex flex-col gap-4 sm:gap-5" noValidate>
          {errors._form && (
            <p
              className="text-sm text-danger-600 bg-danger-50 border border-red-200 rounded-xl px-4 py-3"
              role="alert"
            >
              {errors._form}
            </p>
          )}

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-brand-600">
              Store details
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <FormField label="Store Name" htmlFor="storeName" error={errors.storeName} required>
                <InputGroup>
                  <InputIcon>
                    <Store size={16} />
                  </InputIcon>
                  <Input
                    id="storeName"
                    value={form.storeName}
                    onChange={set('storeName')}
                    placeholder="Vape City"
                    hasIcon
                    error={errors.storeName}
                    autoComplete="organization"
                  />
                </InputGroup>
              </FormField>

              <FormField label="Owner Name" htmlFor="ownerName" error={errors.ownerName} required>
                <InputGroup>
                  <InputIcon>
                    <User size={16} />
                  </InputIcon>
                  <Input
                    id="ownerName"
                    value={form.ownerName}
                    onChange={set('ownerName')}
                    placeholder="Alex Smith"
                    hasIcon
                    error={errors.ownerName}
                    autoComplete="name"
                  />
                </InputGroup>
              </FormField>

              <FormField label="Phone Number" htmlFor="phone" error={errors.phone} required>
                <InputGroup>
                  <InputIcon>
                    <Phone size={16} />
                  </InputIcon>
                  <Input
                    id="phone"
                    type="tel"
                    value={form.phone}
                    onChange={set('phone')}
                    placeholder="+1 604 555 0100"
                    hasIcon
                    error={errors.phone}
                    autoComplete="tel"
                  />
                </InputGroup>
              </FormField>

              <FormField label="Email" htmlFor="email" error={errors.email} required>
                <InputGroup>
                  <InputIcon>
                    <Mail size={16} />
                  </InputIcon>
                  <Input
                    id="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={set('email')}
                    placeholder="you@store.com"
                    hasIcon
                    error={errors.email}
                  />
                </InputGroup>
              </FormField>

              <FormField
                label="Website URL"
                htmlFor="websiteUrl"
                error={errors.websiteUrl}
                hint="Saved for your embed script domain. Inventory sync starts later from the dashboard."
                required
                className="sm:col-span-2"
              >
                <InputGroup>
                  <InputIcon>
                    <Globe size={16} />
                  </InputIcon>
                  <Input
                    id="websiteUrl"
                    value={form.websiteUrl}
                    onChange={set('websiteUrl')}
                    placeholder="https://yourstore.com"
                    hasIcon
                    error={errors.websiteUrl}
                    autoComplete="url"
                  />
                </InputGroup>
              </FormField>
            </div>
          </fieldset>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-brand-600">
              Location
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <FormField label="Country" htmlFor="country" error={errors.country} required>
                <select
                  id="country"
                  value={form.country}
                  onChange={set('country')}
                  className={selectClassName}
                >
                  {COUNTRY_OPTIONS.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {form.country === 'CA' ? (
                <FormField
                  label="Province / Region"
                  htmlFor="province"
                  error={errors.province}
                  required
                >
                  <select
                    id="province"
                    value={form.province}
                    onChange={set('province')}
                    className={selectClassName}
                  >
                    {CANADIAN_PROVINCES.map((p) => (
                      <option key={p.code} value={p.code}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                </FormField>
              ) : (
                <FormField label="State / Region" htmlFor="province" error={errors.province}>
                  <Input
                    id="province"
                    value={form.province}
                    onChange={set('province')}
                    placeholder="Optional"
                  />
                </FormField>
              )}

              <FormField label="City" htmlFor="city" error={errors.city} required>
                <InputGroup>
                  <InputIcon>
                    <MapPin size={16} />
                  </InputIcon>
                  <Input
                    id="city"
                    value={form.city}
                    onChange={set('city')}
                    placeholder="Vancouver"
                    hasIcon
                    error={errors.city}
                    autoComplete="address-level2"
                  />
                </InputGroup>
              </FormField>

              <FormField label="Address" htmlFor="address" error={errors.address} required>
                <Input
                  id="address"
                  value={form.address}
                  onChange={set('address')}
                  placeholder="123 Main Street"
                  error={errors.address}
                  autoComplete="street-address"
                />
              </FormField>
            </div>
          </fieldset>

          <fieldset className="m-0 min-w-0 border-0 p-0">
            <legend className="mb-2.5 p-0 text-[0.7rem] font-bold uppercase tracking-[0.08em] text-brand-600">
              Plan & security
            </legend>
            <div className="grid grid-cols-1 gap-3.5 sm:grid-cols-2 sm:gap-4">
              <FormField
                label="Subscription Plan"
                htmlFor="subscriptionPlan"
                className="sm:col-span-2"
              >
                <select
                  id="subscriptionPlan"
                  value={form.subscriptionPlan}
                  onChange={set('subscriptionPlan')}
                  className={selectClassName}
                >
                  <option value="pro">Pro — $99/month</option>
                </select>
              </FormField>

              <FormField label="Password" htmlFor="password" error={errors.password} required>
                <InputGroup>
                  <InputIcon>
                    <Lock size={16} />
                  </InputIcon>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.password}
                    onChange={set('password')}
                    hasIcon
                    error={errors.password}
                    placeholder="Min. 8 characters"
                    className="pr-10"
                  />
                  <InputToggle
                    label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((v) => !v)}
                  >
                    {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </InputToggle>
                </InputGroup>
              </FormField>

              <FormField
                label="Confirm Password"
                htmlFor="confirmPassword"
                error={errors.confirmPassword}
                required
              >
                <InputGroup>
                  <InputIcon>
                    <Lock size={16} />
                  </InputIcon>
                  <Input
                    id="confirmPassword"
                    type={showConfirmPassword ? 'text' : 'password'}
                    autoComplete="new-password"
                    value={form.confirmPassword}
                    onChange={set('confirmPassword')}
                    hasIcon
                    error={errors.confirmPassword}
                    placeholder="Repeat password"
                    className="pr-10"
                  />
                  <InputToggle
                    label={showConfirmPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowConfirmPassword((v) => !v)}
                  >
                    {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </InputToggle>
                </InputGroup>
              </FormField>
            </div>
          </fieldset>

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
            {loading ? 'Creating account…' : 'Continue to subscription'}
          </button>
        </form>
      </RegisterLayout>
    </GuestGuard>
  );
}
