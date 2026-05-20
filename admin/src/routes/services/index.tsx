import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, post, patch, del } from '@/lib/api';
import { Plus, Trash2, Edit2, Check, X, GripVertical, ExternalLink } from 'lucide-react';

interface SubForm { name: string; description: string; externalUrl: string; isActive: boolean; }
const emptyForm = (): SubForm => ({ name: '', description: '', externalUrl: '', isActive: true });

export default function ServicesPage() {
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [addingNew, setAddingNew] = useState(false);
  const [newForm, setNewForm] = useState<SubForm>(emptyForm());
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<SubForm>(emptyForm());

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['service-categories'],
    queryFn: () => get('/api/admin/services/categories'),
  });

  const addCategory = useMutation({
    mutationFn: (name: string) => post('/api/admin/services/categories', { name }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); toast.success('Category added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteCategory = useMutation({
    mutationFn: (id: string) => del(`/api/admin/services/categories/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); toast.success('Category deleted'); setActiveTab(0); },
    onError: (e: Error) => toast.error(e.message),
  });

  const addSubservice = useMutation({
    mutationFn: (data: SubForm & { categoryId: string }) => post('/api/admin/services/subservices', data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); setAddingNew(false); setNewForm(emptyForm()); toast.success('Subservice added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateSubservice = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<SubForm> }) => patch(`/api/admin/services/subservices/${id}`, data),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['service-categories'] }); setEditId(null); toast.success('Updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteSubservice = useMutation({
    mutationFn: (id: string) => del(`/api/admin/services/subservices/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-categories'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  if (isLoading) return <PageShell title="Services"><div className="text-sm text-text-muted">Loading…</div></PageShell>;

  const cat = categories[activeTab] as any;

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors';

  return (
    <PageShell
      title="Services"
      description="Manage service categories and subservices shown on the landing page"
      action={
        <button
          onClick={() => { const name = prompt('New category name:'); if (name?.trim()) addCategory.mutate(name.trim()); }}
          className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors"
        >
          <Plus size={16} /> Add Category
        </button>
      }
    >
      {categories.length === 0 ? (
        <div className="text-center py-20 text-text-muted text-sm">No categories yet. Add one to get started.</div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          {/* Category tabs */}
          <div className="flex border-b border-border overflow-x-auto">
            {(categories as any[]).map((c: any, i: number) => (
              <button
                key={c.id}
                onClick={() => { setActiveTab(i); setAddingNew(false); setEditId(null); }}
                className={`px-6 py-3.5 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === i ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}
              >
                {c.name}
              </button>
            ))}
          </div>

          {cat && (
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h3 className="font-semibold text-[16px]">{cat.name}</h3>
                <button
                  onClick={() => { if (confirm(`Delete category "${cat.name}" and all its subservices?`)) deleteCategory.mutate(cat.id); }}
                  className="text-xs text-red-500 hover:text-red-600 flex items-center gap-1"
                >
                  <Trash2 size={13} /> Delete category
                </button>
              </div>

              {/* Subservice list */}
              <div className="space-y-2 mb-4">
                {(cat.subservices as any[]).map((sub: any) => editId === sub.id ? (
                  // ── Edit mode ──
                  <div key={sub.id} className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/3">
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Name</label>
                        <input className={inputCls} value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Upwork URL (optional)</label>
                        <input className={inputCls} value={editForm.externalUrl} onChange={(e) => setEditForm(f => ({ ...f, externalUrl: e.target.value }))} placeholder="https://upwork.com/…" />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Description</label>
                      <textarea className={inputCls} rows={2} value={editForm.description} onChange={(e) => setEditForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description shown on the service card" />
                    </div>
                    <label className="flex items-center gap-2 text-sm cursor-pointer">
                      <input type="checkbox" checked={editForm.isActive} onChange={(e) => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="w-4 h-4 accent-primary" />
                      Active (shown on site)
                    </label>
                    <div className="flex gap-2">
                      <button onClick={() => updateSubservice.mutate({ id: sub.id, data: editForm })} disabled={updateSubservice.isPending} className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">
                        <Check size={14} /> {updateSubservice.isPending ? 'Saving…' : 'Save'}
                      </button>
                      <button onClick={() => setEditId(null)} className="flex items-center gap-1.5 border border-border px-4 py-1.5 rounded-lg text-sm text-text-muted hover:bg-bg">
                        <X size={14} /> Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  // ── View mode ──
                  <div key={sub.id} className={`flex items-start gap-3 p-3.5 border rounded-xl transition-colors ${sub.isActive ? 'border-border bg-bg' : 'border-border/50 bg-bg/50 opacity-60'}`}>
                    <GripVertical size={16} className="text-text-muted mt-0.5 flex-shrink-0 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <div className="font-medium text-sm">{sub.name}</div>
                      {sub.description && <p className="text-xs text-text-muted mt-0.5 line-clamp-1">{sub.description}</p>}
                      {sub.externalUrl && (
                        <a href={sub.externalUrl} target="_blank" rel="noopener" className="text-xs text-primary hover:underline flex items-center gap-1 mt-0.5">
                          <ExternalLink size={10} /> View on Upwork
                        </a>
                      )}
                    </div>
                    <div className="flex gap-1.5 flex-shrink-0">
                      <button
                        onClick={() => { setEditId(sub.id); setEditForm({ name: sub.name, description: sub.description ?? '', externalUrl: sub.externalUrl ?? '', isActive: sub.isActive }); }}
                        className="p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary transition-colors"
                        title="Edit"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        onClick={() => { if (confirm(`Delete "${sub.name}"?`)) deleteSubservice.mutate(sub.id); }}
                        className="p-1.5 rounded-lg border border-border text-text-muted hover:text-red-500 hover:border-red-200 transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Add new subservice */}
              {addingNew ? (
                <div className="border border-primary/30 rounded-xl p-4 space-y-3 bg-primary/3">
                  <h4 className="font-semibold text-sm">New Subservice</h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Name *</label>
                      <input className={inputCls} value={newForm.name} onChange={(e) => setNewForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Figma to Website" autoFocus />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Upwork URL (optional)</label>
                      <input className={inputCls} value={newForm.externalUrl} onChange={(e) => setNewForm(f => ({ ...f, externalUrl: e.target.value }))} placeholder="https://upwork.com/…" />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Description</label>
                    <textarea className={inputCls} rows={2} value={newForm.description} onChange={(e) => setNewForm(f => ({ ...f, description: e.target.value }))} placeholder="Short description shown on the service card" />
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => { if (newForm.name.trim()) addSubservice.mutate({ ...newForm, categoryId: cat.id }); }}
                      disabled={!newForm.name.trim() || addSubservice.isPending}
                      className="flex items-center gap-1.5 bg-primary text-white px-4 py-1.5 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50"
                    >
                      <Check size={14} /> {addSubservice.isPending ? 'Adding…' : 'Add Subservice'}
                    </button>
                    <button onClick={() => { setAddingNew(false); setNewForm(emptyForm()); }} className="flex items-center gap-1.5 border border-border px-4 py-1.5 rounded-lg text-sm text-text-muted hover:bg-bg">
                      <X size={14} /> Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingNew(true)} className="flex items-center gap-2 text-sm font-medium text-text-muted hover:text-primary border border-dashed border-border hover:border-primary rounded-xl px-4 py-3 w-full transition-colors">
                  <Plus size={16} /> Add Subservice
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </PageShell>
  );
}
