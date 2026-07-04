/**
 * Damacana Tasarruf Hesaplayıcı — Embed Script
 * 
 * Firmalar bu script'i sitelerine ekleyerek widget'ı gösterir.
 * 
 * Kullanım:
 * ```html
 * <script src="https://suaritmaservisyazilimi.com.tr/widget/damacana.js"
 *   data-tenant="firma_abc123"
 *   data-primary="#1e40af"
 *   data-bg="#ffffff">
 * </script>
 * ```
 *
 * data-* parametreleri:
 *   data-tenant      — Firma ID (zorunlu)
 *   data-primary     — Ana renk (opsiyonel, otomatik algılanır)
 *   data-bg          — Arka plan rengi (opsiyonel)
 *   data-text        — Yazı rengi (opsiyonel)
 */

(function () {
  // Script tag'ini bul
  const script = document.currentScript as HTMLScriptElement | null;
  if (!script) return;

  const tenant = script.getAttribute('data-tenant');
  if (!tenant) {
    console.warn('[DamacanaWidget] Firma ID zorunludur');
    return;
  }

  // Widget URL'sini oluştur
  const baseUrl = script.src.replace(/\/widget\/damacana\.js.*$/, '');
  const widgetUrl = new URL(`${baseUrl}/widget/damacana`);
  widgetUrl.searchParams.set('tenant', tenant);

  // Manuel renk override
  const primary = script.getAttribute('data-primary');
  const bg = script.getAttribute('data-bg');
  const text = script.getAttribute('data-text');
  if (primary) widgetUrl.searchParams.set('primary', primary);
  if (bg) widgetUrl.searchParams.set('bg', bg);
  if (text) widgetUrl.searchParams.set('text', text);

  // Host sayfadan renk algılama
  let hostStyles: Record<string, string> | null = null;
  if (!primary || !bg) {
    const bodyStyles = getComputedStyle(document.body);
    hostStyles = {
      primary: getCSSVar(bodyStyles, '--primary', bodyStyles.color || '#1e40af'),
      bg: getCSSVar(bodyStyles, '--bg', bodyStyles.backgroundColor || '#ffffff'),
      text: getCSSVar(bodyStyles, '--text', bodyStyles.color || '#1e293b'),
      font: bodyStyles.fontFamily || '',
    };
  }

  // Iframe oluştur
  const iframe = document.createElement('iframe');
  iframe.src = widgetUrl.toString();
  iframe.style.border = 'none';
  iframe.style.width = '100%';
  iframe.style.maxWidth = '420px';
  iframe.style.display = 'block';
  iframe.style.margin = '0 auto';
  iframe.style.overflow = 'hidden';
  iframe.scrolling = 'no';
  iframe.title = 'Damacana Tasarruf Hesaplayıcı';

  // Container
  const wrapper = document.createElement('div');
  wrapper.style.maxWidth = '420px';
  wrapper.style.margin = '16px auto';
  wrapper.appendChild(iframe);

  // Script'in olduğu yere ekle
  script.parentNode?.insertBefore(wrapper, script);

  // Iframe yüklendiğinde host renklerini gönder
  iframe.addEventListener('load', () => {
    if (hostStyles && iframe.contentWindow) {
      iframe.contentWindow.postMessage({
        type: 'host-styles',
        styles: hostStyles,
      }, '*');
    }
  });

  // Widget'tan gelen yükseklik mesajlarını dinle
  window.addEventListener('message', (e) => {
    if (e.data?.type === 'widget-resize' && e.data?.height) {
      iframe.style.height = `${e.data.height}px`;
    }
  });
})();

/** CSS değişkenini oku, yoksa fallback kullan */
function getCSSVar(styles: CSSStyleDeclaration, varName: string, fallback: string): string {
  const val = styles.getPropertyValue(varName);
  if (val && val.trim()) return val.trim();
  // rgba(0,0,0,0) gibi transparan değerleri fallback'e düşür
  if (val && (val.includes('rgba(0, 0, 0, 0)') || val === 'transparent')) return fallback;
  return val || fallback;
}
