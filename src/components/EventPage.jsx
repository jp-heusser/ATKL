/* Compra de entradas: elegir tipo y cantidad, datos del comprador, transferir y subir el comprobante. */
import { useEffect, useMemo, useState } from 'react';
import { api } from '../api.js';
import { link, navigate } from '../router.js';
import { clp, fullDate, compressImage } from '../format.js';
import { rememberOrder } from './OrderPage.jsx';
import { photoUrl } from './Avatar.jsx';
import Lightbox from './Lightbox.jsx';

function CopyValue({ label, value }) {
  const [done, setDone] = useState(false);
  if (!value) return null;
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1500);
    } catch {}
  };
  return (
    <div className="pay-row">
      <span className="pay-label">{label}</span>
      <span className="pay-value">{value}</span>
      <button type="button" className="btn-link" onClick={copy}>{done ? 'Copiado ✓' : 'Copiar'}</button>
    </div>
  );
}

export default function EventPage({ slug }) {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [typeId, setTypeId] = useState('');
  const [qty, setQty] = useState(1);
  const [buyer, setBuyer] = useState({ name: '', email: '', doc: '', phone: '' });
  const [proof, setProof] = useState('');
  const [proofErr, setProofErr] = useState('');
  const [accept, setAccept] = useState(false);
  const [sending, setSending] = useState(false);
  const [sendErr, setSendErr] = useState('');
  const [zoom, setZoom] = useState(false);

  useEffect(() => {
    api(`/events/${slug}`)
      .then((d) => {
        setData(d);
        document.title = `${d.event.title} — Entradas · ATKL Records`;
        const first = d.types.find((t) => !t.soldOut);
        if (first) setTypeId(first.id);
      })
      .catch((e) => setError(e.status === 404 ? 'Este evento no existe o ya no está disponible.' : e.message));
    window.scrollTo(0, 0);
  }, [slug]);

  const type = useMemo(() => data?.types.find((t) => t.id === typeId), [data, typeId]);
  useEffect(() => setQty((q) => Math.min(q, type?.maxPerOrder || 1) || 1), [type]);
  const total = type ? type.price * qty : 0;
  const pay = data?.payment;
  const payReady = !!(pay?.accountNumber && pay?.holder);

  const pickProof = async (e) => {
    const file = e.target.files?.[0];
    setProofErr('');
    if (!file) return;
    try {
      setProof(await compressImage(file));
    } catch (err) {
      setProof('');
      setProofErr(err.message);
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!proof) return setSendErr('Falta subir el comprobante de la transferencia');
    setSending(true);
    setSendErr('');
    try {
      const r = await api('/orders', {
        method: 'POST',
        body: { event: slug, ticketType: typeId, quantity: qty, buyer, proof, accept },
      });
      rememberOrder(r.token, r.code, data.event.title);
      navigate(`pedido/${r.token}`);
    } catch (err) {
      setSendErr(err.message);
      setSending(false);
    }
  };

  if (error)
    return (
      <main className="page">
        <nav className="back"><a href={link('')}>← ATKL Records</a></nav>
        <p className="msg msg-error">{error}</p>
      </main>
    );
  if (!data) return <main className="page" />;

  const { event, types } = data;
  const field = (k) => ({ value: buyer[k], onChange: (e) => setBuyer({ ...buyer, [k]: e.target.value }) });

  return (
    <main className="page">
      <nav className="back"><a href={link('')}>← ATKL Records</a></nav>
      {zoom && event.image && <Lightbox src={photoUrl(event.imageFull || event.image)} alt={`Imagen de ${event.title}`} onClose={() => setZoom(false)} />}

      <header className="event-head">
        <span className="event-kicker">Entradas</span>
        <h1 className="artist-title">{event.title}</h1>
        <p className="event-when">{fullDate(event.startsAt)}</p>
        <p className="artist-meta">{[event.venue, event.address, event.city].filter(Boolean).join(' · ')}</p>
        {event.image && (
          <button type="button" className="ev-hero-btn" onClick={() => setZoom(true)} aria-label="Ver imagen en grande">
            <img className="ev-hero ev-hero-in" src={photoUrl(event.image)} alt={`Imagen de ${event.title}`} width="1600" height="900" />
            <span className="ev-zoom-hint" aria-hidden="true">⤢</span>
          </button>
        )}
        {event.description && <p className="event-desc">{event.description}</p>}
      </header>

      {event.onSale && event.ticketUrl && (
        <a className="btn-primary ext-buy" href={event.ticketUrl} target="_blank" rel="noopener noreferrer">
          Comprar entradas en {(() => { try { return new URL(event.ticketUrl).hostname.replace(/^www\./, ''); } catch { return 'línea'; } })()} ↗
        </a>
      )}

      {!event.onSale ? (
        <div className="maintenance"><span className="maintenance-tag">Venta cerrada</span><p>La venta de entradas para este evento terminó.</p></div>
      ) : types.length === 0 ? (
        !event.ticketUrl && <div className="maintenance"><span className="maintenance-tag">Pronto</span><p>La venta abre muy pronto. Síguenos en Instagram para enterarte.</p></div>
      ) : !payReady ? (
        event.ticketUrl ? null :
        <div className="maintenance"><span className="maintenance-tag">Pronto</span><p>La venta abre muy pronto. Síguenos en Instagram para enterarte.</p></div>
      ) : (
        <form className="buy" onSubmit={submit}>
          {event.ticketUrl && <p className="form-hint center">O compra aquí pagando por transferencia:</p>}
          {/* 1. Entrada */}
          <section className="card form">
            <span className="step">1</span>
            <span className="form-label">Elige tu entrada</span>
            <div className="tt-list" role="radiogroup">
              {types.map((t) => (
                <label key={t.id} className={`tt-option${t.soldOut ? ' is-out' : ''}${t.id === typeId ? ' is-on' : ''}`}>
                  <input type="radio" name="tt" value={t.id} checked={t.id === typeId} disabled={t.soldOut} onChange={() => setTypeId(t.id)} />
                  <span className="tt-text">
                    <strong>{t.name}</strong>
                    {t.description && <small>{t.description}</small>}
                  </span>
                  <span className="tt-price">
                    {t.soldOut ? 'Agotado' : clp(t.price)}
                    {t.low && <small>Últimas</small>}
                  </span>
                </label>
              ))}
            </div>
            {type && (
              <div className="qty-row">
                <label>
                  Cantidad
                  <select value={qty} onChange={(e) => setQty(Number(e.target.value))}>
                    {Array.from({ length: type.maxPerOrder }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n}</option>)}
                  </select>
                </label>
                <div className="total"><small>Total</small><strong>{clp(total)}</strong></div>
              </div>
            )}
          </section>

          {/* 2. Datos */}
          <section className="card form">
            <span className="step">2</span>
            <span className="form-label">Tus datos</span>
            <label>Nombre completo<input required minLength={3} maxLength={100} autoComplete="name" {...field('name')} /></label>
            <label>Correo<input type="email" required maxLength={120} autoComplete="email" {...field('email')} /></label>
            <div className="form-2">
              <label>RUT o pasaporte<input required maxLength={20} placeholder="12.345.678-5" {...field('doc')} /></label>
              <label>Teléfono (opcional)<input type="tel" maxLength={30} autoComplete="tel" {...field('phone')} /></label>
            </div>
          </section>

          {/* 3. Transferencia */}
          <section className="card form">
            <span className="step">3</span>
            <span className="form-label">Transfiere {clp(total)}</span>
            <div className="pay-box">
              <CopyValue label="Banco" value={pay.bank} />
              <CopyValue label="Tipo de cuenta" value={pay.accountType} />
              <CopyValue label="N° de cuenta" value={pay.accountNumber} />
              <CopyValue label="Titular" value={pay.holder} />
              <CopyValue label="RUT" value={pay.rut} />
              <CopyValue label="Correo" value={pay.email} />
              <CopyValue label="Monto" value={String(total)} />
            </div>
            {pay.note && <p className="form-hint">{pay.note}</p>}
          </section>

          {/* 4. Comprobante */}
          <section className="card form">
            <span className="step">4</span>
            <span className="form-label">Sube el comprobante</span>
            <p className="form-hint">Captura de pantalla o foto de la transferencia, donde se vea el monto y la fecha.</p>
            <label className="file-drop">
              <input type="file" accept="image/*" onChange={pickProof} />
              {proof ? <img src={proof} alt="Comprobante seleccionado" /> : <span>Elegir imagen</span>}
            </label>
            {proofErr && <p className="msg msg-error">{proofErr}</p>}
            <label className="check">
              <input type="checkbox" checked={accept} onChange={(e) => setAccept(e.target.checked)} required />
              Confirmo que transferí el monto exacto y que mis datos son correctos. Las entradas se activan cuando validemos el pago.
            </label>
            {sendErr && <p className="msg msg-error" role="alert">{sendErr}</p>}
            <button className="btn-primary" disabled={sending || !type}>{sending ? 'Enviando…' : `Enviar pedido · ${clp(total)}`}</button>
          </section>
        </form>
      )}
    </main>
  );
}
