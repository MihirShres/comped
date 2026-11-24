import { useCallback, useEffect, useState } from 'react';
import { supabase, money2, fmtWhen, fmtFollowers, errMsg, postDeadline, type Claim } from '../../lib';
import { useAuth } from '../../auth';
import { Empty, ErrorNote, Header, Spinner, StatusPill } from '../../ui';

export default function Reviews() {
  const { business } = useAuth();
  const [claims, setClaims] = useState<Claim[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!business) return;
    supabase.from('claims').select('*, profiles(*), offers(*)').eq('business_id', business.id)
      .in('status', ['redeemed', 'submitted', 'approved', 'changes_requested'])
      .order('redeemed_at', { ascending: false })
      .then(({ data, error }) => {
        if (error) setError(error.message);
        setClaims((data as Claim[]) ?? []);
      });
  }, [business]);
  useEffect(load, [load]);

  const pending = (claims ?? []).filter((c) => c.status === 'submitted');
  const waiting = (claims ?? []).filter((c) => c.status === 'redeemed' || c.status === 'changes_requested');
  const done = (claims ?? []).filter((c) => c.status === 'approved');

  return (
    <div className="page">
      <Header title="Reviews" />
      <ErrorNote msg={error} />
      {claims === null ? (
        <Spinner />
      ) : claims.length === 0 ? (
        <Empty title="Nothing to review" body="After a creator's visit is redeemed and they post, it shows up here." />
      ) : (
        <>
          {pending.length > 0 && <h2 className="section-title">Needs your review</h2>}
          <div className="stack">{pending.map((c) => <ReviewCard key={c.id} c={c} onDone={load} />)}</div>
          {waiting.length > 0 && <h2 className="section-title">Waiting on creator</h2>}
          <div className="list">
            {waiting.map((c) => {
              const d = postDeadline(c);
              return (
                <div className="row" key={c.id}>
                  <div className="avatar" aria-hidden="true">{(c.profiles?.handle ?? '?').slice(0, 1).toUpperCase()}</div>
                  <div className="row-main">
                    <div className="row-title">@{c.profiles?.handle}</div>
                    <div className="row-meta">{d ? (d > new Date() ? 'Due ' + fmtWhen(d.toISOString()) : 'Overdue since ' + fmtWhen(d.toISOString())) : ''}</div>
                  </div>
                  <StatusPill status={c.status} />
                </div>
              );
            })}
          </div>
          {done.length > 0 && <h2 className="section-title">Approved</h2>}
          <div className="list">
            {done.map((c) => (
              <div className="row" key={c.id}>
                <div className="avatar" aria-hidden="true">{(c.profiles?.handle ?? '?').slice(0, 1).toUpperCase()}</div>
                <div className="row-main">
                  <div className="row-title">@{c.profiles?.handle}</div>
                  <div className="row-meta">{c.offers?.deliverables}</div>
                </div>
                {c.post_url?.startsWith('https://') && <a className="link-btn" href={c.post_url} target="_blank" rel="noreferrer">View ↗</a>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function ReviewCard({ c, onDone }: { c: Claim; onDone: () => void }) {
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [asking, setAsking] = useState(false);
  const d = postDeadline(c);
  const onTime = d && c.submitted_at ? new Date(c.submitted_at) <= d : null;

  async function review(approve: boolean) {
    if (!approve && !note.trim()) return setError('Tell the creator what to change.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('review_claim', { p_claim_id: c.id, p_approve: approve, p_note: note.trim() });
    setBusy(false);
    if (error) return setError(errMsg(error));
    onDone();
  }

  return (
    <div className="card pad review-card">
      <div className="row-between">
        <div>
          <div className="row-title">@{c.profiles?.handle}</div>
          <div className="row-meta">
            {c.profiles?.platform === 'tiktok' ? 'TikTok' : 'Instagram'} · {fmtFollowers(c.profiles?.followers ?? 0)} followers · {money2(Math.min(c.bill_cents ?? 0, c.comp_cents))} comped
          </div>
        </div>
      </div>
      <div className="table">
        <div className="tr"><span>Asked for</span><strong>{c.offers?.deliverables}</strong></div>
        <div className="tr"><span>Posted</span><strong>{onTime === null ? '—' : onTime ? 'On time' : 'Late'}</strong></div>
      </div>
      {c.post_url?.startsWith('https://') && (
        <a className="btn secondary" href={c.post_url} target="_blank" rel="noreferrer">Open post ↗</a>
      )}
      <p className="small muted">Check it tags you and includes #ad before approving.</p>
      {asking && (
        <label className="field"><span>What should they change?</span>
          <textarea value={note} onChange={(e) => setNote(e.target.value)} rows={2} maxLength={500} />
        </label>
      )}
      <ErrorNote msg={error} />
      <div className="btn-row">
        <button className="btn secondary" disabled={busy} onClick={() => (asking ? review(false) : setAsking(true))}>{asking ? 'Send request' : 'Request changes'}</button>
        <button className="btn brand-btn" disabled={busy} onClick={() => review(true)}>Approve</button>
      </div>
    </div>
  );
}
