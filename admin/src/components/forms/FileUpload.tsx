import { useRef, useState } from 'react';
import { Upload, X, Loader2, FileText, Music, Film, Type } from 'lucide-react';
import { toast } from 'sonner';

interface FileUploadProps {
  onUpload: (url: string) => void;
  folder?: string;
  accept?: string;
  label?: string;
  currentUrl?: string | null;
  className?: string;
  compact?: boolean;
  multiple?: boolean;
}

type MediaKind = 'image' | 'video' | 'audio' | 'font' | 'other';

function detectKind(url: string): MediaKind {
  const clean = url.split('?')[0].split('#')[0].toLowerCase();
  if (/\.(jpe?g|png|gif|webp|svg|avif|bmp|ico)$/.test(clean)) return 'image';
  if (/\.(mp4|webm|mov|m4v|avi|mkv|ogv)$/.test(clean)) return 'video';
  if (/\.(mp3|wav|m4a|aac|flac|ogg|opus)$/.test(clean)) return 'audio';
  if (/\.(woff2?|ttf|otf|eot)$/.test(clean)) return 'font';
  // Cloudinary stores videos under /video/upload/
  if (clean.includes('/video/upload/')) return 'video';
  return 'other';
}

function filenameFromUrl(url: string): string {
  try {
    const pathname = new URL(url).pathname;
    return decodeURIComponent(pathname.split('/').pop() || url);
  } catch {
    return url.split('/').pop() || url;
  }
}

function KindIcon({ kind, size = 18 }: { kind: MediaKind; size?: number }) {
  if (kind === 'video') return <Film size={size} className="text-primary" />;
  if (kind === 'audio') return <Music size={size} className="text-primary" />;
  if (kind === 'font') return <Type size={size} className="text-primary" />;
  return <FileText size={size} className="text-primary" />;
}

function Preview({ url, onClear }: { url: string; onClear: () => void }) {
  const kind = detectKind(url);
  const name = filenameFromUrl(url);
  return (
    <div className="relative p-2">
      {kind === 'image' ? (
        <img src={url} alt="Uploaded" className="max-h-40 w-full object-contain rounded-lg" />
      ) : kind === 'video' ? (
        <video src={url} controls className="max-h-40 w-full rounded-lg bg-black" />
      ) : kind === 'audio' ? (
        <div className="flex items-center gap-3 px-3 py-3 bg-bg rounded-lg">
          <KindIcon kind="audio" size={22} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{name}</p>
            <audio src={url} controls className="mt-1 w-full h-8" />
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 px-3 py-3 bg-bg rounded-lg">
          <KindIcon kind={kind} size={22} />
          <p className="text-sm font-medium truncate flex-1">{name}</p>
        </div>
      )}
      <button
        type="button"
        onClick={(e) => { e.stopPropagation(); onClear(); }}
        className="absolute top-3 right-3 bg-white/90 border border-border rounded-full p-1 hover:bg-red-50"
      >
        <X size={14} className="text-red-500" />
      </button>
    </div>
  );
}

export function FileUpload({
  onUpload,
  folder = 'site',
  accept = 'image/*',
  label = 'Upload',
  currentUrl,
  className = '',
  compact = false,
  multiple = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [preview, setPreview] = useState<string | null>(currentUrl ?? null);

  async function uploadOne(file: File): Promise<string | null> {
    const formData = new FormData();
    formData.append('file', file);
    const res = await fetch(`/api/admin/upload?folder=${folder}`, {
      method: 'POST',
      credentials: 'include',
      headers: {
        'x-csrf-token': document.cookie.match(/pf_csrf=([^;]+)/)?.[1] ?? '',
      },
      body: formData,
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Upload failed');
    return data.url as string;
  }

  async function handleFiles(files: File[]) {
    if (!files.length) return;
    setUploading(true);
    setProgress({ current: 0, total: files.length });
    let succeeded = 0;
    for (let i = 0; i < files.length; i++) {
      try {
        const url = await uploadOne(files[i]);
        if (url) {
          setPreview(url);
          onUpload(url);
          succeeded++;
        }
      } catch (err: any) {
        toast.error(`${files[i].name}: ${err.message || 'Upload failed'}`);
      } finally {
        setProgress((p) => ({ ...p, current: i + 1 }));
      }
    }
    setUploading(false);
    setProgress({ current: 0, total: 0 });
    if (succeeded > 0) {
      toast.success(succeeded === 1 ? 'Uploaded successfully' : `Uploaded ${succeeded} files`);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const files = Array.from(e.dataTransfer.files);
    if (files.length) handleFiles(multiple ? files : files.slice(0, 1));
  }

  if (compact) {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        {preview && (
          <div className="relative">
            {detectKind(preview) === 'image' ? (
              <img src={preview} alt="" className="w-10 h-10 rounded-lg object-cover border border-border" />
            ) : (
              <div className="w-10 h-10 rounded-lg border border-border flex items-center justify-center bg-bg">
                <KindIcon kind={detectKind(preview)} />
              </div>
            )}
            <button onClick={() => { setPreview(null); onUpload(''); }} className="absolute -top-1 -right-1 bg-white rounded-full border border-border p-0.5 hover:bg-red-50">
              <X size={10} className="text-red-500" />
            </button>
          </div>
        )}
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-border rounded-lg text-sm text-text-muted hover:border-primary hover:text-primary transition-colors disabled:opacity-50"
        >
          {uploading ? <Loader2 size={13} className="animate-spin" /> : <Upload size={13} />}
          {uploading
            ? (progress.total > 1 ? `Uploading ${progress.current}/${progress.total}…` : 'Uploading…')
            : label}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          multiple={multiple}
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) handleFiles(multiple ? files : files.slice(0, 1));
            e.target.value = '';
          }}
        />
      </div>
    );
  }

  const showPreview = preview && !multiple;

  return (
    <div className={className}>
      <div
        onDrop={handleDrop}
        onDragOver={(e) => e.preventDefault()}
        onClick={() => !uploading && inputRef.current?.click()}
        className={`border-2 border-dashed rounded-xl transition-colors cursor-pointer ${uploading ? 'border-primary/30 bg-primary/5' : 'border-border hover:border-primary/40 hover:bg-primary/3'}`}
      >
        {showPreview ? (
          <Preview url={preview!} onClear={() => { setPreview(null); onUpload(''); }} />
        ) : (
          <div className="flex flex-col items-center justify-center py-8 px-4 text-center">
            {uploading ? (
              <>
                <Loader2 size={24} className="animate-spin text-primary mb-2" />
                <p className="text-sm text-text-muted">
                  {progress.total > 1
                    ? `Uploading ${progress.current} of ${progress.total}…`
                    : 'Uploading to Cloudinary…'}
                </p>
                {progress.total > 1 && (
                  <div className="w-48 h-1.5 bg-border rounded-full mt-2 overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all"
                      style={{ width: `${(progress.current / progress.total) * 100}%` }}
                    />
                  </div>
                )}
              </>
            ) : (
              <>
                <Upload size={24} className="text-text-muted mb-2" />
                <p className="text-sm font-medium text-text-muted">{label}</p>
                <p className="text-xs text-text-muted mt-1">
                  {multiple ? 'Select multiple files or drag & drop' : 'Drag & drop or click to browse'}
                </p>
              </>
            )}
          </div>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        className="hidden"
        onChange={(e) => {
          const files = Array.from(e.target.files ?? []);
          if (files.length) handleFiles(multiple ? files : files.slice(0, 1));
          e.target.value = '';
        }}
      />
    </div>
  );
}
