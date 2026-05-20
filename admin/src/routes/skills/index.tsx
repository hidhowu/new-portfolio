import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { FileUpload } from '@/components/forms/FileUpload';
import { get, post, patch, del } from '@/lib/api';
import { Plus, Trash2, Edit2, Check, X } from 'lucide-react';

export default function SkillsPage() {
  const qc = useQueryClient();
  const [newGroupName, setNewGroupName] = useState('');
  const [newTool, setNewTool] = useState<Record<string, { name: string; iconUrl: string }>>({});
  const [editToolId, setEditToolId] = useState<string | null>(null);
  const [editTool, setEditTool] = useState({ name: '', iconUrl: '' });

  const { data: groups = [] } = useQuery({
    queryKey: ['tool-groups'],
    queryFn: () => get('/api/admin/skills/groups'),
  });

  const addGroup = useMutation({
    mutationFn: () => post('/api/admin/skills/groups', { name: newGroupName.trim(), sortOrder: (groups as any[]).length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tool-groups'] }); setNewGroupName(''); toast.success('Group added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteGroup = useMutation({
    mutationFn: (id: string) => del(`/api/admin/skills/groups/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tool-groups'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const addTool = useMutation({
    mutationFn: ({ groupId }: { groupId: string }) => {
      const t = newTool[groupId] ?? { name: '', iconUrl: '' };
      const group = (groups as any[]).find((g: any) => g.id === groupId);
      return post('/api/admin/skills/tools', { groupId, name: t.name, iconUrl: t.iconUrl || null, sortOrder: group?.tools?.length ?? 0 });
    },
    onSuccess: (_, vars) => {
      qc.invalidateQueries({ queryKey: ['tool-groups'] });
      setNewTool(prev => ({ ...prev, [vars.groupId]: { name: '', iconUrl: '' } }));
      toast.success('Tool added');
    },
    onError: (e: Error) => toast.error(e.message),
  });

  const updateTool = useMutation({
    mutationFn: (id: string) => patch(`/api/admin/skills/tools/${id}`, { name: editTool.name, iconUrl: editTool.iconUrl || null }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['tool-groups'] }); setEditToolId(null); toast.success('Updated'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteTool = useMutation({
    mutationFn: (id: string) => del(`/api/admin/skills/tools/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['tool-groups'] }),
  });

  return (
    <PageShell title="Skills & Tools" description="Manage skill groups and tools. Each tool can have an icon uploaded from here.">
      <div className="space-y-5 max-w-2xl">
        {(groups as any[]).map((group: any) => (
          <div key={group.id} className="bg-white border border-border rounded-xl overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-bg">
              <h3 className="font-semibold text-[15px]">{group.name}</h3>
              <button onClick={() => { if (confirm(`Delete group "${group.name}" and all its tools?`)) deleteGroup.mutate(group.id); }} className="text-text-muted hover:text-red-500 transition-colors">
                <Trash2 size={15} />
              </button>
            </div>

            <div className="p-4 space-y-2">
              {/* Existing tools */}
              {(group.tools as any[]).map((tool: any) => editToolId === tool.id ? (
                <div key={tool.id} className="flex items-center gap-3 p-3 border border-primary/30 rounded-xl bg-primary/3">
                  <FileUpload
                    folder="tools"
                    accept="image/svg+xml,image/png,image/webp"
                    label="Icon"
                    currentUrl={editTool.iconUrl || null}
                    compact
                    onUpload={(url) => setEditTool(t => ({ ...t, iconUrl: url }))}
                  />
                  <input value={editTool.name} onChange={(e) => setEditTool(t => ({ ...t, name: e.target.value }))} className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" placeholder="Tool name" />
                  <button onClick={() => updateTool.mutate(tool.id)} disabled={updateTool.isPending} className="p-1.5 rounded-lg bg-primary text-white hover:bg-primary-light"><Check size={14} /></button>
                  <button onClick={() => setEditToolId(null)} className="p-1.5 rounded-lg border border-border text-text-muted hover:bg-bg"><X size={14} /></button>
                </div>
              ) : (
                <div key={tool.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-bg">
                  {tool.iconUrl ? (
                    <img src={tool.iconUrl} alt="" className="w-7 h-7 object-contain rounded flex-shrink-0" />
                  ) : (
                    <div className="w-7 h-7 bg-border rounded flex-shrink-0 flex items-center justify-center text-text-muted text-xs">?</div>
                  )}
                  <span className="flex-1 text-sm font-medium">{tool.name}</span>
                  <button onClick={() => { setEditToolId(tool.id); setEditTool({ name: tool.name, iconUrl: tool.iconUrl ?? '' }); }} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-primary hover:border-primary transition-colors"><Edit2 size={13} /></button>
                  <button onClick={() => deleteTool.mutate(tool.id)} className="p-1.5 rounded-lg border border-border text-text-muted hover:text-red-500 hover:border-red-200 transition-colors"><Trash2 size={13} /></button>
                </div>
              ))}

              {/* Add new tool row */}
              <div className="flex items-center gap-3 p-3 border border-dashed border-border rounded-xl">
                <FileUpload
                  folder="tools"
                  accept="image/svg+xml,image/png,image/webp"
                  label="Icon"
                  compact
                  currentUrl={newTool[group.id]?.iconUrl || null}
                  onUpload={(url) => setNewTool(prev => ({ ...prev, [group.id]: { ...(prev[group.id] ?? { name: '' }), iconUrl: url } }))}
                />
                <input
                  value={newTool[group.id]?.name ?? ''}
                  onChange={(e) => setNewTool(prev => ({ ...prev, [group.id]: { ...(prev[group.id] ?? { iconUrl: '' }), name: e.target.value } }))}
                  placeholder="Tool name (e.g. React)"
                  className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
                  onKeyDown={(e) => { if (e.key === 'Enter' && newTool[group.id]?.name) addTool.mutate({ groupId: group.id }); }}
                />
                <button
                  onClick={() => { if (newTool[group.id]?.name) addTool.mutate({ groupId: group.id }); }}
                  disabled={!newTool[group.id]?.name || addTool.isPending}
                  className="flex items-center gap-1 bg-primary text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors"
                >
                  <Plus size={13} /> Add
                </button>
              </div>
            </div>
          </div>
        ))}

        {/* Add group */}
        <form onSubmit={(e) => { e.preventDefault(); if (newGroupName.trim()) addGroup.mutate(); }} className="flex gap-2">
          <input
            value={newGroupName}
            onChange={(e) => setNewGroupName(e.target.value)}
            placeholder="New group name (e.g. Websites)"
            className="flex-1 px-3 py-2 border border-border rounded-xl text-sm focus:outline-none focus:border-primary"
          />
          <button type="submit" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-sm font-semibold hover:bg-primary-light transition-colors">
            <Plus size={14} /> Add Group
          </button>
        </form>
      </div>
    </PageShell>
  );
}
