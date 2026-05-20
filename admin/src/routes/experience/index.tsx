import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, post, patch, del } from '@/lib/api';
import { Plus, Trash2, Edit2, Check, X, ChevronUp, ChevronDown } from 'lucide-react';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function monthYearToDisplay(my: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(my);
  if (!m) return my;
  const idx = parseInt(m[2], 10) - 1;
  if (idx < 0 || idx > 11) return my;
  return `${MONTHS[idx]} ${m[1]}`;
}

function parseDisplayToMonthYear(s: string): string {
  const m = /^([A-Za-z]+)\s+(\d{4})$/.exec(s.trim());
  if (m) {
    const idx = MONTHS.findIndex((x) => x.toLowerCase() === m[1].slice(0, 3).toLowerCase());
    if (idx >= 0) return `${m[2]}-${String(idx + 1).padStart(2, '0')}`;
  }
  const yr = /^(\d{4})$/.exec(s.trim());
  if (yr) return `${yr[1]}-01`;
  return '';
}

function parsePeriod(period: string): { start: string; end: string; isCurrent: boolean } {
  if (!period) return { start: '', end: '', isCurrent: false };
  const parts = period.split(/\s*[—–-]\s*/);
  const start = parseDisplayToMonthYear(parts[0] || '');
  const endRaw = (parts[1] || '').trim();
  const isCurrent = /present|now|current/i.test(endRaw);
  const end = isCurrent ? '' : parseDisplayToMonthYear(endRaw);
  return { start, end, isCurrent };
}

function composePeriod(start: string, end: string, isCurrent: boolean): string {
  if (!start) return '';
  const s = monthYearToDisplay(start);
  if (isCurrent || !end) return `${s} — Present`;
  return `${s} — ${monthYearToDisplay(end)}`;
}

interface ExperienceForm {
  role: string;
  company: string;
  description: string;
  startDate: string;
  endDate: string;
  isCurrent: boolean;
}

const emptyForm: ExperienceForm = { role: '', company: '', description: '', startDate: '', endDate: '', isCurrent: true };

export default function ExperiencePage() {
  const qc = useQueryClient();
  const [editId, setEditId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<ExperienceForm>(emptyForm);
  const [newForm, setNewForm] = useState<ExperienceForm>(emptyForm);
  const [adding, setAdding] = useState(false);

  const { data: items = [] } = useQuery<any[]>({ queryKey: ['work-experience'], queryFn: () => get('/api/admin/work-experience') });

  const add = useMutation({
    mutationFn: () => {
      const period = composePeriod(newForm.startDate, newForm.endDate, newForm.isCurrent);
      return post('/api/admin/work-experience', {
        role: newForm.role,
        company: newForm.company,
        description: newForm.description,
        period,
        sortOrder: (items as any[]).length,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-experience'] }); setAdding(false); setNewForm(emptyForm); toast.success('Added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const update = useMutation({
    mutationFn: () => {
      const period = composePeriod(editForm.startDate, editForm.endDate, editForm.isCurrent);
      return patch(`/api/admin/work-experience/${editId}`, {
        role: editForm.role,
        company: editForm.company,
        description: editForm.description,
        period,
      });
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['work-experience'] }); setEditId(null); toast.success('Updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/admin/work-experience/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-experience'] }),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => post('/api/admin/work-experience/reorder', { ids }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['work-experience'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    reorder.mutate(next.map((x: any) => x.id));
  }

  function startEdit(item: any) {
    const parsed = parsePeriod(item.period || '');
    setEditId(item.id);
    setEditForm({
      role: item.role,
      company: item.company,
      description: item.description,
      startDate: parsed.start,
      endDate: parsed.end,
      isCurrent: parsed.isCurrent,
    });
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary';
  const labelCls = 'block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1';

  function DateFields({ form, setForm }: { form: ExperienceForm; setForm: (f: ExperienceForm) => void }) {
    return (
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className={labelCls}>Start date</label>
          <input
            type="month"
            className={inputCls}
            value={form.startDate}
            onChange={(e) => setForm({ ...form, startDate: e.target.value })}
          />
        </div>
        <div>
          <label className={labelCls}>End date</label>
          <input
            type="month"
            className={inputCls}
            value={form.endDate}
            disabled={form.isCurrent}
            onChange={(e) => setForm({ ...form, endDate: e.target.value })}
            placeholder="—"
          />
        </div>
        <label className="col-span-2 flex items-center gap-2 cursor-pointer text-sm">
          <input
            type="checkbox"
            checked={form.isCurrent}
            onChange={(e) => setForm({ ...form, isCurrent: e.target.checked, endDate: e.target.checked ? '' : form.endDate })}
            className="w-4 h-4 accent-primary"
          />
          I currently work here (end date is "Present")
        </label>
      </div>
    );
  }

  return (
    <PageShell
      title="Work Experience"
      description="Manage your professional timeline"
      action={<button onClick={() => { setNewForm(emptyForm); setAdding(true); }} className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light"><Plus size={16} /> Add Entry</button>}
    >
      {adding && (
        <div className="bg-white border border-primary/30 rounded-xl p-6 mb-4 space-y-3 max-w-2xl">
          <h3 className="font-semibold text-[15px]">New Experience</h3>
          <div className="grid grid-cols-2 gap-3">
            <input className={inputCls} placeholder="Role" value={newForm.role} onChange={(e) => setNewForm({ ...newForm, role: e.target.value })} />
            <input className={inputCls} placeholder="Company" value={newForm.company} onChange={(e) => setNewForm({ ...newForm, company: e.target.value })} />
          </div>
          <DateFields form={newForm} setForm={setNewForm} />
          <textarea className={inputCls} rows={3} placeholder="Description" value={newForm.description} onChange={(e) => setNewForm({ ...newForm, description: e.target.value })} />
          <div className="flex gap-2">
            <button onClick={() => add.mutate()} disabled={add.isPending || !newForm.role || !newForm.startDate} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">Save</button>
            <button onClick={() => setAdding(false)} className="px-4 py-2 rounded-lg text-sm border border-border hover:bg-bg">Cancel</button>
          </div>
        </div>
      )}

      <div className="space-y-3 max-w-2xl">
        {(items as any[]).map((item: any, i: number) => editId === item.id ? (
          <div key={item.id} className="bg-white border border-primary/30 rounded-xl p-5 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <input className={inputCls} value={editForm.role} onChange={(e) => setEditForm({ ...editForm, role: e.target.value })} placeholder="Role" />
              <input className={inputCls} value={editForm.company} onChange={(e) => setEditForm({ ...editForm, company: e.target.value })} placeholder="Company" />
            </div>
            <DateFields form={editForm} setForm={setEditForm} />
            <textarea className={inputCls} rows={3} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} placeholder="Description" />
            <div className="flex gap-2">
              <button onClick={() => update.mutate()} disabled={update.isPending || !editForm.startDate} className="bg-primary text-white px-3 py-1.5 rounded-lg text-sm font-semibold disabled:opacity-50"><Check size={15} /></button>
              <button onClick={() => setEditId(null)} className="px-3 py-1.5 rounded-lg text-sm border border-border"><X size={15} /></button>
            </div>
          </div>
        ) : (
          <div key={item.id} className="bg-white border border-border rounded-xl p-5 flex gap-4">
            <div className="flex flex-col gap-1 pt-1">
              <button onClick={() => move(i, -1)} disabled={i === 0} className="text-text-muted hover:text-primary disabled:opacity-30"><ChevronUp size={16} /></button>
              <button onClick={() => move(i, 1)} disabled={i === items.length - 1} className="text-text-muted hover:text-primary disabled:opacity-30"><ChevronDown size={16} /></button>
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold uppercase tracking-wide text-primary mb-1">{item.period}</div>
              <div className="font-semibold text-[16px]">{item.role}</div>
              <div className="text-sm text-text-muted mb-2">{item.company}</div>
              <p className="text-sm text-text-muted leading-relaxed">{item.description}</p>
            </div>
            <div className="flex flex-col gap-2 flex-shrink-0">
              <button onClick={() => startEdit(item)} className="text-text-muted hover:text-primary"><Edit2 size={16} /></button>
              <button onClick={() => { if (confirm('Delete?')) remove.mutate(item.id); }} className="text-text-muted hover:text-red-500"><Trash2 size={16} /></button>
            </div>
          </div>
        ))}
      </div>
    </PageShell>
  );
}
