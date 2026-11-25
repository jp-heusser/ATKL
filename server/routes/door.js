/* Puerta: escanear y validar entradas. Roles: door o admin. */
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Event from '../models/Event.js';
import Ticket from '../models/Ticket.js';
import Order from '../models/Order.js';
import { requireAuth, requireRole } from '../auth.js';

const router = Router();
router.use(requireAuth, requireRole('door', 'admin'));
router.use(rateLimit({ windowMs: 60e3, limit: 120, standardHeaders: true, legacyHeaders: false, message: { error: 'Demasiadas lecturas seguidas' } }));

// Eventos de hoy y próximos, con cuántas entradas válidas y usadas tienen.
router.get('/events', async (_req, res) => {
  const events = await Event.find({ status: { $in: ['published', 'closed'] }, startsAt: { $gte: new Date(Date.now() - 24 * 3600e3) } })
    .sort({ startsAt: 1 })
    .limit(10)
    .lean();
  const stats = await Ticket.aggregate([
    { $match: { event: { $in: events.map((e) => e._id) } } },
    { $group: { _id: { event: '$event', status: '$status' }, n: { $sum: 1 } } },
  ]);
  const count = (id, st) => stats.find((s) => String(s._id.event) === String(id) && s._id.status === st)?.n || 0;
  res.json(
    events.map((e) => ({
      id: String(e._id),
      title: e.title,
      startsAt: e.startsAt,
      used: count(e._id, 'used'),
      total: count(e._id, 'used') + count(e._id, 'valid'),
    })),
  );
});

const show = (t, title) => ({ code: t.code, typeName: t.typeName, holder: t.holder, doc: t.doc, event: title, usedAt: t.usedAt, status: t.status });

// Validar una entrada: la marca como usada si es válida. Una sola vez, aunque dos lectores la escaneen a la vez.
router.post('/checkin', async (req, res) => {
  const code = (String(req.body?.code || '').toLowerCase().match(/[a-f0-9]{32}/) || [])[0];
  if (!code) return res.json({ result: 'invalid' });
  const eventId = /^[a-f0-9]{24}$/.test(String(req.body?.event || '')) ? req.body.event : null;

  const used = await Ticket.findOneAndUpdate(
    { code, status: 'valid', ...(eventId ? { event: eventId } : {}) },
    { $set: { status: 'used', usedAt: new Date(), usedBy: req.user._id } },
    { returnDocument: 'after' },
  ).lean();
  const ticket = used || (await Ticket.findOne({ code }).lean());
  if (!ticket) return res.json({ result: 'invalid' });
  const ev = await Event.findById(ticket.event).select('title').lean();

  if (used) return res.json({ result: 'ok', ticket: show(ticket, ev?.title) });
  if (ticket.status === 'used') return res.json({ result: 'used', ticket: show(ticket, ev?.title) });
  if (ticket.status === 'void') return res.json({ result: 'void', ticket: show(ticket, ev?.title) });
  return res.json({ result: 'other_event', ticket: show(ticket, ev?.title) }); // válida, pero de otro evento
});

// Búsqueda manual cuando el QR no se puede leer: por código de pedido (ATK-…) o RUT/pasaporte.
router.get('/lookup', async (req, res) => {
  const q = String(req.query.q || '').trim().toUpperCase().replace(/\./g, '');
  if (q.length < 5) return res.json([]);
  const orders = await Order.find({ status: 'approved', $or: [{ code: q }, { 'buyer.doc': q }] }).select('_id').limit(10).lean();
  const tickets = await Ticket.find({ order: { $in: orders.map((o) => o._id) } }).lean();
  const titles = new Map((await Event.find({ _id: { $in: tickets.map((t) => t.event) } }).select('title').lean()).map((e) => [String(e._id), e.title]));
  res.json(tickets.map((t) => show(t, titles.get(String(t.event)))));
});

export default router;
