/** Canadian provinces/territories for store location */
import { resolveMediaUrl } from '@/lib/media';

export const CANADIAN_PROVINCES = [
  { code: 'AB', label: 'Alberta' },
  { code: 'BC', label: 'British Columbia' },
  { code: 'MB', label: 'Manitoba' },
  { code: 'NB', label: 'New Brunswick' },
  { code: 'NL', label: 'Newfoundland and Labrador' },
  { code: 'NS', label: 'Nova Scotia' },
  { code: 'NT', label: 'Northwest Territories' },
  { code: 'NU', label: 'Nunavut' },
  { code: 'ON', label: 'Ontario' },
  { code: 'PE', label: 'Prince Edward Island' },
  { code: 'QC', label: 'Quebec' },
  { code: 'SK', label: 'Saskatchewan' },
  { code: 'YT', label: 'Yukon' },
];

export const COUNTRY_OPTIONS = [
  { code: 'CA', label: 'Canada' },
  { code: 'US', label: 'United States' },
];

/** Map backend store document to frontend form shape */
export function storeToForm(store) {
  if (!store) {
    return {
      name: '',
      color: '#7c3aed',
      brandColor: '#7c3aed',
      reward: '',
      rewardDescription: '',
      stampGoal: 10,
      logo: null,
      address: '',
      country: 'CA',
      province: '',
      legalAge: 19,
    };
  }

  return {
    name: store.name || '',
    color: store.brandColor || '#7c3aed',
    brandColor: store.brandColor || '#7c3aed',
    reward: store.rewardDescription || '',
    rewardDescription: store.rewardDescription || '',
    stampGoal: store.stampGoal ?? 10,
    logo: resolveMediaUrl(store.logo) || null,
    subscriptionStatus: store.subscriptionStatus,
    productPageUrl: store.productPageUrl || '',
    websiteUrl: store.websiteUrl || store.productPageUrl || '',
    address: store.address || '',
    city: store.city || '',
    country: store.country || 'CA',
    province: store.province || '',
    legalAge: store.legalAge ?? 19,
    subscriptionStartDate: store.subscriptionStartDate || null,
    subscriptionEndDate: store.subscriptionEndDate || null,
    nextBillingDate: store.nextBillingDate || null,
    subscriptionPlan: store.subscriptionPlan || 'pro',
  };
}

/** Map frontend form to backend store settings payload */
export function formToStorePayload(form) {
  const payload = {
    name: form.name ?? form.storeName,
    brandColor: form.brandColor ?? form.color,
    rewardDescription: form.rewardDescription ?? form.reward,
    stampGoal: Number(form.stampGoal),
  };

  const websiteUrl = (form.websiteUrl || form.productPageUrl || '').trim();
  if (websiteUrl) {
    payload.websiteUrl = websiteUrl;
    payload.productPageUrl = websiteUrl;
  }

  if (form.address !== undefined) {
    payload.address = (form.address || '').trim() || null;
  }

  if (form.city !== undefined) {
    payload.city = (form.city || '').trim() || null;
  }

  if (form.country !== undefined) {
    payload.country = (form.country || 'CA').trim();
  }

  if (form.province !== undefined) {
    payload.province = (form.province || '').trim() || null;
  }

  return payload;
}
