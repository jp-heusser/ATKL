/* Formulario de compra de entradas (página del evento). */
import { clp, compressImage } from '../lib/format.js';

export function initBuy() {
  const form = document.getElementById('buy');
  if (!form) return;
  const qtySel = form.elements.quantity;
  const errBox = form.querySelector('[data-error]');
  const submit = form.querySelector('[data-submit]');
  let proof = '';

  const selected = () => form.querySelector('input[name="ticketType"]:checked');

  const refresh = () => {
    const t = selected();
    form.querySelectorAll('.tt-option').forEach((o) => o.classList.toggle('is-on', o.contains(t)));
    const max = Number(t?.dataset.max || 1);
    const prev = Number(qtySel.value || 1);
    qtySel.innerHTML = Array.from({ length: max }, (_, i) => `<option value="${i + 1}">${i + 1}</option>`).join('');
    qtySel.value = String(Math.min(prev, max));
    const total = t ? Number(t.dataset.price) * Number(qtySel.value) : 0;
    form.querySelectorAll('[data-total]').forEach((el) => (el.textContent = clp(total)));
    form.querySelector('[data-amount]').textContent = String(total);
    form.querySelector('[data-amount-copy]').dataset.copy = String(total);
    submit.textContent = `Enviar pedido · ${clp(total)}`;
    submit.disabled = !t;
  };
  form.addEventListener('change', (e) => {
    if (e.target.name === 'ticketType' || e.target.name === 'quantity') refresh();
  });
  refresh();

  // Comprobante: se comprime en el navegador antes de subirlo.
  const fileErr = form.querySelector('[data-proof-error]');
  const preview = form.querySelector('[data-proof-preview]');
  form.elements.proof.addEventListener('change', async (e) => {
    const file = e.target.files?.[0];
    fileErr.hidden = true;
    if (!file) return;
    try {
      proof = await compressImage(file);
      preview.src = proof;
      preview.hidden = false;
      form.querySelector('[data-proof-empty]').hidden = true;
    } catch (err) {
      proof = '';
      fileErr.textContent = err.message;
      fileErr.hidden = false;
    }
  });

  const showError = (msg) => {
    errBox.textContent = msg;
    errBox.hidden = false;
    errBox.scrollIntoView({ block: 'center', behavior: 'smooth' });
  };

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    errBox.hidden = true;
    if (!form.reportValidity()) return;
    if (!proof) return showError('Falta subir el comprobante de la transferencia');
    const f = form.elements;
    submit.disabled = true;
    submit.textContent = 'Enviando…';
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: form.dataset.event,
          ticketType: selected()?.value,
          quantity: Number(f.quantity.value),
          buyer: { name: f.name.value, email: f.email.value, doc: f.doc.value, phone: f.phone.value },
          proof,
          accept: f.accept.checked,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'No se pudo enviar el pedido');
      try {
        const list = JSON.parse(localStorage.getItem('atkl_orders') || '[]').filter((o) => o.token !== data.token);
        list.unshift({ token: data.token, code: data.code, title: document.querySelector('h1')?.textContent, at: Date.now() });
        localStorage.setItem('atkl_orders', JSON.stringify(list.slice(0, 20)));
      } catch {}
      location.href = `/pedido/${data.token}`;
    } catch (err) {
      showError(err.message === 'Failed to fetch' ? 'No se pudo conectar. Revisa tu conexión e intenta de nuevo.' : err.message);
      refresh();
    }
  });
}
