import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';

export default function Login() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = mode === 'login' ? await api.login(email, password) : await api.signup(email, password);
      localStorage.setItem('lf_token', data.token);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="min-h-screen p-5 lg:p-8">
      <div className="mx-auto grid min-h-[calc(100vh-2.5rem)] max-w-6xl gap-6 lg:grid-cols-[1.15fr,0.85fr]">
        <section className="panel surface-blue flex flex-col justify-between p-6 lg:p-8">
          <div>
            <p className="badge mb-4 inline-flex">LANDINGFORGE</p>
            <h1 className="max-w-xl text-5xl leading-tight">Ship fast websites with an agentic builder that stays focused.</h1>
            <p className="mt-4 max-w-lg text-sm text-[var(--muted)]">
              Neo-brutalist, no-noise workspace. Prompt. Stream. Preview. Iterate.
            </p>
          </div>
          <div className="grid gap-3 text-sm md:grid-cols-3">
            <div className="event-card p-3">Realtime activity feed</div>
            <div className="event-card p-3">Project-level preview</div>
            <div className="event-card p-3">Prompt history + files</div>
          </div>
        </section>

        <section className="panel emotional-enter p-6 lg:p-8">
          <h2 className="text-3xl">{mode === 'login' ? 'Welcome back' : 'Create account'}</h2>
          <p className="mt-1 text-sm text-[var(--muted)]">Simple auth. Straight into builder mode.</p>

          <div className="my-5 grid grid-cols-2 gap-2">
            <button onClick={() => setMode('login')} className={mode === 'login' ? 'btn-primary' : 'btn'} type="button">Sign in</button>
            <button onClick={() => setMode('signup')} className={mode === 'signup' ? 'btn-primary' : 'btn'} type="button">Sign up</button>
          </div>

          <form onSubmit={onSubmit} className="space-y-3">
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="input" />
            <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" minLength={8} />
            <button disabled={loading} className="btn-primary w-full disabled:opacity-50">{loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}</button>
            {error && <p className="badge mt-2 inline-flex !bg-[#ffd4d4] text-sm text-[#650000]">{error}</p>}
          </form>
        </section>
      </div>
    </main>
  );
}
