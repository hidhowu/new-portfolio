(function () {
  const openBtn = document.getElementById('nav-mobile-open');
  const closeBtn = document.getElementById('nav-mobile-close');
  const menu = document.getElementById('nav-mobile-menu');
  if (!openBtn || !menu) return;
  openBtn.addEventListener('click', () => menu.classList.add('open'));
  closeBtn && closeBtn.addEventListener('click', () => menu.classList.remove('open'));
  menu.querySelectorAll('a').forEach((a) => a.addEventListener('click', () => menu.classList.remove('open')));
})();
