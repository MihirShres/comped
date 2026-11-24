import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, money, type Offer } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Logo, Spinner } from '../../ui';

export default function Discover() {
  const { profile } = useAuth();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [q, setQ] = useState('');

  useEffect(() => {
    supabase
      .from('offers')
      .select('*, businesses(*)')
      .eq('active', true)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setOffers(((data as Offer[]) ?? []).filter((o) => o.spots_claimed < o.spots_total));
      });
  }, []);

  const shown = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!offers) return [];
    if (!s) return offers;
    return offers.filter((o) =>
      [o.businesses?.name, o.businesses?.category, o.businesses?.neighborhood, o.deliverables]
        .join(' ')
        .toLowerCase()
        .includes(s),
    );
  }, [offers, q]);

  const featured = shown.slice(0, 3);
  const rest = shown.slice(3);

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
      </header>

      {!profile?.handle && (
        <Link to="/profile" className="banner">
          Add your Instagram or TikTok handle to start claiming offers →
        </Link>
      )}

      <ErrorNote msg={error} />
      {offers === null ? (
        <Spinner />
      ) : shown.length === 0 ? (
        <Empty title="No open offers yet" body={q ? 'Try a different search.' : 'New comps from local spots show up here. Check back soon.'} />
      ) : (
        <>
          <h2 className="section-title">Open comps</h2>
          <div className="carousel">
            {featured.map((o) => (
              <Link key={o.id} to={`/offer/${o.id}`} className="feature-card">
                <div className="feature-img" style={{ background: tint(o.businesses?.brand_color) }}>
                  <span className="chip-white">{money(o.comp_cents)} comp</span>
                  {o.businesses && (
                    <div className="feature-logo">
                      <Logo business={o.businesses} size={44} />
                    </div>
                  )}
                </div>
                <div className="card-title">{o.businesses?.name}</div>
                <div className="card-meta">
                  {[o.businesses?.category, o.businesses?.neighborhood].filter(Boolean).join(' · ')} · {o.deliverables}
                </div>
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
                      <div className="row-meta">{o.deliverables}</div>
                    </div>
                    <div className="row-value">{money(o.comp_cents)}</div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}

function tint(hex?: string) {
  if (!hex || !/^#[0-9a-f]{6}$/i.test(hex)) return '#D9CBB8';
  const n = parseInt(hex.slice(1), 16);
  const mix = (c: number) => Math.round(c + (255 - c) * 0.72);
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `rgb(${r}, ${g}, ${b})`;
}
