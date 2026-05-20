(function () {
  const pills = document.querySelectorAll('.filter-pill');
  const cards = document.querySelectorAll('.blog-card[data-category]');
  if (!pills.length) return;

  pills.forEach((pill) => {
    pill.addEventListener('click', () => {
      pills.forEach((p) => p.classList.remove('active'));
      pill.classList.add('active');
      const cat = pill.dataset.category;
      cards.forEach((card) => {
        const matches = cat === 'all' || card.dataset.category === cat;
        card.style.display = matches ? '' : 'none';
      });
    });
  });
})();
