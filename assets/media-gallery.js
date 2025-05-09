if (!customElements.get('media-gallery')) {
  customElements.define(
    'media-gallery',
    class MediaGallery extends HTMLElement {
      constructor() {
        super();

        // Только для мобилки
        if (window.matchMedia('(max-width: 749px)').matches) {
          const slider = this.querySelector('.custom-mobile-slider');
          if (!slider) return;

          let startX = 0;
          let isDragging = false;

          slider.addEventListener('touchstart', (e) => {
            startX = e.touches[0].clientX;
            isDragging = true;
          });

          slider.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            const currentX = e.touches[0].clientX;
            const deltaX = startX - currentX;

            if (Math.abs(deltaX) > 50) {
              isDragging = false;
              if (deltaX > 0) {
                // Свайп влево
                slider.scrollBy({ left: slider.offsetWidth, behavior: 'smooth' });
              } else {
                // Свайп вправо
                slider.scrollBy({ left: -slider.offsetWidth, behavior: 'smooth' });
              }
            }
          });

          slider.addEventListener('touchend', () => {
            isDragging = false;
          });
        }
      }
    }
  );
}
