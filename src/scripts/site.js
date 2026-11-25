/* Comportamientos comunes de todas las páginas (sin librerías). */
import { startLightning } from './lightning.js';

startLightning();

/* ---------- Tema claro / oscuro (siempre abre en oscuro) ---------- */
const META = { light: '#f4f4f1', dark: '#000000' };
const applyTheme = (t) => {
  document.documentElement.dataset.theme = t;
  document.querySelector('meta[name="theme-color"]')?.setAttribute('content', META[t]);
  const b = document.getElementById('theme-toggle');
  if (b) {
    b.setAttribute('aria-label', t === 'light' ? 'Cambiar a modo oscuro' : 'Cambiar a modo claro');
    b.querySelector('.ic-sun').hidden = t === 'light';
    b.querySelector('.ic-moon').hidden = t !== 'light';
  }
};
applyTheme(document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const t = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
  try {
    localStorage.setItem('atkl_theme', t);
  } catch {}
  applyTheme(t);
});

/* ---------- Botones "copiar" ---------- */
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-copy]');
  if (!b) return;
  const value = b.dataset.copy === 'url' ? location.origin + location.pathname : b.dataset.copy;
  const original = b.dataset.label || b.textContent;
  b.dataset.label = original;
  try {
    await navigator.clipboard.writeText(value);
    b.textContent = b.dataset.done || 'Copiado ✓';
  } catch {
    window.prompt?.('Copia este texto:', value);
  }
  setTimeout(() => (b.textContent = original), 1800);
});

/* ---------- Brillo que sigue al cursor en los botones ---------- */
document.addEventListener('pointermove', (e) => {
  const a = e.target.closest?.('.link-btn');
  if (!a) return;
  const r = a.getBoundingClientRect();
  a.style.setProperty('--mx', `${e.clientX - r.left}px`);
  a.style.setProperty('--my', `${e.clientY - r.top}px`);
}, { passive: true });

/* ---------- Imágenes de evento: marco más alto si la imagen es vertical ---------- */
const markPortrait = (img) => {
  if (img.naturalWidth) img.closest('.ev-media')?.classList.toggle('is-portrait', img.naturalHeight > img.naturalWidth * 1.05);
};
document.querySelectorAll('.ev-media-fg').forEach((img) => (img.complete ? markPortrait(img) : img.addEventListener('load', () => markPortrait(img))));

/* ---------- Avatares: si la foto no carga, iniciales ---------- */
document.querySelectorAll('img.avatar[data-fallback]').forEach((img) => {
  const fail = () => {
    img.hidden = true;
    img.nextElementSibling?.removeAttribute('hidden');
  };
  if (img.complete && !img.naturalWidth) fail();
  else img.addEventListener('error', fail);
});

/* ---------- Ampliar imagen (data-lightbox="url") ---------- */
document.addEventListener('click', (e) => {
  const t = e.target.closest('[data-lightbox]');
  if (!t) return;
  const box = document.createElement('div');
  box.className = 'lightbox';
  box.setAttribute('role', 'dialog');
  box.setAttribute('aria-modal', 'true');
  box.innerHTML = '<img alt=""><button type="button" class="lightbox-close" aria-label="Cerrar">✕</button>';
  box.querySelector('img').src = t.dataset.lightbox;
  box.querySelector('img').alt = t.dataset.alt || '';
  const prev = document.body.style.overflow;
  const close = () => {
    box.remove();
    document.body.style.overflow = prev;
    document.removeEventListener('keydown', onKey);
    t.focus();
  };
  const onKey = (k) => k.key === 'Escape' && close();
  box.addEventListener('click', (ev) => ev.target.tagName !== 'IMG' && close());
  document.addEventListener('keydown', onKey);
  document.body.style.overflow = 'hidden';
  document.body.appendChild(box);
  box.querySelector('button').focus();
});

/* ---------- Instagram: carga el embed solo al acercarse a la pantalla ---------- */
const igBoxes = document.querySelectorAll('[data-ig]');
if (igBoxes.length) {
  let script;
  const load = () =>
    (script ??= new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = 'https://www.instagram.com/embed.js';
      s.async = true;
      s.onload = resolve;
      s.onerror = reject;
      document.body.appendChild(s);
    }));
  const io = new IntersectionObserver(
    (entries) =>
      entries.forEach((en) => {
        if (!en.isIntersecting) return;
        io.unobserve(en.target);
        load().then(() => window.instgrm?.Embeds?.process()).catch(() => {});
      }),
    { rootMargin: '400px' },
  );
  igBoxes.forEach((b) => io.observe(b));
}
