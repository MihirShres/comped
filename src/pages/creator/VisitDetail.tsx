import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { useParams } from 'react-router-dom';
import { supabase, money2, fmtWhen, errMsg, postDeadline, hoursLeft, type Claim } from '../../lib';
import { ErrorNote, Header, Logo, Spinner, StatusPill } from '../../ui';

export default function VisitDetail() {
  const { id } = useParams();
  const [c, setC] = useState<Claim | null>(null);
  const [url, setUrl] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    if (!id) return;
    supabase.from('claims').select('*, offers(*), businesses(*)').eq('id', id).maybeSingle().then(({ data, error }) => {
      if (error) setError(error.message);
      setC(data as Claim);
      if (data?.post_url) setUrl(data.post_url);
    });
  }, [id]);
  useEffect(load, [load]);

  // refresh while waiting on the restaurant so status updates appear
  useEffect(() => {
    if (!c || !['booked', 'submitted'].includes(c.status)) return;
    const t = setInterval(load, 15000);
    return () => clearInterval(t);
  }, [c, load]);

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!c) return;
    setBusy(true);
    setError(null);
    const { error } = await supabase.rpc('submit_post', { p_claim_id: c.id, p_url: url.trim() });
    setBusy(false);
    if (error) return setError(errMsg(error));
    load();
  }

  async function cancel() {
    if (!c || !window.confirm('Cancel this visit? Your spot goes back to other creators.')) return;
    const { error } = await supabase.rpc('cancel_claim', { p_claim_id: c.id });
    if (error) return setError(errMsg(error));
    load();
  }

  if (!c) return <div className="page"><Header title="" back="/visits" />{error ? <ErrorNote msg={error} /> : <Spinner />}</div>;
  const b = c.businesses!;
  const o = c.offers!;
  const deadline = postDeadline(c);
  const covered = c.bill_cents != null ? Math.min(c.bill_cents, c.comp_cents) : null;
  const steps = [
    { label: 'Offer claimed', done: true },
    { label: 'Show your code at the restaurant', done: c.status !== 'booked' && c.status !== 'cancelled' },
    { label: `Post ${o.deliverables}`, done: ['submitted', 'approved'].includes(c.status) },
    { label: 'Approved by the restaurant', done: c.status === 'approved' },
  ];

  return (
    <div className="page">
      <Header title={b.name} back="/visits" kicker={<span className="kicker-row"><Logo business={b} size={22} />{fmtWhen(c.visit_at)}</span>} right={<StatusPill status={c.status} />} />

      {c.status === 'booked' && (
        <div className="code-card">
          <div className="small muted">Show this code to your server</div>
          <div className="code" aria-label={'Code ' + c.code.split('').join(' ')}>{c.code}</div>
          <div className="small muted">Covers up to {money2(c.comp_cents)} of your bill. Tip is on you.</div>
        </div>
      )}

      <div className="card steps">
        {steps.map((s, i) => (
          <div key={i} className={'step' + (s.done ? ' done' : '')}>
            <span className="dot" aria-hidden="true">{s.done ? '✓' : ''}</span>
            <span>{s.label}</span>
          </div>
        ))}
      </div>

      {covered != null && (
        <div className="card table">
          <div className="tr"><span>Your bill</span><span>{money2(c.bill_cents)}</span></div>
          <div className="tr"><span>Covered by comp</span><strong className="brand">−{money2(covered)}</strong></div>
          <div className="tr total"><span>You paid</span><strong>{money2((c.bill_cents ?? 0) - covered)} + tip</strong></div>
        </div>
      )}

      {c.status === 'changes_requested' && c.review_note && (
        <div className="note warn"><strong>The restaurant asked for changes:</strong> {c.review_note}</div>
      )}

      {(c.status === 'redeemed' || c.status === 'changes_requested') && (
        <form className="form card pad" onSubmit={submit}>
          <h2 className="section-title tight">Submit your post</h2>
          {deadline && (
            <p className="small muted">
              {hoursLeft(deadline) > 0 ? `Due in ${hoursLeft(deadline)} hrs` : 'Past due — post as soon as you can'} · Tag {b.instagram_handle ? '@' + b.instagram_handle.replace(/^@/, '') : b.name} and add #ad
            </p>
          )}
          <label className="field">
            <span>Link to your post</span>
            <input type="url" inputMode="url" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/…" required />
          </label>
          <ErrorNote msg={error} />
          <button className="btn dark" disabled={busy}>{busy ? 'Submitting…' : 'Submit for review'}</button>
        </form>
      )}

      {c.status === 'submitted' && <p className="note">Submitted {c.submitted_at && fmtWhen(c.submitted_at)}. The restaurant will review it shortly.</p>}
      {c.status === 'approved' && <p className="note good">Approved — nice work. This counts toward your on-time record.</p>}
      {c.post_url && c.post_url.startsWith('https://') && (
        <a className="link-btn" href={c.post_url} target="_blank" rel="noreferrer">Open your post ↗</a>
      )}

      {c.status === 'booked' && (
        <>
          <ErrorNote msg={error} />
          <button className="link-btn danger" onClick={cancel}>Cancel visit</button>
        </>
      )}
    </div>
  );
}
