import { apiRequest } from './api.js';

export async function registerUser(payload) {
  const res = await apiRequest('/auth/register', {
    method: 'POST',
    body: payload,
    auth: false,
  });
  return res.data;
}

export async function loginUser(email, password) {
  const res = await apiRequest('/auth/login', {
    method: 'POST',
    body: { email, password },
    auth: false,
  });
  return res.data;
}

export async function logoutUser() {
  return apiRequest('/auth/logout', { method: 'POST' });
}

export async function forgotPassword(email) {
  const res = await apiRequest('/auth/forgot-password', {
    method: 'POST',
    body: { email },
    auth: false,
  });
  return res.data;
}

export async function verifyPasswordResetOtp(email, otp) {
  const res = await apiRequest('/auth/forgot-password/verify', {
    method: 'POST',
    body: { email, otp },
    auth: false,
  });
  return res.data;
}

export async function resetPassword(token, password) {
  const res = await apiRequest('/auth/reset-password', {
    method: 'POST',
    body: { token, password },
    auth: false,
  });
  return res.data;
}

export async function requestPasswordChange(currentPassword, newPassword, confirmPassword) {
  const res = await apiRequest('/auth/change-password', {
    method: 'POST',
    body: { currentPassword, newPassword, confirmPassword },
  });
  return res.data;
}

export async function confirmPasswordChange(otp) {
  const res = await apiRequest('/auth/change-password/confirm', {
    method: 'POST',
    body: { otp },
  });
  return res.data;
}

export async function verifyEmail(otp) {
  const res = await apiRequest('/auth/verify-email', {
    method: 'POST',
    body: { otp },
  });
  return res.data;
}

export async function resendVerification() {
  const res = await apiRequest('/auth/resend-verification', {
    method: 'POST',
  });
  return res.data;
}

export async function getProfile() {
  const res = await apiRequest('/auth/profile');
  return res.data.user;
}

export async function updateProfile(payload) {
  const res = await apiRequest('/auth/profile', {
    method: 'PATCH',
    body: payload,
  });
  return res.data.user;
}
