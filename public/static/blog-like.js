(function () {
  const btn = document.getElementById('like-btn');
  if (!btn) return;
  const id = btn.dataset.postId;
  if (!id) return;

  const countEl = document.getElementById('like-count');
  const storageKey = 'pf_blog_liked_' + id;

  function setLiked() {
    btn.dataset.liked = '1';
    btn.style.borderColor = 'var(--color-primary)';
    btn.style.background = 'rgba(27,107,46,0.06)';
    btn.style.color = 'var(--color-primary)';
    btn.querySelector('svg path')?.setAttribute('fill', 'currentColor');
  }

  // Reflect prior like for this browser
  try { if (localStorage.getItem(storageKey) === '1') setLiked(); } catch (_) {}

  btn.addEventListener('click', async () => {
    if (btn.dataset.liked === '1') return;
    btn.dataset.liked = '1';
    try {
      const res = await fetch('/api/blog/posts/' + id + '/like', { method: 'POST' });
      if (!res.ok) throw new Error('Like failed');
      const data = await res.json();
      if (countEl && typeof data.likes === 'number') countEl.textContent = '(' + data.likes + ')';
      setLiked();
      try { localStorage.setItem(storageKey, '1'); } catch (_) {}
    } catch (err) {
      btn.dataset.liked = '0';
    }
  });
})();
