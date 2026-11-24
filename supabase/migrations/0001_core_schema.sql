-- Comped core schema. Already applied to the "comped" Supabase project.
-- Run this in the SQL editor only if you set up a fresh project.

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('creator','business')),
  full_name text not null default '',
  handle text,
  platform text check (platform in ('instagram','tiktok')),
  followers integer not null default 0 check (followers >= 0),
  created_at timestamptz not null default now()
);

create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null unique references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 80),
  category text not null default 'Restaurant',
  neighborhood text not null default '',
  address text not null default '',
  instagram_handle text not null default '',
  brand_color text not null default '#B4532A' check (brand_color ~ '^#[0-9A-Fa-f]{6}$'),
  monthly_budget_cents integer not null default 50000 check (monthly_budget_cents >= 0),
  created_at timestamptz not null default now()
);

create table public.offers (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  comp_cents integer not null check (comp_cents between 500 and 50000),
  deliverables text not null check (char_length(deliverables) between 1 and 200),
  post_window_hours integer not null default 48 check (post_window_hours between 12 and 336),
  min_followers integer not null default 0 check (min_followers >= 0),
  spots_total integer not null check (spots_total between 1 and 100),
  spots_claimed integer not null default 0,
  visit_days int[] not null default '{0,1,2,3,4,5,6}',
  notes text not null default '',
  active boolean not null default true,
  created_at timestamptz not null default now()
);

create table public.claims (
  id uuid primary key default gen_random_uuid(),
  code text not null unique,
  offer_id uuid not null references public.offers(id) on delete cascade,
  business_id uuid not null references public.businesses(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  visit_at timestamptz not null,
  status text not null default 'booked' check (status in ('booked','redeemed','submitted','approved','changes_requested','cancelled','expired')),
  comp_cents integer not null,
  bill_cents integer,
  redeemed_at timestamptz,
  post_url text,
  submitted_at timestamptz,
  review_note text,
  reviewed_at timestamptz,
  created_at timestamptz not null default now()
);

create index on public.offers (business_id);
create index on public.claims (creator_id);
create index on public.claims (business_id);
create index on public.claims (offer_id);

alter table public.profiles enable row level security;
alter table public.businesses enable row level security;
alter table public.offers enable row level security;
alter table public.claims enable row level security;

create policy "profiles readable by signed-in users" on public.profiles for select to authenticated using (true);
create policy "update own profile" on public.profiles for update to authenticated using (id = (select auth.uid())) with check (id = (select auth.uid()));

create policy "businesses readable" on public.businesses for select to authenticated using (true);
create policy "owner inserts business" on public.businesses for insert to authenticated
  with check (owner_id = (select auth.uid()) and exists (select 1 from public.profiles p where p.id = (select auth.uid()) and p.role = 'business'));
create policy "owner updates business" on public.businesses for update to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));

create policy "offers readable" on public.offers for select to authenticated using (true);
create policy "owner inserts offers" on public.offers for insert to authenticated
  with check (spots_claimed = 0 and exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));
create policy "owner updates offers" on public.offers for update to authenticated
  using (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())))
  with check (exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

-- Claims are readable by the creator and the business; every write goes through the functions below.
create policy "claims visible to parties" on public.claims for select to authenticated
  using (creator_id = (select auth.uid()) or exists (select 1 from public.businesses b where b.id = business_id and b.owner_id = (select auth.uid())));

create or replace function public.guard_offer_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.spots_claimed is distinct from old.spots_claimed and current_setting('comped.internal', true) is distinct from '1' then
    new.spots_claimed := old.spots_claimed;
  end if;
  if new.spots_total < new.spots_claimed then
    raise exception 'Spots cannot go below the number already claimed';
  end if;
  return new;
end $$;
create trigger offers_guard before update on public.offers for each row execute function public.guard_offer_update();

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, role, full_name)
  values (new.id,
          case when new.raw_user_meta_data->>'role' = 'business' then 'business' else 'creator' end,
          coalesce(left(new.raw_user_meta_data->>'full_name', 80), ''));
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.claim_offer(p_offer_id uuid, p_visit_at timestamptz) returns public.claims
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_offer public.offers;
  v_prof public.profiles;
  v_claim public.claims;
  v_code text;
begin
  if v_uid is null then raise exception 'Not signed in'; end if;
  select * into v_prof from public.profiles where id = v_uid;
  if v_prof.role <> 'creator' then raise exception 'Only creators can claim offers'; end if;
  if v_prof.handle is null or v_prof.handle = '' then raise exception 'Add your social handle to your profile first'; end if;
  select * into v_offer from public.offers where id = p_offer_id for update;
  if not found or not v_offer.active then raise exception 'This offer is no longer available'; end if;
  if v_prof.followers < v_offer.min_followers then raise exception 'This offer needs % followers or more', v_offer.min_followers; end if;
  if v_offer.spots_claimed >= v_offer.spots_total then raise exception 'All spots are taken'; end if;
  if p_visit_at < now() then raise exception 'Pick a time in the future'; end if;
  if exists (select 1 from public.claims c where c.offer_id = p_offer_id and c.creator_id = v_uid and c.status <> 'cancelled') then
    raise exception 'You already claimed this offer';
  end if;
  loop
    v_code := upper(substr(md5(gen_random_uuid()::text), 1, 6));
    exit when not exists (select 1 from public.claims where code = v_code);
  end loop;
  insert into public.claims (code, offer_id, business_id, creator_id, visit_at, comp_cents)
  values (v_code, v_offer.id, v_offer.business_id, v_uid, p_visit_at, v_offer.comp_cents)
  returning * into v_claim;
  perform set_config('comped.internal', '1', true);
  update public.offers set spots_claimed = spots_claimed + 1 where id = v_offer.id;
  perform set_config('comped.internal', '0', true);
  return v_claim;
end $$;

create or replace function public.cancel_claim(p_claim_id uuid) returns void
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claims;
begin
  select * into v_claim from public.claims where id = p_claim_id for update;
  if not found or v_claim.creator_id <> auth.uid() then raise exception 'Claim not found'; end if;
  if v_claim.status <> 'booked' then raise exception 'Only booked visits can be cancelled'; end if;
  update public.claims set status = 'cancelled' where id = p_claim_id;
  perform set_config('comped.internal', '1', true);
  update public.offers set spots_claimed = greatest(spots_claimed - 1, 0) where id = v_claim.offer_id;
  perform set_config('comped.internal', '0', true);
end $$;

create or replace function public.redeem_claim(p_code text, p_bill_cents integer) returns public.claims
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claims;
begin
  select c.* into v_claim from public.claims c join public.businesses b on b.id = c.business_id
   where c.code = upper(trim(p_code)) and b.owner_id = auth.uid() for update of c;
  if not found then raise exception 'No visit with that code at your business'; end if;
  if v_claim.status <> 'booked' then raise exception 'This code was already used'; end if;
  if p_bill_cents is null or p_bill_cents < 0 or p_bill_cents > 1000000 then raise exception 'Enter the bill amount'; end if;
  update public.claims set status = 'redeemed', bill_cents = p_bill_cents, redeemed_at = now()
   where id = v_claim.id returning * into v_claim;
  return v_claim;
end $$;

create or replace function public.submit_post(p_claim_id uuid, p_url text) returns public.claims
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claims;
begin
  select * into v_claim from public.claims where id = p_claim_id for update;
  if not found or v_claim.creator_id <> auth.uid() then raise exception 'Claim not found'; end if;
  if v_claim.status not in ('redeemed','changes_requested') then raise exception 'You can submit after your visit is redeemed'; end if;
  if p_url !~* '^https://(www\.)?(instagram\.com|tiktok\.com|vm\.tiktok\.com)/' then raise exception 'Paste a link to your Instagram or TikTok post'; end if;
  update public.claims set status = 'submitted', post_url = left(p_url, 500), submitted_at = now()
   where id = p_claim_id returning * into v_claim;
  return v_claim;
end $$;

create or replace function public.review_claim(p_claim_id uuid, p_approve boolean, p_note text) returns public.claims
language plpgsql security definer set search_path = '' as $$
declare v_claim public.claims;
begin
  select c.* into v_claim from public.claims c join public.businesses b on b.id = c.business_id
   where c.id = p_claim_id and b.owner_id = auth.uid() for update of c;
  if not found then raise exception 'Claim not found'; end if;
  if v_claim.status <> 'submitted' then raise exception 'Nothing to review'; end if;
  update public.claims set status = case when p_approve then 'approved' else 'changes_requested' end,
         review_note = left(coalesce(p_note, ''), 500), reviewed_at = now()
   where id = p_claim_id returning * into v_claim;
  return v_claim;
end $$;

revoke all on function public.claim_offer(uuid, timestamptz) from public, anon;
revoke all on function public.cancel_claim(uuid) from public, anon;
revoke all on function public.redeem_claim(text, integer) from public, anon;
revoke all on function public.submit_post(uuid, text) from public, anon;
revoke all on function public.review_claim(uuid, boolean, text) from public, anon;
revoke all on function public.handle_new_user() from public, anon, authenticated;
grant execute on function public.claim_offer(uuid, timestamptz) to authenticated;
grant execute on function public.cancel_claim(uuid) to authenticated;
grant execute on function public.redeem_claim(text, integer) to authenticated;
grant execute on function public.submit_post(uuid, text) to authenticated;
grant execute on function public.review_claim(uuid, boolean, text) to authenticated;

-- People can't change their own role (creator/business) after sign-up.
create or replace function public.guard_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.role := old.role;
  new.created_at := old.created_at;
  return new;
end $$;
create trigger profiles_guard before update on public.profiles for each row execute function public.guard_profile_update();
