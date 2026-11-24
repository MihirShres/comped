import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, money, fmtWhen, type Claim } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Header, Logo, Spinner, StatusPill } from '../../ui';

const ACTIVE = ['booked', 'redeemed', 'submitted', 'changes_requested'];

export default function Visits() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('claims')
      .select('*, offers(*), businesses(*)')
      .eq('creator_id', profile.id)
      .order('visit_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setClaims((data as Claim[]) ?? []);
      });
  }, [profile]);

  const active = (claims ?? []).filter((c) => ACTIVE.includes(c.status));
  const past = (claims ?? []).filter((c) => !ACTIVE.includes(c.status));

  return (
    <div className="page">
      <Header title="Visits" />
      <ErrorNote msg={error} />
      {claims === null ? (
        <Spinner />
      ) : claims.length === 0 ? (
        <Empty title="No visits yet" body="Claim an offer on Discover and it'll show up here." action={<Link className="btn secondary inline" to="/">Browse offers</Link>} />
      ) : (
        <>
          {active.length > 0 && <h2 className="section-title">In progress</h2>}
          <div className="list">{active.map((c) => <VisitRow key={c.id} c={c} />)}</div>
          {past.length > 0 && <h2 className="section-title">Past</h2>}
          <div className="list">{past.map((c) => <VisitRow key={c.id} c={c} />)}</div>
        </>
      )}
    </div>
  );
}

function VisitRow({ c }: { c: Claim }) {
  return (
    <Link to={`/visits/${c.id}`} className="row">
      {c.businesses && <Logo business={c.businesses} size={48} />}
      <div className="row-main">
        <div className="row-title">{c.businesses?.name}</div>
        <div className="row-meta">{fmtWhen(c.visit_at)} · {money(c.comp_cents)}</div>
      </div>
      <StatusPill status={c.status} />
    </Link>
  );
}
