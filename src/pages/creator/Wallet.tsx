import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase, money2, fmtWhen, postDeadline, type Claim } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Header, Logo, Spinner } from '../../ui';

export default function Wallet() {
  const { profile } = useAuth();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!profile) return;
    supabase
      .from('claims')
      .select('*, offers(*), businesses(*)')
      .eq('creator_id', profile.id)
      .not('redeemed_at', 'is', null)
      .order('redeemed_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setClaims((data as Claim[]) ?? []);
      });
  }, [profile]);

  const list = claims ?? [];
  const covered = (c: Claim) => Math.min(c.bill_cents ?? 0, c.comp_cents);
  const total = list.reduce((s, c) => s + covered(c), 0);
  const posted = list.filter((c) => c.submitted_at);
  const onTime = posted.filter((c) => {
    const d = postDeadline(c);
    return d && c.submitted_at && new Date(c.submitted_at) <= d;
  });
  const approved = list.filter((c) => c.status === 'approved').length;

  return (
    <div className="page">
      <Header title="Wallet" />
      <div className="balance-card">
        <div className="row-between"><span className="wordmark light">comped</span><span className="small">Creator</span></div>
        <div>
          <div className="small">Total comped</div>
          <div className="big-number">{money2(total)}</div>
        </div>
        <div className="small">{list.length} visit{list.length === 1 ? '' : 's'} redeemed</div>
      </div>
      <div className="stat-grid three">
        <div className="stat"><strong>{approved}</strong><span>Posts approved</span></div>
        <div className="stat"><strong>{posted.length ? Math.round((onTime.length / posted.length) * 100) + '%' : '—'}</strong><span>On time</span></div>
        <div className="stat"><strong>{profile?.followers ? Intl.NumberFormat('en', { notation: 'compact' }).format(profile.followers) : '—'}</strong><span>Followers</span></div>
      </div>
      <h2 className="section-title">Activity</h2>
      <ErrorNote msg={error} />
      {claims === null ? (
        <Spinner />
      ) : list.length === 0 ? (
        <Empty title="Nothing yet" body="After your first comped visit, it'll show here." />
      ) : (
        <div className="list">
          {list.map((c) => (
            <Link to={`/visits/${c.id}`} key={c.id} className="row">
              {c.businesses && <Logo business={c.businesses} size={40} />}
              <div className="row-main">
                <div className="row-title">{c.businesses?.name}</div>
                <div className="row-meta">{c.redeemed_at && fmtWhen(c.redeemed_at)}</div>
              </div>
              <div className="row-value brand">{money2(covered(c))}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
