import { useCallback, useEffect, useState } from 'react';
import { api, ApiError, type Me } from './lib/api.ts';
import { SignIn } from './screens/SignIn.tsx';
import { Onboarding } from './screens/Onboarding.tsx';
import { Today } from './screens/Today.tsx';
import { Settings } from './screens/Settings.tsx';

type Status = 'loading' | 'signed_out' | 'onboarding' | 'ready';

export function App() {
  const [status, setStatus] = useState<Status>('loading');
  const [me, setMe] = useState<Me | null>(null);
  const [view, setView] = useState<'today' | 'settings'>('today');

  const load = useCallback(async () => {
    try {
      const next = await api.me();
      setMe(next);
      // Targets need a height, a birth date and a weight before the day view
      // means anything, so onboarding is not optional.
      setStatus(next.profile.onboarded && next.targets.calculated ? 'ready' : 'onboarding');
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) setStatus('signed_out');
      else setStatus('signed_out');
    }
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (status === 'loading') {
    return (
      <main className="shell" aria-busy="true">
        <p className="quiet" style={{ paddingTop: '4rem' }}>One moment…</p>
      </main>
    );
  }

  if (status === 'signed_out') return <SignIn onSignedIn={load} />;
  if (status === 'onboarding' || !me) return <Onboarding me={me} onDone={load} />;

  if (view === 'settings') {
    return <Settings me={me} onBack={() => { setView('today'); void load(); }} onSignedOut={load} />;
  }

  return <Today me={me} onOpenSettings={() => setView('settings')} onProfileChanged={load} />;
}
