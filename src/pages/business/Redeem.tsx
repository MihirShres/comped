import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { supabase, money2, fmtWhen, errMsg, type Claim } from '../../lib';
import { useAuth } from '../../auth';
import { ErrorNote, Header } from '../../ui';

export default function Redeem() {
  const { business } = useAuth();
  const [code, setCode] = useState('');
  const [bill, setBill] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<Claim | null>(null);
  const [today, setToday] = useState<Claim[]>([]);

  const load = useCallback(() => {
    if (!business) return;
    const start = new Date(); start.setHours(0, 0, 0, 0);
    const end = new Date(start); end.setDate(start.getDate() + 1);
    supabase.from('claims').select('*, profiles(*), offers(*)').eq('business_id', business.id).eq('status', 'booked')
      .gte('visit_at', start.toISOString()).lt('visit_at', end.toISOString()).order('visit_at')
      .then(({ data }) => setToday((data as Claim[]) ?? []));
  }, [business]);
  useEffect(load, [load]);

  async function redeem(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setDone(null);
    const cents = Math.round(parseFloat(bill.replace(/[^0-9.]/g, '') || 'NaN') * 100);
    if (!Number.isFinite(cents)) { setBusy(false); return setError('Enter the bill total before tip.'); }
    const { data, error } = await supabase.rpc('redeem_claim', { p_code: code.trim(), p_bill_cents: cents });
    setBusy(false);
    if (error) return setError(errMsg(error));
    setDone(data as Claim);
    setCode('');
    setBill('');
    load();
  }

  const covered = done ? Math.min(done.bill_cents ?? 0, done.comp_cents) : 0;

  return (
    <div className="page">
      <Header title="Redeem a visit" kicker="At the table" />
      <p className="muted">Ask the creator for their 6-character code, then enter the bill total before tip.</p>
      <form className="form" onSubmit={redeem}>
        <label className="field"><span>Creator code</span>
          <input className="code-input" value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} maxLength={6} autoCapitalize="characters" autoComplete="off" required placeholder="A1B2C3" />
        </label>
        <label className="field"><span>Bill total before tip ($)</span>
          <input inputMode="decimal" value={bill} onChange={(e) => setBill(e.target.value)} required placeholder="36.50" />
        </label>
        <ErrorNote msg={error} />
        <button className="btn dark" disabled={busy}>{busy ? 'Checking…' : 'Redeem'}</button>
      </form>

      {done && (
        <div className="card table" role="status">
          <div className="tr"><span>Bill</span><span>{money2(done.bill_cents)}</span></div>
          <div className="tr"><span>Comped</span><strong className="brand">−{money2(covered)}</strong></div>
          <div className="tr total"><span>Creator pays</span><strong>{money2((done.bill_cents ?? 0) - covered)} + tip</strong></div>
        </div>
      )}

      {today.length > 0 && (
        <>
          <h2 className="section-title">Booked for today</h2>
          <div className="list">
            {today.map((c) => (
              <div className="row" key={c.id}>
                <div className="avatar" aria-hidden="true">{(c.profiles?.handle ?? '?').slice(0, 1).toUpperCase()}</div>
                <div className="row-main">
                  <div className="row-title">@{c.profiles?.handle}</div>
                  <div className="row-meta">{fmtWhen(c.visit_at)} · up to {money2(c.comp_cents)}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
