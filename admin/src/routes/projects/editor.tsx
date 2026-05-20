import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { FileUpload } from '@/components/forms/FileUpload';
import { get, post, patch, put, del } from '@/lib/api';
import { HexColorPicker } from 'react-colorful';
import { Plus, Trash2, Link, Upload, ChevronUp, ChevronDown, Pencil, Check, X } from 'lucide-react';

const TABS = ['Overview', 'Challenge', 'Approach', 'Typography', 'Colors', 'Spacing', 'Gallery', 'Impact', 'Related'];

const DEFAULT_SPACING = [
  { label: '4px', valuePx: 4 },
  { label: '8px', valuePx: 8 },
  { label: '16px', valuePx: 16 },
  { label: '24px', valuePx: 24 },
];

async function initEditor(holder: HTMLElement, data: any, onChange: (d: any) => void) {
  const EditorJS = (await import('@editorjs/editorjs')).default;
  const Header = (await import('@editorjs/header')).default;
  const List = (await import('@editorjs/list')).default;
  const Quote = (await import('@editorjs/quote')).default;
  const Code = (await import('@editorjs/code')).default;
  const Delimiter = (await import('@editorjs/delimiter')).default;
  const editor = new EditorJS({
    holder,
    placeholder: 'Write here…',
    tools: {
      header: { class: Header as any, config: { levels: [2, 3], defaultLevel: 2 } },
      list: { class: List as any, inlineToolbar: true },
      quote: { class: Quote as any, inlineToolbar: true },
      code: Code as any,
      delimiter: Delimiter as any,
    },
    data: data ?? { blocks: [] },
    onChange: async () => {
      try {
        const d = await editor.save();
        onChange(d);
      } catch {}
    },
  });
  return editor;
}

export default function ProjectEditorPage() {
  const { id } = useParams();
  const isNew = !id;
  const nav = useNavigate();
  const qc = useQueryClient();
  const [activeTab, setActiveTab] = useState(0);
  const [saving, setSaving] = useState(false);
  const [autoSavedAt, setAutoSavedAt] = useState<Date | null>(null);

  const [form, setForm] = useState({
    title: '', slug: '', category: '', shortDesc: '',
    coverImageUrl: '', coverColor: '#1a3a5a',
    client: '', year: '', role: '', duration: '',
    videoUrl: '', videoMode: 'url' as 'url' | 'upload',
    demoUrl: '',
    isFeatured: false, isPublished: false,
    gridSize: 'STD', sortOrder: 0,
    showImpact: true, impactIntro: '',
  });

  const [challengeData, setChallengeData] = useState<any>(null);
  const [approachData, setApproachData] = useState<any>(null);
  const [typo, setTypo] = useState<{ fontFamily: string; customFontUrl: string; samples: any }>({
    fontFamily: 'DM Sans', customFontUrl: '', samples: { fonts: [{ name: 'DM Sans', url: '' }], items: [] },
  });
  const [spacing, setSpacing] = useState(DEFAULT_SPACING);
  const [relatedIds, setRelatedIds] = useState<string[]>([]);

  const { data: project, isLoading } = useQuery({
    queryKey: ['project', id],
    queryFn: () => get(`/api/admin/projects/${id}`),
    enabled: !!id,
  });

  useEffect(() => {
    if (!project) return;
    setForm({
      title: project.title ?? '',
      slug: project.slug ?? '',
      category: project.category ?? '',
      shortDesc: project.shortDesc ?? '',
      coverImageUrl: project.coverImageUrl ?? '',
      coverColor: project.coverColor ?? '#1a3a5a',
      client: project.client ?? '',
      year: project.year?.toString() ?? '',
      role: project.role ?? '',
      duration: project.duration ?? '',
      videoUrl: project.videoUrl ?? '',
      videoMode: 'url',
      demoUrl: project.demoUrl ?? '',
      isFeatured: project.isFeatured ?? false,
      isPublished: project.isPublished ?? false,
      gridSize: project.gridSize ?? 'STD',
      sortOrder: project.sortOrder ?? 0,
      showImpact: project.showImpact ?? true,
      impactIntro: project.impactIntro ?? '',
    });
    setChallengeData(project.challengeJson ?? null);
    setApproachData(project.approachJson ?? null);
    if (project.typography) {
      setTypo({
        fontFamily: project.typography.fontFamily ?? 'DM Sans',
        customFontUrl: project.typography.customFontUrl ?? '',
        samples: project.typography.samples ?? [],
      });
    }
    if (Array.isArray(project.spacingScale) && project.spacingScale.length > 0) {
      setSpacing(project.spacingScale);
    }
    setRelatedIds((project.relatedProjects ?? []).map((r: any) => r.id));
  }, [project]);

  async function persistAll({ silent = false } = {}) {
    if (!id) return;
    const data: any = { ...form, year: form.year ? parseInt(form.year) : null };
    delete data.videoMode;
    data.challengeJson = challengeData;
    data.approachJson = approachData;
    data.spacingScale = spacing;

    const ops: Promise<any>[] = [patch(`/api/admin/projects/${id}`, data)];

    if (typo.fontFamily) {
      ops.push(put(`/api/admin/projects/${id}/typography`, {
        fontFamily: typo.fontFamily,
        customFontUrl: typo.customFontUrl || null,
        samples: typo.samples,
      }));
    }

    ops.push(put(`/api/admin/projects/${id}/related`, { relatedIds }));

    await Promise.all(ops);
    if (!silent) toast.success('Saved');
  }

  // Auto-save for existing projects every 15s. Errors are swallowed.
  useEffect(() => {
    if (isNew || !id) return;
    const t = setInterval(async () => {
      try {
        await persistAll({ silent: true });
        setAutoSavedAt(new Date());
      } catch (_) {}
    }, 15000);
    return () => clearInterval(t);
    // eslint-disable-next-line
  }, [id, isNew, form, challengeData, approachData, typo, spacing, relatedIds]);

  async function handleSave() {
    setSaving(true);
    try {
      if (isNew) {
        const data: any = { ...form, year: form.year ? parseInt(form.year) : null };
        delete data.videoMode;
        const created = await post('/api/admin/projects', data);
        toast.success('Project created');
        nav(`/admin/projects/${created.id}`, { replace: true });
      } else {
        await persistAll();
        qc.invalidateQueries({ queryKey: ['project', id] });
      }
    } catch (e: any) {
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  }

  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary transition-colors';
  const labelCls = 'block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5';

  if (!isNew && isLoading) {
    return <PageShell title="Loading…"><div className="text-sm text-text-muted">Loading project…</div></PageShell>;
  }

  return (
    <PageShell
      title={isNew ? 'New Project' : (form.title || 'Edit Project')}
      action={
        <div className="flex items-center gap-3">
          {autoSavedAt && (
            <span className="text-xs text-text-muted">Draft saved {autoSavedAt.toLocaleTimeString()}</span>
          )}
          <button onClick={handleSave} disabled={saving} className="bg-primary text-white px-5 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      }
    >
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)} className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${activeTab === i ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>{t}</button>
        ))}
      </div>

      {activeTab === 0 && (
        <div className="grid grid-cols-2 gap-5 max-w-3xl">
          <div className="col-span-2">
            <label className={labelCls}>Title</label>
            <input className={inputCls} value={form.title} onChange={(e) => setForm(f => ({ ...f, title: e.target.value }))} placeholder="CloudSync Pro" />
          </div>
          <div>
            <label className={labelCls}>Slug</label>
            <input className={inputCls} value={form.slug} onChange={(e) => setForm(f => ({ ...f, slug: e.target.value }))} placeholder="cloudsync-pro" />
          </div>
          <div>
            <label className={labelCls}>Category</label>
            <input className={inputCls} value={form.category} onChange={(e) => setForm(f => ({ ...f, category: e.target.value }))} placeholder="SaaS Platform" />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Short Description (card text)</label>
            <textarea className={inputCls} rows={2} value={form.shortDesc} onChange={(e) => setForm(f => ({ ...f, shortDesc: e.target.value }))} placeholder="One-line summary for the project card" />
          </div>

          <div className="col-span-2">
            <label className={labelCls}>Cover Image</label>
            <FileUpload
              folder="projects"
              accept="image/*"
              label="Upload cover image (goes to Cloudinary)"
              currentUrl={form.coverImageUrl || null}
              onUpload={(url) => setForm(f => ({ ...f, coverImageUrl: url }))}
            />
            <div className="flex items-center gap-3 mt-2">
              <div className="text-xs text-text-muted">Fallback color if no image:</div>
              <input className="flex-1 px-2 py-1 border border-border rounded text-xs" value={form.coverColor} onChange={(e) => setForm(f => ({ ...f, coverColor: e.target.value }))} placeholder="#1a3a5a" />
              <div className="w-7 h-7 rounded border border-border" style={{ background: form.coverColor }} />
            </div>
          </div>

          <div className="col-span-2">
            <label className={labelCls}>Project Video</label>
            <div className="flex gap-2 mb-2">
              <button type="button" onClick={() => setForm(f => ({ ...f, videoMode: 'url' }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.videoMode === 'url' ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}><Link size={12} /> URL</button>
              <button type="button" onClick={() => setForm(f => ({ ...f, videoMode: 'upload' }))} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${form.videoMode === 'upload' ? 'bg-primary text-white border-primary' : 'border-border text-text-muted'}`}><Upload size={12} /> Upload file</button>
            </div>
            {form.videoMode === 'url' ? (
              <input className={inputCls} value={form.videoUrl} onChange={(e) => setForm(f => ({ ...f, videoUrl: e.target.value }))} placeholder="YouTube, Vimeo, or Cloudinary URL" />
            ) : (
              <FileUpload
                folder="projects"
                accept="video/*,audio/*"
                label="Upload video file (stored on Cloudinary)"
                currentUrl={form.videoUrl || null}
                onUpload={(url) => setForm(f => ({ ...f, videoUrl: url }))}
              />
            )}
          </div>

          <div className="col-span-2">
            <label className={labelCls}>View Demo URL (optional)</label>
            <input
              className={inputCls}
              value={form.demoUrl}
              onChange={(e) => setForm(f => ({ ...f, demoUrl: e.target.value }))}
              placeholder="https://demo.example.com — leave empty to hide the button"
            />
            <p className="text-xs text-text-muted mt-1">If set, a "View Demo" button appears below the cover/video on the project page.</p>
          </div>

          <div><label className={labelCls}>Client</label><input className={inputCls} value={form.client} onChange={(e) => setForm(f => ({ ...f, client: e.target.value }))} /></div>
          <div><label className={labelCls}>Year</label><input className={inputCls} type="number" value={form.year} onChange={(e) => setForm(f => ({ ...f, year: e.target.value }))} /></div>
          <div><label className={labelCls}>Role</label><input className={inputCls} value={form.role} onChange={(e) => setForm(f => ({ ...f, role: e.target.value }))} /></div>
          <div><label className={labelCls}>Duration</label><input className={inputCls} value={form.duration} onChange={(e) => setForm(f => ({ ...f, duration: e.target.value }))} placeholder="3 months" /></div>

          <div>
            <label className={labelCls}>Grid Size</label>
            <select className={inputCls} value={form.gridSize} onChange={(e) => setForm(f => ({ ...f, gridSize: e.target.value }))}>
              <option value="STD">Standard</option>
              <option value="WIDE">Wide (2 columns)</option>
              <option value="TALL">Tall (2 rows)</option>
            </select>
          </div>
          <div className="flex flex-col gap-3 justify-center">
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isFeatured} onChange={(e) => setForm(f => ({ ...f, isFeatured: e.target.checked }))} className="w-4 h-4 accent-primary" /><span className="text-sm">Featured on home page</span></label>
            <label className="flex items-center gap-2 cursor-pointer"><input type="checkbox" checked={form.isPublished} onChange={(e) => setForm(f => ({ ...f, isPublished: e.target.checked }))} className="w-4 h-4 accent-primary" /><span className="text-sm">Published</span></label>
          </div>
        </div>
      )}

      {activeTab === 1 && (
        isNew
          ? <p className="text-sm text-text-muted">Save the project first, then add challenge content.</p>
          : <ContentEditorTab key="challenge" label="The Challenge" data={challengeData} onChange={setChallengeData} />
      )}

      {activeTab === 2 && (
        isNew
          ? <p className="text-sm text-text-muted">Save the project first, then add approach content.</p>
          : <ContentEditorTab key="approach" label="How We Built It" data={approachData} onChange={setApproachData} />
      )}

      {activeTab === 3 && !isNew && <TypographyTab value={typo} onChange={setTypo} />}
      {activeTab === 4 && !isNew && <ColorsTab projectId={id!} colors={project?.colors ?? []} />}
      {activeTab === 5 && !isNew && <SpacingTab value={spacing} onChange={setSpacing} />}
      {activeTab === 6 && !isNew && <GalleryTab projectId={id!} images={project?.galleryImages ?? []} />}
      {activeTab === 7 && !isNew && <ImpactTab projectId={id!} project={project} form={form} setForm={setForm} />}
      {activeTab === 8 && !isNew && <RelatedTab projectId={id!} selected={relatedIds} setSelected={setRelatedIds} />}
    </PageShell>
  );
}

function ContentEditorTab({ label, data, onChange }: { label: string; data: any; onChange: (d: any) => void }) {
  const holderRef = useRef<HTMLDivElement>(null);
  const editorRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const initialData = useRef(data ?? { blocks: [] });

  useEffect(() => {
    let mounted = true;
    (async () => {
      if (!holderRef.current) return;
      const editor = await initEditor(holderRef.current, initialData.current, onChange);
      await editor.isReady;
      if (mounted) { editorRef.current = editor; setReady(true); }
    })();
    return () => {
      mounted = false;
      try { editorRef.current?.destroy?.(); } catch {}
      editorRef.current = null;
    };
    // eslint-disable-next-line
  }, []);

  return (
    <div className="max-w-2xl">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-semibold text-[15px]">{label}</h3>
        <span className="text-xs text-text-muted">Use the top Save button to persist.</span>
      </div>
      {!ready && <div className="text-sm text-text-muted mb-3">Loading editor…</div>}
      <div ref={holderRef} className="min-h-[300px] bg-white border border-border rounded-xl px-8 py-6" />
    </div>
  );
}

function TypographyTab({ value, onChange }: { value: { fontFamily: string; customFontUrl: string; samples: any }; onChange: (v: any) => void }) {
  const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary';
  const { fontFamily, customFontUrl, samples } = value;

  // Normalize the stored shape into local fonts + items.
  const isObjectShape = samples && typeof samples === 'object' && !Array.isArray(samples);
  const fonts: { name: string; url: string }[] = isObjectShape && Array.isArray(samples.fonts) && samples.fonts.length
    ? samples.fonts
    : [{ name: fontFamily || 'DM Sans', url: customFontUrl || '' }];
  const items: any[] = isObjectShape
    ? (Array.isArray(samples.items) ? samples.items : Array.isArray(samples.samples) ? samples.samples : [])
    : (Array.isArray(samples) ? samples : []);

  function saveAll(newFonts: { name: string; url: string }[], newItems: any[]) {
    onChange({
      ...value,
      fontFamily: (newFonts[0] && newFonts[0].name) || 'DM Sans',
      customFontUrl: (newFonts[0] && newFonts[0].url) || '',
      samples: { fonts: newFonts, items: newItems },
    });
  }
  const setFonts = (next: typeof fonts) => saveAll(next, items);
  const setItems = (next: any[]) => saveAll(fonts, next);

  const moveItem = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= items.length) return;
    const next = [...items];
    [next[i], next[j]] = [next[j], next[i]];
    setItems(next);
  };

  const fontOptions = fonts.filter(f => f.name).map(f => f.name);
  const previewFontFamily = (name?: string) => {
    const target = name && fonts.find(f => f.name === name);
    const chosen = target || fonts[0];
    return chosen && chosen.name ? `'${chosen.name}', sans-serif` : 'inherit';
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Fonts loaded for this project</label>
          <button onClick={() => setFonts([...fonts, { name: '', url: '' }])} className="text-xs text-primary font-semibold flex items-center gap-1"><Plus size={12} /> Add Font</button>
        </div>
        <div className="space-y-2">
          {fonts.map((f, i) => (
            <div key={i} className="grid grid-cols-[1fr_1fr_auto] gap-2 items-start p-3 border border-border rounded-xl bg-bg/40">
              <div>
                <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Family name</label>
                <input className={inputCls} value={f.name} onChange={(e) => setFonts(fonts.map((x, j) => j === i ? { ...x, name: e.target.value } : x))} placeholder="DM Sans" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-text-muted uppercase tracking-wide mb-1">Font file (woff2 / otf / ttf)</label>
                <FileUpload
                  folder="fonts"
                  accept=".woff,.woff2,.otf,.ttf"
                  label="Upload font"
                  currentUrl={f.url || null}
                  compact
                  onUpload={(url) => setFonts(fonts.map((x, j) => j === i ? { ...x, url } : x))}
                />
              </div>
              <button
                onClick={() => setFonts(fonts.filter((_, j) => j !== i))}
                disabled={fonts.length === 1}
                title={fonts.length === 1 ? 'Need at least one font' : 'Remove font'}
                className="mt-5 text-text-muted hover:text-red-500 disabled:opacity-30"
              ><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
        <p className="text-xs text-text-muted mt-2">System fonts (e.g. "Inter", "DM Sans") can be added with just a name and no file upload.</p>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-semibold text-text-muted uppercase tracking-wide">Type Samples</label>
          <button onClick={() => setItems([...items, { fontName: fontOptions[0] || '', label: 'New Sample', sizePx: 16, weight: 400, letterSpacing: 'normal', sampleText: 'The quick brown fox' }])} className="text-xs text-primary font-semibold flex items-center gap-1"><Plus size={12} /> Add Sample</button>
        </div>
        <div className="space-y-2">
          {items.map((s, i) => (
            <div key={i} className="border border-border rounded-xl bg-white p-3 space-y-2">
              <div className="grid grid-cols-[auto_1fr_140px_70px_70px_auto] gap-2 items-center">
                <div className="flex flex-col">
                  <button onClick={() => moveItem(i, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button onClick={() => moveItem(i, 1)} disabled={i === items.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
                </div>
                <input className={inputCls} value={s.label ?? ''} onChange={(e) => { const next = [...items]; next[i] = { ...s, label: e.target.value }; setItems(next); }} placeholder="Label (e.g. H1)" />
                <select
                  className={inputCls}
                  value={s.fontName || fontOptions[0] || ''}
                  onChange={(e) => { const next = [...items]; next[i] = { ...s, fontName: e.target.value }; setItems(next); }}
                >
                  {fontOptions.length === 0 && <option value="">— add a font first —</option>}
                  {fontOptions.map((name) => <option key={name} value={name}>{name}</option>)}
                </select>
                <input className={inputCls} type="number" value={s.sizePx ?? 16} onChange={(e) => { const next = [...items]; next[i] = { ...s, sizePx: +e.target.value }; setItems(next); }} placeholder="px" />
                <input className={inputCls} type="number" value={s.weight ?? 400} onChange={(e) => { const next = [...items]; next[i] = { ...s, weight: +e.target.value }; setItems(next); }} placeholder="Weight" />
                <button onClick={() => setItems(items.filter((_, j) => j !== i))}><Trash2 size={14} className="text-red-400" /></button>
              </div>
              <input className={inputCls} value={s.sampleText ?? ''} onChange={(e) => { const next = [...items]; next[i] = { ...s, sampleText: e.target.value }; setItems(next); }} placeholder="Sample text" />
            </div>
          ))}
        </div>
      </div>

      {fonts.some(f => f.url) && items.length > 0 && (
        <div>
          <style>{fonts.filter(f => f.url).map(f => `@font-face { font-family: '${f.name}'; src: url('${f.url}') format('woff2'); }`).join('\n')}</style>
          <div className="border border-border rounded-xl p-5 bg-bg space-y-3">
            <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-3">Live preview</p>
            {items.map((s, i) => (
              <div key={i} style={{ fontFamily: previewFontFamily(s.fontName), fontSize: s.sizePx, fontWeight: s.weight }}>
                {s.label}: {s.sampleText || 'The quick brown fox'}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function ColorsTab({ projectId, colors }: { projectId: string; colors: any[] }) {
  const qc = useQueryClient();
  const [picked, setPicked] = useState('#1a3a5a');
  const [label, setLabel] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editHex, setEditHex] = useState('');
  const [editLabel, setEditLabel] = useState('');

  const addColor = useMutation({
    mutationFn: () => post(`/api/admin/projects/${projectId}/colors`, { hex: picked, label, sortOrder: colors.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); setLabel(''); toast.success('Color added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const deleteColor = useMutation({
    mutationFn: (colorId: string) => del(`/api/admin/projects/${projectId}/colors/${colorId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  async function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= colors.length) return;
    const a = colors[idx];
    const b = colors[j];
    await Promise.all([
      patch(`/api/admin/projects/${projectId}/colors/${a.id}`, { sortOrder: j }),
      patch(`/api/admin/projects/${projectId}/colors/${b.id}`, { sortOrder: idx }),
    ]);
    qc.invalidateQueries({ queryKey: ['project', projectId] });
  }

  function startEdit(c: any) {
    setEditingId(c.id);
    setEditHex(c.hex);
    setEditLabel(c.label);
  }

  async function saveEdit() {
    if (!editingId) return;
    try {
      await patch(`/api/admin/projects/${projectId}/colors/${editingId}`, { hex: editHex, label: editLabel });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
      setEditingId(null);
      toast.success('Color updated');
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="max-w-lg space-y-5">
      <div className="space-y-2">
        {colors.map((c, i) => (
          editingId === c.id ? (
            <div key={c.id} className="border border-border rounded-xl p-3 space-y-2 bg-bg">
              <HexColorPicker color={editHex} onChange={setEditHex} />
              <div className="flex gap-2 items-center">
                <div className="w-8 h-8 rounded-lg border border-border" style={{ background: editHex }} />
                <input value={editHex} onChange={(e) => setEditHex(e.target.value)} className="w-28 px-2 py-1.5 border border-border rounded-lg text-sm font-mono" />
                <input value={editLabel} onChange={(e) => setEditLabel(e.target.value)} placeholder="Label" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm" />
                <button onClick={saveEdit} className="text-primary hover:text-primary-light"><Check size={16} /></button>
                <button onClick={() => setEditingId(null)} className="text-text-muted hover:text-text"><X size={16} /></button>
              </div>
            </div>
          ) : (
            <div key={c.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-bg">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
                <button onClick={() => move(i, 1)} disabled={i === colors.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
              </div>
              <div className="w-12 h-12 rounded-lg border border-border" style={{ background: c.hex }} />
              <div className="flex-1">
                <div className="text-sm font-medium">{c.label}</div>
                <div className="text-xs font-mono text-text-muted">{c.hex}</div>
              </div>
              <button onClick={() => startEdit(c)} className="text-text-muted hover:text-primary"><Pencil size={14} /></button>
              <button onClick={() => deleteColor.mutate(c.id)} className="text-red-400 hover:text-red-500"><Trash2 size={14} /></button>
            </div>
          )
        ))}
      </div>

      <div className="border-t border-border pt-4">
        <p className="text-xs font-semibold text-text-muted uppercase tracking-wide mb-2">Add new color</p>
        <HexColorPicker color={picked} onChange={setPicked} />
        <div className="flex gap-2 items-center mt-3">
          <div className="w-8 h-8 rounded-lg border border-border" style={{ background: picked }} />
          <input value={picked} onChange={(e) => setPicked(e.target.value)} className="w-28 px-2 py-1.5 border border-border rounded-lg text-sm font-mono focus:outline-none focus:border-primary" />
          <input value={label} onChange={(e) => setLabel(e.target.value)} placeholder="Label (e.g. Primary)" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          <button onClick={() => addColor.mutate()} disabled={!label || addColor.isPending} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">Add</button>
        </div>
      </div>
    </div>
  );
}

function SpacingTab({ value, onChange }: { value: { label: string; valuePx: number }[]; onChange: (v: any) => void }) {
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= value.length) return;
    const next = [...value];
    [next[i], next[j]] = [next[j], next[i]];
    onChange(next);
  };

  return (
    <div className="max-w-md space-y-3">
      {value.map((s, i) => (
        <div key={i} className="flex gap-2 items-center">
          <div className="flex flex-col">
            <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
            <button onClick={() => move(i, 1)} disabled={i === value.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
          </div>
          <input value={s.label} onChange={(e) => { const sc = [...value]; sc[i] = { ...s, label: e.target.value }; onChange(sc); }} placeholder="Label" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          <input type="number" value={s.valuePx} onChange={(e) => { const sc = [...value]; sc[i] = { ...s, valuePx: +e.target.value }; onChange(sc); }} placeholder="px" className="w-20 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
          <div className="bg-primary/30 rounded" style={{ width: 40, height: Math.max(2, s.valuePx) }} />
          <button onClick={() => onChange(value.filter((_, j) => j !== i))}><Trash2 size={14} className="text-red-400" /></button>
        </div>
      ))}
      <div className="flex gap-2 pt-2">
        <button onClick={() => onChange([...value, { label: '', valuePx: 8 }])} className="text-sm text-primary font-semibold flex items-center gap-1"><Plus size={13} /> Add</button>
      </div>
    </div>
  );
}

function GalleryTab({ projectId, images }: { projectId: string; images: any[] }) {
  const qc = useQueryClient();

  const delImage = useMutation({
    mutationFn: (imgId: string) => del(`/api/admin/projects/${projectId}/gallery/${imgId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  async function addImage(url: string) {
    try {
      await post(`/api/admin/projects/${projectId}/gallery`, { imageUrl: url, sortOrder: images.length });
      qc.invalidateQueries({ queryKey: ['project', projectId] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="max-w-2xl space-y-4">
      <FileUpload
        folder="projects"
        accept="image/*"
        label="Add gallery images"
        multiple
        onUpload={addImage}
      />
      <p className="text-xs text-text-muted">Pick multiple files at once — each one uploads to Cloudinary and is added to the gallery.</p>
      <div className="grid grid-cols-3 gap-3">
        {images.map((img) => (
          <div key={img.id} className="relative group">
            <img src={img.imageUrl} alt={img.caption ?? ''} className="w-full aspect-video object-cover rounded-xl border border-border" />
            <button onClick={() => delImage.mutate(img.id)} className="absolute top-2 right-2 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
              <Trash2 size={13} className="text-red-500" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

function ImpactTab({ projectId, project, form, setForm }: any) {
  const qc = useQueryClient();
  const metrics = project?.impactMetrics ?? [];
  const [newMetric, setNewMetric] = useState({ value: '', label: '' });

  const addMetric = useMutation({
    mutationFn: () => post(`/api/admin/projects/${projectId}/metrics`, { ...newMetric, sortOrder: metrics.length }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['project', projectId] }); setNewMetric({ value: '', label: '' }); },
    onError: (e: Error) => toast.error(e.message),
  });

  const delMetric = useMutation({
    mutationFn: (mId: string) => del(`/api/admin/projects/${projectId}/metrics/${mId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['project', projectId] }),
  });

  async function moveMetric(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= metrics.length) return;
    const a = metrics[idx];
    const b = metrics[j];
    await Promise.all([
      patch(`/api/admin/projects/${projectId}/metrics/${a.id}`, { sortOrder: j }),
      patch(`/api/admin/projects/${projectId}/metrics/${b.id}`, { sortOrder: idx }),
    ]);
    qc.invalidateQueries({ queryKey: ['project', projectId] });
  }

  return (
    <div className="max-w-lg space-y-4">
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={form.showImpact} onChange={(e) => setForm((f: any) => ({ ...f, showImpact: e.target.checked }))} className="w-4 h-4 accent-primary" />
        <span className="text-sm font-medium">Show impact section on project page</span>
      </label>
      <div>
        <label className="block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5">Impact Intro</label>
        <input value={form.impactIntro ?? ''} onChange={(e) => setForm((f: any) => ({ ...f, impactIntro: e.target.value }))} className="w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" placeholder="One sentence about the results…" />
      </div>
      <div className="space-y-2">
        {metrics.map((m: any, i: number) => (
          <div key={m.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-bg">
            <div className="flex flex-col">
              <button onClick={() => moveMetric(i, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
              <button onClick={() => moveMetric(i, 1)} disabled={i === metrics.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
            </div>
            <span className="font-bold text-primary text-lg w-16">{m.value}</span>
            <span className="flex-1 text-sm text-text-muted">{m.label}</span>
            <button onClick={() => delMetric.mutate(m.id)}><Trash2 size={14} className="text-red-400" /></button>
          </div>
        ))}
      </div>
      <div className="flex gap-2">
        <input value={newMetric.value} onChange={(e) => setNewMetric(n => ({ ...n, value: e.target.value }))} placeholder="+47%" className="w-24 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
        <input value={newMetric.label} onChange={(e) => setNewMetric(n => ({ ...n, label: e.target.value }))} placeholder="User retention increase" className="flex-1 px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary" />
        <button onClick={() => addMetric.mutate()} disabled={!newMetric.value || !newMetric.label || addMetric.isPending} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50">Add</button>
      </div>
    </div>
  );
}

function RelatedTab({ projectId, selected, setSelected }: { projectId: string; selected: string[]; setSelected: (ids: string[]) => void }) {
  const { data: allProjects = [] } = useQuery({ queryKey: ['projects-all'], queryFn: () => get('/api/admin/projects') });

  return (
    <div className="max-w-lg space-y-3">
      <p className="text-xs text-text-muted">Use the top Save button to persist your selection.</p>
      {(allProjects as any[]).filter(p => p.id !== projectId).map((p: any) => (
        <label key={p.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-bg cursor-pointer hover:border-primary/30 transition-colors">
          <input
            type="checkbox"
            checked={selected.includes(p.id)}
            onChange={() => setSelected(selected.includes(p.id) ? selected.filter(x => x !== p.id) : [...selected, p.id])}
            className="w-4 h-4 accent-primary"
          />
          {p.coverImageUrl ? <img src={p.coverImageUrl} alt="" className="w-10 h-8 rounded object-cover" /> : <div className="w-10 h-8 rounded" style={{ background: p.coverColor || '#1a3a5a' }} />}
          <span className="text-sm font-medium flex-1">{p.title}</span>
          <span className="text-xs text-text-muted">{p.category}</span>
        </label>
      ))}
    </div>
  );
}
