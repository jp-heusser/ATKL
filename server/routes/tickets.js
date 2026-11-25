/* Venta de entradas: rutas públicas (sin cuenta). */
import { Router } from '../router.js';
import rateLimit from '../router.js';
import Event from '../models/Event.js';
import TicketType from '../models/TicketType.js';
import Order from '../models/Order.js';
import Proof from '../models/Proof.js';
import Ticket from '../models/Ticket.js';
import Label from '../models/Label.js';
import EventImage from '../models/EventImage.js';
import { parseImage } from '../photos.js';
import { sha256, newToken, newOrderCode, cleanDoc, bad, salesOpen } from '../tickets.js';

const router = Router();
const PROOF_MAX = 2 * 1024 * 1024; // 2 MB (la web la comprime antes de subirla)

const limiter = (limit, windowMin, error) =>
  rateLimit({ windowMs: windowMin * 60e3, limit, standardHeaders: true, legacyHeaders: false, message: { error } });

const VISIBLE = { status: { $in: ['published', 'closed'] } };
const recent = () => ({ startsAt: { $gte: new Date(Date.now() - 12 * 3600e3) } });

export const publicEvent = (e) => ({
  slug: e.slug,
  title: e.title,
  description: e.description,
  venue: e.venue,
  address: e.address,
  city: e.city,
  startsAt: e.startsAt,
  image: e.image || '',
  imageFull: e.imageFull || '',
  ticketUrl: e.ticketUrl || '',
  onSale: salesOpen(e),
});

const publicType = (t) => ({
  id: String(t._id),
  name: t.name,
  description: t.description,
  price: t.price,
  maxPerOrder: Math.min(t.maxPerOrder, t.remaining),
  soldOut: t.remaining <= 0,
  low: t.remaining > 0 && t.remaining <= 10,
});

// Próximos eventos (para la portada).
router.get('/events', async (_req, res) => {
  const events = await Event.find({ ...VISIBLE, ...recent() }).sort({ startsAt: 1 }).limit(20).lean();
  res.json(events.map(publicEvent));
});

// Imagen del evento (pública; la dirección cambia con cada subida, así que se guarda en caché).
const sendBin = (res, type, data) => {
  res.set({ 'Content-Type': type, 'Cache-Control': 'public, max-age=31536000, immutable', 'X-Content-Type-Options': 'nosniff' });
  res.send(Buffer.isBuffer(data) ? data : Buffer.from(data.buffer));
};

router.get('/events/:id/image', async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).end();
  const img = await EventImage.findOne({ event: req.params.id }).select('type data').lean();
  if (!img) return res.status(404).end();
  sendBin(res, img.type, img.data);
});

// Original sin recortar (vista ampliada).
router.get('/events/:id/image/full', async (req, res) => {
  if (!/^[a-f0-9]{24}$/i.test(req.params.id)) return res.status(404).end();
  const img = await EventImage.findOne({ event: req.params.id }).select('fullType fullData').lean();
  if (!img?.fullData) return res.status(404).end();
  sendBin(res, img.fullType, img.fullData);
});

// Un evento visible con sus tipos de entrada y los datos para transferir, o null.
export async function getEventPage(slug) {
  const event = await Event.findOne({ slug: String(slug).toLowerCase(), ...VISIBLE }).lean();
  if (!event) return null;
  const [types, label] = await Promise.all([
    TicketType.find({ event: event._id, active: true }).sort({ order: 1, price: 1 }).lean(),
    Label.findOne({ key: 'main' }).select('payment').lean(),
  ]);
  return { event: publicEvent(event), types: types.map(publicType), payment: label?.payment || null };
}

router.get('/events/:slug', async (req, res) => {
  const data = await getEventPage(req.params.slug);
  if (!data) return res.status(404).json({ error: 'Evento no encontrado' });
  res.json(data);
});

// Crear pedido: datos del comprador + comprobante. Reserva las entradas hasta que se revise el pago.
router.post('/orders', limiter(10, 15, 'Demasiados pedidos seguidos. Espera unos minutos.'), async (req, res) => {
  const b = req.body || {};
  const event = await Event.findOne({ slug: String(b.event || '').toLowerCase() }).lean();
  if (!event || !salesOpen(event)) throw bad('La venta de este evento no está disponible', 409);

  const quantity = Number(b.quantity);
  if (!Number.isInteger(quantity) || quantity < 1 || quantity > 20) throw bad('Cantidad no válida');
  const name = String(b.buyer?.name || '').trim();
  const email = String(b.buyer?.email || '').trim().toLowerCase();
  const phone = String(b.buyer?.phone || '').trim();
  if (name.length < 3) throw bad('Escribe tu nombre completo');
  if (!/^\S+@\S+\.\S+$/.test(email)) throw bad('Correo no válido');
  const { doc, error } = cleanDoc(b.buyer?.doc);
  if (error) throw bad(error);
  if (!b.accept) throw bad('Debes aceptar las condiciones de compra');
  const proof = parseImage(b.proof, PROOF_MAX); // valida formato real y tamaño

  const type = await TicketType.findOne({ _id: String(b.ticketType || ''), event: event._id, active: true }).lean().catch(() => null);
  if (!type) throw bad('Tipo de entrada no disponible');
  if (quantity > type.maxPerOrder) throw bad(`Máximo ${type.maxPerOrder} entradas por compra`);

  // Reserva atómica: solo descuenta si quedan suficientes.
  const reserved = await TicketType.findOneAndUpdate(
    { _id: type._id, active: true, remaining: { $gte: quantity } },
    { $inc: { remaining: -quantity } },
  );
  if (!reserved) throw bad('No quedan suficientes entradas de este tipo', 409);

  const token = newToken();
  let order;
  try {
    for (let i = 0; !order; i++) {
      try {
        order = await Order.create({
          code: newOrderCode(),
          tokenHash: sha256(token),
          event: event._id,
          ticketType: type._id,
          typeName: type.name,
          unitPrice: type.price,
          quantity,
          total: type.price * quantity,
          buyer: { name, email, doc, phone },
        });
      } catch (e) {
        if (e?.code !== 11000 || i >= 4) throw e; // código repetido: reintenta
      }
    }
    await Proof.create({ order: order._id, type: proof.type, data: proof.buffer });
  } catch (e) {
    // Si algo falla, se libera la reserva y no queda un pedido a medias.
    await TicketType.updateOne({ _id: type._id }, { $inc: { remaining: quantity } });
    if (order) await Order.deleteOne({ _id: order._id });
    throw e;
  }

  res.status(201).json({ code: order.code, token });
});

// Pedido visto por el comprador (link privado), o null.
export async function getOrderView(token) {
  token = String(token || '').toLowerCase();
  if (!/^[a-f0-9]{64}$/.test(token)) return null;
  const order = await Order.findOne({ tokenHash: sha256(token) }).lean();
  if (!order) return null;
  const [event, tickets] = await Promise.all([
    Event.findById(order.event).lean(),
    order.status === 'approved' ? Ticket.find({ order: order._id }).sort({ _id: 1 }).lean() : [],
  ]);
  return {
    code: order.code,
    status: order.status,
    note: order.status === 'pending' ? '' : order.note,
    createdAt: order.createdAt,
    event: event ? publicEvent(event) : null,
    typeName: order.typeName,
    quantity: order.quantity,
    total: order.total,
    buyer: { name: order.buyer.name, email: order.buyer.email },
    tickets: tickets.map((t) => ({ code: t.code, typeName: t.typeName, holder: t.holder, status: t.status })),
  };
}

// Estado del pedido (link privado del comprador).
router.get('/orders/:token', limiter(60, 1, 'Demasiadas consultas. Espera un momento.'), async (req, res) => {
  const view = await getOrderView(req.params.token);
  if (!view) return res.status(404).json({ error: 'Pedido no encontrado' });
  res.set('Cache-Control', 'no-store');
  res.json(view);
});

export default router;
