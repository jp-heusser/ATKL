/* Panel: un solo script para todas sus páginas (sin librerías).
   Las páginas vienen ya llenas desde el servidor; aquí solo se envían los cambios a la API.

   - <form data-api="/api/…" data-method="PUT" data-then="reload|redirect:/ruta/{id}|show">
       Envía los campos con name como JSON. Checkbox → true/false, data-num → número,
       datetime-local → fecha ISO, editores de enlaces → lista de enlaces.
   - Editor de enlaces (.links-editor): agregar, quitar, subir/bajar, ícono y "mostrar incrustado".
   - Campo de imagen ([data-image-field]): se procesa en el navegador y se sube al elegirla.
   - [data-toggle="#id"]: muestra u oculta un bloque (p. ej. motivo de rechazo).
   - [data-proof]: muestra el comprobante de un pedido.
   - [data-logout]: cierra la sesión. */
import { resolveLink } from '../lib/platforms.js';
import { getEmbed } from '../lib/embeds.js';
import { compressImage, toSquareJpeg } from '../lib/format.js';

async function api(url, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : {},
      body: body ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new Error('No se pudo conectar con el servidor');
  }
  const data = await res.json().catch(() => ({}));
  if (res.status === 401) {
    location.href = `/acceso?next=${encodeURIComponent(location.pathname)}`;
    throw new Error('Sesión vencida');
  }
  if (!res.ok) throw new Error(data.error || `Error ${res.status}`);
  return data;
}

const status = (el, msg, ok = true) => {
  if (!el) return;
  el.textContent = msg;
  el.className = `msg ${ok ? 'msg-ok' : 'msg-error'}`;
  el.hidden = false;
};

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

/* ======================= Editor de enlaces ======================= */
const iconHtml = (icon, badge) =>
  icon
    ? `<svg class="pf-icon" width="18" height="18" viewBox="0 0 24 24" aria-hidden="true">${
        icon.stroke
          ? `<path d="${icon.path}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/>`
          : `<path d="${icon.path}" fill="currentColor"/>`
      }</svg>`
    : `<span class="pf-badge" aria-hidden="true">${esc(badge || '·')}</span>`;

function refreshRow(row) {
  const url = row.querySelector('[data-f="url"]').value.trim();
  const icon = row.querySelector('[data-f="icon"]').value;
  const valid = /^(https:\/\/|mailto:)/.test(url);
  const info = valid ? resolveLink({ url, icon }) : null;
  row.querySelector('[data-icon]').innerHTML = info ? iconHtml(info.icon, info.badge) : '·';
  const wrap = row.querySelector('[data-embed-wrap]');
  if (wrap) {
    const e = valid ? getEmbed(url) : null;
    wrap.hidden = !e;
    if (e) wrap.querySelector('[data-embed-text]').textContent = `Mostrar incrustado (reproductor de ${e.name})`;
  }
}

const collectLinks = (editor) =>
  [...editor.querySelectorAll('[data-rows] > .le-row')].map((row) => ({
    url: row.querySelector('[data-f="url"]').value.trim(),
    label: row.querySelector('[data-f="label"]').value.trim(),
    icon: row.querySelector('[data-f="icon"]').value,
    embed: !!row.querySelector('[data-f="embed"]')?.checked && !row.querySelector('[data-embed-wrap]')?.hidden,
  }));

document.addEventListener('input', (e) => {
  const row = e.target.closest('.le-row');
  if (row) refreshRow(row);
});
document.addEventListener('change', (e) => {
  const row = e.target.closest('.le-row');
  if (row) refreshRow(row);
});

/* ======================= Clics delegados ======================= */
document.addEventListener('click', async (e) => {
  const t = e.target.closest('button, a');
  if (!t) return;

  if (t.matches('[data-add-link]')) {
    const ed = t.closest('.links-editor');
    const row = ed.querySelector('template').content.firstElementChild.cloneNode(true);
    ed.querySelector('[data-rows]').appendChild(row);
    row.querySelector('[data-f="url"]').focus();
    return;
  }
  if (t.matches('[data-move]')) {
    const row = t.closest('.le-row');
    const sib = Number(t.dataset.move) < 0 ? row.previousElementSibling : row.nextElementSibling;
    if (sib) Number(t.dataset.move) < 0 ? sib.before(row) : sib.after(row);
    t.focus();
    return;
  }
  if (t.matches('[data-remove]')) {
    t.closest('.le-row').remove();
    return;
  }
  if (t.matches('[data-toggle]')) {
    const box = document.querySelector(t.dataset.toggle);
    if (box) {
      box.hidden = !box.hidden;
      box.querySelector('input, textarea')?.focus();
    }
    return;
  }
  if (t.matches('[data-proof]')) {
    const box = t.nextElementSibling;
    if (box.hidden) {
      if (!box.querySelector('img')) box.innerHTML = `<a href="${t.dataset.proof}" target="_blank" rel="noopener noreferrer" class="proof-img" title="Abrir en grande"><img src="${t.dataset.proof}" alt="Comprobante"></a>`;
      box.hidden = false;
      t.textContent = 'Ocultar comprobante';
    } else {
      box.hidden = true;
      t.textContent = 'Ver comprobante';
    }
    return;
  }
  if (t.matches('[data-action-url]')) {
    // Acción directa (p. ej. aprobar pago)
    const st = t.closest('[data-card]')?.querySelector('[data-status]');
    t.disabled = true;
    try {
      await api(t.dataset.actionUrl, { method: 'POST', body: {} });
      status(st, t.dataset.ok || 'Listo ✓');
      setTimeout(() => location.reload(), 600);
    } catch (err) {
      status(st, err.message, false);
      t.disabled = false;
    }
    return;
  }
  if (t.matches('[data-logout]')) {
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    location.href = '/acceso';
  }
});

/* ======================= Formularios ======================= */
function formBody(form) {
  const body = {};
  for (const el of form.elements) {
    if (!el.name || el.closest('.links-editor') || el.type === 'file') continue;
    if (el.type === 'checkbox') body[el.name] = el.checked;
    else if (el.type === 'datetime-local') body[el.name] = el.value ? new Date(el.value).toISOString() : '';
    else if (el.dataset.num !== undefined) body[el.name] = el.value === '' ? undefined : Number(el.value);
    else body[el.name] = el.value;
  }
  form.querySelectorAll('.links-editor').forEach((ed) => (body[ed.dataset.links] = collectLinks(ed)));
  return body;
}

document.addEventListener('submit', async (e) => {
  const form = e.target.closest('form[data-api]');
  if (!form) return;
  e.preventDefault();
  if (!form.reportValidity()) return;
  const st = form.querySelector('[data-status]');
  const btn = form.querySelector('button[type="submit"], button:not([type])');
  if (btn) btn.disabled = true;
  if (st) st.hidden = true;
  try {
    const r = await api(form.dataset.api, { method: form.dataset.method || 'POST', body: formBody(form) });
    // Imagen elegida antes de crear (evento nuevo): se sube ahora que existe.
    const pending = form.querySelector('[data-image-field]')?._pending;
    if (pending && r.id && form.dataset.imageUrl) await api(form.dataset.imageUrl.replace('{id}', r.id), { method: 'PUT', body: { image: pending } });

    const then = form.dataset.then || 'show';
    if (then === 'reload') return location.reload();
    if (then.startsWith('redirect:')) return (location.href = then.slice(9).replace('{id}', r.id || r.slug || ''));
    if (then === 'account') {
      const out = form.querySelector('[data-result]');
      out.innerHTML = `Entrégale estos datos (la contraseña no se vuelve a mostrar):<br><strong>${esc(r.email)}</strong> · <code>${esc(r.tempPassword)}</code>`;
      out.hidden = false;
      form.reset();
      if (btn) btn.disabled = false;
      return;
    }
    status(st, form.dataset.ok || 'Guardado ✓');
    if (form.dataset.reset !== undefined) form.reset();
  } catch (err) {
    status(st, err.message, false);
  }
  if (btn) btn.disabled = false;
});

/* ======================= Imágenes ======================= */
const mediaHtml = (src) =>
  `<div class="ev-media ev-media-card"><img class="ev-media-bg" src="${src}" alt="" aria-hidden="true"><img class="ev-media-fg" src="${src}" alt="Imagen del evento"></div>`;

function showImage(field, src) {
  const prev = field.querySelector('[data-preview]');
  if (field.dataset.kind === 'photo') {
    prev.innerHTML = src ? `<img class="avatar" style="width:72px;height:72px" src="${src}" alt="">` : prev.dataset.empty || prev.innerHTML;
    const pick = field.querySelector('[data-pick-text]');
    if (pick) pick.textContent = src ? 'Cambiar foto' : 'Subir foto';
  } else {
    prev.innerHTML = src ? mediaHtml(src) : '<span>Elegir imagen</span>';
    const fg = prev.querySelector('.ev-media-fg');
    fg?.addEventListener('load', () => fg.closest('.ev-media').classList.toggle('is-portrait', fg.naturalHeight > fg.naturalWidth * 1.05));
  }
  field.querySelector('[data-remove-image]').hidden = !src;
}

document.querySelectorAll('[data-image-field]').forEach((field) => {
  const prev = field.querySelector('[data-preview]');
  if (prev) prev.dataset.empty = prev.innerHTML;
  const st = field.querySelector('[data-image-status]');
  const input = field.querySelector('input[type="file"]');

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;
    st.hidden = true;
    try {
      const image = field.dataset.kind === 'photo' ? await toSquareJpeg(file) : await compressImage(file, 2000, 0.86);
      if (!field.dataset.upload) {
        field._pending = image; // se sube al crear
        showImage(field, image);
        return;
      }
      status(st, 'Subiendo…');
      const r = await api(field.dataset.upload, { method: 'PUT', body: { image } });
      showImage(field, r.photo || r.image);
      status(st, 'Imagen guardada ✓');
    } catch (err) {
      status(st, err.message, false);
    }
  });

  field.querySelector('[data-remove-image]').addEventListener('click', async () => {
    try {
      if (field.dataset.upload) await api(field.dataset.upload, { method: 'DELETE' });
      field._pending = null;
      if (field.dataset.kind === 'photo') prev.innerHTML = prev.dataset.empty;
      showImage(field, '');
      if (field.dataset.kind === 'photo') {
        prev.innerHTML = prev.dataset.empty;
        prev.querySelector('img.avatar')?.remove();
        prev.querySelector('.avatar-initials')?.removeAttribute('hidden');
      }
      status(st, 'Imagen quitada ✓');
    } catch (err) {
      status(st, err.message, false);
    }
  });
});
