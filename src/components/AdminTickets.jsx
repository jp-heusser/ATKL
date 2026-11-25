/* Panel de administración: eventos y entradas (AdminEvents) y revisión de pagos (AdminOrders). */
import { useCallback, useEffect, useState } from 'react';
import { api, apiBlobUrl } from '../api.js';
import { link } from '../router.js';
import { clp, shortDateTime, toLocalInput, STATUS, cropImage } from '../format.js';
import { photoUrl } from './Avatar.jsx';
import { useSaver, Status } from './ui.jsx';

/* =========================================================
   VENTAS: revisar comprobantes, aprobar, rechazar, anular
   ========================================================= */
function OrderCard({ o, onDone }) {
  const [proof, setProof] = useState('');
  const [proofErr, setProofErr] = useState('');
  const [action, setAction] = useState(null); // 'reject' | 'void'
  const [reason, setReason] = useState('');
  const [s, run] = useSaver();
  const st = STATUS[o.status];

  useEffect(() => () => proof && URL.revokeObjectURL(proof), [proof]);

  const toggleProof = async () => {
    if (proof) return setProof('');
    try {
      setProof(await apiBlobUrl(`/admin/orders/${o.id}/proof`));
    } catch (e) {
      setProofErr(e.message);
    }
  };
  const act = (path, body, msg) => run(async () => {
    await api(`/admin/orders/${o.id}/${path}`, { method: 'POST', body });
    setAction(null);
    onDone();
  }, msg);

  return (
    <article className="card order-card">
      <header>
        <span className="mono">{o.code}</span>
        <span className={`status-badge ${st.cls}`}>{st.label}</span>
      </header>
      <p className="oc-main">
        <span><strong>{o.quantity} × {o.typeName}</strong> · {clp(o.total)}</span>
        <small>{o.event}</small>
      </p>
      <p className="oc-buyer">
        <strong>{o.buyer.name}</strong>
        <span>{o.buyer.doc} · {o.buyer.email}{o.buyer.phone ? ` · ${o.buyer.phone}` : ''}</span>
        <small>Enviado {shortDateTime(o.createdAt)}{o.reviewedAt ? ` · revisado ${shortDateTime(o.reviewedAt)}` : ''}</small>
      </p>
      {o.note && <p className="form-hint">Nota: {o.note}</p>}

      <button type="button" className="btn-ghost" onClick={toggleProof}>{proof ? 'Ocultar comprobante' : 'Ver comprobante'}</button>
      {proofErr && <p className="msg msg-error">{proofErr}</p>}
      {proof && (
        <a href={proof} target="_blank" rel="noopener noreferrer" className="proof-img" title="Abrir en grande">
          <img src={proof} alt={`Comprobante del pedido ${o.code}`} />
        </a>
      )}
      {proof && <p className="form-hint">Revisa que el monto sea <strong>{clp(o.total)}</strong>, que la fecha sea reciente y que el dinero haya llegado a la cuenta.</p>}

      {o.status === 'pending' && !action && (
        <div className="oc-actions">
          <button type="button" className="btn-primary" disabled={s.busy} onClick={() => act('approve', null, 'Aprobado: entradas generadas ✓')}>Aprobar pago</button>
          <button type="button" className="btn-ghost" onClick={() => setAction('reject')}>Rechazar</button>
        </div>
      )}
      {o.status === 'approved' && !action && (
        <button type="button" className="btn-link" onClick={() => setAction('void')}>Anular pedido…</button>
      )}
      {action && (
        <div className="form">
          <label>
            {action === 'reject' ? 'Motivo del rechazo (lo verá el comprador)' : 'Motivo de la anulación (lo verá el comprador)'}
            <input value={reason} maxLength={300} onChange={(e) => setReason(e.target.value)} placeholder={action === 'reject' ? 'El monto no coincide…' : 'Devolución solicitada…'} />
          </label>
          {action === 'void' && <p className="form-hint">Las entradas de este pedido dejarán de servir en la puerta y los cupos vuelven a la venta.</p>}
          <div className="oc-actions">
            <button type="button" className="btn-primary" disabled={s.busy} onClick={() => act(action, { reason }, action === 'reject' ? 'Rechazado ✓' : 'Anulado ✓')}>
              {action === 'reject' ? 'Confirmar rechazo' : 'Confirmar anulación'}
            </button>
            <button type="button" className="btn-link" onClick={() => setAction(null)}>Cancelar</button>
          </div>
        </div>
      )}
      <Status s={s} />
    </article>
  );
}

export function AdminOrders({ onChanged }) {
  const [status, setStatus] = useState('pending');
  const [event, setEvent] = useState('');
  const [q, setQ] = useState('');
  const [events, setEvents] = useState([]);
  const [list, setList] = useState(null);

  useEffect(() => {
    api('/admin/events').then(setEvents).catch(() => {});
  }, []);

  const load = useCallback(() => {
    const p = new URLSearchParams();
    if (status) p.set('status', status);
    if (event) p.set('event', event);
    if (q.trim()) p.set('q', q.trim());
    api(`/admin/orders?${p}`).then(setList).catch(() => setList([]));
  }, [status, event, q]);

  useEffect(() => {
    const t = setTimeout(load, q ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, q]);

  const done = () => {
    load();
    onChanged?.();
  };

  return (
    <>
      <div className="card form">
        <div className="form-2">
          <label>
            Estado
            <select value={status} onChange={(e) => setStatus(e.target.value)}>
              <option value="pending">En revisión</option>
              <option value="approved">Aprobados</option>
              <option value="rejected">Rechazados</option>
              <option value="cancelled">Anulados</option>
              <option value="">Todos</option>
            </select>
          </label>
          <label>
            Evento
            <select value={event} onChange={(e) => setEvent(e.target.value)}>
              <option value="">Todos</option>
              {events.map((e) => <option key={e.id} value={e.id}>{e.title}</option>)}
            </select>
          </label>
        </div>
        <label>Buscar<input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Código, nombre, correo o RUT" /></label>
      </div>
      {list && list.length === 0 && <p className="form-hint center">No hay pedidos {status === 'pending' ? 'por revisar' : 'con este filtro'}.</p>}
      {list?.map((o) => <OrderCard key={o.id} o={o} onDone={done} />)}
    </>
  );
}

/* =========================================================
   EVENTOS: datos del evento, tipos de entrada, transferencia, puerta
   ========================================================= */
const blankEvent = { title: '', slug: '', startsAt: '', venue: '', address: '', city: '', description: '', status: 'draft', ticketUrl: '' };

// Imagen 16:9 del evento: se recorta al centro en el navegador (1600×900) y se guarda al instante.
function EventImageField({ ev, onChanged }) {
  const [img, setImg] = useState(ev.image);
  const [s, run] = useSaver();
  useEffect(() => setImg(ev.image), [ev.id, ev.image]);
  const pick = (e) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    run(async () => {
      const r = await api(`/admin/events/${ev.id}/image`, { method: 'PUT', body: { image: await cropImage(file) } });
      setImg(r.image);
      onChanged();
    }, 'Imagen guardada ✓');
  };
  const remove = () =>
    run(async () => {
      await api(`/admin/events/${ev.id}/image`, { method: 'DELETE' });
      setImg('');
      onChanged();
    }, 'Imagen quitada ✓');
  return (
    <div className="form">
      <span className="form-label">Imagen (16:9)</span>
      <label className="file-drop ev-img-drop">
        <input type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} disabled={s.busy} />
        {img ? <img src={photoUrl(img)} alt="Imagen del evento" /> : <span>{s.busy ? 'Subiendo…' : 'Elegir imagen'}</span>}
      </label>
      <p className="form-hint">Se recorta al centro en formato 16:9 (ideal 1600×900). {img && <button type="button" className="btn-link" onClick={remove}>Quitar imagen</button>}</p>
      <Status s={s} />
    </div>
  );
}

function EventForm({ ev, onSaved }) {
  const [e, setE] = useState(ev ? { ...ev, startsAt: toLocalInput(ev.startsAt) } : blankEvent);
  const [s, run] = useSaver();
  useEffect(() => setE(ev ? { ...ev, startsAt: toLocalInput(ev.startsAt) } : blankEvent), [ev?.id]);
  const f = (k) => ({ value: e[k] ?? '', onChange: (x) => setE({ ...e, [k]: x.target.value }) });

  const submit = (x) => {
    x.preventDefault();
    run(async () => {
      const body = { ...e, startsAt: new Date(e.startsAt).toISOString() };
      if (ev) await api(`/admin/events/${ev.id}`, { method: 'PUT', body });
      else {
        const r = await api('/admin/events', { method: 'POST', body });
        body.id = r.id;
      }
      onSaved(ev?.id || body.id);
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <span className="form-label">{ev ? 'Datos del evento' : 'Nuevo evento'}</span>
      <label>Nombre<input required maxLength={120} {...f('title')} /></label>
      {!ev && (
        <label>Slug (su link: /evento/…)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="dkstle-rancagua-dic" {...f('slug')} onChange={(x) => setE({ ...e, slug: x.target.value.toLowerCase() })} /></label>
      )}
      <div className="form-2">
        <label>Fecha y hora<input type="datetime-local" required {...f('startsAt')} /></label>
        <label>
          Estado
          <select {...f('status')}>
            <option value="draft">Borrador (oculto)</option>
            <option value="published">Publicado (a la venta)</option>
            <option value="closed">Venta cerrada</option>
          </select>
        </label>
      </div>
      <div className="form-2">
        <label>Lugar<input maxLength={120} {...f('venue')} /></label>
        <label>Ciudad<input maxLength={60} {...f('city')} /></label>
      </div>
      <label>Dirección<input maxLength={200} {...f('address')} /></label>
      <label>Descripción<textarea rows={4} maxLength={2000} {...f('description')} /></label>
      <label>Link de venta externa (opcional)<input type="url" maxLength={500} placeholder="https://www.toliv.com/eventos/…" {...f('ticketUrl')} /></label>
      <p className="form-hint">Si las entradas se venden en otra plataforma. Se muestra como botón; si además cargas tipos de entrada, también se puede pagar por transferencia.</p>
      <Status s={s} />
      <button className="btn-primary" disabled={s.busy}>{ev ? 'Guardar evento' : 'Crear evento'}</button>
      {ev && ev.status !== 'draft' && <a className="form-hint" href={link(`evento/${ev.slug}`)}>Ver página de venta →</a>}
    </form>
  );
}

function TypeRow({ t, onSaved }) {
  const [x, setX] = useState(t);
  const [s, run] = useSaver();
  useEffect(() => setX(t), [t]);
  const f = (k, num) => ({ value: x[k] ?? '', onChange: (e) => setX({ ...x, [k]: num ? e.target.value.replace(/\D/g, '') : e.target.value }) });
  const save = () => run(async () => onSaved(await api(`/admin/types/${t.id}`, { method: 'PUT', body: { ...x, price: Number(x.price), capacity: Number(x.capacity), maxPerOrder: Number(x.maxPerOrder) } })));

  return (
    <div className={`tt-admin${x.active ? '' : ' is-off'}`}>
      <div className="form-2">
        <label>Nombre<input maxLength={60} {...f('name')} /></label>
        <label>Precio (CLP)<input inputMode="numeric" {...f('price', true)} /></label>
      </div>
      <div className="form-2">
        <label>Capacidad<input inputMode="numeric" {...f('capacity', true)} /></label>
        <label>Máx. por compra<input inputMode="numeric" {...f('maxPerOrder', true)} /></label>
      </div>
      <label>Descripción (opcional)<input maxLength={200} {...f('description')} /></label>
      <p className="tt-stats">
        <span><strong>{t.sold}</strong> vendidas</span>
        <span><strong>{t.pending}</strong> en revisión</span>
        <span><strong>{t.remaining}</strong> disponibles</span>
      </p>
      <label className="check"><input type="checkbox" checked={x.active} onChange={(e) => setX({ ...x, active: e.target.checked })} /> A la venta</label>
      <Status s={s} />
      <button type="button" className="btn-ghost" disabled={s.busy} onClick={save}>Guardar tipo</button>
    </div>
  );
}

function NewType({ eventId, onSaved }) {
  const [x, setX] = useState({ name: '', price: '', capacity: '', maxPerOrder: '6' });
  const [s, run] = useSaver();
  const f = (k, num) => ({ value: x[k], onChange: (e) => setX({ ...x, [k]: num ? e.target.value.replace(/\D/g, '') : e.target.value }) });
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api(`/admin/events/${eventId}/types`, { method: 'POST', body: { ...x, price: Number(x.price), capacity: Number(x.capacity), maxPerOrder: Number(x.maxPerOrder) } });
      setX({ name: '', price: '', capacity: '', maxPerOrder: '6' });
      onSaved();
    }, 'Tipo creado ✓');
  };
  return (
    <form className="form tt-new" onSubmit={submit}>
      <span className="form-label">Agregar tipo de entrada</span>
      <div className="form-2">
        <label>Nombre<input required maxLength={60} placeholder="Preventa" {...f('name')} /></label>
        <label>Precio (CLP)<input required inputMode="numeric" placeholder="8000" {...f('price', true)} /></label>
      </div>
      <div className="form-2">
        <label>Capacidad<input required inputMode="numeric" placeholder="100" {...f('capacity', true)} /></label>
        <label>Máx. por compra<input required inputMode="numeric" {...f('maxPerOrder', true)} /></label>
      </div>
      <Status s={s} />
      <button className="btn-ghost" disabled={s.busy}>+ Agregar</button>
    </form>
  );
}

function PaymentForm() {
  const [p, setP] = useState(null);
  const [s, run] = useSaver();
  useEffect(() => {
    api('/admin/payment').then(setP).catch(() => setP({}));
  }, []);
  if (!p) return null;
  const f = (k) => ({ value: p[k] ?? '', onChange: (e) => setP({ ...p, [k]: e.target.value }) });
  const submit = (e) => {
    e.preventDefault();
    run(async () => setP(await api('/admin/payment', { method: 'PUT', body: p })));
  };
  return (
    <details className="card">
      <summary>Datos de transferencia{!p.accountNumber && ' · ⚠ sin completar'}</summary>
      <form className="form" onSubmit={submit}>
        <p className="form-hint">Se muestran al comprador. Sin número de cuenta y titular, la venta no se abre.</p>
        <div className="form-2">
          <label>Banco<input maxLength={60} {...f('bank')} /></label>
          <label>Tipo de cuenta<input maxLength={40} placeholder="Cuenta corriente" {...f('accountType')} /></label>
        </div>
        <div className="form-2">
          <label>N° de cuenta<input maxLength={40} {...f('accountNumber')} /></label>
          <label>RUT del titular<input maxLength={20} {...f('rut')} /></label>
        </div>
        <label>Titular<input maxLength={80} {...f('holder')} /></label>
        <label>Correo para el aviso<input type="email" maxLength={120} {...f('email')} /></label>
        <label>Nota (opcional)<input maxLength={300} placeholder="Indica tu nombre en el comentario de la transferencia" {...f('note')} /></label>
        <Status s={s} />
        <button className="btn-primary" disabled={s.busy}>Guardar datos</button>
      </form>
    </details>
  );
}

function StaffForm() {
  const [list, setList] = useState([]);
  const [email, setEmail] = useState('');
  const [created, setCreated] = useState(null);
  const [s, run] = useSaver();
  const load = () => api('/admin/staff').then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      setCreated(await api('/admin/staff', { method: 'POST', body: { email } }));
      setEmail('');
      load();
    }, 'Cuenta lista ✓');
  };
  const toggle = (u) => run(async () => {
    await api(`/admin/staff/${u.id}`, { method: 'PUT', body: { active: !u.active } });
    load();
  }, u.active ? 'Cuenta desactivada ✓' : 'Cuenta activada ✓');

  return (
    <details className="card">
      <summary>Personal de puerta ({list.filter((u) => u.active).length})</summary>
      <div className="form">
        <p className="form-hint">Estas cuentas solo pueden escanear entradas en <a href={link('puerta')}>/puerta</a>. Desactívalas cuando termine el evento.</p>
        {list.map((u) => (
          <div key={u.id} className="door-found">
            <span><strong>{u.email}</strong><small>{u.lastLoginAt ? `Último ingreso ${shortDateTime(u.lastLoginAt)}` : 'Nunca ha ingresado'}</small></span>
            <button type="button" className="btn-link" onClick={() => toggle(u)}>{u.active ? 'Desactivar' : 'Activar'}</button>
          </div>
        ))}
        <form className="form" onSubmit={submit}>
          <label>Correo<input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></label>
          <button className="btn-primary" disabled={s.busy}>Crear cuenta / reiniciar contraseña</button>
        </form>
        {created && (
          <p className="msg msg-ok">
            Entrégale estos datos (la contraseña no se vuelve a mostrar):<br />
            <strong>{created.email}</strong> · <code>{created.tempPassword}</code>
          </p>
        )}
        <Status s={s} />
      </div>
    </details>
  );
}

export function AdminEvents({ onChanged }) {
  const [events, setEvents] = useState([]);
  const [sel, setSel] = useState('');
  const load = (pick) =>
    api('/admin/events')
      .then((l) => {
        setEvents(l);
        if (pick) setSel(pick);
      })
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const ev = events.find((e) => e.id === sel);
  const saved = (id) => {
    load(id);
    onChanged?.();
  };

  return (
    <>
      <div className="card form">
        <label>
          Evento
          <select value={sel} onChange={(e) => setSel(e.target.value)}>
            <option value="">+ Nuevo evento</option>
            {events.map((e) => (
              <option key={e.id} value={e.id}>
                {e.title} · {shortDateTime(e.startsAt)}{e.status === 'draft' ? ' (borrador)' : e.status === 'closed' ? ' (cerrado)' : ''}
              </option>
            ))}
          </select>
        </label>
        <a className="btn-ghost center" href={link('puerta')}>Abrir escáner de puerta</a>
      </div>

      {ev && (
        <section className="card">
          <EventImageField ev={ev} onChanged={() => { load(); onChanged?.(); }} />
        </section>
      )}

      <EventForm ev={ev} onSaved={saved} />

      {ev && (
        <section className="card form">
          <span className="form-label">Tipos de entrada</span>
          {ev.types.length === 0 && <p className="form-hint">Agrega al menos un tipo de entrada para poder vender.</p>}
          {ev.types.map((t) => <TypeRow key={t.id} t={t} onSaved={() => load()} />)}
          <NewType eventId={ev.id} onSaved={() => load()} />
        </section>
      )}

      <PaymentForm />
      <StaffForm />
    </>
  );
}
