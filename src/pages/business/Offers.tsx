import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, money, DAY_LABELS, errMsg, type Offer } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Header, Spinner } from '../../ui';

export default function Offers() {
  const { business } = useAuth();
  const [offers, setOffers] = useState<Offer[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!business) return;
    supabase.from('offers').select('*').eq('business_id', business.id).order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setOffers((data as Offer[]) ?? []);
      });
  }, [business]);
  useEffect(load, [load]);

  async function toggle(o: Offer) {
    const { error } = await supabase.from('offers').update({ active: !o.active }).eq('id', o.id);
    if (error) return setError(errMsg(error));
    load();
  }

  return (
    <div className="page">
      <Header title="Offers" right={<Link to="/offers/new" className="btn small dark">+ New</Link>} />
      <ErrorNote msg={error} />
      {offers === null ? (
        <Spinner />
      ) : offers.length === 0 ? (
        <Empty title="No offers yet" body="Create one and nearby creators can claim it." action={<Link className="btn dark inline" to="/offers/new">Create an offer</Link>} />
      ) : (
        <div className="stack">
          {offers.map((o) => (
            <div key={o.id} className={'card pad offer-card' + (o.active ? '' : ' paused')}>
              <div className="row-between">
                <div className="big-number dark sm">{money(o.comp_cents)}</div>
                <span className={'pill ' + (o.active ? 'pill-approved' : 'pill-cancelled')}>{o.active ? 'Live' : 'Paused'}</span>
              </div>
              <div className="row-title">{o.deliverables}</div>
              <div className="row-meta">
                {o.spots_claimed}/{o.spots_total} spots claimed · post within {o.post_window_hours}h
                {o.min_followers > 0 ? ` · ${o.min_followers.toLocaleString()}+ followers` : ''}
              </div>
              <div className="days">{DAY_LABELS.map((d, i) => <span key={i} className={o.visit_days.includes(i) ? 'on' : ''}>{d}</span>)}</div>
              <button className="btn secondary small" onClick={() => toggle(o)}>{o.active ? 'Pause offer' : 'Resume offer'}</button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
