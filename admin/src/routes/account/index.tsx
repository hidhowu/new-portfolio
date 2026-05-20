import { useState } from 'react';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { post } from '@/lib/api';
import { useAuth } from '@/lib/auth';

export default function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  async function handleChange(e: React.FormEvent) {
    e.preventDefault();
    if (form.next !== form.confirm) { toast.error('New passwords do not match'); return; }
    if (form.next.length < 12) { toast.error('Password must be at least 12 characters'); return; }
    setSaving(true);
    try {
      await post('/api/admin/auth/change-password', { current: form.current, next: form.next });
      toast.success('Password changed');
      setForm({ current: '', next: '', confirm: '' });
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary';

  return (
    <PageShell title="Account" description="Manage your admin account">
      <div className="max-w-md space-y-6">
        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="font-semibold text-[15px] mb-4">Account Details</h2>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between py-2 border-b border-border">
              <span className="text-text-muted">Email</span>
              <span className="font-medium">{user?.email}</span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-text-muted">Name</span>
              <span className="font-medium">{user?.name}</span>
            </div>
          </div>
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="font-semibold text-[15px] mb-4">Change Password</h2>
          <form onSubmit={handleChange} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Current Password</label>
              <input type="password" className={inputCls} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">New Password</label>
              <input type="password" className={inputCls} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required minLength={12} />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Confirm New Password</label>
              <input type="password" className={inputCls} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            <button type="submit" disabled={saving} className="bg-primary text-white w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>
      </div>
    </PageShell>
  );
}
