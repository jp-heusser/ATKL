# API de ATKL Records (Express + MongoDB)

Backend del hub. Guarda en MongoDB los datos del sello y de los artistas, y los entrega a la web.

## Puesta en marcha

1. Instalar dependencias (una vez): `npm install`
2. Crear el archivo **`.env`** en la raíz del proyecto, copiando `.env.example`: poner la cadena de conexión real en `MONGODB_URI` (usuario y contraseña **sin** los `< >`) y una clave larga y aleatoria en `JWT_SECRET`.
3. En MongoDB Atlas → **Network Access**, autorizar la IP desde donde se conecta.
4. Cargar los datos actuales en la base: `npm run seed`
5. Levantar la API: `npm run server` → http://localhost:3001/api/hub
6. En otra terminal, la web: `npm run dev` → http://localhost:5173

El `.env` está en `.gitignore`: **nunca** se sube al repositorio.

## Modelos (`server/models/`)

| Modelo | Colección | Contenido |
|---|---|---|
| `Label` | `labels` | Un solo documento: `name`, `bio`, `socials[]` (íconos), `links[]` (botones en orden) |
| `Artist` | `artists` | `slug` (único), `name`, `role`, `city`, `photo`, `socials[]` (íconos de redes), `links[]`, `order`, `active`, `owner` → User |
| `Photo` | `photos` | Imagen de perfil de cada artista |
| `User` | `users` | Para el login (siguiente etapa): `email` (único), `passwordHash`, `role` (`admin` / `artist`), `artist` → Artist, `active`, `lastLoginAt` |

Cada enlace es `{ url, label, icon, embed }`. Con `embed: true` se muestra como reproductor incrustado en vez de botón (YouTube, SoundCloud o un post/reel de Instagram; máximo 6 por lista). El orden de la lista es el orden en la página. La URL debe empezar con `https://` o `mailto:`. El ícono se reconoce solo a partir de la URL; `icon` permite elegir otro a mano desde el panel (lista en `src/platforms.js`).

## Rutas

**Públicas**
- `GET /api/health` — estado.
- `GET /api/hub` — sello + artistas activos (lo que usa la web).
- `GET /api/artists/:slug` — un artista.

**Sesión** (`Authorization: Bearer <token>`, dura 7 días)
- `POST /api/auth/login` — `{ email, password }` → `{ token, user }`. Máximo 10 intentos cada 15 min por IP.
- `GET /api/auth/me` — usuario de la sesión.
- `POST /api/auth/password` — `{ current, next }` (mínimo 10 caracteres).

**Artista** (su propio perfil)
- `GET /api/me/artist` · `PUT /api/me/artist` — edita nombre, rol, ciudad y enlaces. No puede cambiar slug, orden ni visibilidad.

**Admin**
- `GET/PUT /api/admin/label` — datos del sello.
- `GET/POST /api/admin/artists` · `PUT /api/admin/artists/:slug` — todos los artistas.
- `POST /api/admin/accounts` — `{ email, slug }` crea la cuenta del artista (o reinicia su contraseña) y devuelve una contraseña temporal una sola vez.

## Cuentas

Las contraseñas se guardan cifradas (bcrypt). La primera cuenta de administrador se crea por terminal:

```sh
npm run create-user -- admin correo@dominio.cl
```

Muestra una contraseña temporal; cámbiala al entrar. Las cuentas de artistas se crean desde el panel (pestaña Artistas) o con `npm run create-user -- artist correo slug-del-artista`.

## Direcciones de la web

Cada artista tiene una dirección limpia: `tusitio.com/slug` (por ejemplo `/desmont-landvik`). No usa `#`, porque Instagram lo convierte en `%23` al pegar el link en la bio. Los links antiguos (`/#slug`) y los que Instagram rompió (`/%23slug`) se siguen entendiendo y se corrigen solos. `vercel.json` envía cualquier ruta que no sea archivo ni `/api` a la web.

## Panel en la web

- `/acceso` — login.
- `/panel` — el artista edita su perfil y enlaces; el admin edita el sello, cualquier artista, crea artistas y cuentas.

El enlace "Acceso" aparece al pie de la web solo cuando hay API configurada.

## Cómo usa la web estos datos

`src/useHub.js` muestra primero los datos locales (`src/data/`) y, si la API responde, los reemplaza por los de MongoDB. Si la API no está disponible, la web sigue funcionando con los datos locales (sin panel).

En producción, la web necesita la variable `VITE_API_URL` con la dirección pública de la API al hacer el build, y conviene limitar `CORS_ORIGIN` al dominio de la web. GitHub Pages solo sirve archivos estáticos: la API debe alojarse aparte (Render, Railway, Fly.io, un VPS…).

## Fotos de perfil

Se suben desde el panel. El navegador las recorta cuadradas a 400×400 (JPEG) antes de enviarlas.

Se guardan en MongoDB (colección `photos`, una por artista) y se sirven en `/api/photos/:id`. Funciona igual en local y en Vercel; como ambos usan la misma base, la foto subida en uno se ve en el otro.

Rutas: `PUT/DELETE /api/me/photo` (artista) y `PUT/DELETE /api/admin/artists/:slug/photo` (admin), con cuerpo `{ image: "data:image/jpeg;base64,…" }`. Se aceptan JPG, PNG y WebP de hasta 600 kB.

## Pendiente

- Recuperación de contraseña por correo (hoy la reinicia un admin).

## Publicar en Vercel (web + API juntas)

El repo ya está preparado: `vercel.json` publica la web (Vite) y envía todo `/api/*` a `api/index.js`, que ejecuta la app Express como función serverless.

1. En vercel.com → **Add New → Project** → importar el repositorio de GitHub. Vercel detecta Vite; no hay que cambiar nada.
2. En **Settings → Environment Variables** agregar (las mismas del `.env` local):
   - `MONGODB_URI`
   - `MONGODB_DB` = `atkl`
   - `JWT_SECRET` (larga y aleatoria; puede ser distinta a la local)
3. En MongoDB Atlas → **Network Access** → permitir `0.0.0.0/0`. Vercel no tiene IP fija, así que la protección queda en el usuario y la contraseña de la base: usar una contraseña larga y generada.
4. **Deploy**. Cada `push` a `main` vuelve a publicar.

La web y la API quedan en el mismo dominio, así que no hace falta `VITE_API_URL` ni `CORS_ORIGIN`.

Límites a tener en cuenta: el tope de intentos de login se cuenta por instancia de la función (en serverless es aproximado), y la primera visita tras un rato sin uso tarda un poco más (arranque en frío).

El workflow de GitHub Pages sigue funcionando, pero publica una versión solo estática (sin API ni panel). Si se usa Vercel, conviene desactivar Pages para no tener dos webs.

## Venta de entradas (transferencia + validación manual)

**Flujo**

1. El admin crea el evento (pestaña **Eventos**), le agrega tipos de entrada (precio, capacidad, máximo por compra), completa los **datos de transferencia** y lo pasa a **Publicado**.
2. El evento aparece en el inicio. El comprador, sin crear cuenta, elige entrada y cantidad, deja nombre, correo y RUT/pasaporte, transfiere y sube la captura del comprobante.
3. Las entradas quedan **reservadas** y el comprador recibe un link privado `/pedido/<token>`, que se actualiza solo.
4. El admin revisa el comprobante en **Ventas** y **aprueba** (se generan las entradas con QR en el link del comprador) o **rechaza** con un motivo (las entradas vuelven a la venta). Un pedido aprobado se puede **anular** (devolución): sus QR dejan de servir.
5. En la puerta, el personal entra a `/puerta`, elige el evento y escanea los QR con la cámara del celular. Si un QR no se lee, puede buscar por código de pedido (ATK-…) o RUT.

**Colecciones**

| Modelo | Colección | Contenido |
|---|---|---|
| `Event` | `events` | `slug`, `title`, `description`, `venue`, `address`, `city`, `startsAt`, `status` (`draft` / `published` / `closed`) |
| `TicketType` | `tickettypes` | `event`, `name`, `price` (CLP), `capacity`, `remaining`, `sold`, `maxPerOrder`, `active` |
| `Order` | `orders` | `code` (ATK-XXXXXX), `tokenHash`, `event`, `ticketType`, copia de nombre y precio, `quantity`, `total`, `buyer` (nombre, correo, RUT/pasaporte, teléfono), `status` (`pending` / `approved` / `rejected` / `cancelled`), `reviewedBy`, `note` |
| `Proof` | `proofs` | Imagen del comprobante de cada pedido (solo admin) |
| `Ticket` | `tickets` | Una por persona: `code` (va en el QR), `order`, `seq`, `event`, `holder`, `status` (`valid` / `used` / `void`), `usedAt`, `usedBy` |
| `Label.payment` | `labels` | Datos de la cuenta para transferir |
| `User` (rol `door`) | `users` | Personal de puerta: solo puede escanear |

**Garantías**

- No se vende más que la capacidad: la reserva descuenta con una operación atómica condicionada (`remaining >= cantidad`).
- Un pedido no se aprueba dos veces (cambio de estado condicionado + índice único `order+seq` en las entradas).
- Un QR entra una sola vez, aunque dos lectores lo escaneen a la vez.
- El link del comprador es un token aleatorio de 64 caracteres; en la base solo se guarda su hash.
- Los comprobantes solo los ve un admin y nunca se guardan en caché.
- Límite: 10 pedidos cada 15 min por IP.

**Rutas**

- Públicas: `GET /api/events`, `GET /api/events/:slug`, `POST /api/orders`, `GET /api/orders/:token`.
- Admin: `GET/POST /api/admin/events`, `PUT /api/admin/events/:id`, `POST /api/admin/events/:id/types`, `PUT /api/admin/types/:id`, `GET/PUT /api/admin/payment`, `GET /api/admin/orders`, `GET /api/admin/orders/:id/proof`, `POST /api/admin/orders/:id/approve|reject|void`, `GET/POST /api/admin/staff`, `PUT /api/admin/staff/:id`.
- Puerta (roles `door` o `admin`): `GET /api/door/events`, `POST /api/door/checkin`, `GET /api/door/lookup?q=`.

Cuenta de puerta por terminal: `npm run create-user -- door correo@dominio.cl` (o desde el panel: Eventos → Personal de puerta).

**Pendiente / ideas**

- Enviar las entradas también por correo (requiere un servicio de envío).
- Pedidos pendientes que nadie revisa mantienen sus entradas reservadas hasta que el admin los rechace.
- Exportar a planilla las ventas de un evento.
