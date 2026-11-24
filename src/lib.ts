import { createClient } from '@supabase/supabase-js';

// The publishable key is meant to ship in browser code; row-level security in the database protects the data.
const url = (import.meta.env.VITE_SUPABASE_URL as string) || 'https://defpepvvmnjzyblpspya.supabase.co';
const key = (import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string) || 'sb_publishable_SzIrKjVzeFCqCp77zd9DRg_18Sr5Zbo';

export const supabase = createClient(url, key, {
  auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true },
});

export type Role = 'creator' | 'business';

export interface Profile {
  id: string;
  role: Role;
  full_name: string;
  handle: string | null;
  platform: 'instagram' | 'tiktok' | null;
  followers: number;
}

export interface Business {
  id: string;
  owner_id: string;
  name: string;
  category: string;
  neighborhood: string;
  address: string;
  instagram_handle: string;
  brand_color: string;
  monthly_budget_cents: number;
  is_demo: boolean;
  photo_url: string | null;
  description: string;
}

export const safePhoto = (url: string | null | undefined) => (url && url.startsWith('https://') ? url : null);

export interface Offer {
  id: string;
  business_id: string;
  comp_cents: number;
  deliverables: string;
  post_window_hours: number;
  min_followers: number;
  spots_total: number;
  spots_claimed: number;
  visit_days: number[];
  notes: string;
  active: boolean;
  created_at: string;
  businesses?: Business;
}

export type ClaimStatus =
  | 'booked'
  | 'redeemed'
  | 'submitted'
  | 'approved'
  | 'changes_requested'
  | 'cancelled'
  | 'expired';

export interface Claim {
  id: string;
  code: string;
  offer_id: string;
  business_id: string;
  creator_id: string;
  visit_at: string;
  status: ClaimStatus;
  comp_cents: number;
  bill_cents: number | null;
  redeemed_at: string | null;
  post_url: string | null;
  submitted_at: string | null;
  review_note: string | null;
  reviewed_at: string | null;
  created_at: string;
  offers?: Offer;
  businesses?: Business;
  profiles?: Profile;
}

export const money = (cents: number | null | undefined) =>
  '$' + ((cents ?? 0) / 100).toFixed(2).replace(/\.00$/, '');

export const money2 = (cents: number | null | undefined) => '$' + ((cents ?? 0) / 100).toFixed(2);

export const fmtFollowers = (n: number) =>
  n >= 1000 ? (n / 1000).toFixed(n >= 10000 ? 0 : 1).replace(/\.0$/, '') + 'K' : String(n);

export const fmtWhen = (iso: string) => {
  const d = new Date(iso);
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(now.getDate() + 1);
  const time = d.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === now.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === tomorrow.toDateString()) return `Tomorrow, ${time}`;
  return `${d.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}, ${time}`;
};

export const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export const STATUS_LABEL: Record<ClaimStatus, string> = {
  booked: 'Booked',
  redeemed: 'Post due',
  submitted: 'In review',
  approved: 'Approved',
  changes_requested: 'Changes requested',
  cancelled: 'Cancelled',
  expired: 'Expired',
};

export const errMsg = (e: unknown) => {
  if (e && typeof e === 'object' && 'message' in e) return String((e as { message: unknown }).message);
  return 'Something went wrong. Try again.';
};

export const postDeadline = (c: Claim) => {
  if (!c.redeemed_at || !c.offers) return null;
  return new Date(new Date(c.redeemed_at).getTime() + c.offers.post_window_hours * 3600_000);
};

export const hoursLeft = (d: Date) => Math.round((d.getTime() - Date.now()) / 3600_000);
