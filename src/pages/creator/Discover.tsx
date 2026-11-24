import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, money, safePhoto, type Offer } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Logo, Spinner } from '../../ui';

export default function Discover() {
  const { profile } = useAuth();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const [cat, setCat] = useState('All');

  useEffect(() => {
    supabase
      .from('offers')
      .select('*, businesses(*)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        const open = ((data as Offer[]) ?? []).filter((o) => o.spots_claimed < o.spots_total);
        // real listings first, samples after
        open.sort((a, b) => Number(a.businesses?.is_demo) - Number(b.businesses?.is_demo));
        setOffers(open);
      });
  }, []);

  const categories = useMemo(() => {
    const set = new Set((offers ?? []).map((o) => o.businesses?.category).filter(Boolean) as string[]);
    return ['All', ...Array.from(set).sort()];
  }, [offers]);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (offers ?? []).filter((o) => {
      if (cat !== 'All' && o.businesses?.category !== cat) return false;
      if (!s) return true;
      return [o.businesses?.name, o.businesses?.category, o.businesses?.neighborhood, o.deliverables].join(' ').toLowerCase().includes(s);
    });
  }, [offers, q, cat]);

  const featured = shown.slice(0, 4);
  const rest = shown.slice(4);
  const anyDemo = shown.some((o) => o.businesses?.is_demo);

  return (
    <div className="page">
      <header className="header">
        <div className="header-row">
          <div>
            <div className="kicker">Hi {profile?.full_name.split(' ')[0] || 'there'}</div>
            <h1>Discover</h1>
          </div>
        </div>
        <label className="search">
          <svg aria-hidden="true" width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#6B655C" strokeWidth="2" strokeLinecap="round"><circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" /></svg>
          <span className="sr-only">Search offers</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Restaurants, cuisines, neighborhoods" />
        </label>
        {categories.length > 2 && (
          <div className="chips" role="tablist" aria-label="Categories">
            {categories.map((c) => (
              <button key={c} role="tab" aria-selected={cat === c} className={'chip' + (cat === c ? ' on' : '')} onClick={() => setCat(c)}>{c}</button>
            ))}
          </div>
        )}
      </header>

      {!profile?.handle && (
        <Link to="/profile" className="banner">Add your Instagram or TikTok handle to start claiming offers →</Link>
      )}

      <ErrorNote msg={error} />
      {offers === null ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <Empty title="Nothing here yet" body={q || cat !== 'All' ? 'Try a different search or category.' : 'New comps from local spots show up here. Check back soon.'} />
      ) : (
        <>
          <h2 className="section-title">Open comps</h2>
          <div className="carousel">
            {featured.map((o) => (
              <Link key={o.id} to={`/offer/${o.id}`} className="feature-card">
                <div className="feature-img" style={{ background: tint(o.businesses?.brand_color) }}>
                  {safePhoto(o.businesses?.photo_url) && <img src={safePhoto(o.businesses?.photo_url)!} alt="" />}
                  <span className="chip-white">{money(o.comp_cents)} comp</span>
                  {o.businesses?.is_demo && <span className="chip-sample">Sample</span>}
                  {o.businesses && <div className="feature-logo"><Logo business={o.businesses} size={44} /></div>}
                </div>
                <div className="card-title">{o.businesses?.name}</div>
                <div className="card-meta">{[o.businesses?.category, o.businesses?.neighborhood].filter(Boolean).join(' · ')}</div>
                <div className="card-meta">{o.deliverables}</div>
              </Link>
            ))}
          </div>
          {rest.length > 0 && (
            <>
              <h2 className="section-title">More near you</h2>
              <div className="list">
                {rest.map((o) => (
                  <Link key={o.id} to={`/offer/${o.id}`} className="row">
                    {o.businesses && <Logo business={o.businesses} size={52} />}
                    <div className="row-main">
                      <div className="row-title">{o.businesses?.name}</div>
                      <div className="row-meta">{[o.businesses?.neighborhood, o.deliverables].filter(Boolean).join(' · ')}{o.businesses?.is_demo ? ' · Sample' : ''}</div>
                    </div>
                    <div className="row-value">{money(o.comp_cents)}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
          {anyDemo && <p className="small muted">Listings marked Sample show how Comped works. Real offers from local spots appear first as they join.</p>}
        </>
      )}
    </div>
  );
}

function tint(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#D9CBB8';
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.72);
  return `rgb(${mix((n >> 16) & 255)}, ${mix((n >> 8) & 255)}, ${mix(n & 255)})`;
}
