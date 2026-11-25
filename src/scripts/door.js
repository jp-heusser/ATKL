/* Escáner de la puerta. Lector nativo (BarcodeDetector) si existe; si no (iPhone), jsQR.
   - Mientras se ve un resultado no se escanea. Verde: se cierra solo en 2 s; rojo/naranjo: hasta tocarlo.
   - El mismo QR que sigue frente a la cámara se ignora por 15 s (no se marca como "ya usada"). */
import { shortDateTime } from '../lib/format.js';

const RESULT = {
  ok: { title: 'VÁLIDA', cls: 'door-ok' },
  used: { title: 'YA USADA', cls: 'door-bad' },
  invalid: { title: 'NO VÁLIDA', cls: 'door-bad' },
  void: { title: 'ANULADA', cls: 'door-bad' },
  other_event: { title: 'OTRO EVENTO', cls: 'door-warn' },
};

async function api(url, opts = {}) {
  const res = await fetch(url, { ...opts, headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) } });
  if (res.status === 401) location.href = '/acceso?next=/puerta';
  const d = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(d.error || `Error ${res.status}`);
  return d;
}

async function makeDecoder() {
  if ('BarcodeDetector' in window) {
    try {
      const formats = await window.BarcodeDetector.getSupportedFormats?.();
      if (!formats || formats.includes('qr_code')) {
        const det = new window.BarcodeDetector({ formats: ['qr_code'] });
        return async (video) => (await det.detect(video))[0]?.rawValue || null;
      }
    } catch {}
  }
  const { default: jsQR } = await import('jsqr');
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  return async (video) => {
    const w = video.videoWidth;
    const h = video.videoHeight;
    if (!w || !h) return null;
    const scale = Math.min(1, 640 / Math.max(w, h));
    canvas.width = Math.round(w * scale);
    canvas.height = Math.round(h * scale);
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
    return jsQR(img.data, img.width, img.height, { inversionAttempts: 'dontInvert' })?.data || null;
  };
}

export function initDoor() {
  const $ = (id) => document.getElementById(id);
  const eventSel = $('event');
  const video = document.querySelector('#cam video');
  const frame = document.querySelector('#cam .door-frame');
  const startBtn = $('start');
  const stopBtn = $('stop');
  const camErr = $('cam-error');
  const box = $('result');
  let stream = null;
  let busy = false;
  let showing = false;
  let autoClose = null;
  let last = { code: '', at: 0 };

  const loadCount = async () => {
    try {
      const list = await api('/api/door/events');
      const ev = list.find((x) => x.id === eventSel.value);
      const c = $('count');
      c.hidden = !ev;
      if (ev) {
        c.querySelector('strong').textContent = ev.used;
        c.querySelector('span').textContent = ev.total;
      }
    } catch {}
  };
  eventSel.addEventListener('change', loadCount);
  loadCount();

  const close = () => {
    clearTimeout(autoClose);
    showing = false;
    last = { ...last, at: Date.now() };
    box.hidden = true;
  };
  box.addEventListener('click', close);

  const show = (r) => {
    const def = RESULT[r.result] || RESULT.invalid;
    showing = true;
    box.className = `door-result ${def.cls}`;
    box.querySelector('strong').textContent = def.title;
    const t = r.ticket || {};
    box.querySelector('[data-r="holder"]').textContent = t.holder || r.error || '';
    box.querySelector('[data-r="type"]').textContent = t.typeName ? `${t.typeName}${t.doc ? ` · ${t.doc}` : ''}` : '';
    box.querySelector('[data-r="extra"]').textContent =
      r.result === 'used' && t.usedAt ? `Ingresó ${shortDateTime(t.usedAt)}` : r.result === 'other_event' ? `Es para: ${t.event}` : '';
    box.querySelector('small').textContent = r.result === 'ok' ? 'Siguiente…' : 'Toca para continuar';
    box.hidden = false;
    clearTimeout(autoClose);
    if (r.result === 'ok') autoClose = setTimeout(close, 2000);
    navigator.vibrate?.(r.result === 'ok' ? 120 : [80, 60, 80, 60, 200]);
  };

  const checkin = async (code) => {
    busy = true;
    try {
      show(await api('/api/door/checkin', { method: 'POST', body: JSON.stringify({ code, event: eventSel.value }) }));
      loadCount();
    } catch (e) {
      show({ result: 'invalid', error: e.message });
    } finally {
      setTimeout(() => (busy = false), 300);
    }
  };

  const stop = () => {
    stream?.getTracks().forEach((t) => t.stop());
    stream = null;
    video.parentElement.classList.remove('on');
    frame.hidden = true;
    startBtn.hidden = false;
    stopBtn.hidden = true;
  };

  startBtn.addEventListener('click', async () => {
    camErr.hidden = true;
    close();
    try {
      stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.srcObject = stream;
      await video.play();
      video.parentElement.classList.add('on');
      frame.hidden = false;
      startBtn.hidden = true;
      stopBtn.hidden = false;
      const decode = await makeDecoder();
      const tick = async () => {
        if (!stream) return;
        if (!busy && !showing && !document.hidden) {
          const text = await decode(video).catch(() => null);
          const code = (String(text || '').toLowerCase().match(/[a-f0-9]{32}/) || [])[0];
          const now = Date.now();
          if (code && !(code === last.code && now - last.at < 15000)) {
            last = { code, at: now };
            await checkin(code);
          }
        }
        setTimeout(tick, 180);
      };
      tick();
    } catch (e) {
      stop();
      camErr.textContent =
        e?.name === 'NotAllowedError'
          ? 'Sin permiso para usar la cámara. Actívalo en la configuración del navegador.'
          : 'No se pudo abrir la cámara (requiere HTTPS). Usa la búsqueda manual.';
      camErr.hidden = false;
    }
  });
  stopBtn.addEventListener('click', stop);

  // Búsqueda manual
  const found = $('found');
  $('manual').addEventListener('submit', async (e) => {
    e.preventDefault();
    const q = e.target.q.value.trim();
    if (/^[a-f0-9]{32}$/i.test(q)) return checkin(q.toLowerCase());
    const list = await api(`/api/door/lookup?q=${encodeURIComponent(q)}`).catch(() => []);
    found.innerHTML = list.length ? '' : '<p class="form-hint">Sin resultados (solo pedidos aprobados).</p>';
    for (const t of list) {
      const row = document.createElement('div');
      row.className = 'door-found';
      row.innerHTML = '<span><strong></strong><small></small></span>';
      row.querySelector('strong').textContent = t.holder;
      row.querySelector('small').textContent = `${t.typeName} · ${t.event}`;
      if (t.status === 'valid') {
        const b = document.createElement('button');
        b.type = 'button';
        b.className = 'btn-ghost';
        b.textContent = 'Validar';
        b.addEventListener('click', async () => {
          await checkin(t.code);
          found.innerHTML = '';
          e.target.q.value = '';
        });
        row.appendChild(b);
      } else {
        const s = document.createElement('span');
        s.className = 'status-badge st-bad';
        s.textContent = t.status === 'used' ? 'Usada' : 'Anulada';
        row.appendChild(s);
      }
      found.appendChild(row);
    }
  });

  $('logout').addEventListener('click', async () => {
    stop();
    await fetch('/api/auth/logout', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: '{}' }).catch(() => {});
    location.href = '/acceso';
  });
}
