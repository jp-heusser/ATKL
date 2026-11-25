/* Piezas pequeñas compartidas por los formularios del panel. */
import { useState } from 'react';

// Ejecuta una acción mostrando "guardando", el error o el mensaje de éxito.
export function useSaver() {
  const [state, setState] = useState({ busy: false, ok: '', error: '' });
  const run = async (fn, okMsg = 'Guardado ✓') => {
    setState({ busy: true, ok: '', error: '' });
    try {
      const r = await fn();
      setState({ busy: false, ok: okMsg, error: '' });
      return r;
    } catch (e) {
      setState({ busy: false, ok: '', error: e.message });
    }
  };
  return [state, run];
}

export const Status = ({ s }) => (
  <>
    {s.error && <p className="msg msg-error" role="alert">{s.error}</p>}
    {s.ok && <p className="msg msg-ok" role="status">{s.ok}</p>}
  </>
);
