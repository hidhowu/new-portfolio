import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import { PageShell } from '@/components/layout/PageShell';
import { get, post, del } from '@/lib/api';
import { useAuth } from '@/lib/auth';

interface AdminUser {
  id: string;
  email: string;
  name: string;
  createdAt: string;
  lastLoginAt: string | null;
}

export default function AccountPage() {
  const { user } = useAuth();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);

  const [users, setUsers] = useState<AdminUser[]>([]);
  const [newUser, setNewUser] = useState({ name: '', email: '', password: '' });
  const [creating, setCreating] = useState(false);

  async function loadUsers() {
    try {
      setUsers(await get<AdminUser[]>('/api/admin/auth/users'));
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  useEffect(() => { loadUsers(); }, []);

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

  async function handleCreate(e: React.FormEvent) {
    e.preventDefault();
    if (newUser.password.length < 12) { toast.error('Password must be at least 12 characters'); return; }
    setCreating(true);
    try {
      await post('/api/admin/auth/users', newUser);
      toast.success('User added');
      setNewUser({ name: '', email: '', password: '' });
      loadUsers();
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(u: AdminUser) {
    if (!confirm(`Remove ${u.email}? This cannot be undone.`)) return;
    try {
      await del(`/api/admin/auth/users/${u.id}`);
      toast.success('User removed');
      loadUsers();
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary';
  const labelCls = 'block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5';

  return (
    <PageShell title="Account" description="Manage your admin account and users">
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
              <label className={labelCls}>Current Password</label>
              <input type="password" className={inputCls} value={form.current} onChange={(e) => setForm({ ...form, current: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>New Password</label>
              <input type="password" className={inputCls} value={form.next} onChange={(e) => setForm({ ...form, next: e.target.value })} required minLength={12} />
            </div>
            <div>
              <label className={labelCls}>Confirm New Password</label>
              <input type="password" className={inputCls} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />
            </div>
            <button type="submit" disabled={saving} className="bg-primary text-white w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">
              {saving ? 'Saving…' : 'Change Password'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="font-semibold text-[15px] mb-4">Add User</h2>
          <form onSubmit={handleCreate} className="space-y-3">
            <div>
              <label className={labelCls}>Name</label>
              <input type="text" className={inputCls} value={newUser.name} onChange={(e) => setNewUser({ ...newUser, name: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Email</label>
              <input type="email" className={inputCls} value={newUser.email} onChange={(e) => setNewUser({ ...newUser, email: e.target.value })} required />
            </div>
            <div>
              <label className={labelCls}>Password</label>
              <input type="password" className={inputCls} value={newUser.password} onChange={(e) => setNewUser({ ...newUser, password: e.target.value })} required minLength={12} />
            </div>
            <button type="submit" disabled={creating} className="bg-primary text-white w-full py-2.5 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">
              {creating ? 'Adding…' : 'Add User'}
            </button>
          </form>
        </div>

        <div className="bg-white border border-border rounded-xl p-6">
          <h2 className="font-semibold text-[15px] mb-4">Users</h2>
          <div className="space-y-2">
            {users.map((u) => (
              <div key={u.id} className="flex items-center justify-between py-2 border-b border-border last:border-0">
                <div className="min-w-0">
                  <div className="text-sm font-medium truncate">{u.name}</div>
                  <div className="text-xs text-text-muted truncate">{u.email}</div>
                </div>
                {u.email !== user?.email && (
                  <button
                    onClick={() => handleDelete(u)}
                    className="text-text-muted hover:text-red-600 p-1.5 rounded-md hover:bg-red-50 transition-colors shrink-0"
                    aria-label={`Remove ${u.email}`}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
            {users.length === 0 && <p className="text-sm text-text-muted">No users found.</p>}
          </div>
        </div>
      </div>
    </PageShell>
  );
}
