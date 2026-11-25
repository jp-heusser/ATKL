/* Link privado del comprador: estado del pedido y, cuando se aprueba, sus entradas con QR. */
import { useEffect, useState } from 'react';
import { api } from '../api.js';
import { link, absoluteLink } from '../router.js';
import { clp, fullDate, shortDateTime, STATUS } from '../format.js';
import Qr from './Qr.jsx';
import { photoUrl } from './Avatar.jsx';
import EventMedia from './EventMedia.jsx';

// Guarda los pedidos en este navegador para encontrarlos después.
const KEY = 'atkl_orders';
export function rememberOrder(token, code, title) {
  try {
    const list = JSON.parse(localStorage.getItem(KEY) || '[]').filter((o) => o.token !== token);
    list.unshift({ token, code, title, at: Date.now() });
    localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
  } catch {}
}

export default function OrderPage({ token }) {
  const [o, setO] = useState(null);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let timer;
    const load = () =>
      api(`/orders/${token}`)
        .then((d) => {
          setO(d);
          document.title = `Pedido ${d.code} · ATKL Records`;
          if (d.status === 'pending') timer = setTimeout(load, 30000); // se actualiza solo mientras está en revisión
        })
        .catch((e) => setError(e.status === 404 ? 'No encontramos este pedido. Revisa que el link esté completo.' : e.message));
    load();
    window.scrollTo(0, 0);
    return () => clearTimeout(timer);
  }, [token]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(absoluteLink(`pedido/${token}`));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  if (error)
    return (
      <main className="page">
        <nav className="back"><a href={link('')}>← ATKL Records</a></nav>
        <p className="msg msg-error">{error}</p>
      </main>
    );
  if (!o) return <main className="page" />;
  const st = STATUS[o.status];

  return (
    <main className="page">
      <nav className="back"><a href={link('')}>← ATKL Records</a></nav>

      {o.event?.image && <div className="order-media"><EventMedia src={photoUrl(o.event.image)} variant="card" /></div>}
      <header className="event-head">
        <span className={`status-badge ${st.cls}`}>{st.label}</span>
        <h1 className="artist-title">{o.event?.title}</h1>
        {o.event && <p className="event-when">{fullDate(o.event.startsAt)}</p>}
        {o.event && <p className="artist-meta">{[o.event.venue, o.event.address, o.event.city].filter(Boolean).join(' · ')}</p>}
      </header>

      <section className="card order-sum">
        <div><small>Pedido</small><strong className="mono">{o.code}</strong></div>
        <div><small>Entradas</small><strong>{o.quantity} × {o.typeName}</strong></div>
        <div><small>Total</small><strong>{clp(o.total)}</strong></div>
        <div><small>A nombre de</small><strong>{o.buyer.name}</strong></div>
      </section>

      {o.status === 'pending' && (
        <section className="card form">
          <p>Recibimos tu pedido y el comprobante. <strong>Estamos revisando la transferencia</strong>; cuando la validemos, tus entradas con código QR aparecerán en esta misma página.</p>
          <p className="msg msg-warn"><strong>Guarda este link</strong>: es la única forma de ver tus entradas. No compartas este link: quien lo tenga puede usarlas.</p>
          <button type="button" className="btn-primary" onClick={copy}>{copied ? 'Link copiado ✓' : 'Copiar link de mi pedido'}</button>
          <p className="form-hint">Pedido enviado el {shortDateTime(o.createdAt)}. Esta página se actualiza sola.</p>
        </section>
      )}

      {o.status === 'approved' && (
        <>
          <p className="form-hint center">Muestra cada QR en la entrada. Puedes hacer una captura de pantalla. Cada QR sirve una sola vez.</p>
          <div className="tickets">
            {o.tickets.map((t, i) => (
              <article key={t.code} className={`ticket ticket-${t.status}`}>
                <header>
                  <span>{o.event?.title}</span>
                  <span>{i + 1}/{o.tickets.length}</span>
                </header>
                {t.status === 'valid' ? <Qr value={t.code} /> : <div className="qr qr-off">{t.status === 'used' ? 'USADA' : 'ANULADA'}</div>}
                <footer>
                  <strong>{t.typeName}</strong>
                  <span>{t.holder}</span>
                  <span className="mono">{o.code} · {t.code.slice(0, 6).toUpperCase()}</span>
                </footer>
              </article>
            ))}
          </div>
          <button type="button" className="copy-btn" onClick={copy}>{copied ? 'Link copiado ✓' : 'Copiar link de mi pedido'}</button>
        </>
      )}

      {(o.status === 'rejected' || o.status === 'cancelled') && (
        <section className="card form">
          <p className="msg msg-error">{o.note}</p>
          <p>Si crees que es un error, escríbenos por Instagram indicando tu código de pedido <strong className="mono">{o.code}</strong>.</p>
          <a className="btn-primary center" href="https://www.instagram.com/atkl.records/" target="_blank" rel="noopener noreferrer">Escribir a ATKL</a>
        </section>
      )}
    </main>
  );
}
