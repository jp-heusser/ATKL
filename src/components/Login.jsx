import { useState } from 'react';
import { api, setToken } from '../api.js';

export default function Login({ onLogin }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');
    try {
      const { token, user } = await api('/auth/login', { method: 'POST', body: { email, password } });
      setToken(token);
      onLogin(user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page">
      <nav className="back">
        <a href="#">← ATKL Records</a>
      </nav>
      <form className="card form" onSubmit={submit}>
        <h1 className="form-title">Acceso</h1>
        <p className="form-hint">Para artistas y equipo de ATKL.</p>
        <label>
          Correo
          <input type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </label>
        <label>
          Contraseña
          <input type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
        </label>
        {error && <p className="msg msg-error" role="alert">{error}</p>}
        <button className="btn-primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar'}</button>
      </form>
    </main>
  );
}
