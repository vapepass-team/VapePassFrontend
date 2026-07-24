/** True when a signed-in store owner still needs email OTP verification. */
export function needsEmailVerification(user) {
  if (!user || user.role === 'admin') return false;
  return user.emailVerified === false;
}
