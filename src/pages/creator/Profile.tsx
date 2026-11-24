import { useEffect, useState, type FormEvent } from 'react';
import { supabase, errMsg } from '../../lib';
import { useAuth } from '../../auth';
import { ErrorNote, Header } from '../../ui';

export default function CreatorProfile() {
  const { profile, session, refresh } = useAuth();
  const [name, setName] = useState('');
  const [handle, setHandle] = useState('');
  const [platform, setPlatform] = useState<'instagram' | 'tiktok'>('instagram');
  const [followers, setFollowers] = useState('');
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    setName(profile.full_name);
    setHandle(profile.handle ?? '');
    setPlatform(profile.platform ?? 'instagram');
    setFollowers(profile.followers ? String(profile.followers) : '');
  }, [profile]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    setSaved(false);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: name.trim(),
        handle: handle.trim().replace(/^@/, '') || null,
        platform,
        followers: Math.max(0, parseInt(followers.replace(/[^0-9]/g, '') || '0', 10)),
      })
      .eq('id', profile.id);
    setBusy(false);
    if (error) return setError(errMsg(error));
    setSaved(true);
    refresh();
  }

  return (
    <div className="page">
      <Header title="Profile" kicker={session?.user.email} />
      <form className="form" onSubmit={save}>
        <label className="field"><span>Name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
        <div className="field">
          <span>Main platform</span>
          <div className="segmented" role="radiogroup" aria-label="Main platform">
            <button type="button" role="radio" aria-checked={platform === 'instagram'} className={platform === 'instagram' ? 'on' : ''} onClick={() => setPlatform('instagram')}>Instagram</button>
            <button type="button" role="radio" aria-checked={platform === 'tiktok'} className={platform === 'tiktok' ? 'on' : ''} onClick={() => setPlatform('tiktok')}>TikTok</button>
          </div>
        </div>
        <label className="field"><span>Handle</span><input value={handle} onChange={(e) => setHandle(e.target.value)} placeholder="@yourhandle" maxLength={40} required /></label>
        <label className="field"><span>Followers</span><input inputMode="numeric" value={followers} onChange={(e) => setFollowers(e.target.value)} placeholder="e.g. 4200" required /></label>
        <p className="small muted">Restaurants see your handle and follower count when you claim. Keep it accurate — they check.</p>
        <ErrorNote msg={error} />
        {saved && <p className="note good">Saved.</p>}
        <button className="btn dark" disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
      </form>
      <button className="link-btn danger" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );
}
