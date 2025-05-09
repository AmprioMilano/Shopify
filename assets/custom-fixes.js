document.addEventListener('DOMContentLoaded', () => {
  console.log('card ok?');

  const moduleStatus = (name, ok = true) => {
    console.log(`${name} MODULE — ${ok ? 'OK' : 'FAIL'}`);
  };

  // FIX: Clickable product card
  (function initCardClickFix() {
    const grid = document.querySelector('#product-grid');  // Находим контейнер с карточками
    if (!grid) return moduleStatus('CardClick', false);

    grid.addEventListener('click', (e) => {
      // Ищем ближайшую карточку
      const card = e.target.closest('.card-wrapper');
      const isLink = e.target.closest('a'); // Проверяем, не был ли клик по ссылке внутри карточки

      if (!card || isLink) return;  // Если клик не по карточке или по ссылке — ничего не делаем

      // Находим ссылку внутри карточки
      const link = card.querySelector('a');
      if (link && link.href) {
        window.location.href = link.href;  // Редирект на ссылку карточки
      }
    });

    moduleStatus('CardClick');
  })();
});
