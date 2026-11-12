/* Panel: el artista edita su perfil; el admin edita el sello, los artistas y crea cuentas. */
import { useEffect, useState } from 'react';
import { api, setToken } from '../api.js';
import LinksEditor from './LinksEditor.jsx';
import PhotoField from './PhotoField.jsx';

const blank = { name: '', role: '', city: '', photo: '', links: [], instagram: [] };
const MAX_IG = 3;

function useSaver() {
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

const Status = ({ s }) => (
  <>
    {s.error && <p className="msg msg-error" role="alert">{s.error}</p>}
    {s.ok && <p className="msg msg-ok" role="status">{s.ok}</p>}
  </>
);

/* ---------- Perfil de artista (propio, o el elegido por el admin) ---------- */
function ArtistForm({ initial, onSave, admin, onSaved, photoPath }) {
  const [a, setA] = useState({ ...blank, ...initial });
  const [s, run] = useSaver();
  useEffect(() => setA({ ...blank, ...initial }), [initial?.slug]); // no pisa lo que se está editando
  const field = (k) => ({ value: a[k] ?? '', onChange: (e) => setA({ ...a, [k]: e.target.value }) });

  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await onSave(a);
      onSaved?.();
    });
  };

  return (
    <form className="card form" onSubmit={submit}>
      <PhotoField
        artist={a}
        onUpload={async (image) => {
          const r = await api(photoPath, { method: 'PUT', body: { image } });
          setA((x) => ({ ...x, photo: r.photo }));
          onSaved?.();
        }}
        onRemove={async () => {
          await api(photoPath, { method: 'DELETE' });
          setA((x) => ({ ...x, photo: '' }));
          onSaved?.();
        }}
      />
      <label>Nombre artístico<input required maxLength={80} {...field('name')} /></label>
      <div className="form-2">
        <label>Rol<input maxLength={80} placeholder="DJ / Productor" {...field('role')} /></label>
        <label>Ciudad<input maxLength={60} {...field('city')} /></label>
      </div>
      <span className="form-label">Enlaces</span>
      <LinksEditor links={a.links} onChange={(links) => setA({ ...a, links })} />
      <span className="form-label">Destacados de Instagram (máx. {MAX_IG})</span>
      <p className="form-hint">Pega el enlace de una publicación o reel público. Se muestran incrustados en tu página.</p>
      {a.instagram.map((url, i) => (
        <div className="ig-row" key={i}>
          <input
            type="url"
            placeholder="https://www.instagram.com/p/…"
            value={url}
            onChange={(e) => setA({ ...a, instagram: a.instagram.map((u, k) => (k === i ? e.target.value : u)) })}
            aria-label={`Publicación de Instagram ${i + 1}`}
          />
          <button type="button" className="btn-link" onClick={() => setA({ ...a, instagram: a.instagram.filter((_, k) => k !== i) })} aria-label="Quitar">
            ✕
          </button>
        </div>
      ))}
      {a.instagram.length < MAX_IG && (
        <button type="button" className="btn-ghost" onClick={() => setA({ ...a, instagram: [...a.instagram, ''] })}>
          + Agregar publicación
        </button>
      )}
      {admin && (
        <label className="check">
          <input type="checkbox" checked={a.active !== false} onChange={(e) => setA({ ...a, active: e.target.checked })} />
          Visible en la web
        </label>
      )}
      <Status s={s} />
      <button className="btn-primary" disabled={s.busy}>{s.busy ? 'Guardando…' : 'Guardar cambios'}</button>
      {a.slug && <a className="form-hint" href={`#${a.slug}`}>Ver mi página →</a>}
    </form>
  );
}

function PasswordForm() {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [s, run] = useSaver();
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      await api('/auth/password', { method: 'POST', body: { current, next } });
      setCurrent('');
      setNext('');
    }, 'Contraseña cambiada ✓');
  };
  return (
    <details className="card">
      <summary>Cambiar contraseña</summary>
      <form className="form" onSubmit={submit}>
        <label>Contraseña actual<input type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} /></label>
        <label>Nueva (mínimo 10 caracteres)<input type="password" autoComplete="new-password" required minLength={10} value={next} onChange={(e) => setNext(e.target.value)} /></label>
        <Status s={s} />
        <button className="btn-primary" disabled={s.busy}>Cambiar</button>
      </form>
    </details>
  );
}

/* ---------- Admin ---------- */
function LabelForm({ onSaved }) {
  const [l, setL] = useState(null);
  const [s, run] = useSaver();
  useEffect(() => {
    api('/admin/label').then(setL).catch(() => {});
  }, []);
  if (!l) return null;
  const submit = (e) => {
    e.preventDefault();
    run(async () => {
      setL(await api('/admin/label', { method: 'PUT', body: l }));
      onSaved?.();
    });
  };
  return (
    <form className="card form" onSubmit={submit}>
      <label>Nombre<input required maxLength={80} value={l.name} onChange={(e) => setL({ ...l, name: e.target.value })} /></label>
      <label>Descripción<textarea rows={2} maxLength={300} value={l.bio} onChange={(e) => setL({ ...l, bio: e.target.value })} /></label>
      <span className="form-label">Íconos de redes</span>
      <LinksEditor links={l.socials} onChange={(socials) => setL({ ...l, socials })} />
      <span className="form-label">Botones (en orden; sin URL no se muestran)</span>
      <LinksEditor links={l.links} onChange={(links) => setL({ ...l, links })} labelPlaceholder="Título del botón" />
      <Status s={s} />
      <button className="btn-primary" disabled={s.busy}>{s.busy ? 'Guardando…' : 'Guardar sello'}</button>
    </form>
  );
}

function AdminArtists({ onSaved }) {
  const [list, setList] = useState([]);
  const [slug, setSlug] = useState('');
  const [nu, setNu] = useState({ slug: '', name: '' });
  const [acc, setAcc] = useState({ email: '', result: null });
  const [s, run] = useSaver();

  const load = () => api('/admin/artists').then(setList).catch(() => {});
  useEffect(() => {
    load();
  }, []);
  const current = list.find((a) => a.slug === slug);

  const create = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api('/admin/artists', { method: 'POST', body: nu });
      await load();
      setSlug(r.slug);
      setNu({ slug: '', name: '' });
      onSaved?.();
    }, 'Artista creado ✓');
  };

  const createAccount = (e) => {
    e.preventDefault();
    run(async () => {
      const r = await api('/admin/accounts', { method: 'POST', body: { email: acc.email, slug } });
      setAcc({ email: '', result: r });
      await load();
    }, 'Cuenta lista ✓');
  };

  return (
    <>
      <div className="card form">
        <label>
          Artista
          <select value={slug} onChange={(e) => { setSlug(e.target.value); setAcc({ email: '', result: null }); }}>
            <option value="">— Elegir —</option>
            {list.map((a) => (
              <option key={a.slug} value={a.slug}>
                {a.name}{a.active ? '' : ' (oculto)'}
              </option>
            ))}
          </select>
        </label>
      </div>

      {current && (
        <>
          <ArtistForm
            admin
            photoPath={`/admin/artists/${current.slug}/photo`}
            initial={current}
            onSave={(a) => api(`/admin/artists/${current.slug}`, { method: 'PUT', body: a })}
            onSaved={() => { load(); onSaved?.(); }}
          />
          <form className="card form" onSubmit={createAccount}>
            <span className="form-label">Cuenta de acceso de {current.name}</span>
            <p className="form-hint">
              {current.account ? `Cuenta actual: ${current.account}. Crear otra vez reinicia su contraseña.` : 'Aún no tiene cuenta.'}
            </p>
            <label>Correo del artista<input type="email" required value={acc.email} onChange={(e) => setAcc({ ...acc, email: e.target.value })} /></label>
            <button className="btn-primary">Crear cuenta / reiniciar contraseña</button>
            {acc.result && (
              <p className="msg msg-ok">
                Entrégale estos datos (la contraseña no se vuelve a mostrar):<br />
                <strong>{acc.result.email}</strong> · <code>{acc.result.tempPassword}</code>
              </p>
            )}
          </form>
        </>
      )}

      <form className="card form" onSubmit={create}>
        <span className="form-label">Nuevo artista</span>
        <div className="form-2">
          <label>Nombre<input required value={nu.name} onChange={(e) => setNu({ ...nu, name: e.target.value })} /></label>
          <label>Slug (su link)<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" placeholder="nombre-artista" value={nu.slug} onChange={(e) => setNu({ ...nu, slug: e.target.value.toLowerCase() })} /></label>
        </div>
        <button className="btn-primary">Crear artista</button>
      </form>
      <Status s={s} />
    </>
  );
}

/* ---------- Panel ---------- */
export default function Panel({ user, onLogout, onChanged }) {
  const [mine, setMine] = useState(null);
  const [error, setError] = useState('');
  const [tab, setTab] = useState('artistas');
  const admin = user.role === 'admin';

  useEffect(() => {
    if (admin) return;
    api('/me/artist').then(setMine).catch((e) => setError(e.message));
  }, [admin]);

  const logout = () => {
    setToken(null);
    onLogout();
  };

  return (
    <main className="page">
      <nav className="back panel-bar">
        <a href="#">← ATKL Records</a>
        <button type="button" className="btn-link" onClick={logout}>Cerrar sesión</button>
      </nav>
      <h1 className="form-title">{admin ? 'Administración' : 'Mi perfil'}</h1>
      <p className="form-hint">{user.email}</p>

      {admin ? (
        <>
          <div className="tabs" role="tablist">
            <button role="tab" aria-selected={tab === 'artistas'} onClick={() => setTab('artistas')}>Artistas</button>
            <button role="tab" aria-selected={tab === 'sello'} onClick={() => setTab('sello')}>Sello</button>
          </div>
          {tab === 'artistas' ? <AdminArtists onSaved={onChanged} /> : <LabelForm onSaved={onChanged} />}
        </>
      ) : (
        <>
          {error && <p className="msg msg-error">{error}</p>}
          {mine && (
            <ArtistForm
              photoPath="/me/photo"
              initial={mine}
              onSave={async (a) => setMine(await api('/me/artist', { method: 'PUT', body: a }))}
              onSaved={onChanged}
            />
          )}
        </>
      )}
      <PasswordForm />
    </main>
  );
}
