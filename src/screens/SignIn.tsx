import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../lib/api.ts';

export function SignIn({ onSignedIn }: { onSignedIn: () => void }) {
  const [needsSetup, setNeedsSetup] = useState<boolean | null>(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [signupCode, setSignupCode] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.needsSetup().then((r) => setNeedsSetup(r.needsSetup)).catch(() => setNeedsSetup(false));
  }, []);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError(null);
    try {
      if (needsSetup) await api.register(email, password, signupCode || undefined);
      else await api.login(email, password);
      onSignedIn();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'That did not work.');
      setBusy(false);
    }
  }

  return (
    <main className="shell">
      <header className="topbar">
        <h1 className="topbar__date" style={{ fontSize: 'var(--step-2)' }}>Standing</h1>
      </header>

      <p className="quiet" style={{ marginTop: 0, marginBottom: 'var(--space-6)' }}>
        {needsSetup
          ? 'Set up your account. It stays on your own server.'
          : 'Log a meal, know where you stand.'}
      </p>

      <form onSubmit={submit} className="stack">
        <div className="field">
          <label className="field__label" htmlFor="email">Email</label>
          <input
            id="email" className="input" type="email" autoComplete="email"
            inputMode="email" required value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="field">
          <label className="field__label" htmlFor="password">Password</label>
          <input
            id="password" className="input" type="password" required
            autoComplete={needsSetup ? 'new-password' : 'current-password'}
            minLength={8} value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          {needsSetup && <p className="field__hint">At least 8 characters.</p>}
        </div>

        {needsSetup && (
          <div className="field">
            <label className="field__label" htmlFor="code">Signup code (only if one is set)</label>
            <input
              id="code" className="input" type="text" value={signupCode}
              onChange={(e) => setSignupCode(e.target.value)}
            />
          </div>
        )}

        {error && <p role="alert" className="banner">{error}</p>}

        <button className="btn btn--primary btn--block" type="submit" disabled={busy}>
          {busy ? 'One moment…' : needsSetup ? 'Create account' : 'Sign in'}
        </button>
      </form>
    </main>
  );
}
