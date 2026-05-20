import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, post, patch, del } from '@/lib/api';
import { FileUpload } from '@/components/forms/FileUpload';
import { Trash2 } from 'lucide-react';

// Lazy-load Editor.js to avoid Vite ESM/CJS crash at module parse time
async function initEditor(holder: HTMLElement, data: any) {
  const EditorJS = (await import('@editorjs/editorjs')).default;
  const Header = (await import('@editorjs/header')).default;
  const List = (await import('@editorjs/list')).default;
  const Quote = (await import('@editorjs/quote')).default;
  const Code = (await import('@editorjs/code')).default;
  const Delimiter = (await import('@editorjs/delimiter')).default;
  const Table = (await import('@editorjs/table')).default;

  return new EditorJS({
    holder,
    placeholder: 'Start writing your post…',
    tools: {
      header: { class: Header as any, config: { levels: [2, 3], defaultLevel: 2 } },
      list: { class: List as any, inlineToolbar: true },
      quote: { class: Quote as any, inlineToolbar: true },
      code: Code as any,
      delimiter: Delimiter as any,
      table: Table as any,
    },
    data: data ?? { blocks: [] },
  });
}

export default function BlogPostEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [saving, setSaving] = useState(false);
  const [editorReady, setEditorReady] = useState(false);

  const [form, setForm] = useState({
    title: '', slug: '', excerpt: '', coverImageUrl: '', categoryId: '',
    isFeatured: false, isPublished: false, readMinutes: 5,
  });

  const { data: postData, isLoading } = useQuery({
    queryKey: ['blog-post', id],
    queryFn: () => get(`/api/admin/blog/posts/${id}`),
    enabled: !!id,
  });

  const { data: categories = [] } = useQuery({
    queryKey: ['blog-categories'],
    queryFn: () => get('/api/admin/blog/categories'),
  });

  // Populate form when existing post loads
  useEffect(() => {
    if (postData) {
      setForm({
        title: postData.title ?? '',
        slug: postData.slug ?? '',
        excerpt: postData.excerpt ?? '',
        coverImageUrl: postData.coverImageUrl ?? '',
        categoryId: postData.categoryId ?? '',
        isFeatured: postData.isFeatured ?? false,
        isPublished: postData.isPublished ?? false,
        readMinutes: postData.readMinutes ?? 5,
      });
    }
  }, [postData]);

  // Initialize editor once data is ready
  const setupEditor = useCallback(async () => {
    if (!holderRef.current) return;
    if (editorRef.current) {
      await editorRef.current.isReady;
      editorRef.current.destroy();
      editorRef.current = null;
    }
    const data = isNew ? { blocks: [] } : (postData?.contentJson ?? { blocks: [] });
    editorRef.current = await initEditor(holderRef.current, data);
    await editorRef.current.isReady;
    setEditorReady(true);
  }, [isNew, postData]);

  // Run setup when component mounts (new post) or when postData arrives (existing)
  useEffect(() => {
    if (isNew || postData) {
      setupEditor();
    }
    return () => {
      editorRef.current?.destroy();
      editorRef.current = null;
    };
  }, [postData, isNew]); // eslint-disable-line

  // Auto-save every 15s for existing posts
  useEffect(() => {
    if (isNew || !id || !editorReady) return;
    const t = setInterval(async () => {
      try {
        const contentJson = await editorRef.current?.save();
        await patch(`/api/admin/blog/posts/${id}`, { ...form, contentJson });
      } catch (_) {}
    }, 15000);
    return () => clearInterval(t);
  }, [id, form, isNew, editorReady]);

  async function handleSave(publish = false) {
    setSaving(true);
    try {
      const contentJson = editorReady ? await editorRef.current?.save() : { blocks: [] };
      const data = { ...form, contentJson };
      if (isNew) {
        const created = await post('/api/admin/blog/posts', data);
        if (publish) await post(`/api/admin/blog/posts/${created.id}/publish`, {});
        toast.success(publish ? 'Published!' : 'Draft saved');
        nav(`/admin/blog/${created.id}`, { replace: true });
      } else {
        await patch(`/api/admin/blog/posts/${id}`, data);
        if (publish && !form.isPublished) await post(`/api/admin/blog/posts/${id}/publish`, {});
        toast.success(publish ? 'Published!' : 'Saved');
        qc.invalidateQueries({ queryKey: ['blog-post', id] });
        setForm(f => ({ ...f, isPublished: publish || f.isPublished }));
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors';

  if (!isNew && isLoading) {
    return <PageShell title="Loading…"><div className="text-sm text-text-muted">Loading post…</div></PageShell>;
  }

  return (
    <PageShell
      title={isNew ? 'New Post' : (form.title || 'Edit Post')}
      action={
        <div className="flex gap-2">
          <button onClick={() => handleSave(false)} disabled={saving} className="border border-border px-4 py-2 rounded-lg text-sm font-semibold hover:bg-bg disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save Draft'}
          </button>
          <button onClick={() => handleSave(true)} disabled={saving} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
            {form.isPublished ? 'Update' : 'Publish'}
          </button>
        </div>
      }
    >
      <div className="grid grid-cols-3 gap-6">
        {/* Editor area */}
        <div className="col-span-2">
          <input
            className="w-full text-2xl font-bold border-0 outline-none mb-4 bg-transparent placeholder:text-text-muted/40"
            value={form.title}
            onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))}
            placeholder="Post title…"
          />
          {/* Editor.js mounts here */}
          <div
            ref={holderRef}
            className="min-h-[400px] bg-white border border-border rounded-xl px-8 py-6 focus:outline-none"
          />
          {!editorReady && (
            <div className="text-sm text-text-muted text-center mt-4">Loading editor…</div>
          )}
        </div>

        {/* Sidebar */}
        <div className="space-y-4">
          {/* Cover image */}
          <div className="bg-white border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Cover Image</h3>
            <FileUpload
              folder="blog"
              accept="image/*"
              label="Upload cover image"
              currentUrl={form.coverImageUrl || null}
              onUpload={(url) => setForm(f => ({ ...f, coverImageUrl: url }))}
            />
          </div>

          {/* Post settings */}
          <div className="bg-white border border-border rounded-xl p-4 space-y-3">
            <h3 className="font-semibold text-sm">Settings</h3>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Slug</label>
              <input className={inputCls} value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="auto-generated" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Excerpt</label>
              <textarea className={inputCls} rows={3} value={form.excerpt} onChange={(e) => setForm(f => ({ ...f, excerpt: e.target.value }))} placeholder="One-paragraph summary…" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Category</label>
              <select className={inputCls} value={form.categoryId} onChange={(e) => setForm(f => ({ ...f, categoryId: e.target.value }))}>
                <option value="">Uncategorized</option>
                {categories.map((c: any) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1">Read Time (min)</label>
              <input type="number" className={inputCls} value={form.readMinutes} min={1} onChange={(e) => setForm(f => ({ ...f, readMinutes: +e.target.value }))} />
            </div>
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 accent-primary" />
              <span className="text-sm">Featured post</span>
            </label>
          </div>

          {/* Blog categories quick-add */}
          <div className="bg-white border border-border rounded-xl p-4">
            <h3 className="font-semibold text-sm mb-3">Categories</h3>
            <div className="space-y-1 mb-3">
              {categories.map((c: any) => (
                <div key={c.id} className="flex items-center gap-2 text-sm group">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary" />
                  <span className="flex-1">{c.name}</span>
                  <button
                    onClick={async () => {
                      if (!confirm(`Delete category "${c.name}"? Posts in this category will become uncategorized.`)) return;
                      try {
                        await del(`/api/admin/blog/categories/${c.id}`);
                        qc.invalidateQueries({ queryKey: ['blog-categories'] });
                        toast.success('Category deleted');
                      } catch (e: any) {
                        toast.error(e.message);
                      }
                    }}
                    className="opacity-0 group-hover:opacity-100 text-text-muted hover:text-red-500 transition-opacity"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              ))}
            </div>
            <CategoryQuickAdd onAdded={() => qc.invalidateQueries({ queryKey: ['blog-categories'] })} />
          </div>
        </div>
      </div>
    </PageShell>
  );
}

function CategoryQuickAdd({ onAdded }: { onAdded: () => void }) {
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  async function add() {
    if (!name.trim()) return;
    setLoading(true);
    try {
      await post('/api/admin/blog/categories', { name: name.trim() });
      setName('');
      onAdded();
      toast.success('Category added');
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={(e) => { e.preventDefault(); add(); }} className="flex gap-2">
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="New category…"
        className="flex-1 px-2.5 py-1.5 border border-border rounded-lg text-xs focus:outline-none focus:border-primary"
      />
      <button type="submit" disabled={!name || loading} className="bg-primary text-white px-3 py-1.5 rounded-lg text-xs font-semibold hover:bg-primary-light disabled:opacity-50">Add</button>
    </form>
  );
}
