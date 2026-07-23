'use client';

import { useState } from 'react';
import { Check, Calendar, ArrowRight } from 'lucide-react';
import AnimateIn from '@/components/AnimateIn';
import { Input, FormField } from '@/components/ui/Input';
import Spinner from '@/components/ui/Spinner';
import { ApiError, fieldErrorsToMap } from '@/lib/api';
import { submitContactLead } from '@/lib/contact-api';

const FEATURES_LEFT = [
  'AI Flavor Sommelier',
  'Palate profiling',
  'Customer analytics',
];

const FEATURES_RIGHT = [
  'Compliance engine',
  'Live inventory sync',
  'Full dashboard access',
];

const initialForm = {
  storeName: '',
  ownerName: '',
  email: '',
  phone: '',
  startDate: '',
  message: '',
};

export default function PricingSection() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const set = (field) => (e) => {
    setForm((prev) => ({ ...prev, [field]: e.target.value }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: undefined }));
    if (submitError) setSubmitError('');
  };

  const validate = () => {
    const next = {};
    if (!form.storeName.trim()) next.storeName = 'Store name is required';
    if (!form.ownerName.trim()) next.ownerName = "Owner's name is required";
    if (!form.email.trim()) {
      next.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      next.email = 'Enter a valid email address';
    }
    if (!form.phone.trim()) next.phone = 'Phone number is required';
    setErrors(next);
    return Object.keys(next).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setSubmitError('');
    try {
      await submitContactLead({
        storeName: form.storeName.trim(),
        ownerName: form.ownerName.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        startDate: form.startDate || undefined,
        message: form.message.trim(),
      });
      setSubmitted(true);
      setForm(initialForm);
    } catch (err) {
      if (err instanceof ApiError && err.errors?.length) {
        setErrors(fieldErrorsToMap(err.errors));
      }
      setSubmitError(
        err instanceof ApiError
          ? err.message
          : 'Unable to submit right now. Please try again in a moment.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="bg-[#f9fafb] py-20 sm:py-24 md:py-28" aria-labelledby="pricing-heading">
      <div className="max-w-[560px] mx-auto px-6">
        <AnimateIn variant="slide-up" className="text-center mb-10 sm:mb-12">
          <h2
            id="pricing-heading"
            className="text-[1.75rem] sm:text-3xl md:text-[2.25rem] font-bold text-[#111827] tracking-[-0.02em] mb-3"
          >
            Simple pricing
          </h2>
          <p className="text-[#6b7280] text-base sm:text-lg">One plan. Everything included.</p>
        </AnimateIn>

        <AnimateIn variant="slide-up" delay={100}>
          <div className="rounded-[18px] sm:rounded-[20px] border border-brand-200 bg-white shadow-[0_4px_24px_rgba(124,58,237,0.08),0_2px_8px_rgba(12,12,18,0.04)] overflow-hidden">
            {/* Price header */}
            <div className="gradient-brand px-8 sm:px-10 py-9 sm:py-10 text-center">
              <div className="flex items-baseline justify-center gap-1 mb-2.5">
                <span className="text-[2.75rem] sm:text-5xl font-bold text-white tracking-[-0.02em]">$100</span>
                <span className="text-white/80 text-lg sm:text-xl font-medium">/month</span>
              </div>
              <p className="text-white/75 text-sm sm:text-[15px]">
                AI Sommelier · Compliance Engine · Full Dashboard
              </p>
            </div>

            {/* Features */}
            <div className="px-8 sm:px-10 py-8 sm:py-9 border-b border-[#f0f1f5]">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3.5">
                <ul className="space-y-3.5">
                  {FEATURES_LEFT.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check size={16} className="text-brand-600 flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
                      <span className="text-[#374151] text-[14px] sm:text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
                <ul className="space-y-3.5">
                  {FEATURES_RIGHT.map((item) => (
                    <li key={item} className="flex items-center gap-2.5">
                      <Check size={16} className="text-brand-600 flex-shrink-0" strokeWidth={2.5} aria-hidden="true" />
                      <span className="text-[#374151] text-[14px] sm:text-[15px]">{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Signup form */}
            <div className="px-8 sm:px-10 py-8 sm:py-9">
              {submitted ? (
                <div className="text-center py-6 animate-fade-in" role="status">
                  <p className="text-lg font-bold text-[#111827] mb-2">You&apos;re on the list!</p>
                  <p className="text-[#6b7280] text-sm">
                    We&apos;ll reach out shortly. Check your email for a confirmation.
                  </p>
                </div>
              ) : (
                <form onSubmit={handleSubmit} noValidate>
                  <h3 className="text-[17px] sm:text-lg font-bold text-[#111827] mb-6 sm:mb-7 tracking-[-0.01em]">
                    Contact US — fill out your info
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 mb-5">
                    <FormField label="Store Name" htmlFor="storeName" error={errors.storeName} required className="[&_label]:text-[13px] [&_label]:text-[#6b7280] [&_label]:font-normal [&_label]:mb-1.5">
                      <Input
                        id="storeName"
                        placeholder="Cloud Nine Vapes"
                        className="h-11 rounded-lg"
                        value={form.storeName}
                        onChange={set('storeName')}
                        error={Boolean(errors.storeName)}
                        disabled={loading}
                      />
                    </FormField>

                    <FormField label="Owner's Name" htmlFor="ownerName" error={errors.ownerName} required className="[&_label]:text-[13px] [&_label]:text-[#6b7280] [&_label]:font-normal [&_label]:mb-1.5">
                      <Input
                        id="ownerName"
                        autoComplete="name"
                        placeholder="Alex Johnson"
                        className="h-11 rounded-lg"
                        value={form.ownerName}
                        onChange={set('ownerName')}
                        error={Boolean(errors.ownerName)}
                        disabled={loading}
                      />
                    </FormField>

                    <FormField label="Email" htmlFor="contactEmail" error={errors.email} required className="[&_label]:text-[13px] [&_label]:text-[#6b7280] [&_label]:font-normal [&_label]:mb-1.5">
                      <Input
                        id="contactEmail"
                        type="email"
                        autoComplete="email"
                        placeholder="you@store.com"
                        className="h-11 rounded-lg"
                        value={form.email}
                        onChange={set('email')}
                        error={Boolean(errors.email)}
                        disabled={loading}
                      />
                    </FormField>

                    <FormField label="Phone Number" htmlFor="phone" error={errors.phone} required className="[&_label]:text-[13px] [&_label]:text-[#6b7280] [&_label]:font-normal [&_label]:mb-1.5">
                      <Input
                        id="phone"
                        type="tel"
                        autoComplete="tel"
                        placeholder="(555) 000-0000"
                        className="h-11 rounded-lg"
                        value={form.phone}
                        onChange={set('phone')}
                        error={Boolean(errors.phone)}
                        disabled={loading}
                      />
                    </FormField>

                    <FormField label="When do you want to start?" htmlFor="startDate" className="sm:col-span-2 [&_label]:text-[13px] [&_label]:text-[#6b7280] [&_label]:font-normal [&_label]:mb-1.5">
                      <div className="relative">
                        <Input
                          id="startDate"
                          type="date"
                          placeholder="dd/mm/yyyy"
                          className="h-11 rounded-lg pr-10 [&::-webkit-calendar-picker-indicator]:opacity-0 [&::-webkit-calendar-picker-indicator]:absolute [&::-webkit-calendar-picker-indicator]:inset-0 [&::-webkit-calendar-picker-indicator]:w-full [&::-webkit-calendar-picker-indicator]:cursor-pointer"
                          value={form.startDate}
                          onChange={set('startDate')}
                          disabled={loading}
                        />
                        <Calendar
                          size={16}
                          className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6b7280] pointer-events-none"
                          aria-hidden="true"
                        />
                      </div>
                    </FormField>
                  </div>

                  <FormField
                    label="Message"
                    htmlFor="pricing-message"
                    hint="Optional"
                    className="mb-6 [&_label]:text-[13px] [&_label]:text-[#6b7280] [&_label]:font-normal [&_label]:mb-1.5"
                  >
                    <textarea
                      id="pricing-message"
                      name="message"
                      rows={4}
                      value={form.message}
                      onChange={set('message')}
                      disabled={loading}
                      placeholder="Tell us about your store, goals, or any questions…"
                      className={[
                        'w-full resize-y rounded-lg border bg-surface px-3.5 py-3 text-sm text-ink',
                        'placeholder:text-muted transition-all duration-[var(--duration-fast)]',
                        'focus:outline-none focus:ring-[3px]',
                        'border-line focus:border-brand-500 focus:ring-brand-500/15',
                        'disabled:opacity-50',
                      ].join(' ')}
                    />
                  </FormField>

                  {submitError && (
                    <p
                      className="mb-4 rounded-xl border border-red-200 bg-danger-50 px-4 py-3 text-sm text-danger-600"
                      role="alert"
                    >
                      {submitError}
                    </p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className={[
                      'w-full inline-flex items-center justify-center gap-2 h-12 px-6',
                      'text-[15px] font-semibold text-white rounded-full',
                      'gradient-brand shadow-brand',
                      'transition-all duration-200 hover:brightness-110 hover:shadow-lg',
                      'disabled:opacity-70 disabled:pointer-events-none',
                      'focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-brand-500/30',
                      'select-none touch-manipulation',
                    ].join(' ')}
                  >
                    {loading ? (
                      <>
                        <Spinner size="sm" className="border-white/30 border-t-white" />
                        Submitting…
                      </>
                    ) : (
                      <>
                        Contact US — $100/mo
                        <ArrowRight size={16} aria-hidden="true" />
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>
          </div>
        </AnimateIn>
      </div>
    </section>
  );
}
