import { FormEvent, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { OvenLogo } from '../components/OvenLogo';

export function LoginPage() {
  const { loginWithCredentials } = useAuth();
  const navigate = useNavigate();
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await loginWithCredentials(nationalId, password);
      navigate('/', { replace: true });
    } catch {
      setError('Cédula o contraseña incorrecta');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="login-page">
      <div className="card login-card">
        <div className="login-card__logo">
          <OvenLogo size={64} />
          <h1>Hornillas</h1>
          <p className="login-card__tagline">El arte del pan y el aroma del café.</p>
        </div>
        {error && <div className="error-banner">{error}</div>}
        <form onSubmit={handleSubmit}>
          <div className="form-field">
            <label htmlFor="nationalId">Cédula</label>
            <input
              id="nationalId"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value)}
              autoFocus
              inputMode="numeric"
              required
            />
          </div>
          <div className="form-field">
            <label htmlFor="password">Contraseña</label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary" style={{ width: '100%' }} disabled={submitting}>
            {submitting ? 'Ingresando...' : 'Ingresar'}
          </button>
        </form>
      </div>
    </div>
  );
}
