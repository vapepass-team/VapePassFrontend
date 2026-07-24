'use client';
import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { ChevronDown, Menu, LogOut, Settings, User } from 'lucide-react';
import Avatar from '@/components/ui/Avatar';
import { useAuth } from '@/context/AuthContext';

export default function Navbar({ onMenuClick }) {
  const { user, store, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  const storeName = store?.name || 'Your Store';

  useEffect(() => {
    const handleClick = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const handleLogout = async () => {
    setOpen(false);
    await logout();
  };

  return (
    <header className="flex items-center justify-between px-4 sm:px-6 h-16 bg-surface/80 backdrop-blur-md border-b border-line sticky top-0 z-20">
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 -ml-1 rounded-xl text-body hover:text-ink hover:bg-canvas transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
          aria-label="Open navigation menu"
        >
          <Menu size={20} />
        </button>
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-ink truncate">{storeName}</h2>
          <p className="text-xs text-muted truncate">{user?.email || 'Store dashboard'}</p>
        </div>
      </div>

      <div className="flex items-center gap-1 sm:gap-2">
        <div className="relative" ref={menuRef}>
          <button
            onClick={() => setOpen(!open)}
            className="flex items-center gap-2.5 px-2 sm:px-3 py-2 rounded-xl hover:bg-canvas transition-colors min-h-[44px]"
            aria-expanded={open}
            aria-haspopup="menu"
            aria-label="Account menu"
          >
            <Avatar name={storeName} src={store?.logo || undefined} size="sm" />
            <span className="text-sm font-medium text-ink hidden sm:block truncate max-w-[10rem]">
              {storeName}
            </span>
            <ChevronDown size={14} className={`text-muted transition-transform ${open ? 'rotate-180' : ''}`} />
          </button>

          {open && (
            <div
              role="menu"
              className="absolute right-0 mt-2 w-48 rounded-xl py-1.5 z-50 bg-surface border border-line shadow-lg animate-slide-down"
            >
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:text-ink hover:bg-canvas transition-colors"
              >
                <User size={15} /> Profile
              </Link>
              <Link
                href="/settings"
                role="menuitem"
                onClick={() => setOpen(false)}
                className="flex items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:text-ink hover:bg-canvas transition-colors"
              >
                <Settings size={15} /> Settings
              </Link>
              <hr className="my-1.5 border-line-subtle" />
              <button
                type="button"
                role="menuitem"
                onClick={handleLogout}
                className="flex w-full items-center gap-2.5 px-4 py-2.5 text-sm text-body hover:text-ink hover:bg-canvas transition-colors"
              >
                <LogOut size={15} /> Sign out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
