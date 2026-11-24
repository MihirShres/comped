import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase, money, DAY_LABELS, errMsg } from '../../lib';
import { useAuth } from '../../auth';
import { ErrorNote, Header } from '../../ui';

const COMPS = [1500, 2500, 4000, 6000];
const DELIVERABLES = ['1 Instagram Reel', '1 TikTok video', '2 Instagram Stories', '1 Reel + 2 Stories', '1 TikTok + 2 Stories'];

export default function NewOffer() {
  const { business } = useAuth();
  const nav = useNavigate();
  const [comp, setComp] = useState(4000);
  const [deliv, setDeliv] = useState(DELIVERABLES[3]);
  const [minF, setMinF] = useState(1500);
  const [spots, setSpots] = useState(5);
  const [hours, setHours] = useState(48);
  const [days, setDays] = useState<number[]>([1, 2, 3, 4]);
  const [notes, setNotes] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleDay = (d: number) => setDays((cur) => (cur.includes(d) ? cur.filter((x) => x !== d) : [...cur, d].sort()));

  async function publish(e: FormEvent) {
    e.preventDefault();
    if (!business) return;
    if (days.length === 0) return setError('Pick at least one visit day.');
    setBusy(true);
    setError(null);
    const { error } = await supabase.from('offers').insert({
      business_id: business.id,
      comp_cents: comp,
      deliverables: deliv,
      min_followers: minF,
      spots_total: spots,
      post_window_hours: hours,
      visit_days: days,
      notes: notes.trim(),
    });
    setBusy(false);
    if (error) return setError(errMsg(error));
    nav('/offers');
  }

  return (
    <div className="page">
      <Header title="New offer" back="/offers" />
      <form className="form" onSubmit={publish}>
        <div className="field">
          <span>Comp per creator</span>
          <div className="segmented four">
            {COMPS.map((c) => (
              <button type="button" key={c} aria-pressed={comp === c} className={comp === c ? 'on' : ''} onClick={() => setComp(c)}>{money(c)}</button>
            ))}
          </div>
        </div>
        <label className="field"><span>What creators post</span>
          <select value={deliv} onChange={(e) => setDeliv(e.target.value)}>{DELIVERABLES.map((d) => <option key={d}>{d}</option>)}</select>
        </label>
        <label className="field"><span>Minimum followers</span>
          <select value={minF} onChange={(e) => setMinF(Number(e.target.value))}>
            {[0, 1000, 1500, 5000, 10000].map((n) => <option key={n} value={n}>{n === 0 ? 'Anyone' : n.toLocaleString() + '+'}</option>)}
          </select>
        </label>
        <label className="field"><span>Post deadline after visit</span>
          <select value={hours} onChange={(e) => setHours(Number(e.target.value))}>
            {[24, 48, 72, 168].map((n) => <option key={n} value={n}>{n === 168 ? '1 week' : n + ' hours'}</option>)}
          </select>
        </label>
        <div className="field">
          <span>Creator spots</span>
          <div className="stepper">
            <button type="button" aria-label="Fewer spots" onClick={() => setSpots((s) => Math.max(1, s - 1))}>−</button>
            <strong aria-live="polite">{spots}</strong>
            <button type="button" aria-label="More spots" onClick={() => setSpots((s) => Math.min(100, s + 1))}>+</button>
          </div>
        </div>
        <div className="field">
          <span>Visit days</span>
          <div className="day-picker">
            {DAY_LABELS.map((d, i) => (
              <button type="button" key={i} aria-pressed={days.includes(i)} aria-label={['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][i]} className={days.includes(i) ? 'on' : ''} onClick={() => toggleDay(i)}>{d}</button>
            ))}
          </div>
        </div>
        <label className="field"><span>Notes for creators (optional)</span>
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={400} rows={3} placeholder="e.g. Try the birria tacos. Table for two max." />
        </label>
        <div className="summary row-between"><span className="muted">Max credit used</span><strong>{spots} × {money(comp)} = {money(spots * comp)}</strong></div>
        <ErrorNote msg={error} />
        <button className="btn dark" disabled={busy}>{busy ? 'Publishing…' : 'Publish offer'}</button>
      </form>
    </div>
  );
}
