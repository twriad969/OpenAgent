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
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="panel emotional-enter w-full max-w-md p-8">
        <p className="mb-2 text-xs tracking-[0.24em] text-[#9f947f]">LANDINGFORGE</p>
        <h1 className="mb-2 text-4xl text-[var(--text)]">{mode === 'login' ? 'Return to Craft' : 'Begin Crafting'}</h1>
        <p className="mb-6 text-sm text-[#b7ad9a]">Build cinematic PHP experiences with streaming agent feedback.</p>

        <div className="mb-4 grid grid-cols-2 gap-2">
          <button onClick={() => setMode('login')} className={mode === 'login' ? 'btn-primary' : 'btn'} type="button">Sign in</button>
          <button onClick={() => setMode('signup')} className={mode === 'signup' ? 'btn-primary' : 'btn'} type="button">Sign up</button>
        </div>

        <form onSubmit={onSubmit} className="space-y-3">
          <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@company.com" className="input" />
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Password" className="input" minLength={8} />
          <button disabled={loading} className="btn-primary w-full disabled:opacity-50">
            {loading ? 'Please wait…' : mode === 'login' ? 'Sign in' : 'Create account'}
          </button>
          {error && <p className="text-sm text-[var(--danger)]">{error}</p>}
        </form>
      </div>
    </div>
  );
}
