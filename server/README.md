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
