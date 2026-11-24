import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { supabase, money, errMsg, fmtFollowers, safePhoto, type Offer, type Claim } from '../../lib';
import { useAuth } from '../../auth';
import { ErrorNote, Header, Logo, Spinner } from '../../ui';

const TIMES = ['11:30', '12:30', '17:30', '18:30', '19:30', '20:30'];

function nextDays(allowed: number[]) {
  const out: Date[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  for (let i = 0; i < 14 && out.length < 5; i++) {
    const day = new Date(d);
    day.setDate(d.getDate() + i);
    if (allowed.includes(day.getDay())) out.push(day);
  }
  return out;
}

const label12 = (t: string) => {
  const [h, m] = t.split(':').map(Number);
  return `${((h + 11) % 12) + 1}:${String(m).padStart(2, '0')}${h < 12 ? ' AM' : ' PM'}`;
};

export default function OfferDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { profile } = useAuth();
  const [offer, setOffer] = useState<Offer | null>(null);
  const [existing, setExisting] = useState<Claim | null>(null);
  const [dayIdx, setDayIdx] = useState(0);
  const [time, setTime] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id || !profile) return;
    supabase.from('offers').select('*, businesses(*)').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message);
      setOffer(data as Offer);
    });
    supabase
      .from('claims')
      .select('*')
      .eq('offer_id', id)
      .eq('creator_id', profile.id)
      .neq('status', 'cancelled')
      .maybeSingle()
      .then(({ data }) => setExisting((data as Claim) ?? null));
  }, [id, profile]);

  const days = useMemo(() => (offer ? nextDays(offer.visit_days) : []), [offer]);
  const day = days[dayIdx];
  const slotDate = (t: string) => {
    const d = new Date(day);
    const [h, m] = t.split(':').map(Number);
    d.setHours(h, m, 0, 0);
    return d;
  };

  async function claim() {
    if (!offer || !day || !time) return;
    setBusy(true);
    setError(null);
    const { data, error } = await supabase.rpc('claim_offer', { p_offer_id: offer.id, p_visit_at: slotDate(time).toISOString() });
    setBusy(false);
    if (error) return setError(errMsg(error));
    nav(`/visits/${(data as Claim).id}`, { replace: true });
  }

  if (!offer) return <div className="page"><Header title="" back="/" />{error ? <ErrorNote msg={error} /> : <Spinner />}</div>;
  const b = offer.businesses!;
  const left = offer.spots_total - offer.spots_claimed;
  const tooSmall = (profile?.followers ?? 0) < offer.min_followers;

  return (
    <div className="page no-pad-top">
      <div className="hero" style={{ background: b.brand_color + '33' }}>
        {safePhoto(b.photo_url) && <img className="hero-photo" src={safePhoto(b.photo_url)!} alt="" />}
        <button className="circle-btn" aria-label="Back" onClick={() => nav(-1)}>
          <svg aria-hidden="true" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#16130F" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="m15 18-6-6 6-6" /></svg>
        </button>
      </div>
      <div className="hero-logo"><Logo business={b} size={68} /></div>
      <h1 className="title">{b.name}</h1>
      <p className="muted">{[b.category, b.neighborhood, b.address].filter(Boolean).join(' · ')}</p>
      {b.description && <p className="body-text">{b.description}</p>}
      {b.is_demo && <p className="note warn">Sample listing — shows how an offer works. It can't be claimed.</p>}

      <div className="card table">
        <div className="tr"><span>Comp value</span><strong>{money(offer.comp_cents)}</strong></div>
        <div className="tr"><span>You post</span><strong>{offer.deliverables}</strong></div>
        <div className="tr"><span>Post within</span><strong>{offer.post_window_hours} hours of visit</strong></div>
        <div className="tr"><span>Tag</span><strong>{b.instagram_handle ? '@' + b.instagram_handle.replace(/^@/, '') : b.name} + #ad</strong></div>
        {offer.min_followers > 0 && <div className="tr"><span>Minimum followers</span><strong>{fmtFollowers(offer.min_followers)}</strong></div>}
      </div>
      {offer.notes && <p className="note">{offer.notes}</p>}

      {existing ? (
        <div className="sticky-cta">
          <button className="btn primary" onClick={() => nav(`/visits/${existing.id}`)}>View your visit</button>
        </div>
      ) : (
        <>
          <h2 className="section-title">Pick a visit time</h2>
          {days.length === 0 ? (
            <p className="muted">No visit days open right now.</p>
          ) : (
            <>
              <div className="tabs-line" role="tablist">
                {days.map((d, i) => (
                  <button key={d.toISOString()} role="tab" aria-selected={i === dayIdx} className={i === dayIdx ? 'on' : ''} onClick={() => { setDayIdx(i); setTime(null); }}>
                    {i === 0 && d.toDateString() === new Date().toDateString() ? 'Today' : d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                  </button>
                ))}
              </div>
              <div className="time-grid">
                {TIMES.map((t) => {
                  const past = day && slotDate(t) < new Date();
                  return (
                    <button key={t} disabled={past} aria-pressed={time === t} className={'time' + (time === t ? ' on' : '')} onClick={() => setTime(t)}>
                      {label12(t)}
                    </button>
                  );
                })}
              </div>
            </>
          )}
          <p className="muted small">{left} of {offer.spots_total} creator spots left</p>
          <ErrorNote msg={error} />
          {tooSmall && <p className="muted small">This offer needs {fmtFollowers(offer.min_followers)}+ followers. Update your profile if that's out of date.</p>}
          <div className="sticky-cta">
            <button className="btn dark" disabled={!time || busy || left <= 0 || b.is_demo} onClick={claim}>
              {busy ? 'Claiming…' : time && day ? `Claim for ${slotDate(time).toLocaleDateString([], { weekday: 'short' })}, ${label12(time)}` : 'Pick a time'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
