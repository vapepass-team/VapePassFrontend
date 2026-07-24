/**
 * Turns stored logo / media references into browser-loadable absolute URLs.
 *
 * Backend may return:
 * - `/uploads/logos/...` (portable local upload)
 * - `http://localhost:5000/uploads/...` (legacy misconfigured absolute)
 * - `https://res.cloudinary.com/...` (CDN)
 *
 * Production must never attempt to load loopback hosts from Vercel.
 */

const LOOPBACK = new Set(['localhost', '127.0.0.1', '0.0.0.0', '::1']);

let warnedLocalApi = false;

function getApiOrigin() {
  const apiUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api/v1').replace(
    /\/+$/,
    ''
  );
  return apiUrl.replace(/\/api\/v1$/i, '');
}

export function resolveMediaUrl(value) {
  const raw = String(value || '').trim();
  if (!raw) return null;

  const apiOrigin = getApiOrigin();

  // Deployed frontend must not talk to a loopback API origin
  if (typeof window !== 'undefined') {
    try {
      const pageHost = window.location.hostname.toLowerCase();
      const apiHost = new URL(apiOrigin).hostname.toLowerCase();
      if (!LOOPBACK.has(pageHost) && LOOPBACK.has(apiHost) && !warnedLocalApi) {
        warnedLocalApi = true;
        console.error(
          '[VapePass] NEXT_PUBLIC_API_URL points at localhost while the app is deployed. ' +
            'Set it to your Railway HTTPS API URL in Vercel → Settings → Environment Variables, then redeploy.'
        );
      }
    } catch {
      // ignore invalid API origin during boot
    }
  }

  if (raw.startsWith('/')) {
    return `${apiOrigin}${raw}`;
  }

  if (!/^https?:\/\//i.test(raw)) {
    return raw;
  }

  try {
    const url = new URL(raw);
    if (LOOPBACK.has(url.hostname.toLowerCase()) && url.pathname.startsWith('/uploads/')) {
      return `${apiOrigin}${url.pathname}`;
    }
  } catch {
    return raw;
  }

  return raw;
}

/** Rewrite store.logo (and nested copies) so UI never points at localhost */
export function withResolvedStoreMedia(store) {
  if (!store || typeof store !== 'object') return store;
  if (!store.logo) return store;
  const logo = resolveMediaUrl(store.logo);
  if (logo === store.logo) return store;
  return { ...store, logo };
}
