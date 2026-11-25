/* Administración de eventos, tipos de entrada, pedidos y personal de puerta. Solo admin. */
import { Router } from 'express';
import Event from '../models/Event.js';
import TicketType from '../models/TicketType.js';
import Order from '../models/Order.js';
import Proof from '../models/Proof.js';
import Ticket from '../models/Ticket.js';
import Label from '../models/Label.js';
import User from '../models/User.js';
import { requireAuth, requireAdmin, hashPassword, tempPassword } from '../auth.js';
import { newTicketCode, bad } from '../tickets.js';

const router = Router();
router.use(requireAuth, requireAdmin);

const str = (v, max = 2000) => (typeof v === 'string' ? v.trim().slice(0, max) : undefined);
const int = (v) => (v === '' || v === null || v === undefined ? undefined : Number(v));

const adminType = (t) => ({
  id: String(t._id),
  name: t.name,
  description: t.description,
  price: t.price,
  capacity: t.capacity,
  remaining: t.remaining,
  sold: t.sold,
  pending: t.capacity - t.remaining - t.sold, // reservadas por pedidos sin revisar
  maxPerOrder: t.maxPerOrder,
  active: t.active,
});

/* ===================== Eventos ===================== */
router.get('/events', async (_req, res) => {
  const [events, types, pending] = await Promise.all([
    Event.find().sort({ startsAt: -1 }).lean(),
    TicketType.find().sort({ order: 1, price: 1 }).lean(),
    Order.aggregate([{ $match: { status: 'pending' } }, { $group: { _id: '$event', n: { $sum: 1 } } }]),
  ]);
  const pend = new Map(pending.map((p) => [String(p._id), p.n]));
  res.json(
    events.map((e) => ({
      id: String(e._id),
      slug: e.slug,
      title: e.title,
      description: e.description,
      venue: e.venue,
      address: e.address,
      city: e.city,
      startsAt: e.startsAt,
      status: e.status,
      pendingOrders: pend.get(String(e._id)) || 0,
      types: types.filter((t) => String(t.event) === String(e._id)).map(adminType),
    })),
  );
});

function applyEvent(ev, b) {
  for (const f of ['title', 'description', 'venue', 'address', 'city']) {
    const v = str(b[f]);
    if (v !== undefined) ev[f] = v;
  }
  if (b.startsAt !== undefined) {
    const d = new Date(b.startsAt);
    if (Number.isNaN(d.getTime())) throw bad('Fecha no válida');
    ev.startsAt = d;
  }
  if (b.status !== undefined) ev.status = b.status;
}

router.post('/events', async (req, res) => {
  const ev = new Event({ slug: str(req.body?.slug, 80)?.toLowerCase() });
  applyEvent(ev, req.body || {});
  await ev.save();
  res.status(201).json({ id: String(ev._id) });
});

router.put('/events/:id', async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
  applyEvent(ev, req.body || {});
  await ev.save();
  res.json({ ok: true });
});

/* ===================== Tipos de entrada ===================== */
router.post('/events/:id/types', async (req, res) => {
  const ev = await Event.findById(req.params.id);
  if (!ev) return res.status(404).json({ error: 'Evento no encontrado' });
  const b = req.body || {};
  const capacity = int(b.capacity);
  if (!Number.isInteger(capacity) || capacity < 0) throw bad('Capacidad no válida');
  const count = await TicketType.countDocuments({ event: ev._id });
  const t = await TicketType.create({
    event: ev._id,
    name: str(b.name, 60),
    description: str(b.description, 200) || '',
    price: int(b.price),
    capacity,
    remaining: capacity,
    maxPerOrder: int(b.maxPerOrder) ?? 6,
    order: count,
  });
  res.status(201).json(adminType(t));
});

router.put('/types/:id', async (req, res) => {
  const b = req.body || {};
  let t = await TicketType.findById(req.params.id);
  if (!t) return res.status(404).json({ error: 'Tipo de entrada no encontrado' });

  // Cambio de capacidad: atómico y sin bajar de lo ya vendido o reservado.
  const capacity = int(b.capacity);
  if (capacity !== undefined && capacity !== t.capacity) {
    if (!Number.isInteger(capacity) || capacity < 0) throw bad('Capacidad no válida');
    const delta = capacity - t.capacity;
    const upd = await TicketType.findOneAndUpdate(
      { _id: t._id, capacity: t.capacity, remaining: { $gte: -delta } },
      { $inc: { capacity: delta, remaining: delta } },
      { returnDocument: 'after' },
    );
    if (!upd) throw bad('No puedes bajar la capacidad por debajo de lo vendido o reservado', 409);
    t = upd;
  }
  const name = str(b.name, 60);
  if (name !== undefined) t.name = name;
  const desc = str(b.description, 200);
  if (desc !== undefined) t.description = desc;
  if (int(b.price) !== undefined) t.price = int(b.price); // solo afecta a pedidos nuevos
  if (int(b.maxPerOrder) !== undefined) t.maxPerOrder = int(b.maxPerOrder);
  if (typeof b.active === 'boolean') t.active = b.active;
  await t.save();
  res.json(adminType(t));
});

/* ===================== Datos de transferencia ===================== */
const PAY_FIELDS = ['bank', 'accountType', 'accountNumber', 'holder', 'rut', 'email', 'note'];

router.get('/payment', async (_req, res) => {
  const label = await Label.findOne({ key: 'main' }).select('payment').lean();
  res.json(label?.payment || {});
});

router.put('/payment', async (req, res) => {
  const label = await Label.findOne({ key: 'main' });
  if (!label) throw bad('Primero carga los datos del sello (npm run seed)', 409);
  for (const f of PAY_FIELDS) {
    const v = str(req.body?.[f], 300);
    if (v !== undefined) label.payment[f] = v;
  }
  await label.save();
  res.json(label.payment);
});

/* ===================== Pedidos ===================== */
router.get('/orders', async (req, res) => {
  const q = {};
  if (['pending', 'approved', 'rejected', 'cancelled'].includes(req.query.status)) q.status = req.query.status;
  if (/^[a-f0-9]{24}$/.test(String(req.query.event || ''))) q.event = req.query.event;
  const text = String(req.query.q || '').trim();
  if (text) {
    const rx = new RegExp(text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
    q.$or = [{ code: rx }, { 'buyer.name': rx }, { 'buyer.email': rx }, { 'buyer.doc': rx }];
  }
  const orders = await Order.find(q).sort({ createdAt: -1 }).limit(200).lean();
  const events = new Map((await Event.find({ _id: { $in: [...new Set(orders.map((o) => o.event))] } }).select('title').lean()).map((e) => [String(e._id), e.title]));
  res.json(
    orders.map((o) => ({
      id: String(o._id),
      code: o.code,
      status: o.status,
      event: events.get(String(o.event)) || '',
      typeName: o.typeName,
      quantity: o.quantity,
      unitPrice: o.unitPrice,
      total: o.total,
      buyer: o.buyer,
      note: o.note,
      createdAt: o.createdAt,
      reviewedAt: o.reviewedAt,
    })),
  );
});

// Comprobante (imagen). Solo admin; nunca se guarda en caché.
router.get('/orders/:id/proof', async (req, res) => {
  const proof = await Proof.findOne({ order: req.params.id }).lean();
  if (!proof) return res.status(404).json({ error: 'Sin comprobante' });
  res.set({ 'Content-Type': proof.type, 'Cache-Control': 'private, no-store', 'X-Content-Type-Options': 'nosniff' });
  res.send(Buffer.isBuffer(proof.data) ? proof.data : Buffer.from(proof.data.buffer));
});

const review = (status, extra = {}) => ({ $set: { status, reviewedAt: new Date(), ...extra } });

// Aprobar: el pago está OK → se generan las entradas.
router.post('/orders/:id/approve', async (req, res) => {
  const order = await Order.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, review('approved', { reviewedBy: req.user._id, note: '' }), { returnDocument: 'after' });
  if (!order) throw bad('Este pedido ya fue revisado o no existe', 409);
  const tickets = Array.from({ length: order.quantity }, (_, i) => ({
    code: newTicketCode(),
    seq: i + 1,
    order: order._id,
    event: order.event,
    typeName: order.typeName,
    holder: order.buyer.name,
    doc: order.buyer.doc,
  }));
  try {
    await Ticket.insertMany(tickets);
  } catch (e) {
    if (e?.code === 11000) throw bad('Este pedido ya fue aprobado', 409); // aprobación duplicada
    throw e;
  }
  await TicketType.updateOne({ _id: order.ticketType }, { $inc: { sold: order.quantity } });
  res.json({ ok: true, tickets: tickets.length });
});

// Rechazar: el pago no corresponde → se liberan las entradas reservadas.
router.post('/orders/:id/reject', async (req, res) => {
  const note = str(req.body?.reason, 300) || 'No pudimos validar la transferencia.';
  const order = await Order.findOneAndUpdate({ _id: req.params.id, status: 'pending' }, review('rejected', { reviewedBy: req.user._id, note }), { returnDocument: 'after' });
  if (!order) throw bad('Este pedido ya fue revisado o no existe', 409);
  await TicketType.updateOne({ _id: order.ticketType }, { $inc: { remaining: order.quantity } });
  res.json({ ok: true });
});

// Anular un pedido aprobado (devolución, error): anula las entradas no usadas y las libera.
router.post('/orders/:id/void', async (req, res) => {
  const note = str(req.body?.reason, 300) || 'Pedido anulado.';
  const order = await Order.findOneAndUpdate({ _id: req.params.id, status: 'approved' }, review('cancelled', { reviewedBy: req.user._id, note }), { returnDocument: 'after' });
  if (!order) throw bad('Solo se pueden anular pedidos aprobados', 409);
  await Ticket.updateMany({ order: order._id, status: 'valid' }, { $set: { status: 'void' } });
  await TicketType.updateOne({ _id: order.ticketType }, { $inc: { remaining: order.quantity, sold: -order.quantity } });
  res.json({ ok: true });
});

/* ===================== Personal de puerta ===================== */
router.get('/staff', async (_req, res) => {
  const users = await User.find({ role: 'door' }).select('email active lastLoginAt').sort({ email: 1 }).lean();
  res.json(users.map((u) => ({ id: String(u._id), email: u.email, active: u.active, lastLoginAt: u.lastLoginAt })));
});

// Crea la cuenta (o reinicia su contraseña) y devuelve una contraseña temporal una sola vez.
router.post('/staff', async (req, res) => {
  const email = String(req.body?.email || '').trim().toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) throw bad('Correo no válido');
  let user = await User.findOne({ email });
  if (user && user.role !== 'door') throw bad('Ese correo ya pertenece a otra cuenta (admin o artista)');
  if (!user) user = new User({ email, role: 'door' });
  const password = tempPassword();
  user.passwordHash = await hashPassword(password);
  user.active = true;
  await user.save();
  res.status(201).json({ email, tempPassword: password });
});

router.put('/staff/:id', async (req, res) => {
  const user = await User.findOne({ _id: req.params.id, role: 'door' });
  if (!user) return res.status(404).json({ error: 'Cuenta no encontrada' });
  if (typeof req.body?.active === 'boolean') user.active = req.body.active;
  await user.save();
  res.json({ ok: true });
});

export default router;
