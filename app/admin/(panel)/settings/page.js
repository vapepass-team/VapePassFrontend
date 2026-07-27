'use client';

import PageHeader from '@/components/ui/PageHeader';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/context/AuthContext';

export default function AdminSettingsPage() {
  const { user } = useAuth();

  return (
    <>
      <PageHeader title="Admin Settings" description="Platform administration" />

      <Card className="space-y-4">
        <div>
          <p className="text-xs text-muted uppercase tracking-wider mb-1">Signed in as</p>
          <p className="font-semibold text-ink">{user?.firstName} {user?.lastName}</p>
          <p className="text-sm text-body">{user?.email}</p>
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink mb-2">Platform billing</p>
          <p className="text-sm text-body">Store subscription: $100/month via Stripe</p>
          <p className="text-xs text-muted mt-2">
            AI Assistant requires OPENAI_API_KEY and SCRAPINGBEE_API_KEY in backend .env.
          </p>
        </div>

        <div className="border-t border-line pt-4">
          <p className="text-sm font-semibold text-ink mb-2">Create admin user</p>
          <p className="text-sm text-body font-mono bg-canvas rounded-lg px-3 py-2">
            cd backend && npm run seed:admin
          </p>
        </div>
      </Card>
    </>
  );
}
