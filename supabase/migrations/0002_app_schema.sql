-- =============================================================================
-- 0002_app_schema.sql
-- Extensions to the base schema, auth linkage, helper functions and Row Level
-- Security. Nothing here weakens or alters the meaning of 0001; it only adds.
-- =============================================================================

create schema if not exists extensions;
create extension if not exists postgis;
create extension if not exists pgcrypto with schema extensions;

-- -----------------------------------------------------------------------------
-- 1. Link application users to Supabase Auth (phone OTP)
-- -----------------------------------------------------------------------------
alter table public.users
  add constraint users_id_auth_fkey
  foreign key (id) references auth.users (id) on delete cascade;

-- -----------------------------------------------------------------------------
-- 2. Additions to base tables
-- -----------------------------------------------------------------------------
alter table public.ranks  add constraint ranks_name_key unique (name);
alter table public.routes add constraint routes_origin_dest_key unique (origin_rank_id, destination_rank_id);
create index if not exists ranks_location_gix on public.ranks using gist (location);

alter table public.user_credentials
  add column if not exists rank_id uuid references public.ranks (id);   -- marshals: the rank they manage

alter table public.vehicles
  add column if not exists permit_checked_at timestamptz,
  add column if not exists permit_checked_by uuid references public.users (id);

alter table public.hail_requests
  add column if not exists offered_at timestamptz not null default now(),
  add column if not exists offer_round int not null default 1,
  add column if not exists distance_km numeric(7,1),
  add column if not exists fare_estimate_zar numeric(8,2);   -- indicative guide only, never charged

alter table public.lost_and_found
  add column if not exists report_type varchar(10) not null default 'LOST'
    check (report_type in ('LOST', 'FOUND'));

create index if not exists hail_requests_open_idx on public.hail_requests (status, offered_at);
create index if not exists hail_requests_pickup_gix on public.hail_requests using gist (pickup_location);
create index if not exists trips_commuter_idx on public.trips (commuter_id, created_at desc);
create index if not exists trips_driver_idx on public.trips (driver_id, created_at desc);
create index if not exists lost_and_found_rank_idx on public.lost_and_found (pickup_rank_id, created_at desc);

-- -----------------------------------------------------------------------------
-- 3. New tables
-- -----------------------------------------------------------------------------

-- Taxi associations and the registry of permits they have approved. A driver or
-- marshal can only unlock operator tools by matching a registry row.
create table public.associations (
    id uuid primary key default gen_random_uuid(),
    name varchar(120) not null,
    code varchar(30) unique not null,            -- the "Association ID" typed in the app
    created_at timestamptz default now()
);

create table public.operator_registry (
    id uuid primary key default gen_random_uuid(),
    association_id uuid not null references public.associations (id) on delete cascade,
    license_number varchar(50) not null,         -- driver licence / operating permit number
    license_plate varchar(20),                   -- null for marshals
    role varchar(20) not null default 'DRIVER' check (role in ('DRIVER', 'MARSHAL')),
    rank_id uuid references public.ranks (id),   -- marshals: assigned rank
    claimed_by uuid references public.users (id) on delete set null,
    unique (association_id, license_number)
);

-- Tunable, non-financial settings (indicative charter fare guide, offer window).
create table public.app_settings (
    key text primary key,
    value numeric not null
);
insert into public.app_settings (key, value) values
    ('charter_base_zar', 80),
    ('charter_per_km_zar', 12),
    ('charter_min_zar', 150),
    ('hail_offer_seconds', 30)
on conflict (key) do nothing;

-- A minibus on a route that commuters can board (the shared-route manifest).
create table public.departures (
    id uuid primary key default gen_random_uuid(),
    route_id uuid not null references public.routes (id),
    vehicle_id uuid not null references public.vehicles (id),
    driver_id uuid not null references public.users (id),
    status varchar(20) not null default 'BOARDING'
      check (status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE', 'COMPLETED', 'CANCELLED')),
    departs_at timestamptz,
    passengers_count int not null default 0 check (passengers_count >= 0),
    capacity int not null default 15,
    manifest_updated_at timestamptz not null default to_timestamp(0),
    created_at timestamptz not null default now()
);
create index departures_open_idx on public.departures (status, route_id);
create index departures_driver_idx on public.departures (driver_id, created_at desc);

alter table public.trips
  add column if not exists departure_id uuid references public.departures (id) on delete set null,
  add column if not exists hail_request_id uuid references public.hail_requests (id) on delete set null;
create index if not exists trips_departure_idx on public.trips (departure_id);
create index if not exists trips_hail_idx on public.trips (hail_request_id);

-- Latest GPS fix + operational status per vehicle (drives live tracking).
create table public.vehicle_locations (
    vehicle_id uuid primary key references public.vehicles (id) on delete cascade,
    driver_id uuid not null references public.users (id) on delete cascade,
    lat double precision not null check (lat between -90 and 90),
    lng double precision not null check (lng between -180 and 180),
    heading real,
    speed real,
    status varchar(10) not null default 'IDLE' check (status in ('IDLE', 'EN_ROUTE', 'FULL', 'OFFLINE')),
    location geography(Point, 4326),
    updated_at timestamptz not null default now()
);
create index vehicle_locations_gix on public.vehicle_locations using gist (location);

-- Marshal-managed queue of vehicles waiting to depart a rank.
create table public.rank_queue (
    id uuid primary key default gen_random_uuid(),
    rank_id uuid not null references public.ranks (id),
    vehicle_id uuid not null references public.vehicles (id),
    route_id uuid references public.routes (id),
    departure_id uuid references public.departures (id) on delete set null,
    status varchar(10) not null default 'QUEUED' check (status in ('QUEUED', 'DEPARTED', 'REMOVED')),
    queued_by uuid references public.users (id),
    queued_at timestamptz not null default now(),
    departed_at timestamptz
);
create unique index rank_queue_one_active_per_vehicle on public.rank_queue (vehicle_id) where status = 'QUEUED';
create index rank_queue_rank_idx on public.rank_queue (rank_id, status, queued_at);

-- -----------------------------------------------------------------------------
-- 4. Triggers
-- -----------------------------------------------------------------------------

-- Keep the PostGIS point and the server timestamp in sync with every GPS write.
create or replace function public._vehicle_locations_before_write()
returns trigger
language plpgsql
set search_path = public, extensions
as $$
begin
  new.location := st_setsrid(st_makepoint(new.lng, new.lat), 4326)::geography;
  new.updated_at := now();
  return new;
end;
$$;

create trigger vehicle_locations_before_write
  before insert or update on public.vehicle_locations
  for each row execute function public._vehicle_locations_before_write();

-- Mirror every new auth user into public.users. A client may only ever request
-- COMMUTER or DRIVER here; MARSHAL/ADMIN are never self-assignable, and a DRIVER
-- stays unverified until verify_operator() matches the association registry.
create or replace function public._handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_role text := upper(coalesce(new.raw_user_meta_data ->> 'role', 'COMMUTER'));
begin
  if v_role not in ('COMMUTER', 'DRIVER') then
    v_role := 'COMMUTER';
  end if;

  insert into public.users (id, phone_number, role)
  values (new.id, coalesce(nullif(new.phone, ''), 'uid:' || new.id::text), v_role)
  on conflict (id) do nothing;

  insert into public.user_credentials (user_id, is_verified)
  values (new.id, false)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public._handle_new_auth_user();

-- -----------------------------------------------------------------------------
-- 5. Helper functions used by RLS policies and RPCs
-- -----------------------------------------------------------------------------
create or replace function public.is_verified_operator()
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.users u
    join public.user_credentials c on c.user_id = u.id
    where u.id = auth.uid() and u.role in ('DRIVER', 'MARSHAL') and c.is_verified
  );
$$;

create or replace function public.is_verified_driver()
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.users u
    join public.user_credentials c on c.user_id = u.id
    where u.id = auth.uid() and u.role = 'DRIVER' and c.is_verified
  );
$$;

create or replace function public.is_verified_marshal()
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.users u
    join public.user_credentials c on c.user_id = u.id
    where u.id = auth.uid() and u.role = 'MARSHAL' and c.is_verified
  );
$$;

create or replace function public.marshal_association()
returns uuid
language sql stable security definer
set search_path = public, extensions
as $$
  select c.association_id from public.user_credentials c where c.user_id = auth.uid();
$$;

create or replace function public.marshal_rank()
returns uuid
language sql stable security definer
set search_path = public, extensions
as $$
  select c.rank_id from public.user_credentials c where c.user_id = auth.uid();
$$;

create or replace function public._offer_seconds()
returns int
language sql stable
set search_path = public
as $$
  select coalesce((select value::int from public.app_settings where key = 'hail_offer_seconds'), 30);
$$;

-- True when the calling driver is IDLE with a fresh GPS fix within 15 km of the pickup.
create or replace function public.hail_in_range(p_pickup geography)
returns boolean
language sql stable security definer
set search_path = public, extensions
as $$
  select exists (
    select 1
    from public.vehicle_locations vl
    where vl.driver_id = auth.uid()
      and vl.status = 'IDLE'
      and vl.updated_at > now() - interval '5 minutes'
      and st_dwithin(vl.location, p_pickup, 15000)
  );
$$;

-- -----------------------------------------------------------------------------
-- 6. Row Level Security
-- Principle: clients READ only what they own or what is public transit data,
-- and every state change goes through the audited RPCs in 0003.
-- -----------------------------------------------------------------------------
alter table public.users              enable row level security;
alter table public.user_credentials   enable row level security;
alter table public.vehicles           enable row level security;
alter table public.ranks              enable row level security;
alter table public.routes             enable row level security;
alter table public.trips              enable row level security;
alter table public.hail_requests      enable row level security;
alter table public.trip_share_tokens  enable row level security;
alter table public.lost_and_found     enable row level security;
alter table public.associations       enable row level security;   -- no policies: server-side only
alter table public.operator_registry  enable row level security;   -- no policies: server-side only
alter table public.app_settings       enable row level security;
alter table public.departures         enable row level security;
alter table public.vehicle_locations  enable row level security;
alter table public.rank_queue         enable row level security;

-- users / credentials: read own row only. No client INSERT/UPDATE/DELETE, so
-- role and is_verified can never be self-escalated.
create policy users_select_own on public.users
  for select to authenticated using (id = auth.uid());
create policy credentials_select_own on public.user_credentials
  for select to authenticated using (user_id = auth.uid());

-- vehicles: the driver, or a verified marshal.
create policy vehicles_select on public.vehicles
  for select to authenticated using (driver_id = auth.uid() or public.is_verified_marshal());

-- public transit reference data
create policy ranks_select on public.ranks
  for select to authenticated using (true);
create policy routes_select on public.routes
  for select to authenticated using (true);
create policy app_settings_select on public.app_settings
  for select to authenticated using (true);

-- trips: participants only (writes via RPC)
create policy trips_select_participant on public.trips
  for select to authenticated using (commuter_id = auth.uid() or driver_id = auth.uid());

-- charters: the commuter, the assigned driver, or an eligible nearby IDLE driver
-- while the request is still being offered.
create policy hail_select on public.hail_requests
  for select to authenticated using (
    commuter_id = auth.uid()
    or driver_id = auth.uid()
    or (status = 'SEARCHING' and public.is_verified_driver() and public.hail_in_range(pickup_location))
  );

-- share tokens: only the trip owner can mint / list / revoke, only for live trips,
-- and never for longer than 24 hours.
create policy share_tokens_select_owner on public.trip_share_tokens
  for select to authenticated using (
    exists (select 1 from public.trips t where t.id = trip_id and t.commuter_id = auth.uid())
  );
create policy share_tokens_insert_owner on public.trip_share_tokens
  for insert to authenticated with check (
    expires_at <= now() + interval '24 hours'
    and exists (
      select 1 from public.trips t
      where t.id = trip_id
        and t.commuter_id = auth.uid()
        and t.status in ('SCHEDULED', 'IN_PROGRESS')
    )
  );
create policy share_tokens_delete_owner on public.trip_share_tokens
  for delete to authenticated using (
    exists (select 1 from public.trips t where t.id = trip_id and t.commuter_id = auth.uid())
  );

-- lost & found
create policy lost_found_select on public.lost_and_found
  for select to authenticated using (
    reporter_id = auth.uid()
    or public.is_verified_marshal()
    or exists (select 1 from public.trips t where t.id = trip_id and t.driver_id = auth.uid())
  );
create policy lost_found_insert on public.lost_and_found
  for insert to authenticated with check (
    reporter_id = auth.uid()
    and (
      trip_id is null
      or exists (
        select 1 from public.trips t
        where t.id = trip_id and (t.commuter_id = auth.uid() or t.driver_id = auth.uid())
      )
    )
    and (
      report_type = 'LOST'
      or (public.is_verified_marshal() and pickup_rank_id is not distinct from public.marshal_rank())
    )
  );
create policy lost_found_marshal_update on public.lost_and_found
  for update to authenticated
  using (public.is_verified_marshal())
  with check (public.is_verified_marshal());

-- departures / queue: operators only (commuters read via security-definer RPCs)
create policy departures_select on public.departures
  for select to authenticated using (driver_id = auth.uid() or public.is_verified_marshal());
create policy rank_queue_select on public.rank_queue
  for select to authenticated using (public.is_verified_operator());

-- live vehicle positions: visible while a vehicle is online; drivers write only their own.
create policy vehicle_locations_select on public.vehicle_locations
  for select to authenticated using (status <> 'OFFLINE' or driver_id = auth.uid());
create policy vehicle_locations_insert_own on public.vehicle_locations
  for insert to authenticated with check (
    driver_id = auth.uid()
    and public.is_verified_operator()
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.driver_id = auth.uid())
  );
create policy vehicle_locations_update_own on public.vehicle_locations
  for update to authenticated
  using (driver_id = auth.uid())
  with check (
    driver_id = auth.uid()
    and exists (select 1 from public.vehicles v where v.id = vehicle_id and v.driver_id = auth.uid())
  );
