import { useState, type FormEvent } from 'react';
import { supabase, errMsg, type Role } from '../lib';
import { ErrorNote } from '../ui';

export default function AuthPage() {
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');
  const [role, setRole] = useState<Role>('creator');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [checkEmail, setCheckEmail] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'signup') {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { role, full_name: name.trim() }, emailRedirectTo: window.location.origin + import.meta.env.BASE_URL },
        });
        if (error) throw error;
        if (!data.session) {
          // Accounts are confirmed automatically, so sign straight in.
          const { error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
          if (signInError) setCheckEmail(true);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
        if (error) throw error;
      }
    } catch (err) {
      setError(errMsg(err));
    } finally {
      setBusy(false);
    }
  }

  if (checkEmail) {
    return (
      <div className="page auth">
        <div className="wordmark">comped</div>
        <h1 className="display">Check your email</h1>
        <p className="muted">We sent a confirmation link to {email}. Open it on this device to finish signing up.</p>
        <button className="btn secondary" onClick={() => { setCheckEmail(false); setMode('signin'); }}>Back to sign in</button>
      </div>
    );
  }

  return (
    <div className="page auth">
      <div className="hero-tiles" aria-hidden="true">
        <div style={{ background: '#D9CBB8', gridRow: 'span 2' }} />
        <div style={{ background: '#BFC8BC' }} />
        <div style={{ background: '#C9B7A0' }} />
      </div>
      <div className="wordmark">comped</div>
      <h1 className="display">Great food,<br />on the house.</h1>
      <p className="muted">Local restaurants comp your meal. You share it with your followers.</p>

      <form onSubmit={submit} className="form">
        {mode === 'signup' && (
          <>
            <div className="segmented" role="radiogroup" aria-label="I am a">
              <button type="button" role="radio" aria-checked={role === 'creator'} className={role === 'creator' ? 'on' : ''} onClick={() => setRole('creator')}>I'm a creator</button>
              <button type="button" role="radio" aria-checked={role === 'business'} className={role === 'business' ? 'on' : ''} onClick={() => setRole('business')}>I own a business</button>
            </div>
            <label className="field">
              <span>{role === 'business' ? 'Your name' : 'Full name'}</span>
              <input value={name} onChange={(e) => setName(e.target.value)} required maxLength={80} autoComplete="name" />
            </label>
          </>
        )}
        <label className="field">
          <span>Email</span>
          <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required autoComplete="email" />
        </label>
        <label className="field">
          <span>Password</span>
          <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={8} autoComplete={mode === 'signup' ? 'new-password' : 'current-password'} />
        </label>
        <ErrorNote msg={error} />
        <button className="btn primary" disabled={busy}>{busy ? 'One sec…' : mode === 'signup' ? 'Create account' : 'Sign in'}</button>
      </form>
      <button className="link-btn center-text" onClick={() => { setError(null); setMode(mode === 'signup' ? 'signin' : 'signup'); }}>
        {mode === 'signup' ? 'Already have an account? ' : 'New here? '}
        <strong>{mode === 'signup' ? 'Sign in' : 'Create an account'}</strong>
      </button>
    </div>
  );
}
