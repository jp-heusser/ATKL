/* Mini-router con la misma forma que Express (router.get, router.use, req.params, res.status().json()…),
   para que las rutas de la API sigan iguales y corran dentro de un endpoint de Astro (sin Express).

   Soporta: get/post/put/delete, use(middleware) y use('/prefijo', subrouter), parámetros :x,
   middlewares async (req, res, next) y errores lanzados (se pasan al manejador de errores). */

const compile = (path, prefixOnly) => {
  const keys = [];
  const src = path
    .replace(/\/+$/, '')
    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
    .replace(/:(\w+)/g, (_, k) => (keys.push(k), '([^/]+)'));
  return { re: new RegExp(`^${src}${prefixOnly ? '(?=/|$)' : '/?$'}`), keys };
};

export function Router() {
  const stack = []; // { method, re, keys, prefix, handlers }
  const add = (method, path, handlers, prefix = false) => stack.push({ method, ...compile(path, prefix), prefix, handlers });

  const router = {
    get: (p, ...h) => add('GET', p, h),
    post: (p, ...h) => add('POST', p, h),
    put: (p, ...h) => add('PUT', p, h),
    delete: (p, ...h) => add('DELETE', p, h),
    use(p, ...h) {
      if (typeof p !== 'string') return add(null, '', [p, ...h], true);
      return add(null, p, h, true);
    },
    // Recorre la pila; devuelve true si alguna ruta respondió.
    async handle(req, res, base = '') {
      const path = req.path.slice(base.length) || '/';
      for (const layer of stack) {
        if (res.finished) return true;
        if (layer.method && layer.method !== req.method) continue;
        const m = layer.re.exec(path);
        if (!m) continue;
        const params = { ...req.params };
        layer.keys.forEach((k, i) => (params[k] = decodeURIComponent(m[i + 1])));
        req.params = params;
        const nextBase = base + (layer.prefix ? m[0] : '');
        for (const h of layer.handlers) {
          let advanced = false;
          if (typeof h?.handle === 'function') {
            if (await h.handle(req, res, nextBase)) return true;
            advanced = true;
          } else {
            await new Promise((resolve, reject) => {
              const next = (err) => (err ? reject(err) : ((advanced = true), resolve()));
              Promise.resolve(h(req, res, next)).then(() => resolve(), reject);
            });
          }
          if (res.finished) return true;
          if (!advanced) break; // el middleware no llamó next() ni respondió
        }
      }
      return res.finished;
    },
  };
  return router;
}

// Objeto "res" al estilo Express que termina en un Response estándar.
export function createRes() {
  const headers = new Headers();
  const res = {
    statusCode: 200,
    body: null,
    finished: false,
    headers,
    status(code) {
      res.statusCode = code;
      return res;
    },
    set(name, value) {
      if (typeof name === 'object') Object.entries(name).forEach(([k, v]) => headers.set(k, v));
      else headers.set(name, value);
      return res;
    },
    json(data) {
      headers.set('Content-Type', 'application/json; charset=utf-8');
      res.body = JSON.stringify(data);
      res.finished = true;
      return res;
    },
    send(data) {
      res.body = data;
      res.finished = true;
      return res;
    },
    end() {
      res.finished = true;
      return res;
    },
    cookie(name, value, opts) {
      res.cookies = res.cookies || [];
      res.cookies.push({ name, value, opts });
      return res;
    },
    toResponse() {
      return new Response(res.body ?? null, { status: res.statusCode, headers });
    },
  };
  return res;
}

// Límite de peticiones en memoria (aproximado en serverless: cada instancia lleva su cuenta).
export function rateLimit({ windowMs, limit, message }) {
  const hits = new Map();
  return (req, res, next) => {
    const now = Date.now();
    const key = req.ip || 'anon';
    let h = hits.get(key);
    if (!h || now > h.reset) h = { n: 0, reset: now + windowMs };
    h.n++;
    hits.set(key, h);
    if (hits.size > 5000) for (const [k, v] of hits) if (now > v.reset) hits.delete(k);
    if (h.n > limit) {
      res.set('Retry-After', String(Math.ceil((h.reset - now) / 1000)));
      return res.status(429).json(message || { error: 'Demasiadas peticiones' });
    }
    next();
  };
}
export default rateLimit;
