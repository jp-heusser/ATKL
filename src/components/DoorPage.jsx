/* Puerta: escanear QR con la cámara del celular y validar entradas.
   Usa el lector nativo (BarcodeDetector) si existe; si no (iPhone), la librería jsQR. */
import { useCallback, useEffect, useRef, useState } from 'react';
import { api, setToken } from '../api.js';
import { link } from '../router.js';
import { shortDateTime } from '../format.js';

const RESULT = {
  ok: { title: 'VÁLIDA', cls: 'door-ok' },
  used: { title: 'YA USADA', cls: 'door-bad' },
  invalid: { title: 'NO VÁLIDA', cls: 'door-bad' },
  void: { title: 'ANULADA', cls: 'door-bad' },
  other_event: { title: 'OTRO EVENTO', cls: 'door-warn' },
};

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

export default function DoorPage({ user, onLogout }) {
  const [events, setEvents] = useState([]);
  const [eventId, setEventId] = useState('');
  const [scanning, setScanning] = useState(false);
  const [camError, setCamError] = useState('');
  const [result, setResult] = useState(null);
  const [manual, setManual] = useState('');
  const [found, setFound] = useState(null);
  const video = useRef(null);
  const stream = useRef(null);
  const busy = useRef(false);
  const lastCode = useRef({ code: '', at: 0 });
  const showing = useRef(false); // mientras se ve un resultado, no se escanea
  const autoClose = useRef(null);

  const loadEvents = useCallback(
    () =>
      api('/door/events')
        .then((list) => {
          setEvents(list);
          setEventId((id) => id || list[0]?.id || '');
        })
        .catch(() => {}),
    [],
  );
  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  // Verde: se cierra solo en 2 s. Rojo/naranjo: queda hasta que lo toquen, para que no pase inadvertido.
  const close = useCallback(() => {
    clearTimeout(autoClose.current);
    showing.current = false;
    lastCode.current = { ...lastCode.current, at: Date.now() }; // el mismo QR frente a la cámara no se relee enseguida
    setResult(null);
  }, []);
  const show = useCallback(
    (r) => {
      showing.current = true;
      setResult(r);
      clearTimeout(autoClose.current);
      if (r.result === 'ok') autoClose.current = setTimeout(close, 2000);
    },
    [close],
  );

  const checkin = useCallback(
    async (code) => {
      busy.current = true;
      try {
        const r = await api('/door/checkin', { method: 'POST', body: { code, event: eventId } });
        show(r);
        navigator.vibrate?.(r.result === 'ok' ? 120 : [80, 60, 80, 60, 200]);
        loadEvents();
      } catch (e) {
        show({ result: 'invalid', error: e.message });
      } finally {
        setTimeout(() => (busy.current = false), 300);
      }
    },
    [eventId, loadEvents, show],
  );

  const stop = () => {
    stream.current?.getTracks().forEach((t) => t.stop());
    stream.current = null;
    setScanning(false);
  };
  useEffect(() => () => {
    stop();
    clearTimeout(autoClose.current);
  }, []);

  const start = async () => {
    setCamError('');
    close();
    try {
      stream.current = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' }, audio: false });
      video.current.srcObject = stream.current;
      await video.current.play();
      setScanning(true);
      const decode = await makeDecoder();
      const tick = async () => {
        if (!stream.current) return;
        if (!busy.current && !showing.current && !document.hidden) {
          const text = await decode(video.current).catch(() => null);
          const code = (String(text || '').toLowerCase().match(/[a-f0-9]{32}/) || [])[0];
          const now = Date.now();
          // El mismo QR que sigue frente a la cámara se ignora por 15 s (no se marca como "ya usada").
          if (code && !(code === lastCode.current.code && now - lastCode.current.at < 15000)) {
            lastCode.current = { code, at: now };
            await checkin(code);
          }
        }
        setTimeout(tick, 180);
      };
      tick();
    } catch (e) {
      stop();
      setCamError(
        e?.name === 'NotAllowedError'
          ? 'Sin permiso para usar la cámara. Actívalo en la configuración del navegador.'
          : 'No se pudo abrir la cámara. Usa la búsqueda manual.',
      );
    }
  };

  const search = async (e) => {
    e.preventDefault();
    const q = manual.trim();
    if (/^[a-f0-9]{32}$/i.test(q)) return checkin(q.toLowerCase());
    setFound(await api(`/door/lookup?q=${encodeURIComponent(q)}`).catch(() => []));
  };

  const ev = events.find((x) => x.id === eventId);
  const r = result && RESULT[result.result];

  return (
    <main className="page door">
      <nav className="back panel-bar">
        <a href={link('')}>← ATKL Records</a>
        <button type="button" className="btn-link" onClick={() => { stop(); setToken(null); onLogout(); }}>Cerrar sesión</button>
      </nav>
      <h1 className="form-title">Puerta</h1>
      <p className="form-hint">{user.email}</p>

      <div className="card form">
        <label>
          Evento
          <select value={eventId} onChange={(e) => setEventId(e.target.value)}>
            {events.length === 0 && <option value="">No hay eventos próximos</option>}
            {events.map((x) => <option key={x.id} value={x.id}>{x.title} · {shortDateTime(x.startsAt)}</option>)}
          </select>
        </label>
        {ev && <p className="door-count"><strong>{ev.used}</strong> / {ev.total} ingresados</p>}
      </div>

      <div className={`door-cam${scanning ? ' on' : ''}`}>
        <video ref={video} playsInline muted />
        {scanning && <span className="door-frame" aria-hidden="true" />}
        {!scanning && (
          <button type="button" className="btn-primary" onClick={start} disabled={!eventId}>Escanear QR</button>
        )}
      </div>
      {scanning && <button type="button" className="btn-link center" onClick={stop}>Detener cámara</button>}
      {camError && <p className="msg msg-error">{camError}</p>}

      {r && (
        <div className={`door-result ${r.cls}`} role="status" aria-live="assertive" onClick={close}>
          <strong>{r.title}</strong>
          {result.ticket && (
            <>
              <span>{result.ticket.holder}</span>
              <span>{result.ticket.typeName}{result.ticket.doc ? ` · ${result.ticket.doc}` : ''}</span>
              {result.result === 'used' && result.ticket.usedAt && <span>Ingresó {shortDateTime(result.ticket.usedAt)}</span>}
              {result.result === 'other_event' && <span>Es para: {result.ticket.event}</span>}
            </>
          )}
          {result.error && <span>{result.error}</span>}
          <small>{result.result === 'ok' ? 'Siguiente…' : 'Toca para continuar'}</small>
        </div>
      )}

      <form className="card form" onSubmit={search}>
        <span className="form-label">Búsqueda manual</span>
        <p className="form-hint">Si el QR no se lee: código del pedido (ATK-…), RUT o el código de la entrada.</p>
        <div className="ig-row">
          <input value={manual} onChange={(e) => setManual(e.target.value)} placeholder="ATK-XXXXXX o 12345678-5" />
          <button className="btn-primary">Buscar</button>
        </div>
        {found && found.length === 0 && <p className="form-hint">Sin resultados (solo pedidos aprobados).</p>}
        {found?.map((t) => (
          <div key={t.code} className="door-found">
            <span><strong>{t.holder}</strong><small>{t.typeName} · {t.event}</small></span>
            {t.status === 'valid' ? (
              <button type="button" className="btn-ghost" onClick={async () => { await checkin(t.code); setFound(null); setManual(''); }}>Validar</button>
            ) : (
              <span className="status-badge st-bad">{t.status === 'used' ? 'Usada' : 'Anulada'}</span>
            )}
          </div>
        ))}
      </form>
    </main>
  );
}
