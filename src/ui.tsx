import { NavLink, useNavigate } from 'react-router-dom';
import type { ReactNode } from 'react';
import type { Business, ClaimStatus } from './lib';
import { STATUS_LABEL } from './lib';

export function Logo({ business, size = 44 }: { business: Pick<Business, 'name' | 'brand_color'>; size?: number }) {
  const initials = business.name
    .split(/\s+/)
    .filter((w) => /[A-Za-z0-9]/.test(w[0] ?? ''))
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join('');
  return (
    <div
      aria-hidden="true"
      className="logo"
      style={{ width: size, height: size, borderRadius: size * 0.27, background: business.brand_color, fontSize: size * 0.36 }}
    >
      {initials || '•'}
    </div>
  );
}

export function Header({ title, kicker, back, right }: { title: string; kicker?: ReactNode; back?: string | true; right?: ReactNode }) {
  const nav = useNavigate();
  return (
    <header className="header">
      {back && (
        <button className="link-btn back" onClick={() => (back === true ? nav(-1) : nav(back))}>
          ‹ Back
        </button>
      )}
      <div className="header-row">
        <div>
          {kicker && <div className="kicker">{kicker}</div>}
          <h1>{title}</h1>
        </div>
        {right}
      </div>
    </header>
  );
}

const Icon = {
  discover: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9" /><path d="m15.5 8.5-2 5-5 2 2-5z" /></svg>
  ),
  visits: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M8 3v4M16 3v4M3 10h18" /></svg>
  ),
  wallet: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="2.5" y="6" width="19" height="13" rx="3" /><path d="M16 12.5h2" /></svg>
  ),
  profile: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4" /><path d="M4 21a8 8 0 0 1 16 0" /></svg>
  ),
  home: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M3 11 12 4l9 7v9a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1z" /></svg>
  ),
  offers: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M20.6 13.4 13.4 20.6a2 2 0 0 1-2.8 0L3 13V3h10l7.6 7.6a2 2 0 0 1 0 2.8z" /><circle cx="7.5" cy="7.5" r="1.2" /></svg>
  ),
  redeem: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" /><rect x="3" y="14" width="7" height="7" rx="1.5" /><path d="M14 14h3v3M21 14v7h-7" /></svg>
  ),
  reviews: (
    <svg aria-hidden="true" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
  ),
};

export function TabBar({ role }: { role: 'creator' | 'business' }) {
  const tabs =
    role === 'creator'
      ? [
          { to: '/', label: 'Discover', icon: Icon.discover, end: true },
          { to: '/visits', label: 'Visits', icon: Icon.visits },
          { to: '/wallet', label: 'Wallet', icon: Icon.wallet },
          { to: '/profile', label: 'Profile', icon: Icon.profile },
        ]
      : [
          { to: '/', label: 'Home', icon: Icon.home, end: true },
          { to: '/offers', label: 'Offers', icon: Icon.offers },
          { to: '/redeem', label: 'Redeem', icon: Icon.redeem },
          { to: '/reviews', label: 'Reviews', icon: Icon.reviews },
        ];
  return (
    <nav className="tabbar" aria-label="Main">
      {tabs.map((t) => (
        <NavLink key={t.to} to={t.to} end={t.end} className={({ isActive }) => 'tab' + (isActive ? ' active' : '')}>
          {t.icon}
          <span>{t.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}

export function StatusPill({ status }: { status: ClaimStatus }) {
  return <span className={'pill pill-' + status}>{STATUS_LABEL[status]}</span>;
}

export function Empty({ title, body, action }: { title: string; body: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="empty-title">{title}</div>
      <p>{body}</p>
      {action}
    </div>
  );
}

export function Spinner() {
  return <div className="spinner" role="status" aria-label="Loading" />;
}

export function ErrorNote({ msg }: { msg: string | null }) {
  if (!msg) return null;
  return (
    <div className="error" role="alert">
      {msg}
    </div>
  );
}
