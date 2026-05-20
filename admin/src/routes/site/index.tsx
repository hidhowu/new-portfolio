import { useRef, useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, put, post, del } from '@/lib/api';
import { FileUpload } from '@/components/forms/FileUpload';
import { HexColorPicker } from 'react-colorful';
import { Plus, Trash2, FileText, ChevronUp, ChevronDown, Loader2, Pencil, Music } from 'lucide-react';

const TABS = ['Hero', 'About', 'Music', 'Resume', 'Theme', 'Footer', 'Social', 'Nav', 'Mobile Menu', 'CTA', 'Stats', 'SEO', 'Gallery Strip'];

const SOCIAL_ICON_KEYS = [
  'github', 'x', 'twitter', 'linkedin', 'behance', 'dribbble',
  'instagram', 'tiktok', 'youtube', 'facebook', 'threads', 'medium', 'email',
];

const inputCls = 'w-full px-3 py-2 border border-border rounded-lg text-sm focus:outline-none focus:border-primary';
const labelCls = 'block text-xs font-semibold text-text-muted uppercase tracking-wide mb-1.5';

export default function SitePage() {
  const [tab, setTab] = useState(0);
  return (
    <PageShell title="Site Settings" description="Changes save automatically when you leave a field">
      <div className="flex border-b border-border mb-6 overflow-x-auto">
        {TABS.map((t, i) => (
          <button key={t} onClick={() => setTab(i)} className={`px-5 py-3 text-sm font-medium border-b-2 whitespace-nowrap transition-colors ${tab === i ? 'border-primary text-primary' : 'border-transparent text-text-muted hover:text-text'}`}>{t}</button>
        ))}
      </div>
      {tab === 0 && <HeroTab />}
      {tab === 1 && <AboutTab />}
      {tab === 2 && <MusicTab />}
      {tab === 3 && <ResumeTab />}
      {tab === 4 && <ThemeTab />}
      {tab === 5 && <FooterTab />}
      {tab === 6 && <SocialTab />}
      {tab === 7 && <NavTab />}
      {tab === 8 && <MobileMenuTab />}
      {tab === 9 && <CtaTab />}
      {tab === 10 && <StatsTab />}
      {tab === 11 && <SeoTab />}
      {tab === 12 && <GalleryStripTab />}
    </PageShell>
  );
}

// ── shared autosave hook ─────────────────────────────────────────────────────
function useAutoSetting<T = any>(key: string) {
  const qc = useQueryClient();
  const queryKey = ['setting', key];
  const { data, isLoading } = useQuery({ queryKey, queryFn: () => get(`/api/admin/site/settings/${key}`) });

  async function save(value: T) {
    qc.setQueryData(queryKey, value);
    try {
      await put(`/api/admin/site/settings/${key}`, value);
      toast.success('Saved', { id: `setting-${key}`, duration: 1200 });
    } catch (e: any) {
      toast.error(e.message, { id: `setting-${key}` });
    }
  }

  function patch(partial: Partial<T>) {
    const latest = (qc.getQueryData<T>(queryKey) as any) ?? data ?? ({} as T);
    return save({ ...latest, ...partial } as T);
  }

  return { data: (data as T) ?? null, isLoading, save, patch };
}

// ── ID3 tag reader (ID3v2.3/2.4) ─────────────────────────────────────────────
async function readId3Tags(file: File): Promise<{ title?: string; artist?: string; album?: string; artwork?: { mime: string; bytes: Uint8Array } }> {
  const buf = await file.slice(0, 1024 * 1024).arrayBuffer(); // first 1MB usually covers ID3v2
  const v = new DataView(buf);
  const b = new Uint8Array(buf);
  if (b[0] !== 0x49 || b[1] !== 0x44 || b[2] !== 0x33) return {}; // "ID3"
  const versionMajor = b[3];
  const flags = b[5];
  const tagSize = ((b[6] & 0x7f) << 21) | ((b[7] & 0x7f) << 14) | ((b[8] & 0x7f) << 7) | (b[9] & 0x7f);
  let pos = 10;
  if (flags & 0x40) {
    const extSize = ((b[10] & 0x7f) << 21) | ((b[11] & 0x7f) << 14) | ((b[12] & 0x7f) << 7) | (b[13] & 0x7f);
    pos += extSize;
  }
  const end = Math.min(10 + tagSize, b.length);
  const decode = (bytes: Uint8Array, enc: number) => {
    try {
      if (enc === 0) return new TextDecoder('iso-8859-1').decode(bytes);
      if (enc === 1) return new TextDecoder('utf-16').decode(bytes);
      if (enc === 2) return new TextDecoder('utf-16be').decode(bytes);
      if (enc === 3) return new TextDecoder('utf-8').decode(bytes);
    } catch {}
    return new TextDecoder('utf-8', { fatal: false }).decode(bytes);
  };
  const out: any = {};
  while (pos + 10 <= end) {
    const id = String.fromCharCode(b[pos], b[pos + 1], b[pos + 2], b[pos + 3]);
    if (!/^[A-Z0-9]{4}$/.test(id)) break;
    const frameSize = versionMajor === 4
      ? ((b[pos + 4] & 0x7f) << 21) | ((b[pos + 5] & 0x7f) << 14) | ((b[pos + 6] & 0x7f) << 7) | (b[pos + 7] & 0x7f)
      : v.getUint32(pos + 4);
    const data = b.subarray(pos + 10, pos + 10 + frameSize);
    if (id === 'TIT2' || id === 'TPE1' || id === 'TALB') {
      const text = decode(data.subarray(1), data[0]).replace(/\0+$/g, '').trim();
      if (id === 'TIT2') out.title = text;
      if (id === 'TPE1') out.artist = text;
      if (id === 'TALB') out.album = text;
    } else if (id === 'APIC') {
      let i = 1;
      let mimeEnd = i;
      while (mimeEnd < data.length && data[mimeEnd] !== 0) mimeEnd++;
      const mime = new TextDecoder('iso-8859-1').decode(data.subarray(i, mimeEnd));
      let j = mimeEnd + 1 + 1; // skip picture type
      while (j < data.length && data[j] !== 0) j++; // description
      j++;
      out.artwork = { mime: mime || 'image/jpeg', bytes: data.subarray(j) };
    }
    pos += 10 + frameSize;
  }
  return out;
}

async function uploadBytes(bytes: Uint8Array, mime: string, folder: string): Promise<string> {
  const file = new File([bytes], `artwork.${mime.split('/')[1] || 'jpg'}`, { type: mime });
  const fd = new FormData();
  fd.append('file', file);
  const res = await fetch(`/api/admin/upload?folder=${folder}`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'x-csrf-token': document.cookie.match(/pf_csrf=([^;]+)/)?.[1] ?? '' },
    body: fd,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Upload failed');
  return data.url as string;
}

// ── Hero ─────────────────────────────────────────────────────────────────────
function HeroTab() {
  const { data, patch } = useAutoSetting<any>('hero');
  const d = data ?? {};
  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className={labelCls}>Site Logo (used in nav + footer everywhere)</label>
        <input
          className={inputCls}
          defaultValue={d.logoUrl ?? ''}
          onBlur={(e) => patch({ logoUrl: e.target.value || null })}
          placeholder="Paste an image URL, or upload below"
        />
        <div className="mt-2">
          <FileUpload
            folder="site"
            accept="image/*"
            label="Upload site logo"
            currentUrl={d.logoUrl || null}
            compact
            onUpload={(url) => patch({ logoUrl: url || null })}
          />
        </div>
      </div>
      <div>
        <label className={labelCls}>Heading (after "I build …")</label>
        <input className={inputCls} defaultValue={d.heading ?? ''} onBlur={(e) => patch({ heading: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Typing Words (comma separated)</label>
        <input className={inputCls} defaultValue={(d.typingWords ?? []).join(', ')} onBlur={(e) => patch({ typingWords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} />
      </div>
      <div>
        <label className={labelCls}>Subtitle</label>
        <textarea className={inputCls} rows={2} defaultValue={d.subtitle ?? ''} onBlur={(e) => patch({ subtitle: e.target.value })} />
      </div>
      <div>
        <label className={labelCls}>Main page profile image (hero section)</label>
        <FileUpload
          folder="site"
          accept="image/*"
          label="Upload hero profile picture"
          currentUrl={d.profileImageUrl || null}
          onUpload={(url) => patch({ profileImageUrl: url || null })}
        />
      </div>
      <label className="flex items-center gap-2 cursor-pointer">
        <input type="checkbox" checked={d.showSubtitle ?? true} onChange={(e) => patch({ showSubtitle: e.target.checked })} className="w-4 h-4 accent-primary" />
        <span className="text-sm">Show subtitle</span>
      </label>
    </div>
  );
}

// ── About ────────────────────────────────────────────────────────────────────
function AboutTab() {
  const { data, save, patch } = useAutoSetting<any>('about');
  const [draft, setDraft] = useState<string[] | null>(null);
  // Sync draft with server data whenever it changes from elsewhere
  useEffect(() => { setDraft(Array.isArray(data?.lines) ? [...data.lines] : []); }, [data?.lines]);
  const ls = draft ?? [];
  const lineGap = typeof data?.lineGap === 'number' ? data.lineGap : 16;
  const scrollTrigger = typeof data?.scrollTrigger === 'number' ? data.scrollTrigger : 70;

  function commit(next: string[]) {
    setDraft(next);
    save({ ...(data ?? {}), lines: next });
  }

  function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= ls.length) return;
    const next = [...ls];
    [next[i], next[j]] = [next[j], next[i]];
    commit(next);
  }

  function flushIfDirty() {
    if (!Array.isArray(data?.lines)) return;
    if (JSON.stringify(data.lines) === JSON.stringify(ls)) return;
    save({ ...(data ?? {}), lines: ls });
  }

  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className={labelCls}>About lines (use the chevrons to reorder)</label>
        <div className="space-y-2">
          {ls.map((line: string, i: number) => (
            <div key={i} className="flex gap-2 items-center">
              <div className="flex flex-col">
                <button onClick={() => move(i, -1)} disabled={i === 0} className="text-text-muted hover:text-primary disabled:opacity-30"><ChevronUp size={14} /></button>
                <button onClick={() => move(i, 1)} disabled={i === ls.length - 1} className="text-text-muted hover:text-primary disabled:opacity-30"><ChevronDown size={14} /></button>
              </div>
              <input
                className={inputCls}
                value={line}
                onChange={(e) => {
                  const next = [...ls];
                  next[i] = e.target.value;
                  setDraft(next);
                }}
                onBlur={flushIfDirty}
              />
              <button onClick={() => commit(ls.filter((_: any, j: number) => j !== i))}><Trash2 size={15} className="text-red-400" /></button>
            </div>
          ))}
        </div>
        <button onClick={() => commit([...ls, ''])} className="mt-2 text-sm text-primary font-semibold flex items-center gap-1"><Plus size={13} /> Add Line</button>
      </div>

      <div>
        <label className={labelCls}>Line spacing (pixels between lines)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={48}
            step={2}
            value={lineGap}
            onChange={(e) => patch({ lineGap: +e.target.value })}
            className="flex-1 accent-primary"
          />
          <input
            type="number"
            min={0}
            max={96}
            value={lineGap}
            onChange={(e) => patch({ lineGap: +e.target.value })}
            className="w-20 px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-xs text-text-muted">px</span>
        </div>
        <p className="text-xs text-text-muted mt-1">Default is 16px. Try 16–24px for a more breathable feel.</p>
      </div>

      <div>
        <label className={labelCls}>Scroll trigger (how visible each line must be before it fades in)</label>
        <div className="flex items-center gap-3">
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={scrollTrigger}
            onChange={(e) => patch({ scrollTrigger: +e.target.value })}
            className="flex-1 accent-primary"
          />
          <input
            type="number"
            min={0}
            max={100}
            value={scrollTrigger}
            onChange={(e) => patch({ scrollTrigger: +e.target.value })}
            className="w-20 px-2 py-1.5 border border-border rounded-lg text-sm focus:outline-none focus:border-primary"
          />
          <span className="text-xs text-text-muted">%</span>
        </div>
        <p className="text-xs text-text-muted mt-1">Lower = line appears as soon as it enters the viewport. Higher = line waits until it's fully visible. Default 70%.</p>
      </div>
    </div>
  );
}

// ── Music (playlist editor) ──────────────────────────────────────────────────
function cryptoRandomId() {
  if (typeof crypto !== 'undefined' && (crypto as any).randomUUID) {
    try { return (crypto as any).randomUUID(); } catch {}
  }
  return 'tr_' + Math.random().toString(36).slice(2, 11);
}

function uploadWithProgress(file: File, folder: string, onProgress: (pct: number) => void): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.open('POST', `/api/admin/upload?folder=${folder}`);
    xhr.withCredentials = true;
    xhr.setRequestHeader('x-csrf-token', document.cookie.match(/pf_csrf=([^;]+)/)?.[1] ?? '');
    xhr.upload.onprogress = (e) => { if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100)); };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) resolve(data.url);
        else reject(new Error(data.error || `Upload failed (${xhr.status})`));
      } catch { reject(new Error(`Upload failed (${xhr.status})`)); }
    };
    xhr.onerror = () => reject(new Error('Network error during upload'));
    const fd = new FormData();
    fd.append('file', file);
    xhr.send(fd);
  });
}

function MusicTab() {
  const { data, patch } = useAutoSetting<any>('music');
  const d = data ?? {};

  const library: any[] = Array.isArray(d.library) ? d.library : [];
  const playlistIds: string[] = Array.isArray(d.tracks)
    ? (d.tracks as any[]).map((t) => (typeof t === 'string' ? t : (t && t.id) || null)).filter(Boolean) as string[]
    : [];

  // One-shot migration from previous shapes to { library, tracks: [ids] }.
  useEffect(() => {
    if (!data) return;
    if (Array.isArray(data.library)) return;

    let migratedLib: any[] = [];
    let migratedIds: string[] = [];

    if (Array.isArray(data.tracks) && data.tracks.length > 0 && typeof data.tracks[0] === 'object') {
      migratedLib = data.tracks.map((t: any) => ({ ...t, id: t.id || cryptoRandomId() }));
      migratedIds = migratedLib.map((t) => t.id);
    } else if (data.trackUrl) {
      const legacy = {
        id: cryptoRandomId(),
        trackUrl: data.trackUrl,
        title: data.title || '',
        artist: data.artist || '',
        durationSec: data.durationSec || 0,
        artUrl: data.artUrl || null,
        spotifyUrl: data.spotifyUrl || null,
        youtubeMusicUrl: data.youtubeMusicUrl || null,
        sunoUrl: data.sunoUrl || null,
      };
      migratedLib = [legacy];
      migratedIds = [legacy.id];
    }

    patch({
      library: migratedLib,
      tracks: migratedIds,
      trackUrl: null, title: null, artist: null, durationSec: null,
      artUrl: null, spotifyUrl: null, youtubeMusicUrl: null, sunoUrl: null,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.library, data?.tracks, data?.trackUrl]);

  function addToLibrary(track: any) {
    patch({ library: [...library, track] });
  }
  function updateLibraryItem(id: string, partial: any) {
    patch({ library: library.map((t) => (t.id === id ? { ...t, ...partial } : t)) });
  }
  function deleteLibraryItem(id: string) {
    const t = library.find((x) => x.id === id);
    if (!confirm(`Delete "${t?.title || 'this track'}" from the library? It will also be removed from the playlist.`)) return;
    patch({
      library: library.filter((x) => x.id !== id),
      tracks: playlistIds.filter((pid) => pid !== id),
    });
  }
  function addToPlaylist(id: string) {
    if (playlistIds.includes(id)) return;
    patch({ tracks: [...playlistIds, id] });
  }
  function removeFromPlaylist(id: string) {
    patch({ tracks: playlistIds.filter((pid) => pid !== id) });
  }
  function movePlaylist(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= playlistIds.length) return;
    const next = [...playlistIds];
    [next[idx], next[j]] = [next[j], next[idx]];
    patch({ tracks: next });
  }

  const libraryById = new Map<string, any>(library.map((t) => [t.id, t]));

  return (
    <div className="grid grid-cols-1 xl:grid-cols-2 gap-5">
      {/* ── Library ─────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Music Library</h3>
          <span className="text-xs text-text-muted">{library.length} file{library.length === 1 ? '' : 's'}</span>
        </div>
        {library.length === 0 ? (
          <div className="text-sm text-text-muted p-4 border border-dashed border-border rounded-xl">
            No music uploaded yet. Add your first track below — it stays in the library and you can choose later whether to put it in the playlist.
          </div>
        ) : (
          <div className="space-y-2">
            {library.map((t) => (
              <LibraryRow
                key={t.id}
                track={t}
                inPlaylist={playlistIds.includes(t.id)}
                onAdd={() => addToPlaylist(t.id)}
                onUpdate={(p) => updateLibraryItem(t.id, p)}
                onDelete={() => deleteLibraryItem(t.id)}
              />
            ))}
          </div>
        )}
        <div className="bg-white border border-border rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold">Add new music to library</h4>
          <AddTrackPanel onAdd={addToLibrary} />
          <p className="text-xs text-text-muted">Title, artist and album art auto-fill from ID3 tags. Uploaded music stays in the library — add to the playlist on the right to make it play.</p>
        </div>
      </div>

      {/* ── Playlist ────────────────────────────────────────── */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Playlist</h3>
          <span className="text-xs text-text-muted">{playlistIds.length} track{playlistIds.length === 1 ? '' : 's'}</span>
        </div>
        {playlistIds.length === 0 ? (
          <div className="text-sm text-text-muted p-4 border border-dashed border-border rounded-xl">
            Playlist is empty. Click "Add to playlist" on any library item to queue it.
          </div>
        ) : (
          <div className="space-y-2">
            {playlistIds.map((id, idx) => {
              const t = libraryById.get(id);
              if (!t) return null;
              return (
                <PlaylistRow
                  key={id}
                  track={t}
                  index={idx}
                  total={playlistIds.length}
                  onMoveUp={() => movePlaylist(idx, -1)}
                  onMoveDown={() => movePlaylist(idx, 1)}
                  onRemove={() => removeFromPlaylist(id)}
                />
              );
            })}
          </div>
        )}

        <div className="bg-white border border-border rounded-xl p-4 space-y-2">
          <label className="flex items-center gap-2 cursor-pointer">
            <input type="checkbox" checked={d.autoplay !== false} onChange={(e) => patch({ autoplay: e.target.checked })} className="w-4 h-4 accent-primary" />
            <span className="text-sm font-medium">Try to autoplay on landing page</span>
          </label>
          <p className="text-xs text-text-muted">
            Visitors who haven't been here for 6+ hours start on a shuffled track. Within a session, playback resumes from where it left off across page navigations.
          </p>
        </div>
      </div>
    </div>
  );
}

function LibraryRow({ track, inPlaylist, onAdd, onUpdate, onDelete }: any) {
  const [expanded, setExpanded] = useState(false);
  const dur = track.durationSec || 0;
  const durText = dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '';

  return (
    <div className="border border-border rounded-xl bg-white">
      <div className="flex items-center gap-3 p-3">
        <div className="w-11 h-11 rounded-lg overflow-hidden bg-bg flex-shrink-0 flex items-center justify-center">
          {track.artUrl
            ? <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
            : <Music size={16} className="text-text-muted" />}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold truncate">{track.title || 'Untitled'}</div>
          <div className="text-xs text-text-muted truncate">
            {track.artist || '—'}{durText ? ` · ${durText}` : ''}
          </div>
        </div>
        <button
          onClick={onAdd}
          disabled={inPlaylist}
          title={inPlaylist ? 'Already in playlist' : 'Add to playlist'}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${inPlaylist ? 'border-border text-text-muted cursor-not-allowed' : 'border-primary text-primary hover:bg-primary hover:text-white'}`}
        >
          {inPlaylist ? <>✓ In playlist</> : <><Plus size={12} /> Add</>}
        </button>
        <button onClick={() => setExpanded((v) => !v)} className="text-text-muted hover:text-primary" title="Edit"><Pencil size={14} /></button>
        <button onClick={onDelete} className="text-text-muted hover:text-red-500" title="Delete from library"><Trash2 size={14} /></button>
      </div>
      {expanded && (
        <div className="border-t border-border p-3 space-y-3 bg-bg/40">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Title</label>
              <input className={inputCls} key={track.title} defaultValue={track.title ?? ''} onBlur={(e) => onUpdate({ title: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Artist</label>
              <input className={inputCls} key={track.artist} defaultValue={track.artist ?? ''} onBlur={(e) => onUpdate({ artist: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Duration (sec)</label>
              <input type="number" className={inputCls} key={track.durationSec} defaultValue={track.durationSec ?? 0} onBlur={(e) => onUpdate({ durationSec: +e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Album Art</label>
              <FileUpload folder="site" accept="image/*" label="Replace" currentUrl={track.artUrl || null} compact onUpload={(url) => onUpdate({ artUrl: url || null })} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Track URL</label>
            <input className={inputCls} defaultValue={track.trackUrl ?? ''} onBlur={(e) => onUpdate({ trackUrl: e.target.value })} />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className={labelCls}>Spotify URL</label>
              <input className={inputCls} key={track.spotifyUrl} defaultValue={track.spotifyUrl ?? ''} onBlur={(e) => onUpdate({ spotifyUrl: e.target.value || null })} placeholder="https://open.spotify.com/track/…" />
            </div>
            <div>
              <label className={labelCls}>YouTube Music URL</label>
              <input className={inputCls} key={track.youtubeMusicUrl} defaultValue={track.youtubeMusicUrl ?? ''} onBlur={(e) => onUpdate({ youtubeMusicUrl: e.target.value || null })} placeholder="https://music.youtube.com/…" />
            </div>
            <div>
              <label className={labelCls}>Suno URL</label>
              <input className={inputCls} key={track.sunoUrl} defaultValue={track.sunoUrl ?? ''} onBlur={(e) => onUpdate({ sunoUrl: e.target.value || null })} placeholder="https://suno.com/song/…" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function PlaylistRow({ track, index, total, onMoveUp, onMoveDown, onRemove }: any) {
  const dur = track.durationSec || 0;
  const durText = dur ? `${Math.floor(dur / 60)}:${String(dur % 60).padStart(2, '0')}` : '';

  return (
    <div className="flex items-center gap-3 p-3 border border-border rounded-xl bg-white">
      <div className="flex flex-col">
        <button onClick={onMoveUp} disabled={index === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
        <button onClick={onMoveDown} disabled={index === total - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
      </div>
      <span className="text-xs font-mono text-text-muted w-6 text-center">{index + 1}</span>
      <div className="w-10 h-10 rounded-lg overflow-hidden bg-bg flex-shrink-0 flex items-center justify-center">
        {track.artUrl
          ? <img src={track.artUrl} alt="" className="w-full h-full object-cover" />
          : <Music size={14} className="text-text-muted" />}
      </div>
      <div className="flex-1 min-w-0">
        <div className="text-sm font-semibold truncate">{track.title || 'Untitled'}</div>
        <div className="text-xs text-text-muted truncate">
          {track.artist || '—'}{durText ? ` · ${durText}` : ''}
        </div>
      </div>
      <button onClick={onRemove} className="text-text-muted hover:text-red-500" title="Remove from playlist"><Trash2 size={14} /></button>
    </div>
  );
}

function AddTrackPanel({ onAdd }: { onAdd: (track: any) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [stage, setStage] = useState<'idle' | 'reading' | 'uploading'>('idle');
  const [progress, setProgress] = useState(0);
  const [fileName, setFileName] = useState('');

  async function handle(file: File) {
    setFileName(file.name);
    setStage('reading');
    setProgress(0);
    const tags = await readId3Tags(file).catch(() => ({} as any));
    let artUrl: string | null = null;
    if (tags.artwork) {
      try { artUrl = await uploadBytes(tags.artwork.bytes, tags.artwork.mime, 'site'); } catch {}
    }
    setStage('uploading');
    try {
      const url = await uploadWithProgress(file, 'audio', setProgress);
      const probe = new Audio(url);
      const durationSec = await new Promise<number>((resolve) => {
        const done = (n: number) => resolve(n);
        probe.addEventListener('loadedmetadata', () => done(Math.round(probe.duration) || 0));
        probe.addEventListener('error', () => done(0));
        setTimeout(() => done(0), 6000);
      });
      onAdd({
        id: cryptoRandomId(),
        trackUrl: url,
        title: tags.title || file.name.replace(/\.[^.]+$/, ''),
        artist: tags.artist || '',
        durationSec,
        artUrl,
        spotifyUrl: null,
        youtubeMusicUrl: null,
        sunoUrl: null,
      });
      toast.success(`Added "${tags.title || file.name}"`);
    } catch (err: any) {
      toast.error(err.message || 'Upload failed');
    } finally {
      setStage('idle');
      setProgress(0);
      setFileName('');
    }
  }

  const busy = stage !== 'idle';

  return (
    <div className="space-y-2">
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 border-2 border-dashed border-border rounded-xl text-sm font-medium text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
      >
        {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
        {stage === 'reading' && `Reading metadata from ${fileName}…`}
        {stage === 'uploading' && `Uploading ${fileName} — ${progress}%`}
        {stage === 'idle' && 'Pick audio file to add as a track'}
      </button>
      {busy && (
        <div className="h-1.5 bg-border rounded-full overflow-hidden">
          <div className="h-full bg-primary transition-all" style={{ width: stage === 'reading' ? '15%' : `${progress}%` }} />
        </div>
      )}
      <input
        ref={inputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={async (e) => {
          const file = e.target.files?.[0];
          e.target.value = '';
          if (file) await handle(file);
        }}
      />
    </div>
  );
}

// ── Resume ───────────────────────────────────────────────────────────────────
function ResumeTab() {
  const { data, patch } = useAutoSetting<any>('resume');
  const d = data ?? {};
  return (
    <div className="max-w-xl space-y-4">
      <p className="text-sm text-text-muted">Upload your resume — the URL is auto-wired to the "Resume" button on the landing page hero.</p>
      <div>
        <label className={labelCls}>Resume file (PDF preferred)</label>
        <FileUpload
          folder="site"
          accept=".pdf,application/pdf,.doc,.docx"
          label="Upload your resume"
          currentUrl={d.url || null}
          onUpload={(url) => patch({ url: url || null })}
        />
      </div>
      {d.url && (
        <a href={d.url} target="_blank" rel="noopener" className="inline-flex items-center gap-2 text-sm text-primary font-semibold">
          <FileText size={14} /> Open current resume
        </a>
      )}
      <div>
        <label className={labelCls}>Button label (optional)</label>
        <input className={inputCls} defaultValue={d.buttonLabel ?? 'Resume'} onBlur={(e) => patch({ buttonLabel: e.target.value })} />
      </div>
    </div>
  );
}

// ── Theme ────────────────────────────────────────────────────────────────────
function ThemeTab() {
  const { data, patch } = useAutoSetting<any>('theme');
  const d = data ?? { fontFamily: 'DM Sans', patternStyle: 'dot', primaryColor: '#1B6B2E' };
  return (
    <div className="max-w-xl space-y-4">
      <div>
        <label className={labelCls}>Font Family</label>
        <select className={inputCls} value={d.fontFamily ?? 'DM Sans'} onChange={(e) => patch({ fontFamily: e.target.value })}>
          {['DM Sans', 'Inter', 'Manrope', 'Outfit', 'Sora', 'Space Grotesk'].map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Background Pattern</label>
        <select className={inputCls} value={d.patternStyle ?? 'dot'} onChange={(e) => patch({ patternStyle: e.target.value })}>
          {['dot', 'lines', 'noise', 'geometric'].map((p) => <option key={p} value={p}>{p}</option>)}
        </select>
      </div>
      <div>
        <label className={labelCls}>Primary Color</label>
        <HexColorPicker color={d.primaryColor ?? '#1B6B2E'} onChange={(c) => patch({ primaryColor: c })} />
        <input className={`${inputCls} mt-2`} value={d.primaryColor ?? '#1B6B2E'} onChange={(e) => patch({ primaryColor: e.target.value })} />
      </div>
    </div>
  );
}

// ── Footer ───────────────────────────────────────────────────────────────────
function FooterTab() {
  const { data, patch } = useAutoSetting<any>('footer');
  const d = data ?? {};
  return (
    <div className="max-w-xl space-y-4">
      <div><label className={labelCls}>Copyright Text</label><input className={inputCls} defaultValue={d.copyrightText ?? ''} onBlur={(e) => patch({ copyrightText: e.target.value })} /></div>
      <p className="text-xs text-text-muted">The site logo is configured in the Hero tab — it's reused in the navigation and footer everywhere.</p>
    </div>
  );
}

// ── Social ───────────────────────────────────────────────────────────────────
function SocialTab() {
  const qc = useQueryClient();
  const { data: links = [] } = useQuery({ queryKey: ['social-links'], queryFn: () => get('/api/admin/site/social-links') });
  const [newLink, setNewLink] = useState({ name: '', url: '', iconKey: 'github', customIconUrl: '' });

  const add = useMutation({
    mutationFn: () => post('/api/admin/site/social-links', {
      name: newLink.name, url: newLink.url,
      iconKey: newLink.customIconUrl ? `custom:${newLink.customIconUrl}` : newLink.iconKey,
      sortOrder: (links as any[]).length,
    }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['social-links'] }); setNewLink({ name: '', url: '', iconKey: 'github', customIconUrl: '' }); toast.success('Social link added'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/admin/site/social-links/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['social-links'] }),
  });

  async function updateField(id: string, partial: any) {
    try {
      await fetch(`/api/admin/site/social-links/${id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': document.cookie.match(/pf_csrf=([^;]+)/)?.[1] ?? '',
        },
        body: JSON.stringify(partial),
      });
      qc.invalidateQueries({ queryKey: ['social-links'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="max-w-xl space-y-3">
      {(links as any[]).map((link: any) => (
        <div key={link.id} className="flex items-center gap-3 p-3.5 border border-border rounded-xl bg-white">
          {link.iconKey?.startsWith('custom:') ? (
            <img src={link.iconKey.replace('custom:', '')} alt="" className="w-6 h-6 object-contain" />
          ) : (
            <span className="w-6 h-6 bg-bg border border-border rounded-md flex items-center justify-center text-xs text-text-muted">{link.iconKey?.[0]?.toUpperCase()}</span>
          )}
          <input className="flex-1 text-sm font-medium px-2 py-1 border border-transparent rounded hover:border-border focus:border-primary focus:outline-none" defaultValue={link.name} onBlur={(e) => e.target.value !== link.name && updateField(link.id, { name: e.target.value })} />
          <input className="flex-[2] text-sm text-text-muted px-2 py-1 border border-transparent rounded hover:border-border focus:border-primary focus:outline-none" defaultValue={link.url} onBlur={(e) => e.target.value !== link.url && updateField(link.id, { url: e.target.value })} />
          <button onClick={() => remove.mutate(link.id)} className="text-text-muted hover:text-red-500"><Trash2 size={14} /></button>
        </div>
      ))}

      <div className="border border-dashed border-border rounded-xl p-4 space-y-3">
        <h4 className="text-sm font-semibold">Add Social Link</h4>
        <div className="grid grid-cols-2 gap-3">
          <div><label className={labelCls}>Name</label><input className={inputCls} value={newLink.name} onChange={(e) => setNewLink(n => ({ ...n, name: e.target.value }))} placeholder="TikTok" /></div>
          <div><label className={labelCls}>URL</label><input className={inputCls} value={newLink.url} onChange={(e) => setNewLink(n => ({ ...n, url: e.target.value }))} placeholder="https://tiktok.com/@you" /></div>
        </div>
        <div>
          <label className={labelCls}>Icon — choose built-in or upload custom SVG/PNG</label>
          <div className="flex gap-2 items-center">
            <select className={`${inputCls} flex-1`} value={newLink.iconKey} onChange={(e) => setNewLink(n => ({ ...n, iconKey: e.target.value, customIconUrl: '' }))}>
              {SOCIAL_ICON_KEYS.map((k) => <option key={k} value={k}>{k}</option>)}
            </select>
            <span className="text-xs text-text-muted">or</span>
            <FileUpload folder="site" accept="image/svg+xml,image/png" label="Custom icon" compact currentUrl={newLink.customIconUrl || null} onUpload={(url) => setNewLink(n => ({ ...n, customIconUrl: url }))} />
          </div>
        </div>
        <button onClick={() => add.mutate()} disabled={!newLink.name || !newLink.url || add.isPending} className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-primary-light disabled:opacity-50 transition-colors">
          {add.isPending ? 'Adding…' : 'Add Link'}
        </button>
      </div>
    </div>
  );
}

// ── Nav ──────────────────────────────────────────────────────────────────────
function NavTab() {
  const { data, save } = useAutoSetting<any>('nav');
  const [links, setLinks] = useState<any[] | null>(null);
  useEffect(() => { if (data?.links) setLinks(null); }, [data]);
  const ls = links ?? data?.links ?? [];

  function commit(next: any[]) {
    setLinks(next);
    save({ ...(data ?? {}), links: next });
  }

  return (
    <div className="max-w-xl space-y-3">
      {ls.map((link: any, i: number) => (
        <div key={i} className="flex items-center gap-2">
          <input
            className={inputCls}
            defaultValue={link.label}
            onBlur={(e) => { const next = [...ls]; next[i] = { ...link, label: e.target.value }; commit(next); }}
            placeholder="Label"
          />
          <input
            className={inputCls}
            defaultValue={link.href}
            onBlur={(e) => { const next = [...ls]; next[i] = { ...link, href: e.target.value }; commit(next); }}
            placeholder="/path or #section"
          />
          <input
            type="checkbox"
            checked={link.isActive ?? true}
            onChange={(e) => { const next = [...ls]; next[i] = { ...link, isActive: e.target.checked }; commit(next); }}
            className="w-4 h-4 accent-primary"
            title="Active"
          />
          <button onClick={() => commit(ls.filter((_: any, j: number) => j !== i))}><Trash2 size={14} className="text-red-400" /></button>
        </div>
      ))}
      <button onClick={() => commit([...ls, { label: '', href: '/', isActive: true }])} className="text-sm text-primary font-semibold flex items-center gap-1"><Plus size={13} /> Add Link</button>
    </div>
  );
}

// ── Mobile Menu ──────────────────────────────────────────────────────────────
const MOBILE_MENU_PRESETS = [
  { label: 'Cream (default)', value: '#F7F6F2' },
  { label: 'Green tint', value: '#E8F5EC' },
  { label: 'Warm peach', value: '#FFF4E6' },
  { label: 'Soft blue', value: '#EFF6FF' },
  { label: 'Soft violet', value: '#F3E8FF' },
];

const MOBILE_MENU_WIDGET_DEFS: { id: string; label: string; help: string }[] = [
  { id: 'about', label: 'About chip', help: 'Avatar + 2-line about excerpt' },
  { id: 'links', label: 'Nav links list', help: 'Home / About / Services / Projects / etc.' },
  { id: 'featuredWork', label: 'Featured work', help: 'First featured project as a card' },
  { id: 'latestBlog', label: 'Latest blog post', help: 'Most recent blog entry' },
  { id: 'socials', label: 'Social icons row', help: 'Top 5 social links as icons' },
  { id: 'cta', label: 'Book a Call CTA', help: 'Full-width primary button' },
];

function MobileMenuTab() {
  const { data, save } = useAutoSetting<any>('mobileMenu');
  const d = data ?? {};
  const widgets: { id: string; enabled: boolean }[] = Array.isArray(d.widgets) && d.widgets.length
    ? d.widgets
    : MOBILE_MENU_WIDGET_DEFS.map(w => ({ id: w.id, enabled: true }));

  function commitWidgets(next: { id: string; enabled: boolean }[]) {
    save({ ...d, widgets: next });
  }

  function toggle(id: string) {
    commitWidgets(widgets.map(w => w.id === id ? { ...w, enabled: !w.enabled } : w));
  }

  function move(idx: number, dir: -1 | 1) {
    const j = idx + dir;
    if (j < 0 || j >= widgets.length) return;
    const next = [...widgets];
    [next[idx], next[j]] = [next[j], next[idx]];
    commitWidgets(next);
  }

  function setBgColor(color: string) {
    save({ ...d, backgroundColor: color });
  }

  const currentBg = d.backgroundColor || MOBILE_MENU_PRESETS[1].value;

  return (
    <div className="max-w-xl space-y-6">
      <p className="text-sm text-text-muted">Customize what appears in the hamburger menu on mobile. Toggle widgets on/off and drag with the chevrons to reorder.</p>

      <div>
        <div className={labelCls}>Profile image (shown in the About chip — falls back to hero image)</div>
        <FileUpload
          folder="site"
          accept="image/*"
          label="Upload mobile menu profile picture"
          currentUrl={d.profileImageUrl || null}
          onUpload={(url) => save({ ...d, profileImageUrl: url || null })}
        />
      </div>

      <div>
        <div className={labelCls}>Background Color</div>
        <div className="flex flex-wrap gap-2 mb-3">
          {MOBILE_MENU_PRESETS.map(p => (
            <button
              key={p.value}
              onClick={() => setBgColor(p.value)}
              className={`flex items-center gap-2 px-3 py-2 border rounded-lg text-xs font-medium transition-colors ${currentBg.toLowerCase() === p.value.toLowerCase() ? 'border-primary text-primary' : 'border-border text-text-muted hover:border-primary/40'}`}
            >
              <span className="w-4 h-4 rounded border border-border" style={{ background: p.value }} />
              {p.label}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input type="color" value={currentBg} onChange={(e) => setBgColor(e.target.value)} className="w-10 h-9 border border-border rounded-lg cursor-pointer" />
          <input className={inputCls} value={currentBg} onChange={(e) => setBgColor(e.target.value)} placeholder="#E8F5EC" />
        </div>
      </div>

      <div>
        <div className={labelCls}>Widgets (top-to-bottom order shown on phone)</div>
        <div className="space-y-2">
          {widgets.map((w, i) => {
            const def = MOBILE_MENU_WIDGET_DEFS.find(d => d.id === w.id);
            if (!def) return null;
            return (
              <div key={w.id} className="flex items-center gap-3 p-3 border border-border rounded-xl bg-bg">
                <div className="flex flex-col">
                  <button onClick={() => move(i, -1)} disabled={i === 0} className="disabled:opacity-30"><ChevronUp size={14} /></button>
                  <button onClick={() => move(i, 1)} disabled={i === widgets.length - 1} className="disabled:opacity-30"><ChevronDown size={14} /></button>
                </div>
                <div className="flex-1">
                  <div className="text-sm font-medium">{def.label}</div>
                  <div className="text-xs text-text-muted">{def.help}</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" checked={w.enabled} onChange={() => toggle(w.id)} className="sr-only peer" />
                  <div className="w-10 h-6 bg-border rounded-full peer peer-checked:bg-primary transition-colors relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-transform peer-checked:after:translate-x-4" />
                </label>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── CTA ──────────────────────────────────────────────────────────────────────
function CtaTab() {
  const { data, patch } = useAutoSetting<any>('cta');
  const d = data ?? {};
  return (
    <div className="max-w-xl space-y-4">
      <div><label className={labelCls}>Heading</label><input className={inputCls} defaultValue={d.heading ?? ''} onBlur={(e) => patch({ heading: e.target.value })} /></div>
      <div><label className={labelCls}>Subheading</label><textarea className={inputCls} rows={2} defaultValue={d.subheading ?? ''} onBlur={(e) => patch({ subheading: e.target.value })} /></div>
      <div><label className={labelCls}>Button Label</label><input className={inputCls} defaultValue={d.buttonLabel ?? ''} onBlur={(e) => patch({ buttonLabel: e.target.value })} /></div>
      <div><label className={labelCls}>Button URL (section #anchor or full URL)</label><input className={inputCls} defaultValue={d.buttonHref ?? ''} onBlur={(e) => patch({ buttonHref: e.target.value })} placeholder="#contact" /></div>
    </div>
  );
}

// ── Stats ────────────────────────────────────────────────────────────────────
function StatsTab() {
  const { data, save } = useAutoSetting<any>('stats');
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { if (data?.items) setItems(null); }, [data]);
  const ls = items ?? data?.items ?? [];

  function commit(next: any[]) {
    setItems(next);
    save({ ...(data ?? {}), items: next });
  }

  return (
    <div className="max-w-md space-y-3">
      {ls.map((s: any, i: number) => (
        <div key={i} className="flex gap-2">
          <input className={inputCls} defaultValue={s.value} onBlur={(e) => { const next = [...ls]; next[i] = { ...s, value: e.target.value }; commit(next); }} placeholder="42+" />
          <input className={inputCls} defaultValue={s.label} onBlur={(e) => { const next = [...ls]; next[i] = { ...s, label: e.target.value }; commit(next); }} placeholder="Projects shipped" />
          <button onClick={() => commit(ls.filter((_: any, j: number) => j !== i))}><Trash2 size={14} className="text-red-400" /></button>
        </div>
      ))}
      <button onClick={() => commit([...ls, { value: '', label: '' }])} className="text-sm text-primary font-semibold flex items-center gap-1"><Plus size={13} /> Add Stat</button>
    </div>
  );
}

// ── SEO ──────────────────────────────────────────────────────────────────────
function SeoTab() {
  const { data, patch } = useAutoSetting<any>('seo');
  const d = data ?? {};
  return (
    <div className="max-w-xl space-y-4">
      <div><label className={labelCls}>Site Title (default for pages without an own title)</label><input className={inputCls} defaultValue={d.siteTitle ?? ''} onBlur={(e) => patch({ siteTitle: e.target.value })} placeholder="Josh Studios" /></div>
      <div><label className={labelCls}>Site Name (used in title separators)</label><input className={inputCls} defaultValue={d.siteName ?? ''} onBlur={(e) => patch({ siteName: e.target.value })} placeholder="Josh Studios" /></div>
      <div><label className={labelCls}>Canonical Base URL</label><input className={inputCls} defaultValue={d.canonicalBase ?? ''} onBlur={(e) => patch({ canonicalBase: e.target.value || null })} placeholder="https://joshstudios.com" /></div>
      <div><label className={labelCls}>Default Meta Description</label><textarea className={inputCls} rows={3} defaultValue={d.description ?? ''} onBlur={(e) => patch({ description: e.target.value })} /></div>
      <div><label className={labelCls}>Default Keywords (comma separated)</label><input className={inputCls} defaultValue={(d.keywords ?? []).join(', ')} onBlur={(e) => patch({ keywords: e.target.value.split(',').map((s: string) => s.trim()).filter(Boolean) })} /></div>
      <div>
        <label className={labelCls}>Favicon</label>
        <FileUpload folder="site" accept="image/png,image/x-icon,image/svg+xml" label="Upload favicon (PNG / ICO / SVG)" currentUrl={d.faviconUrl || null} compact onUpload={(url) => patch({ faviconUrl: url || null })} />
      </div>
      <div>
        <label className={labelCls}>Open Graph Image (1200×630 recommended)</label>
        <FileUpload folder="site" accept="image/*" label="Upload OG image" currentUrl={d.ogImageUrl || null} onUpload={(url) => patch({ ogImageUrl: url || null })} />
      </div>
      <div><label className={labelCls}>Twitter Handle</label><input className={inputCls} defaultValue={d.twitterHandle ?? ''} onBlur={(e) => patch({ twitterHandle: e.target.value })} placeholder="@handle" /></div>
      <div>
        <label className={labelCls}>Twitter Card Type</label>
        <select className={inputCls} value={d.twitterCard ?? 'summary_large_image'} onChange={(e) => patch({ twitterCard: e.target.value })}>
          <option value="summary">summary</option>
          <option value="summary_large_image">summary_large_image</option>
        </select>
      </div>
      <div><label className={labelCls}>Twitter OG Image (overrides OG image on X if set)</label>
        <FileUpload folder="site" accept="image/*" label="Upload Twitter card image" currentUrl={d.twitterImageUrl || null} onUpload={(url) => patch({ twitterImageUrl: url || null })} />
      </div>
      <div><label className={labelCls}>Author Name</label><input className={inputCls} defaultValue={d.author ?? ''} onBlur={(e) => patch({ author: e.target.value })} /></div>
      <div><label className={labelCls}>Locale</label><input className={inputCls} defaultValue={d.locale ?? 'en_US'} onBlur={(e) => patch({ locale: e.target.value })} placeholder="en_US" /></div>
      <div><label className={labelCls}>Google Verification Token (optional)</label><input className={inputCls} defaultValue={d.googleVerification ?? ''} onBlur={(e) => patch({ googleVerification: e.target.value })} /></div>
    </div>
  );
}

// ── Gallery Strip ────────────────────────────────────────────────────────────
function GalleryStripTab() {
  const qc = useQueryClient();
  const { data: items = [] } = useQuery({ queryKey: ['gallery-strip'], queryFn: () => get('/api/admin/gallery-strip') });
  const [targetRow, setTargetRow] = useState(0);

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/admin/gallery-strip/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['gallery-strip'] }),
  });

  async function moveItem(item: any, dir: -1 | 1) {
    const newRow = Math.max(0, Math.min(2, item.row + dir));
    if (newRow === item.row) return;
    const newRowCount = (items as any[]).filter((i: any) => i.row === newRow).length;
    try {
      await fetch(`/api/admin/gallery-strip/${item.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: {
          'content-type': 'application/json',
          'x-csrf-token': document.cookie.match(/pf_csrf=([^;]+)/)?.[1] ?? '',
        },
        body: JSON.stringify({ row: newRow, sortOrder: newRowCount }),
      });
      qc.invalidateQueries({ queryKey: ['gallery-strip'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  async function addImage(url: string) {
    const sortOrder = (items as any[]).filter((i: any) => i.row === targetRow).length;
    const label = url.split('/').pop()?.split('?')[0]?.replace(/\.[a-z0-9]+$/i, '') || 'Gallery Image';
    try {
      await post('/api/admin/gallery-strip', {
        label,
        imageUrl: url,
        color: '#1a3a4a',
        row: targetRow,
        sortOrder,
      });
      qc.invalidateQueries({ queryKey: ['gallery-strip'] });
    } catch (e: any) {
      toast.error(e.message);
    }
  }

  return (
    <div className="max-w-3xl space-y-5">
      <p className="text-sm text-text-muted">Three rows of scrolling project thumbnails on the landing page. Upload images — they upload to Cloudinary and appear immediately.</p>

      {[0, 1, 2].map((row) => (
        <div key={row} className="bg-white border border-border rounded-xl p-5">
          <h3 className="font-semibold text-[14px] mb-4">Row {row + 1}</h3>
          <div className="grid grid-cols-4 gap-3">
            {(items as any[]).filter((i: any) => i.row === row).map((item: any) => (
              <div key={item.id} className="relative group">
                <div className="aspect-video rounded-xl overflow-hidden border border-border" style={{ background: item.color || '#1a3a4a' }}>
                  {item.imageUrl && <img src={item.imageUrl} alt={item.label} className="w-full h-full object-cover" />}
                  {!item.imageUrl && <div className="flex items-center justify-center h-full text-white/70 text-xs font-medium">{item.label}</div>}
                </div>
                <p className="text-xs text-text-muted mt-1 truncate">{item.label}</p>
                <div className="absolute top-1 left-1 flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => moveItem(item, -1)}
                    disabled={row === 0}
                    title="Move to previous row"
                    className="bg-white/90 rounded-full p-1 shadow-sm disabled:opacity-30 hover:bg-white"
                  ><ChevronUp size={12} className="text-primary" /></button>
                  <button
                    onClick={() => moveItem(item, 1)}
                    disabled={row === 2}
                    title="Move to next row"
                    className="bg-white/90 rounded-full p-1 shadow-sm disabled:opacity-30 hover:bg-white"
                  ><ChevronDown size={12} className="text-primary" /></button>
                </div>
                <button onClick={() => remove.mutate(item.id)} className="absolute top-1 right-1 bg-white/90 rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity shadow-sm">
                  <Trash2 size={11} className="text-red-500" />
                </button>
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="bg-white border border-border rounded-xl p-5 space-y-4">
        <h4 className="font-semibold text-sm">Add Gallery Images</h4>
        <div>
          <label className={labelCls}>Target Row (for new uploads)</label>
          <select className={inputCls} value={targetRow} onChange={(e) => setTargetRow(+e.target.value)}>
            <option value={0}>Row 1 (top)</option>
            <option value={1}>Row 2 (middle)</option>
            <option value={2}>Row 3 (bottom)</option>
          </select>
        </div>
        <FileUpload
          folder="gallery"
          accept="image/*"
          label="Upload gallery images"
          multiple
          onUpload={addImage}
        />
        <p className="text-xs text-text-muted">Pick multiple files — each uploads to Cloudinary and is added to the selected row. Hover over a tile to move it between rows.</p>
      </div>
    </div>
  );
}
