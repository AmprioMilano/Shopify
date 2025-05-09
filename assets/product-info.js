// Переписанный product-info.js с проверкой пустого блока и фиксом Add to Cart

if (!customElements.get('product-info')) {
  customElements.define(
    'product-info',
    class ProductInfo extends HTMLElement {
      quantityInput = undefined;
      quantityForm = undefined;
      onVariantChangeUnsubscriber = undefined;
      cartUpdateUnsubscriber = undefined;
      abortController = undefined;
      pendingRequestUrl = null;
      preProcessHtmlCallbacks = [];
      postProcessHtmlCallbacks = [];

      constructor() {
        super();
        this.quantityInput = this.querySelector('.quantity__input');
      }

      connectedCallback() {
        this.sectionId = this.dataset.originalSection || this.dataset.section;

        // ✅ Добавлено: Проверка пустого блока
        setTimeout(() => {
          if (this.offsetHeight < 50 || this.innerText.trim().length < 10) {
            this.style.display = 'block';
            this.style.minHeight = '150px';
            this.style.background = '#ffebe8';
            this.innerHTML = `
              <div style="color: #d00; padding: 1em; font-weight: bold;">
                ⚠️ product-info пустой или не загрузился. Проверь Liquid/JS.
              </div>
            `;
            console.warn(`⚠️ product-info пустой — section ${this.sectionId}`);
          } else {
            console.log(`✅ product-info section ${this.sectionId} отрисовался нормально`);
          }
        }, 500);

        this.initializeProductSwapUtility();
        this.onVariantChangeUnsubscriber = subscribe(
          PUB_SUB_EVENTS.optionValueSelectionChange,
          this.handleOptionValueChange.bind(this)
        );
        this.initQuantityHandlers();
        this.dispatchEvent(new CustomEvent('product-info:loaded', { bubbles: true }));
      }

      disconnectedCallback() {
        this.onVariantChangeUnsubscriber();
        this.cartUpdateUnsubscriber?.();
      }

      initializeProductSwapUtility() {
        this.preProcessHtmlCallbacks.push((html) =>
          html.querySelectorAll('.scroll-trigger').forEach((el) => el.classList.add('scroll-trigger--cancel'))
        );
        this.postProcessHtmlCallbacks.push(() => {
          window?.Shopify?.PaymentButton?.init();
          window?.ProductModel?.loadShopifyXR();
        });
      }

      handleOptionValueChange({ data: { event, target, selectedOptionValues } }) {
        if (!this.contains(event.target)) return;
        this.resetProductFormState();

        const productUrl = target.dataset.productUrl || this.pendingRequestUrl || this.dataset.url;
        this.pendingRequestUrl = productUrl;
        const shouldSwapProduct = this.dataset.url !== productUrl;
        const shouldFetchFullPage = this.dataset.updateUrl === 'true' && shouldSwapProduct;

        this.renderProductInfo({
          requestUrl: this.buildRequestUrlWithParams(productUrl, selectedOptionValues, shouldFetchFullPage),
          targetId: target.id,
          callback: shouldSwapProduct
            ? this.handleSwapProduct(productUrl, shouldFetchFullPage)
            : this.handleUpdateProductInfo(productUrl),
        });
      }

      resetProductFormState() {
        this.productForm?.toggleSubmitButton(true);
        this.productForm?.handleErrorMessage();
      }

      handleSwapProduct(productUrl, fullPage) {
        return (html) => {
          const selector = fullPage ? "product-info[id^='MainProduct']" : 'product-info';
          const variant = this.getSelectedVariant(html.querySelector(selector));
          this.updateURL(productUrl, variant?.id);

          const source = fullPage ? document.querySelector('main') : this;
          const destination = html.querySelector(fullPage ? 'main' : 'product-info');

          HTMLUpdateUtility.viewTransition(
            source,
            destination,
            this.preProcessHtmlCallbacks,
            this.postProcessHtmlCallbacks
          );
        };
      }

      handleUpdateProductInfo(productUrl) {
        return (html) => {
          const variant = this.getSelectedVariant(html);
          this.updateURL(productUrl, variant?.id);
          this.updateVariantInputs(variant?.id);

          ['price', 'Sku', 'Inventory', 'Volume', 'Price-Per-Item'].forEach((id) => {
            const src = html.getElementById(`${id}-${this.sectionId}`);
            const dst = this.querySelector(`#${id}-${this.sectionId}`);
            if (src && dst) dst.innerHTML = src.innerHTML;
          });

          new ProductPriceUpdater(this.sectionId).update(html);
        };
      }

      renderProductInfo({ requestUrl, targetId, callback }) {
        this.abortController?.abort();
        this.abortController = new AbortController();

        fetch(requestUrl, { signal: this.abortController.signal })
          .then((res) => res.text())
          .then((text) => new DOMParser().parseFromString(text, 'text/html'))
          .then((html) => {
            this.pendingRequestUrl = null;
            callback(html);
            document.getElementById(targetId)?.focus();
          })
          .catch((err) => err.name !== 'AbortError' && console.error(err));
      }

      getSelectedVariant(node) {
        const json = node.querySelector('variant-selects [data-selected-variant]')?.innerHTML;
        return json ? JSON.parse(json) : null;
      }

      buildRequestUrlWithParams(url, values, full = false) {
        const params = full ? [] : [`section_id=${this.sectionId}`];
        if (values.length) params.push(`option_values=${values.join(',')}`);
        return `${url}?${params.join('&')}`;
      }

      updateVariantInputs(variantId) {
        this.querySelectorAll('form input[name="id"]').forEach((input) => {
          input.value = variantId || '';
          input.dispatchEvent(new Event('change', { bubbles: true }));
        });
      }

      updateURL(url, variantId) {
        if (this.dataset.updateUrl !== 'false') {
          const newUrl = `${url}${variantId ? `?variant=${variantId}` : ''}`;
          history.replaceState({}, '', newUrl);
        }
      }

      get productForm() {
        return this.querySelector('product-form');
      }
    }
  );
}

class ProductPriceUpdater {
  constructor(sectionId) {
    this.sectionId = sectionId;
  }

  update(html) {
    const newBtn = html.getElementById(`ProductSubmitButton-${this.sectionId}`);
    const currentBtn = document.getElementById(`ProductSubmitButton-${this.sectionId}`);
    if (!newBtn || !currentBtn) return;

    currentBtn.innerHTML = newBtn.innerHTML;
    currentBtn.disabled = newBtn.hasAttribute('disabled');

    const newPrice = newBtn.getAttribute('data-pr');
    if (newPrice !== null) {
      currentBtn.setAttribute('data-pr', newPrice);
    }
  }
}
