import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, post, del } from '@/lib/api';
import { Plus, Trash2, Edit2, Eye, EyeOff, Star } from 'lucide-react';

export default function BlogPage() {
  const [params, setParams] = useSearchParams();
  const status = params.get('status') ?? 'all';
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['blog-posts', status],
    queryFn: () => get(`/api/admin/blog/posts?status=${status}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/admin/blog/posts/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['blog-posts'] }); toast.success('Post deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const publish = useMutation({
    mutationFn: (id: string) => post(`/api/admin/blog/posts/${id}/publish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const unpublish = useMutation({
    mutationFn: (id: string) => post(`/api/admin/blog/posts/${id}/unpublish`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['blog-posts'] }),
  });

  const posts = data?.posts ?? [];

  return (
    <PageShell
      title="Blog"
      description="Manage your blog posts and categories"
      action={
        <Link to="/admin/blog/new" className="flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light">
          <Plus size={16} /> New Post
        </Link>
      }
    >
      <div className="flex gap-1 mb-6 bg-white border border-border rounded-lg p-1 w-fit">
        {['all', 'published', 'draft'].map((s) => (
          <button key={s} onClick={() => setParams({ status: s })} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${status === s ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>{s}</button>
        ))}
      </div>

      {isLoading ? <div className="text-sm text-text-muted">Loading…</div> :
        posts.length === 0 ? <div className="text-center py-16 text-text-muted text-sm">No posts found.</div> : (
          <div className="bg-white border border-border rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-bg">
                  <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Title</th>
                  <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Category</th>
                  <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Read</th>
                  <th className="text-left p-4 font-semibold text-text-muted text-xs uppercase tracking-wide">Status</th>
                  <th className="p-4"></th>
                </tr>
              </thead>
              <tbody>
                {posts.map((p: any) => (
                  <tr key={p.id} className="border-b border-border last:border-0 hover:bg-bg">
                    <td className="p-4">
                      <div className="flex items-center gap-2">
                        {p.isFeatured && <Star size={13} className="text-amber-500 fill-amber-500 flex-shrink-0" />}
                        <span className="font-medium">{p.title}</span>
                      </div>
                      <div className="text-xs text-text-muted mt-0.5">{p.slug}</div>
                    </td>
                    <td className="p-4 text-text-muted">{p.category?.name ?? '—'}</td>
                    <td className="p-4 text-text-muted">{p.readMinutes} min</td>
                    <td className="p-4">
                      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${p.isPublished ? 'bg-green-50 text-green-700' : 'bg-amber-50 text-amber-700'}`}>{p.isPublished ? 'Published' : 'Draft'}</span>
                    </td>
                    <td className="p-4">
                      <div className="flex items-center gap-2 justify-end">
                        <button onClick={() => p.isPublished ? unpublish.mutate(p.id) : publish.mutate(p.id)} className="text-text-muted hover:text-primary" title={p.isPublished ? 'Unpublish' : 'Publish'}>
                          {p.isPublished ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                        <Link to={`/admin/blog/${p.id}`} className="text-text-muted hover:text-primary"><Edit2 size={16} /></Link>
                        <button onClick={() => { if (confirm(`Delete "${p.title}"?`)) remove.mutate(p.id); }} className="text-text-muted hover:text-red-500"><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )
      }
    </PageShell>
  );
}
