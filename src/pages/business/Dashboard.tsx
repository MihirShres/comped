import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, money, fmtWhen, type Claim } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Logo, Spinner, StatusPill } from '../../ui';

export default function Dashboard() {
  const { business } = useAuth();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [activeOffers, setActiveOffers] = useState(0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!business) return;
    supabase
      .from('claims')
      .select('*, offers(*), profiles(*)')
      .eq('business_id', business.id)
      .neq('status', 'cancelled')
      .order('visit_at', { ascending: true })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setClaims((data as Claim[]) ?? []);
      });
    supabase.from('offers').select('id', { count: 'exact', head: true }).eq('business_id', business.id).eq('active', true)
      .then(({ count }) => setActiveOffers(count ?? 0));
  }, [business]);

  if (!business) return null;
  const monthStart = new Date();
  monthStart.setDate(1);
  monthStart.setHours(0, 0, 0, 0);
  const all = claims ?? [];
  const thisMonth = all.filter((c) => c.redeemed_at && new Date(c.redeemed_at) >= monthStart);
  const used = thisMonth.reduce((s, c) => s + Math.min(c.bill_cents ?? 0, c.comp_cents), 0);
  const budget = business.monthly_budget_cents;
  const pct = budget > 0 ? Math.min(100, Math.round((used / budget) * 100)) : 0;
  const upcoming = all.filter((c) => c.status === 'booked');
  const toReview = all.filter((c) => c.status === 'submitted');
  const live = all.filter((c) => c.status === 'approved').length;

  return (
    <div className="page grey">
      <header className="header">
        <div className="header-row">
          <div>
            <div className="kicker kicker-row"><Logo business={business} size={22} />{business.name}</div>
            <h1>{new Date().toLocaleDateString([], { month: 'long' })}</h1>
          </div>
          <Link to="/settings" className="btn small secondary">Settings</Link>
        </div>
      </header>

      <div className="card pad">
        <div className="row-between"><span className="muted small">Food credit remaining</span></div>
        <div className="big-number dark">{money(Math.max(0, budget - used))} <span className="muted unit">of {money(budget)}</span></div>
        <div className="bar" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="Budget used"><div style={{ width: pct + '%' }} /></div>
      </div>

      <div className="stat-grid three">
        <div className="stat white"><strong>{thisMonth.length}</strong><span>Visits this month</span></div>
        <div className="stat white"><strong>{live}</strong><span>Posts approved</span></div>
        <div className="stat white"><strong>{activeOffers}</strong><span>Live offers</span></div>
      </div>

      {toReview.length > 0 && (
        <Link to="/reviews" className="banner">{toReview.length} post{toReview.length > 1 ? 's' : ''} waiting for your review →</Link>
      )}

      <h2 className="section-title">Upcoming visits</h2>
      <ErrorNote msg={error} />
      {claims === null ? (
        <Spinner />
      ) : upcoming.length === 0 ? (
        <Empty
          title={activeOffers ? 'No bookings yet' : 'Post your first offer'}
          body={activeOffers ? 'When creators claim your offer, their visits appear here.' : 'Set a comp amount and what you want posted. Creators nearby can claim it right away.'}
          action={!activeOffers ? <Link className="btn dark inline" to="/offers/new">Create an offer</Link> : undefined}
        />
      ) : (
        <div className="card list-card">
          {upcoming.map((c) => (
            <div className="row" key={c.id}>
              <div className="avatar" aria-hidden="true">{(c.profiles?.handle ?? '?').slice(0, 1).toUpperCase()}</div>
              <div className="row-main">
                <div className="row-title">@{c.profiles?.handle}</div>
                <div className="row-meta">{fmtWhen(c.visit_at)} · {c.offers?.deliverables}</div>
              </div>
              <StatusPill status={c.status} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
