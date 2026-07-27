'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard, Settings, X, Sparkles, Bot,
} from 'lucide-react';
import Logo from '@/components/Logo';
import { useAuth } from '@/context/AuthContext';
import { isSidebarRouteVisible } from '@/lib/nav-visibility';
import { getSubscriptionBadgeVariant, getSubscriptionStatusLabel } from '@/lib/subscription';
import Badge from '@/components/ui/Badge';
import { NeedHelpButton } from '@/components/onboarding/WelcomeOnboarding';

/** Visible retailer nav — loyalty routes remain in app but are hidden via nav-visibility. */
const nav = [
  { href: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { href: '/assistant', label: 'AI Assistant', icon: Bot },
  { href: '/settings', label: 'Settings', icon: Settings },
];

export default function Sidebar({ onClose, onNeedHelp }) {
  const path = usePathname();
  const { store } = useAuth();
  const storeName = store?.name || 'Your Store';

  return (
    <aside className="flex flex-col h-full bg-surface border-r border-line">
      <div className="flex items-center justify-between px-5 h-16 border-b border-line">
        <Logo size={32} showText href="/dashboard" />
        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-2 -mr-1 rounded-xl text-body hover:text-ink hover:bg-canvas transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
            aria-label="Close navigation menu"
          >
            <X size={20} />
          </button>
        )}
      </div>

      <div className="mx-4 mt-5 mb-2 px-4 py-3 rounded-xl bg-brand-50 border border-brand-100">
        <p className="text-[11px] font-semibold text-brand-600 uppercase tracking-wider mb-0.5">Current Store</p>
        <p className="text-sm font-semibold text-ink truncate">{storeName}</p>
      </div>

      <nav className="flex-1 px-3 py-3 space-y-1" aria-label="Main navigation">
        {nav.filter(({ href }) => isSidebarRouteVisible(href)).map(({ href, label, icon: Icon }) => {
          const active = path === href;
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              aria-current={active ? 'page' : undefined}
              className={[
                'flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium',
                'transition-all duration-[var(--duration-fast)] min-h-[44px]',
                active
                  ? 'bg-brand-600 text-white shadow-sm'
                  : 'text-body hover:text-ink hover:bg-canvas',
              ].join(' ')}
            >
              <Icon size={18} aria-hidden="true" />
              {label}
            </Link>
          );
        })}
      </nav>

      {onNeedHelp && (
        <div className="px-3 pb-2">
          <NeedHelpButton onClick={onNeedHelp} />
        </div>
      )}

      <div className="p-4 mx-3 mb-4 rounded-xl bg-gradient-to-br from-brand-50 to-brand-100/50 border border-brand-100">
        <div className="flex items-center gap-2 mb-1">
          <Sparkles size={14} className="text-brand-600" aria-hidden="true" />
          <p className="text-xs font-semibold text-ink">VapePass Plan</p>
        </div>
        <p className="text-xs text-body mb-2">$100/mo</p>
        <Badge variant={getSubscriptionBadgeVariant(store?.subscriptionStatus)}>
          {getSubscriptionStatusLabel(store?.subscriptionStatus)}
        </Badge>
      </div>
    </aside>
  );
}
