import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { PageShell } from '@/components/layout/PageShell';
import { get, del } from '@/lib/api';
import { Trash2, Copy, Music, FileText, Image } from 'lucide-react';

const TYPE_ICONS: Record<string, any> = { IMAGE: Image, FONT: FileText, AUDIO: Music, VIDEO: Music };

export default function MediaPage() {
  const [type, setType] = useState('');
  const [page, setPage] = useState(1);
  const qc = useQueryClient();

  const { data } = useQuery({
    queryKey: ['media', type, page],
    queryFn: () => get(`/api/admin/media?type=${type}&page=${page}`),
  });

  const remove = useMutation({
    mutationFn: (id: string) => del(`/api/admin/media/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['media'] }); toast.success('Asset deleted'); },
    onError: (e: Error) => toast.error(e.message),
  });

  const assets = data?.assets ?? [];
  const totalPages = data ? Math.ceil(data.total / data.pageSize) : 1;

  return (
    <PageShell title="Media Library" description="Images, fonts, and audio files uploaded to Cloudinary">
      <div className="flex gap-1 mb-6 bg-white border border-border rounded-lg p-1 w-fit">
        {['', 'IMAGE', 'SVG', 'FONT', 'AUDIO', 'VIDEO'].map((t) => (
          <button key={t} onClick={() => { setType(t); setPage(1); }} className={`px-4 py-1.5 rounded-md text-sm font-medium capitalize transition-colors ${type === t ? 'bg-primary text-white' : 'text-text-muted hover:text-text'}`}>
            {t || 'All'}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-5 gap-4">
        {assets.map((asset: any) => {
          const Icon = TYPE_ICONS[asset.type] ?? Image;
          return (
            <div key={asset.id} className="bg-white border border-border rounded-xl overflow-hidden group">
              <div className="aspect-square bg-bg flex items-center justify-center overflow-hidden">
                {asset.type === 'IMAGE' ? (
                  <img src={asset.url} alt={asset.alt ?? ''} className="w-full h-full object-cover" />
                ) : (
                  <Icon size={32} className="text-text-muted" />
                )}
              </div>
              <div className="p-2">
                <div className="text-xs font-medium truncate">{asset.cloudinaryId.split('/').pop()}</div>
                <div className="text-xs text-text-muted">{asset.type}</div>
                <div className="flex gap-1 mt-2">
                  <button
                    onClick={() => { navigator.clipboard.writeText(asset.url); toast.success('URL copied'); }}
                    className="flex-1 border border-border rounded-md py-1 text-xs text-text-muted hover:text-primary flex items-center justify-center gap-1"
                  >
                    <Copy size={11} /> Copy
                  </button>
                  <button
                    onClick={() => { if (confirm('Delete this asset?')) remove.mutate(asset.id); }}
                    className="border border-border rounded-md p-1 text-text-muted hover:text-red-500"
                  >
                    <Trash2 size={13} />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {totalPages > 1 && (
        <div className="flex gap-2 justify-center mt-6">
          {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
            <button key={p} onClick={() => setPage(p)} className={`w-9 h-9 rounded-lg border text-sm font-medium transition-colors ${page === p ? 'bg-primary text-white border-primary' : 'border-border text-text-muted hover:text-text'}`}>{p}</button>
          ))}
        </div>
      )}
    </PageShell>
  );
}
