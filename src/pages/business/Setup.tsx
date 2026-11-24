import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, errMsg, safePhoto } from '../../lib';
import { useAuth } from '../../auth';
import { ErrorNote, Header, Logo } from '../../ui';

const COLORS = ['#B4532A', '#1E4D3B', '#3F4A32', '#1C1A17', '#1F3A5F', '#8A2846', '#5B3A21', '#C2410C'];
const CATEGORIES = ['Restaurant', 'Café', 'Bar', 'Bakery', 'Dessert', 'Food truck', 'Salon', 'Gym', 'Boutique', 'Other'];

export default function BusinessSetup({ editing = false }: { editing?: boolean }) {
  const { profile, business, refresh } = useAuth();
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [category, setCategory] = useState('Restaurant');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [ig, setIg] = useState('');
  const [color, setColor] = useState(COLORS[0]);
  const [budget, setBudget] = useState('500');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;
    setName(business.name);
    setCategory(business.category);
    setNeighborhood(business.neighborhood);
    setAddress(business.address);
    setIg(business.instagram_handle);
    setColor(business.brand_color);
    setBudget(String(Math.round(business.monthly_budget_cents / 100)));
    setDescription(business.description ?? '');
    setPhoto(business.photo_url);
  }, [business]);

  async function save(e: FormEvent) {
    e.preventDefault();
    if (!profile) return;
    setBusy(true);
    setError(null);
    const row = {
      name: name.trim(),
      category,
      neighborhood: neighborhood.trim(),
      address: address.trim(),
      instagram_handle: ig.trim().replace(/^@/, ''),
      brand_color: color,
      monthly_budget_cents: Math.max(0, Math.round(parseFloat(budget || '0') * 100)),
      description: description.trim(),
      photo_url: photo,
    };
    const { error } = business
      ? await supabase.from('businesses').update(row).eq('id', business.id)
      : await supabase.from('businesses').insert({ ...row, owner_id: profile.id });
    setBusy(false);
    if (error) return setError(errMsg(error));
    await refresh();
    if (editing) nav('/');
  }

  async function upload(file: File | undefined) {
    if (!file || !profile) return;
    if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return setError('Use a JPG, PNG or WebP photo.');
    if (file.size > 5 * 1024 * 1024) return setError('Photo must be under 5 MB.');
    setUploading(true);
    setError(null);
    const ext = file.type === 'image/png' ? 'png' : file.type === 'image/webp' ? 'webp' : 'jpg';
    const path = `${profile.id}/cover-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from('business-photos').upload(path, file, { contentType: file.type, upsert: false });
    setUploading(false);
    if (error) return setError(errMsg(error));
    setPhoto(supabase.storage.from('business-photos').getPublicUrl(path).data.publicUrl);
  }

  return (
    <div className="page">
      <Header title={editing ? 'Business settings' : 'Set up your business'} back={editing ? '/' : undefined} kicker={editing ? undefined : 'Comped for Business'} />
      {!editing && <p className="muted">This is what creators see when they browse your offers.</p>}
      <form className="form" onSubmit={save}>
        <div className="preview-row">
          <Logo business={{ name: name || 'Your business', brand_color: color }} size={56} />
          <div>
            <div className="row-title">{name || 'Your business'}</div>
            <div className="row-meta">{[category, neighborhood].filter(Boolean).join(' · ')}</div>
          </div>
        </div>
        <div className="field">
          <span>Cover photo</span>
          <label className="photo-picker" style={safePhoto(photo) ? { backgroundImage: `url("${safePhoto(photo)}")` } : undefined}>
            <input type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={(e) => upload(e.target.files?.[0])} />
            <span>{uploading ? 'Uploading…' : photo ? 'Change photo' : 'Add a photo of your food or space'}</span>
          </label>
        </div>
        <label className="field"><span>Business name</span><input value={name} onChange={(e) => setName(e.target.value)} maxLength={80} required /></label>
        <label className="field"><span>Short description</span>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} maxLength={300} rows={2} placeholder="What you're known for, in a sentence." />
        </label>
        <label className="field"><span>Category</span>
          <select value={category} onChange={(e) => setCategory(e.target.value)}>{CATEGORIES.map((c) => <option key={c}>{c}</option>)}</select>
        </label>
        <label className="field"><span>Neighborhood</span><input value={neighborhood} onChange={(e) => setNeighborhood(e.target.value)} placeholder="e.g. Mill Ave, Tempe" maxLength={60} /></label>
        <label className="field"><span>Address</span><input value={address} onChange={(e) => setAddress(e.target.value)} maxLength={120} autoComplete="street-address" /></label>
        <label className="field"><span>Instagram handle creators should tag</span><input value={ig} onChange={(e) => setIg(e.target.value)} placeholder="@yourspot" maxLength={40} /></label>
        <div className="field">
          <span>Logo color</span>
          <div className="swatches">
            {COLORS.map((c) => (
              <button type="button" key={c} aria-label={'Color ' + c} aria-pressed={color === c} className={'swatch' + (color === c ? ' on' : '')} style={{ background: c }} onClick={() => setColor(c)} />
            ))}
          </div>
        </div>
        <label className="field"><span>Monthly food-credit budget ($)</span><input inputMode="decimal" value={budget} onChange={(e) => setBudget(e.target.value)} /></label>
        <ErrorNote msg={error} />
        <button className="btn dark" disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Create business'}</button>
      </form>
      <button className="link-btn danger" onClick={() => supabase.auth.signOut()}>Sign out</button>
    </div>
  );
}
