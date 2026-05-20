import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, post, del } from '@/lib/api';
import { Plus, Star, Trash2, Edit2, Eye, EyeOff, ChevronUp, ChevronDown } from 'lucide-react';

export default function ProjectsPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const qc = useQueryClient();

  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects', status],
    queryFn: () => get(`/api/admin/projects?status=${status}`),
  });

  const publish = useMutation({
    mutationFn: (id: string) => post(`/api/admin/projects/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const unpublish = useMutation({
    mutationFn: (id: string) => post(`/api/admin/projects/${id}/unpublish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/admin/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['projects'] }); toast.success('Project deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const reorder = useMutation({
    mutationFn: (ids: string[]) => post('/api/admin/projects/reorder', { ids }),
    onMutate: async (ids) => {
      await qc.cancelQueries({ queryKey: ['projects'] });
      const prev = qc.getQueryData<any[]>(['projects', status]) ?? [];
      const map = new Map(prev.map((p) => [p.id, p]));
      const optimistic = ids.map((id) => map.get(id)).filter(Boolean);
      qc.setQueryData(['projects', status], optimistic);
      return { prev };
    },
    onError: (e: Error, _ids, ctx) => {
      if (ctx?.prev) qc.setQueryData(['projects', status], ctx.prev);
      toast.error(e.message);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= projects.length) return;
    const next = [...projects];
    [next[i], next[j]] = [next[j], next[i]];
    reorder.mutate(next.map((p: any) => p.id));
  }

  return (
    <PageShell
      title="Projects"
      description="Manage your portfolio projects"
      action={
        <Link to="/admin/projects/new" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light transition-colors">
          <Plus size={16} /> New Project
        </Link>
      }
    >
      {/* Filter tabs */}
      <div className="flex gap-1 mb-6 bg-white border border-border rounded-lg p-1 w-fit">
        {['all', 'published', 'draft'].map((s) => (
          <button
            key={s}
            onClick={() => setParams({ status: s })}
            className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${status === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}
          >
            {s}
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="text-sm text-text-muted">Loading…</div>
      ) : projects.length === 0 ? (
        <div className="text-center py-16 text-text-muted text-sm">No projects found.</div>
      ) : (
        <div className="bg-white border border-border rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-bg">
                <th className="p-4 w-10"></th>
                <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Project</th>
                <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Category</th>
                <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Size</th>
                <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Status</th>
                <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Featured</th>
                <th className="p-4"></th>
              </tr>
            </thead>
            <tbody>
              {projects.map((p: any, i: number) => (
                <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg transition-colors">
                  <td className="p-4">
                    <div className="flex flex-col">
                      <button
                        onClick={() => move(i, -1)}
                        disabled={i === 0 || reorder.isPending}
                        className="text-text-muted hover:text-primary disabled:opacity-30"
                        title="Move up"
                      ><ChevronUp size={14} /></button>
                      <button
                        onClick={() => move(i, 1)}
                        disabled={i === projects.length - 1 || reorder.isPending}
                        className="text-text-muted hover:text-primary disabled:opacity-30"
                        title="Move down"
                      ><ChevronDown size={14} /></button>
                    </div>
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-3">
                      {p.coverImageUrl ? (
                        <img src={p.coverImageUrl} alt="" className="w-10 h-10 rounded-lg object-cover bg-border flex-shrink-0" />
                      ) : (
                        <div className="w-10 h-10 rounded-lg flex-shrink-0" style={{ background: p.coverColor || '#1a3a5a' }} />
                      )}
                      <div>
                        <div className="font-medium">{p.title}</div>
                        <div className="text-xs text-text-muted">{p.slug}</div>
                      </div>
                    </div>
                  </td>
                  <td className="p-4 text-text-muted">{p.category}</td>
                  <td className="p-4"><span className="text-xs bg-bg border border-border px-2 py-0.5 rounded-md">{p.gridSize}</span></td>
                  <td className="p-4">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isPublished ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>
                      {p.isPublished ? 'Published' : 'Draft'}
                    </span>
                  </td>
                  <td className="p-4">
                    {p.isFeatured && <Star size={15} className="text-amber-500 fill-amber-500" />}
                  </td>
                  <td className="p-4">
                    <div className="flex items-center gap-2 justify-end">
                      <button
                        onClick={() => p.isPublished ? unpublish.mutate(p.id) : publish.mutate(p.id)}
                        className="text-text-muted hover:text-primary transition-colors"
                        title={p.isPublished ? 'Unpublish' : 'Publish'}
                      >
                        {p.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                      <Link to={`/admin/projects/${p.id}`} className="text-text-muted hover:text-primary transition-colors">
                        <Edit2 size={16} />
                      </Link>
                      <button
                        onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }}
                        className="text-text-muted hover:text-red-500 transition-colors"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </PageShell>
  );
}
