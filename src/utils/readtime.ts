export function estimateReadTime(contentJson: Record<string, any>): number {
  const blocks: any[] = contentJson?.blocks ?? [];
  const text = blocks
    .map((b: any) => {
      if (b.type === 'paragraph' || b.type === 'header') return b.data?.text ?? '';
      if (b.type === 'list') return (b.data?.items ?? []).join(' ');
      if (b.type === 'quote') return b.data?.text ?? '';
      return '';
    })
    .join(' ');
  const words = text.trim().split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.ceil(words / 200));
}
