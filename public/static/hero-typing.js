(function () {
  const words = window.__HERO_TYPING_WORDS__ || ['websites', 'AI automations', 'backend solutions'];
  const el = document.getElementById('hero-typed');
  if (!el) return;

  let wordIdx = 0, charIdx = 0, deleting = false;

  function type() {
    const word = words[wordIdx % words.length];
    if (!deleting) {
      charIdx++;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === word.length) {
        deleting = true;
        setTimeout(type, 1800);
        return;
      }
    } else {
      charIdx--;
      el.textContent = word.slice(0, charIdx);
      if (charIdx === 0) {
        deleting = false;
        wordIdx++;
      }
    }
    setTimeout(type, deleting ? 60 : 90);
  }
  type();
})();
