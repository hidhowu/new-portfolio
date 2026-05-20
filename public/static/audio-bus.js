// Floating mini button on /projects, /blog, etc. Subscribes to window.__MusicQueue.
(function () {
  const RING_LEN = 125.66; // 2*PI*20

  function attach() {
    const btn = document.getElementById('music-player');
    if (!btn) return;
    if (!window.__MusicQueue) {
      // Try again shortly — queue script may still be initializing
      return setTimeout(attach, 50);
    }
    const queue = window.__MusicQueue;
    const playIcon = document.getElementById('music-play-icon');
    const pauseIcon = document.getElementById('music-pause-icon');
    const ringProgress = document.getElementById('music-ring-progress');
    const artImg = btn.querySelector('.music-mini-art');

    function setRing(pct) {
      if (!ringProgress) return;
      const c = Math.max(0, Math.min(1, pct));
      ringProgress.style.strokeDashoffset = String(RING_LEN * (1 - c));
    }

    queue.subscribe(function (state) {
      if (playIcon) playIcon.style.display = state.playing ? 'none' : '';
      if (pauseIcon) pauseIcon.style.display = state.playing ? '' : 'none';
      if (state.duration > 0) setRing(state.position / state.duration); else setRing(0);
      if (state.track) {
        const title = state.track.title || '';
        const artist = state.track.artist || '';
        btn.setAttribute('title', artist ? title + ' — ' + artist : title);
        if (artImg && state.track.artUrl && artImg.src !== state.track.artUrl) {
          artImg.src = state.track.artUrl;
        }
      }
    });

    btn.addEventListener('click', function () { queue.toggle(); });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', attach);
  } else {
    attach();
  }
})();
