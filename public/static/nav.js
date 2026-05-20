(function () {
  // Scroll-based nav background
  const nav = document.getElementById('site-nav');
  if (nav) {
    const onScroll = () => {
      if (window.pageYOffset > 50) nav.classList.add('scrolled');
      else nav.classList.remove('scrolled');
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
  }

  // Mobile menu toggle
  const hamburger = document.getElementById('site-nav-hamburger');
  const menu = document.getElementById('site-mobile-menu');
  if (hamburger && menu) {
    const close = () => document.body.classList.remove('mm-open');
    hamburger.addEventListener('click', (e) => {
      e.stopPropagation();
      document.body.classList.toggle('mm-open');
    });
    // Click on any link inside the menu closes it
    menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', close));
    // Escape key closes it
    document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  }

  // Backward compat for any pages still rendering the old nav
  const oldOpen = document.getElementById('nav-mobile-open');
  const oldMenu = document.getElementById('nav-mobile-menu');
  const oldClose = document.getElementById('nav-mobile-close');
  if (oldOpen && oldMenu) {
    oldOpen.addEventListener('click', () => oldMenu.classList.add('open'));
    oldClose && oldClose.addEventListener('click', () => oldMenu.classList.remove('open'));
    oldMenu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => oldMenu.classList.remove('open')));
  }
})();
