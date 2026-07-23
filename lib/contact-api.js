import { apiRequest } from './api.js';

/**
 * Submit the public pricing Contact Us form.
 * @param {{ storeName: string, ownerName: string, email: string, phone: string, startDate?: string, message?: string }} payload
 */
export async function submitContactLead(payload) {
  const res = await apiRequest('/support/contact', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  return res.data;
}
