// Server-side renderer for Editor.js JSON → HTML
// Each block type maps to an HTML template. Keep it secure — no raw user HTML injection.

function esc(str: string = ''): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderBlock(block: any): string {
  const d = block.data ?? {};
  switch (block.type) {
    case 'header': {
      const level = Math.min(Math.max(d.level ?? 2, 2), 3);
      return `<h${level} class="blog-h${level}">${d.text ?? ''}</h${level}>`;
    }
    case 'paragraph':
      return `<p class="blog-p">${d.text ?? ''}</p>`;
    case 'list': {
      const tag = d.style === 'ordered' ? 'ol' : 'ul';
      const items = (d.items ?? []).map((item: string) => `<li>${item}</li>`).join('');
      return `<${tag} class="blog-list">${items}</${tag}>`;
    }
    case 'quote':
      return `<blockquote class="blog-quote"><p>${esc(d.text ?? '')}</p>${d.caption ? `<cite>${esc(d.caption)}</cite>` : ''}</blockquote>`;
    case 'code':
      return `<pre class="blog-code"><code>${esc(d.code ?? '')}</code></pre>`;
    case 'delimiter':
      return `<hr class="blog-delimiter" />`;
    case 'image': {
      const url = esc(d.file?.url ?? d.url ?? '');
      const cap = esc(d.caption ?? '');
      return `<figure class="blog-image${d.stretched ? ' stretched' : ''}${d.withBorder ? ' with-border' : ''}">
        <img src="${url}" alt="${cap}" loading="lazy" />
        ${cap ? `<figcaption>${cap}</figcaption>` : ''}
      </figure>`;
    }
    case 'embed': {
      const src = esc(d.embed ?? '');
      return `<div class="blog-embed">
        <iframe src="${src}" frameborder="0" allow="autoplay; encrypted-media" allowfullscreen loading="lazy"></iframe>
        ${d.caption ? `<p class="blog-embed-caption">${esc(d.caption)}</p>` : ''}
      </div>`;
    }
    case 'table': {
      const rows: string[][] = d.content ?? [];
      const thead = d.withHeadings && rows.length > 0
        ? `<thead><tr>${rows[0].map((c: string) => `<th>${esc(c)}</th>`).join('')}</tr></thead>`
        : '';
      const bodyRows = (d.withHeadings ? rows.slice(1) : rows)
        .map((row: string[]) => `<tr>${row.map((c: string) => `<td>${esc(c)}</td>`).join('')}</tr>`)
        .join('');
      return `<div class="blog-table-wrapper"><table class="blog-table">${thead}<tbody>${bodyRows}</tbody></table></div>`;
    }
    case 'callout': {
      const style = esc(d.style ?? 'info');
      return `<div class="blog-callout blog-callout--${style}"><p>${d.text ?? ''}</p></div>`;
    }
    case 'gallery': {
      const images: any[] = d.images ?? [];
      const imgs = images.map(img =>
        `<figure><img src="${esc(img.url)}" alt="${esc(img.caption ?? '')}" loading="lazy" />${img.caption ? `<figcaption>${esc(img.caption)}</figcaption>` : ''}</figure>`
      ).join('');
      return `<div class="blog-gallery">${imgs}</div>`;
    }
    case 'fontSample': {
      const family = esc(d.fontFamily ?? 'inherit');
      const size = parseInt(d.sizePx) || 20;
      return `<div class="blog-font-sample" style="font-family:${family};font-size:${size}px">${esc(d.sampleText ?? 'The quick brown fox')}</div>`;
    }
    default:
      return '';
  }
}

export function renderBlocks(contentJson: any): string {
  if (!contentJson || !Array.isArray(contentJson.blocks)) return '';
  return contentJson.blocks.map(renderBlock).join('\n');
}
