// Music queue shared across all pages of the site.
// - Stores tracks list + current index in sessionStorage so position persists across navigations
// - On cold visit (6h+ since last visit), picks a random starting track
// - Auto-cycles to next track when one ends
// - Exposes window.__MusicQueue as the controller object
(function () {
  const STATE_KEY = 'pf_music_state';
  const VISIT_KEY = 'pf_last_visit';
  const COLD_HOURS = 6;

  function createQueue(music) {
    const tracks = (music && Array.isArray(music.tracks)) ? music.tracks.filter(t => t && t.trackUrl) : [];
    if (!tracks.length) {
      window.__MusicQueue = null;
      return;
    }

    const listeners = new Set();
    let audio = null;
    let currentIndex = 0;
    let pendingPosition = 0;

    // Decide starting track
    let resumed = false;
    try {
      const saved = JSON.parse(sessionStorage.getItem(STATE_KEY) || 'null');
      if (saved && typeof saved.index === 'number' && saved.index >= 0 && saved.index < tracks.length) {
        // Within session — resume same track
        currentIndex = saved.index;
        pendingPosition = saved.position || 0;
        resumed = true;
      }
    } catch (_) {}
    if (!resumed) {
      let lastVisit = 0;
      try { lastVisit = parseInt(localStorage.getItem(VISIT_KEY) || '0', 10) || 0; } catch (_) {}
      const hoursSince = (Date.now() - lastVisit) / (1000 * 60 * 60);
      if (hoursSince > COLD_HOURS && tracks.length > 1) {
        currentIndex = Math.floor(Math.random() * tracks.length);
      } else {
        currentIndex = 0;
      }
      pendingPosition = 0;
    }
    try { localStorage.setItem(VISIT_KEY, String(Date.now())); } catch (_) {}

    function getState() {
      const t = tracks[currentIndex] || null;
      return {
        track: t,
        tracks: tracks,
        index: currentIndex,
        total: tracks.length,
        playing: !!audio && !audio.paused,
        position: audio ? audio.currentTime : pendingPosition,
        duration: (audio && audio.duration) || (t && t.durationSec) || 0,
      };
    }

    function emit() {
      const s = getState();
      listeners.forEach(function (fn) { try { fn(s); } catch (_) {} });
    }

    function persist() {
      if (!audio) return;
      try {
        sessionStorage.setItem(STATE_KEY, JSON.stringify({
          index: currentIndex,
          position: audio.currentTime,
          playing: !audio.paused,
          trackUrl: tracks[currentIndex] && tracks[currentIndex].trackUrl,
        }));
        localStorage.setItem(VISIT_KEY, String(Date.now()));
      } catch (_) {}
    }

    function ensureAudio() {
      const url = tracks[currentIndex] && tracks[currentIndex].trackUrl;
      if (!url) return;
      if (audio && audio._src === url) return;
      if (audio) { try { audio.pause(); } catch (_) {} audio.src = ''; }
      audio = new Audio(url);
      audio._src = url;
      audio.preload = 'metadata';
      audio.addEventListener('timeupdate', function () { persist(); emit(); });
      audio.addEventListener('loadedmetadata', function () {
        if (pendingPosition > 0 && (!audio.duration || pendingPosition < audio.duration)) {
          try { audio.currentTime = pendingPosition; } catch (_) {}
          pendingPosition = 0;
        }
        emit();
      });
      audio.addEventListener('ended', function () { next(true); });
      audio.addEventListener('play', emit);
      audio.addEventListener('pause', emit);
      window.__pfAudio = audio;
    }

    function play() {
      ensureAudio();
      if (!audio) return;
      audio.play().then(emit).catch(function () { emit(); });
    }

    function pause() {
      if (audio) audio.pause();
      emit();
    }

    function toggle() {
      if (!audio || audio.paused) play();
      else pause();
    }

    function go(idx, autoplay) {
      if (!tracks.length) return;
      currentIndex = ((idx % tracks.length) + tracks.length) % tracks.length;
      pendingPosition = 0;
      if (audio) { try { audio.pause(); } catch (_) {} audio = null; }
      ensureAudio();
      if (autoplay !== false && audio) audio.play().then(emit).catch(function () { emit(); });
      persist();
      emit();
    }

    function next(autoplay) { go(currentIndex + 1, autoplay); }
    function prev() { go(currentIndex - 1, true); }

    function seek(pct) {
      ensureAudio();
      if (!audio) return;
      const dur = audio.duration || (tracks[currentIndex] && tracks[currentIndex].durationSec) || 0;
      if (!dur) return;
      audio.currentTime = Math.max(0, Math.min(1, pct)) * dur;
      emit();
    }

    function subscribe(fn) {
      listeners.add(fn);
      try { fn(getState()); } catch (_) {}
      return function () { listeners.delete(fn); };
    }

    window.__MusicQueue = {
      getState: getState,
      play: play, pause: pause, toggle: toggle,
      next: next, prev: prev, seek: seek,
      go: go, subscribe: subscribe,
    };

    // Pre-load current track + best-effort autoplay
    ensureAudio();
    const autoplay = music && music.autoplay !== false;
    if (autoplay && audio) {
      audio.play().then(emit).catch(function () {
        emit();
        const kick = function () {
          if (audio && audio.paused) audio.play().then(emit).catch(function () {});
          document.removeEventListener('click', kick, true);
          document.removeEventListener('keydown', kick, true);
          document.removeEventListener('scroll', kick, true);
          document.removeEventListener('touchstart', kick, true);
        };
        document.addEventListener('click', kick, true);
        document.addEventListener('keydown', kick, true);
        document.addEventListener('scroll', kick, true);
        document.addEventListener('touchstart', kick, true);
      });
    }
  }

  function init() {
    const music = (window.__D && window.__D.music) || window.__pfMusic || null;
    createQueue(music);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
