-- =============================================================================
-- 0003_rpcs.sql
-- All state changes and cross-user reads go through these functions. They are
-- SECURITY DEFINER where they must see rows RLS hides from the caller, and each
-- one re-checks auth.uid(), role and ownership itself. Functions prefixed with
-- an underscore are internal helpers and are NOT callable by clients (0004).
-- Fares are an indicative guide only: no payment is processed anywhere.
-- =============================================================================

-- -----------------------------------------------------------------------------
-- Internal helpers
-- -----------------------------------------------------------------------------
create or replace function public._require_auth()
returns uuid
language plpgsql stable
as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated' using errcode = '28000';
  end if;
  return auth.uid();
end;
$$;

create or replace function public._assert_sa_point(p_lat double precision, p_lng double precision)
returns void
language plpgsql immutable
as $$
begin
  if p_lat is null or p_lng is null
     or p_lat not between -35.5 and -21.5
     or p_lng not between 16.0 and 33.5 then
    raise exception 'location must be within South Africa' using errcode = 'P0001';
  end if;
end;
$$;

create or replace function public._charter_estimate(p_pickup geography, p_drop geography)
returns table (distance_km numeric, fare_zar numeric)
language plpgsql stable security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_base numeric;
  v_per_km numeric;
  v_min numeric;
  v_dist numeric;
begin
  select value into v_base   from public.app_settings where key = 'charter_base_zar';
  select value into v_per_km from public.app_settings where key = 'charter_per_km_zar';
  select value into v_min    from public.app_settings where key = 'charter_min_zar';

  -- straight-line distance with a 1.3x road factor
  v_dist := round((st_distance(p_pickup, p_drop) / 1000.0 * 1.3)::numeric, 1);

  return query select
    v_dist,
    greatest(coalesce(v_min, 0), round(coalesce(v_base, 0) + coalesce(v_per_km, 0) * v_dist, 0));
end;
$$;

-- Apply a status change to a departure and cascade to its trips / vehicle / queue.
-- Idempotent: finished departures are left untouched.
create or replace function public._apply_departure_status(p_departure uuid, p_status text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_dep public.departures%rowtype;
begin
  select * into v_dep from public.departures where id = p_departure for update;
  if not found then
    raise exception 'departure not found' using errcode = 'P0002';
  end if;
  if v_dep.status in ('COMPLETED', 'CANCELLED') then
    return;
  end if;

  update public.departures
     set status = p_status,
         departs_at = case when p_status = 'EN_ROUTE' then now() else departs_at end
   where id = p_departure;

  if p_status = 'EN_ROUTE' then
    update public.trips set status = 'IN_PROGRESS'
     where departure_id = p_departure and status = 'SCHEDULED';
    update public.vehicle_locations set status = 'EN_ROUTE'
     where vehicle_id = v_dep.vehicle_id and status = 'IDLE';
  elsif p_status in ('COMPLETED', 'CANCELLED') then
    update public.trips
       set status = case when p_status = 'COMPLETED' then 'COMPLETED' else 'CANCELLED' end
     where departure_id = p_departure and status in ('SCHEDULED', 'IN_PROGRESS');
    update public.vehicle_locations set status = 'IDLE'
     where vehicle_id = v_dep.vehicle_id and status in ('EN_ROUTE', 'FULL');
    update public.rank_queue set status = 'REMOVED'
     where departure_id = p_departure and status = 'QUEUED';
  end if;
end;
$$;

-- -----------------------------------------------------------------------------
-- Operator verification (Association ID + licence/permit number)
-- -----------------------------------------------------------------------------
create or replace function public.verify_operator(p_association_code text, p_license_number text)
returns jsonb
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_assoc public.associations%rowtype;
  v_reg public.operator_registry%rowtype;
  v_vehicle_id uuid;
begin
  if not exists (select 1 from public.users where id = v_uid and role in ('DRIVER', 'MARSHAL')) then
    raise exception 'this account is not an operator account' using errcode = '42501';
  end if;

  select * into v_assoc
    from public.associations
   where upper(code) = upper(trim(p_association_code));
  if not found then
    raise exception 'association or permit not recognised' using errcode = 'P0002';
  end if;

  select * into v_reg
    from public.operator_registry
   where association_id = v_assoc.id
     and upper(license_number) = upper(trim(p_license_number))
   for update;
  if not found then
    raise exception 'association or permit not recognised' using errcode = 'P0002';
  end if;

  if v_reg.claimed_by is not null and v_reg.claimed_by <> v_uid then
    raise exception 'this permit is already linked to another account' using errcode = '23505';
  end if;

  update public.operator_registry set claimed_by = v_uid where id = v_reg.id;
  update public.users set role = v_reg.role where id = v_uid;

  insert into public.user_credentials (user_id, is_verified, association_id, license_number, rank_id)
  values (v_uid, true, v_assoc.id, v_reg.license_number, v_reg.rank_id)
  on conflict (user_id) do update
    set is_verified = true,
        association_id = excluded.association_id,
        license_number = excluded.license_number,
        rank_id = excluded.rank_id;

  if v_reg.license_plate is not null then
    insert into public.vehicles (driver_id, license_plate)
    values (v_uid, upper(v_reg.license_plate))
    on conflict (license_plate) do update set driver_id = excluded.driver_id
    returning id into v_vehicle_id;
  end if;

  return jsonb_build_object('role', v_reg.role, 'vehicle_id', v_vehicle_id);
end;
$$;

-- -----------------------------------------------------------------------------
-- Ranks, routes and spatial search
-- -----------------------------------------------------------------------------
create or replace function public.list_ranks()
returns table (id uuid, name varchar, lat double precision, lng double precision)
language sql stable
set search_path = public, extensions
as $$
  select r.id, r.name, st_y(r.location::geometry), st_x(r.location::geometry)
  from public.ranks r
  order by r.name;
$$;

create or replace function public.list_routes()
returns table (
  route_id uuid,
  origin_rank_id uuid, origin_name varchar,
  destination_rank_id uuid, destination_name varchar,
  estimated_duration_mins int
)
language sql stable
set search_path = public, extensions
as $$
  select r.id, ro.id, ro.name, rd.id, rd.name, r.estimated_duration_mins
  from public.routes r
  join public.ranks ro on ro.id = r.origin_rank_id
  join public.ranks rd on rd.id = r.destination_rank_id
  order by ro.name, rd.name;
$$;

create or replace function public.search_ranks(
  p_query text,
  p_lat double precision default null,
  p_lng double precision default null,
  p_limit int default 15
)
returns table (id uuid, name varchar, lat double precision, lng double precision, distance_m double precision)
language sql stable
set search_path = public, extensions
as $$
  select r.id, r.name, st_y(r.location::geometry), st_x(r.location::geometry),
         case when p_lat is null or p_lng is null then null
              else st_distance(r.location, st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography)
         end
  from public.ranks r
  where coalesce(trim(p_query), '') = ''
     or r.name ilike '%' || trim(p_query) || '%'
  order by 5 asc nulls last, r.name
  limit least(greatest(p_limit, 1), 50);
$$;

-- Uses the GiST index on ranks.location via ST_DWithin.
create or replace function public.nearby_ranks(
  p_lat double precision,
  p_lng double precision,
  p_radius_m int default 5000
)
returns table (id uuid, name varchar, lat double precision, lng double precision, distance_m double precision)
language sql stable
set search_path = public, extensions
as $$
  with pt as (select st_setsrid(st_makepoint(p_lng, p_lat), 4326)::geography as g)
  select r.id, r.name, st_y(r.location::geometry), st_x(r.location::geometry),
         st_distance(r.location, pt.g)
  from public.ranks r, pt
  where st_dwithin(r.location, pt.g, least(greatest(p_radius_m, 100), 50000))
  order by 5
  limit 10;
$$;

-- -----------------------------------------------------------------------------
-- Shared-route commuting
-- -----------------------------------------------------------------------------
create or replace function public.upcoming_departures(p_origin uuid default null, p_dest uuid default null)
returns table (
  departure_id uuid, route_id uuid,
  origin_rank_id uuid, origin_name varchar,
  destination_rank_id uuid, destination_name varchar,
  estimated_duration_mins int,
  status varchar, departs_at timestamptz,
  occupancy int, capacity int,
  vehicle_id uuid, license_plate varchar,
  vehicle_status varchar, vehicle_lat double precision, vehicle_lng double precision,
  vehicle_updated_at timestamptz
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  perform public._require_auth();

  return query
  select d.id, r.id,
         ro.id, ro.name,
         rd.id, rd.name,
         r.estimated_duration_mins,
         d.status, d.departs_at,
         greatest(
           d.passengers_count,
           (select count(*)::int from public.trips t
             where t.departure_id = d.id
               and t.status in ('SCHEDULED', 'IN_PROGRESS')
               and t.created_at > now() - interval '12 hours')
         ),
         d.capacity,
         d.vehicle_id, v.license_plate,
         vl.status, vl.lat, vl.lng, vl.updated_at
  from public.departures d
  join public.routes r  on r.id = d.route_id
  join public.ranks ro  on ro.id = r.origin_rank_id
  join public.ranks rd  on rd.id = r.destination_rank_id
  join public.vehicles v on v.id = d.vehicle_id
  left join public.vehicle_locations vl on vl.vehicle_id = d.vehicle_id and vl.status <> 'OFFLINE'
  where d.status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE')
    and d.created_at > now() - interval '12 hours'
    and (p_origin is null or r.origin_rank_id = p_origin)
    and (p_dest is null or r.destination_rank_id = p_dest)
  order by (d.status = 'BOARDING') desc, d.departs_at nulls last, d.created_at;
end;
$$;

create or replace function public.join_departure(p_departure_id uuid, p_trip_id uuid default gen_random_uuid())
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_dep public.departures%rowtype;
  v_occ int;
  v_existing uuid;
begin
  if (select role from public.users where id = v_uid) is distinct from 'COMMUTER' then
    raise exception 'only commuters can join departures' using errcode = '42501';
  end if;

  -- idempotent retry of the same client-generated trip id
  select id into v_existing from public.trips where id = p_trip_id and commuter_id = v_uid;
  if found then
    return v_existing;
  end if;

  select * into v_dep from public.departures where id = p_departure_id for update;
  if not found or v_dep.status not in ('SCHEDULED', 'BOARDING') then
    raise exception 'this minibus is not open for boarding' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.trips t
     where t.commuter_id = v_uid
       and t.status in ('SCHEDULED', 'IN_PROGRESS')
       and t.created_at > now() - interval '12 hours'
  ) then
    raise exception 'you already have an active trip' using errcode = 'P0001';
  end if;

  select greatest(v_dep.passengers_count, count(*)::int) into v_occ
    from public.trips t
   where t.departure_id = v_dep.id
     and t.status in ('SCHEDULED', 'IN_PROGRESS')
     and t.created_at > now() - interval '12 hours';

  if v_occ >= v_dep.capacity then
    raise exception 'this minibus is full' using errcode = 'P0001';
  end if;

  insert into public.trips (id, commuter_id, driver_id, route_id, departure_id, status)
  values (p_trip_id, v_uid, v_dep.driver_id, v_dep.route_id, v_dep.id, 'SCHEDULED');

  return p_trip_id;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trips
-- -----------------------------------------------------------------------------
create or replace function public.my_trips()
returns table (
  trip_id uuid, status varchar, created_at timestamptz, mode text,
  origin_name text, destination_name text, license_plate varchar
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_uid uuid := public._require_auth();
begin
  return query
  select t.id, t.status, t.created_at,
         case when t.hail_request_id is null then 'SHARED' else 'CHARTER' end,
         ro.name::text, rd.name::text,
         (select v.license_plate from public.vehicles v where v.driver_id = t.driver_id limit 1)
  from public.trips t
  left join public.routes r on r.id = t.route_id
  left join public.ranks ro on ro.id = r.origin_rank_id
  left join public.ranks rd on rd.id = r.destination_rank_id
  where t.commuter_id = v_uid or t.driver_id = v_uid
  order by t.created_at desc
  limit 50;
end;
$$;

create or replace function public.get_trip_detail(p_trip_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_trip public.trips%rowtype;
  v_out jsonb;
begin
  select * into v_trip
    from public.trips
   where id = p_trip_id and (commuter_id = v_uid or driver_id = v_uid);
  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;

  select jsonb_build_object(
    'id', v_trip.id,
    'status', v_trip.status,
    'mode', case when v_trip.hail_request_id is null then 'SHARED' else 'CHARTER' end,
    'hail_request_id', v_trip.hail_request_id,
    'origin', case
      when v_trip.hail_request_id is not null then
        (select jsonb_build_object('name', 'Pickup',
                                   'lat', st_y(h.pickup_location::geometry),
                                   'lng', st_x(h.pickup_location::geometry))
           from public.hail_requests h where h.id = v_trip.hail_request_id)
      else
        (select jsonb_build_object('name', ro.name,
                                   'lat', st_y(ro.location::geometry),
                                   'lng', st_x(ro.location::geometry))
           from public.routes r join public.ranks ro on ro.id = r.origin_rank_id
          where r.id = v_trip.route_id)
    end,
    'destination', case
      when v_trip.hail_request_id is not null then
        (select jsonb_build_object('name', 'Drop-off',
                                   'lat', st_y(h.dropoff_location::geometry),
                                   'lng', st_x(h.dropoff_location::geometry))
           from public.hail_requests h where h.id = v_trip.hail_request_id)
      else
        (select jsonb_build_object('name', rd.name,
                                   'lat', st_y(rd.location::geometry),
                                   'lng', st_x(rd.location::geometry))
           from public.routes r join public.ranks rd on rd.id = r.destination_rank_id
          where r.id = v_trip.route_id)
    end,
    'vehicle', (
      select jsonb_build_object('id', v.id, 'license_plate', v.license_plate,
                                'lat', vl.lat, 'lng', vl.lng, 'heading', vl.heading,
                                'status', vl.status, 'updated_at', vl.updated_at)
        from public.vehicles v
        left join public.vehicle_locations vl on vl.vehicle_id = v.id and vl.status <> 'OFFLINE'
       where v.driver_id = v_trip.driver_id
       limit 1
    )
  ) into v_out;

  return v_out;
end;
$$;

-- Shared-route trips only. Charters are completed through advance_hail / cancel_hail.
create or replace function public.finish_trip(p_trip_id uuid, p_cancel boolean default false)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_trip public.trips%rowtype;
begin
  select * into v_trip
    from public.trips
   where id = p_trip_id and (commuter_id = v_uid or driver_id = v_uid)
   for update;
  if not found then
    raise exception 'trip not found' using errcode = 'P0002';
  end if;
  if v_trip.hail_request_id is not null then
    raise exception 'use the charter flow for private charters' using errcode = 'P0001';
  end if;
  if v_trip.status in ('COMPLETED', 'CANCELLED') then
    return v_trip.status;
  end if;

  if p_cancel then
    if v_trip.commuter_id <> v_uid or v_trip.status <> 'SCHEDULED' then
      raise exception 'only a not-yet-departed trip can be cancelled by its commuter' using errcode = 'P0001';
    end if;
    update public.trips set status = 'CANCELLED' where id = p_trip_id;
    return 'CANCELLED';
  end if;

  update public.trips set status = 'COMPLETED' where id = p_trip_id;
  return 'COMPLETED';
end;
$$;

-- -----------------------------------------------------------------------------
-- Private charter (hail) lifecycle
-- -----------------------------------------------------------------------------
create or replace function public.preview_charter(
  p_pickup_lat double precision, p_pickup_lng double precision,
  p_drop_lat double precision, p_drop_lng double precision
)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_est record;
begin
  perform public._require_auth();
  perform public._assert_sa_point(p_pickup_lat, p_pickup_lng);
  perform public._assert_sa_point(p_drop_lat, p_drop_lng);

  select * into v_est from public._charter_estimate(
    st_setsrid(st_makepoint(p_pickup_lng, p_pickup_lat), 4326)::geography,
    st_setsrid(st_makepoint(p_drop_lng, p_drop_lat), 4326)::geography
  );

  return jsonb_build_object(
    'distance_km', v_est.distance_km,
    'fare_estimate_zar', v_est.fare_zar,
    'disclaimer', 'Indicative guide only. Agree the fare with the driver and pay them directly.'
  );
end;
$$;

create or replace function public.create_hail_request(
  p_pickup_lat double precision, p_pickup_lng double precision,
  p_drop_lat double precision, p_drop_lng double precision,
  p_id uuid default gen_random_uuid()
)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_pick geography;
  v_drop geography;
  v_est record;
  v_existing uuid;
begin
  if (select role from public.users where id = v_uid) is distinct from 'COMMUTER' then
    raise exception 'only commuters can request a charter' using errcode = '42501';
  end if;

  select id into v_existing from public.hail_requests where id = p_id and commuter_id = v_uid;
  if found then
    return v_existing;
  end if;

  if exists (
    select 1 from public.hail_requests
     where commuter_id = v_uid and status in ('SEARCHING', 'ACCEPTED', 'EN_ROUTE')
  ) then
    raise exception 'you already have an active charter request' using errcode = 'P0001';
  end if;

  perform public._assert_sa_point(p_pickup_lat, p_pickup_lng);
  perform public._assert_sa_point(p_drop_lat, p_drop_lng);

  v_pick := st_setsrid(st_makepoint(p_pickup_lng, p_pickup_lat), 4326)::geography;
  v_drop := st_setsrid(st_makepoint(p_drop_lng, p_drop_lat), 4326)::geography;

  if st_distance(v_pick, v_drop) < 200 then
    raise exception 'pickup and drop-off are too close together' using errcode = 'P0001';
  end if;

  select * into v_est from public._charter_estimate(v_pick, v_drop);

  insert into public.hail_requests
    (id, commuter_id, pickup_location, dropoff_location, status, offered_at, offer_round, distance_km, fare_estimate_zar)
  values
    (p_id, v_uid, v_pick, v_drop, 'SEARCHING', now(), 1, v_est.distance_km, v_est.fare_zar);

  return p_id;
end;
$$;

-- Re-offer the request to nearby drivers once the previous window has lapsed.
-- After 4 rounds with no taker the request is cancelled.
create or replace function public.rebroadcast_hail(p_id uuid)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_req public.hail_requests%rowtype;
begin
  select * into v_req from public.hail_requests where id = p_id and commuter_id = v_uid for update;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if v_req.status <> 'SEARCHING' then
    return v_req.status;
  end if;
  if v_req.offered_at > now() - make_interval(secs => public._offer_seconds()) then
    return 'SEARCHING';      -- current offer window still open
  end if;
  if v_req.offer_round >= 4 then
    update public.hail_requests set status = 'CANCELLED' where id = p_id;
    return 'CANCELLED';
  end if;

  update public.hail_requests
     set offered_at = now(), offer_round = offer_round + 1
   where id = p_id;
  return 'SEARCHING';
end;
$$;

create or replace function public.cancel_hail(p_id uuid)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_req public.hail_requests%rowtype;
begin
  select * into v_req from public.hail_requests where id = p_id and commuter_id = v_uid for update;
  if not found then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  if v_req.status in ('COMPLETED', 'CANCELLED') then
    return v_req.status;
  end if;

  update public.hail_requests set status = 'CANCELLED' where id = p_id;
  update public.trips set status = 'CANCELLED'
   where hail_request_id = p_id and status in ('SCHEDULED', 'IN_PROGRESS');
  if v_req.driver_id is not null then
    update public.vehicle_locations set status = 'IDLE'
     where driver_id = v_req.driver_id and status = 'EN_ROUTE';
  end if;
  return 'CANCELLED';
end;
$$;

-- First valid accept wins: the UPDATE only matches while the request is still
-- SEARCHING and inside its 30-second offer window.
create or replace function public.accept_hail(p_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_veh uuid;
  v_req public.hail_requests%rowtype;
  v_trip uuid := gen_random_uuid();
begin
  if not public.is_verified_driver() then
    raise exception 'only verified drivers can accept charters' using errcode = '42501';
  end if;

  select v.id into v_veh
    from public.vehicles v
    join public.vehicle_locations vl on vl.vehicle_id = v.id
   where v.driver_id = v_uid
     and vl.status = 'IDLE'
     and vl.updated_at > now() - interval '5 minutes'
   limit 1;
  if v_veh is null then
    raise exception 'go online as IDLE with a recent location to accept charters' using errcode = 'P0001';
  end if;

  update public.hail_requests h
     set driver_id = v_uid, status = 'ACCEPTED'
   where h.id = p_id
     and h.status = 'SEARCHING'
     and h.offered_at > now() - make_interval(secs => public._offer_seconds())
     and public.hail_in_range(h.pickup_location)
  returning * into v_req;
  if not found then
    raise exception 'this request is no longer available' using errcode = 'P0001';
  end if;

  insert into public.trips (id, commuter_id, driver_id, hail_request_id, status)
  values (v_trip, v_req.commuter_id, v_uid, p_id, 'SCHEDULED');

  update public.vehicle_locations set status = 'EN_ROUTE' where vehicle_id = v_veh;
  return v_trip;
end;
$$;

-- Driver advances a charter. p_from makes double-taps and offline replays safe:
-- the step only applies if the request is still in the state the driver saw.
create or replace function public.advance_hail(p_id uuid, p_from text)
returns text
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_req public.hail_requests%rowtype;
begin
  select * into v_req from public.hail_requests where id = p_id and driver_id = v_uid for update;
  if not found then
    raise exception 'charter not found' using errcode = 'P0002';
  end if;
  if v_req.status <> p_from then
    return v_req.status;
  end if;

  if v_req.status = 'ACCEPTED' then
    update public.hail_requests set status = 'EN_ROUTE' where id = p_id;
    update public.trips set status = 'IN_PROGRESS' where hail_request_id = p_id and status = 'SCHEDULED';
    return 'EN_ROUTE';
  elsif v_req.status = 'EN_ROUTE' then
    update public.hail_requests set status = 'COMPLETED' where id = p_id;
    update public.trips set status = 'COMPLETED' where hail_request_id = p_id and status in ('SCHEDULED', 'IN_PROGRESS');
    update public.vehicle_locations set status = 'IDLE' where driver_id = v_uid and status = 'EN_ROUTE';
    return 'COMPLETED';
  end if;
  return v_req.status;
end;
$$;

create or replace function public.list_open_hails()
returns table (
  id uuid,
  pickup_lat double precision, pickup_lng double precision,
  drop_lat double precision, drop_lng double precision,
  distance_km numeric, fare_estimate_zar numeric,
  offered_at timestamptz, seconds_left int, pickup_distance_m double precision
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
begin
  perform public._require_auth();
  if not public.is_verified_driver() then
    return;
  end if;

  return query
  select h.id,
         st_y(h.pickup_location::geometry), st_x(h.pickup_location::geometry),
         st_y(h.dropoff_location::geometry), st_x(h.dropoff_location::geometry),
         h.distance_km, h.fare_estimate_zar,
         h.offered_at,
         greatest(0, ceil(extract(epoch from (h.offered_at + make_interval(secs => public._offer_seconds()) - now()))))::int,
         st_distance(h.pickup_location, vl.location)
  from public.hail_requests h
  join public.vehicle_locations vl on vl.driver_id = auth.uid() and vl.status = 'IDLE'
  where h.status = 'SEARCHING'
    and h.offered_at > now() - make_interval(secs => public._offer_seconds())
    and st_dwithin(h.pickup_location, vl.location, 15000)
  order by 10;
end;
$$;

create or replace function public.get_hail(p_id uuid)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_out jsonb;
begin
  select jsonb_build_object(
    'id', h.id,
    'status', h.status,
    'offer_round', h.offer_round,
    'offered_at', h.offered_at,
    'distance_km', h.distance_km,
    'fare_estimate_zar', h.fare_estimate_zar,
    'pickup', jsonb_build_object('lat', st_y(h.pickup_location::geometry), 'lng', st_x(h.pickup_location::geometry)),
    'dropoff', jsonb_build_object('lat', st_y(h.dropoff_location::geometry), 'lng', st_x(h.dropoff_location::geometry)),
    'trip_id', (select t.id from public.trips t where t.hail_request_id = h.id limit 1),
    'vehicle', (
      select jsonb_build_object('id', v.id, 'license_plate', v.license_plate,
                                'lat', vl.lat, 'lng', vl.lng, 'heading', vl.heading,
                                'updated_at', vl.updated_at)
        from public.vehicles v
        left join public.vehicle_locations vl on vl.vehicle_id = v.id and vl.status <> 'OFFLINE'
       where v.driver_id = h.driver_id
       limit 1
    )
  ) into v_out
  from public.hail_requests h
  where h.id = p_id and (h.commuter_id = v_uid or h.driver_id = v_uid);

  if v_out is null then
    raise exception 'request not found' using errcode = 'P0002';
  end if;
  return v_out;
end;
$$;

-- -----------------------------------------------------------------------------
-- Driver dashboard and manifest
-- -----------------------------------------------------------------------------
create or replace function public.driver_dashboard()
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_midnight timestamptz := (date_trunc('day', now() at time zone 'Africa/Johannesburg') at time zone 'Africa/Johannesburg');
begin
  if not public.is_verified_operator() then
    raise exception 'verified operator access required' using errcode = '42501';
  end if;

  return jsonb_build_object(
    'association', (select a.name from public.user_credentials c
                      join public.associations a on a.id = c.association_id
                     where c.user_id = v_uid),
    'rank', (select jsonb_build_object('id', r.id, 'name', r.name)
               from public.user_credentials c join public.ranks r on r.id = c.rank_id
              where c.user_id = v_uid),
    'vehicle', (select jsonb_build_object('id', v.id, 'license_plate', v.license_plate,
                                          'capacity', v.capacity, 'status', vl.status)
                  from public.vehicles v
                  left join public.vehicle_locations vl on vl.vehicle_id = v.id
                 where v.driver_id = v_uid limit 1),
    'departure', (select jsonb_build_object('id', d.id, 'status', d.status,
                                            'passengers_count', d.passengers_count,
                                            'capacity', d.capacity,
                                            'origin_name', ro.name, 'destination_name', rd.name)
                    from public.departures d
                    join public.routes r on r.id = d.route_id
                    join public.ranks ro on ro.id = r.origin_rank_id
                    join public.ranks rd on rd.id = r.destination_rank_id
                   where d.driver_id = v_uid and d.status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE')
                   order by d.created_at desc limit 1),
    'active_hail', (select jsonb_build_object('id', h.id, 'status', h.status,
                                              'pickup_lat', st_y(h.pickup_location::geometry),
                                              'pickup_lng', st_x(h.pickup_location::geometry),
                                              'drop_lat', st_y(h.dropoff_location::geometry),
                                              'drop_lng', st_x(h.dropoff_location::geometry))
                      from public.hail_requests h
                     where h.driver_id = v_uid and h.status in ('ACCEPTED', 'EN_ROUTE')
                     order by h.created_at desc limit 1),
    'stats', jsonb_build_object(
      'passengers_today', coalesce((select sum(d.passengers_count) from public.departures d
                                     where d.driver_id = v_uid and d.created_at >= v_midnight), 0),
      'departures_today', (select count(*) from public.departures d
                            where d.driver_id = v_uid and d.created_at >= v_midnight),
      'charters_today', (select count(*) from public.hail_requests h
                          where h.driver_id = v_uid and h.status = 'COMPLETED' and h.created_at >= v_midnight)
    )
  );
end;
$$;

create or replace function public.start_departure(p_route_id uuid, p_id uuid default gen_random_uuid())
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_veh public.vehicles%rowtype;
  v_existing uuid;
begin
  if not public.is_verified_driver() then
    raise exception 'only verified drivers can open a departure' using errcode = '42501';
  end if;

  select id into v_existing from public.departures where id = p_id and driver_id = v_uid;
  if found then
    return v_existing;
  end if;

  select * into v_veh from public.vehicles where driver_id = v_uid limit 1;
  if not found then
    raise exception 'no vehicle is linked to your account' using errcode = 'P0001';
  end if;
  if exists (select 1 from public.departures
              where driver_id = v_uid and status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE')) then
    raise exception 'finish your current departure first' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.routes where id = p_route_id) then
    raise exception 'route not found' using errcode = 'P0002';
  end if;

  insert into public.departures (id, route_id, vehicle_id, driver_id, status, capacity)
  values (p_id, p_route_id, v_veh.id, v_uid, 'BOARDING', coalesce(v_veh.capacity, 15));
  return p_id;
end;
$$;

-- Offline-safe: only the newest client timestamp wins, so replays and
-- out-of-order flushes after a dead zone cannot regress the count.
create or replace function public.set_departure_manifest(p_departure_id uuid, p_count int, p_client_ts timestamptz)
returns boolean
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_ts timestamptz := least(p_client_ts, now());
  v_rows int;
begin
  update public.departures
     set passengers_count = least(greatest(p_count, 0), capacity),
         manifest_updated_at = v_ts
   where id = p_departure_id
     and driver_id = v_uid
     and status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE')
     and v_ts > manifest_updated_at;
  get diagnostics v_rows = row_count;
  return v_rows > 0;
end;
$$;

create or replace function public.set_departure_status(p_departure_id uuid, p_status text)
returns void
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
begin
  if p_status not in ('EN_ROUTE', 'COMPLETED', 'CANCELLED') then
    raise exception 'invalid status' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.departures where id = p_departure_id and driver_id = v_uid) then
    raise exception 'departure not found' using errcode = 'P0002';
  end if;
  perform public._apply_departure_status(p_departure_id, p_status);
end;
$$;

-- -----------------------------------------------------------------------------
-- Rank marshal queue management (scoped to the marshal's own rank + association)
-- -----------------------------------------------------------------------------
create or replace function public.marshal_queue()
returns table (
  entry_id uuid, queue_position int, license_plate varchar, destination_name varchar,
  queued_at timestamptz, passengers_count int, capacity int
)
language plpgsql stable security definer
set search_path = public, extensions
as $$
#variable_conflict use_column
declare
  v_rank uuid := public.marshal_rank();
begin
  if not public.is_verified_marshal() then
    raise exception 'marshal access required' using errcode = '42501';
  end if;

  return query
  select q.id,
         (row_number() over (order by q.queued_at))::int,
         v.license_plate, rd.name, q.queued_at,
         coalesce(d.passengers_count, 0), coalesce(d.capacity, v.capacity, 15)
  from public.rank_queue q
  join public.vehicles v on v.id = q.vehicle_id
  left join public.routes r on r.id = q.route_id
  left join public.ranks rd on rd.id = r.destination_rank_id
  left join public.departures d on d.id = q.departure_id
  where q.rank_id = v_rank and q.status = 'QUEUED'
  order by q.queued_at;
end;
$$;

create or replace function public.marshal_verify_permit(p_plate text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_assoc uuid := public.marshal_association();
  v_veh public.vehicles%rowtype;
  v_cred public.user_credentials%rowtype;
begin
  if not public.is_verified_marshal() then
    raise exception 'marshal access required' using errcode = '42501';
  end if;

  select * into v_veh
    from public.vehicles
   where upper(replace(license_plate, ' ', '')) = upper(replace(p_plate, ' ', ''));
  if not found then
    return jsonb_build_object('valid', false, 'reason', 'Vehicle is not registered', 'license_plate', p_plate);
  end if;

  select * into v_cred from public.user_credentials where user_id = v_veh.driver_id;
  if not found or not coalesce(v_cred.is_verified, false) then
    return jsonb_build_object('valid', false, 'reason', 'Driver permit is not verified', 'license_plate', v_veh.license_plate);
  end if;
  if v_cred.association_id is distinct from v_assoc then
    return jsonb_build_object('valid', false, 'reason', 'Vehicle belongs to a different association', 'license_plate', v_veh.license_plate);
  end if;

  return jsonb_build_object('valid', true, 'reason', null, 'license_plate', v_veh.license_plate);
end;
$$;

create or replace function public.marshal_queue_vehicle(p_plate text, p_route_id uuid)
returns uuid
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_rank uuid := public.marshal_rank();
  v_assoc uuid := public.marshal_association();
  v_veh public.vehicles%rowtype;
  v_dep uuid;
  v_entry uuid;
begin
  if not public.is_verified_marshal() then
    raise exception 'marshal access required' using errcode = '42501';
  end if;
  if v_rank is null then
    raise exception 'no rank is assigned to your account' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.routes where id = p_route_id and origin_rank_id = v_rank) then
    raise exception 'that route does not start at your rank' using errcode = 'P0001';
  end if;

  select v.* into v_veh
    from public.vehicles v
    join public.user_credentials c on c.user_id = v.driver_id
   where upper(replace(v.license_plate, ' ', '')) = upper(replace(p_plate, ' ', ''))
     and c.is_verified
     and c.association_id is not distinct from v_assoc;
  if not found then
    raise exception 'vehicle not found or permit not valid for this association' using errcode = 'P0001';
  end if;

  select id into v_entry from public.rank_queue where vehicle_id = v_veh.id and status = 'QUEUED';
  if found then
    return v_entry;          -- already queued: idempotent
  end if;
  if exists (select 1 from public.departures
              where vehicle_id = v_veh.id and status in ('SCHEDULED', 'BOARDING', 'EN_ROUTE')) then
    raise exception 'this vehicle already has an active departure' using errcode = 'P0001';
  end if;

  insert into public.departures (route_id, vehicle_id, driver_id, status, capacity)
  values (p_route_id, v_veh.id, v_veh.driver_id, 'BOARDING', coalesce(v_veh.capacity, 15))
  returning id into v_dep;

  insert into public.rank_queue (rank_id, vehicle_id, route_id, departure_id, queued_by)
  values (v_rank, v_veh.id, p_route_id, v_dep, v_uid)
  returning id into v_entry;

  update public.vehicles set permit_checked_at = now(), permit_checked_by = v_uid where id = v_veh.id;
  return v_entry;
end;
$$;

-- Idempotent: replaying an already-departed entry is a no-op (returns false).
create or replace function public.marshal_depart(p_entry_id uuid, p_client_ts timestamptz default now())
returns boolean
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_rank uuid := public.marshal_rank();
  v_entry public.rank_queue%rowtype;
begin
  if not public.is_verified_marshal() then
    raise exception 'marshal access required' using errcode = '42501';
  end if;

  select * into v_entry
    from public.rank_queue
   where id = p_entry_id and rank_id = v_rank and status = 'QUEUED'
   for update;
  if not found then
    return false;
  end if;

  update public.rank_queue
     set status = 'DEPARTED', departed_at = least(p_client_ts, now())
   where id = p_entry_id;

  if v_entry.departure_id is not null then
    perform public._apply_departure_status(v_entry.departure_id, 'EN_ROUTE');
  end if;
  return true;
end;
$$;

create or replace function public.marshal_remove(p_entry_id uuid)
returns boolean
language plpgsql security definer
set search_path = public, extensions
as $$
declare
  v_rank uuid := public.marshal_rank();
  v_entry public.rank_queue%rowtype;
begin
  if not public.is_verified_marshal() then
    raise exception 'marshal access required' using errcode = '42501';
  end if;

  select * into v_entry
    from public.rank_queue
   where id = p_entry_id and rank_id = v_rank and status = 'QUEUED'
   for update;
  if not found then
    return false;
  end if;

  update public.rank_queue set status = 'REMOVED' where id = p_entry_id;
  if v_entry.departure_id is not null then
    perform public._apply_departure_status(v_entry.departure_id, 'CANCELLED');
  end if;
  return true;
end;
$$;

-- -----------------------------------------------------------------------------
-- Public trip tracking (no app, no login). Callable by `anon` (see 0004).
-- The caller presents the raw random token; only its SHA-256 is stored. The
-- response is deliberately minimal: no names, phone numbers or user ids.
-- -----------------------------------------------------------------------------
create or replace function public.share_snapshot(p_token text)
returns jsonb
language plpgsql stable security definer
set search_path = public, extensions
as $$
declare
  v_hash text;
  v_tok public.trip_share_tokens%rowtype;
  v_trip public.trips%rowtype;
  v_live boolean;
begin
  if p_token is null or length(p_token) < 32 or length(p_token) > 128 then
    return null;
  end if;

  v_hash := encode(digest(p_token, 'sha256'), 'hex');

  select * into v_tok from public.trip_share_tokens where token_hash = v_hash and expires_at > now();
  if not found then
    return null;
  end if;

  select * into v_trip from public.trips where id = v_tok.trip_id;
  if not found then
    return null;
  end if;

  v_live := v_trip.status in ('SCHEDULED', 'IN_PROGRESS');

  return jsonb_build_object(
    'status', v_trip.status,
    'mode', case when v_trip.hail_request_id is null then 'SHARED' else 'CHARTER' end,
    'expires_at', v_tok.expires_at,
    'origin', case
      when v_trip.hail_request_id is not null then
        (select jsonb_build_object('name', 'Pickup',
                                   'lat', st_y(h.pickup_location::geometry),
                                   'lng', st_x(h.pickup_location::geometry))
           from public.hail_requests h where h.id = v_trip.hail_request_id)
      else
        (select jsonb_build_object('name', ro.name,
                                   'lat', st_y(ro.location::geometry),
                                   'lng', st_x(ro.location::geometry))
           from public.routes r join public.ranks ro on ro.id = r.origin_rank_id
          where r.id = v_trip.route_id)
    end,
    'destination', case
      when v_trip.hail_request_id is not null then
        (select jsonb_build_object('name', 'Drop-off',
                                   'lat', st_y(h.dropoff_location::geometry),
                                   'lng', st_x(h.dropoff_location::geometry))
           from public.hail_requests h where h.id = v_trip.hail_request_id)
      else
        (select jsonb_build_object('name', rd.name,
                                   'lat', st_y(rd.location::geometry),
                                   'lng', st_x(rd.location::geometry))
           from public.routes r join public.ranks rd on rd.id = r.destination_rank_id
          where r.id = v_trip.route_id)
    end,
    'vehicle', case when not v_live then null else (
      select jsonb_build_object('license_plate', v.license_plate,
                                'lat', vl.lat, 'lng', vl.lng, 'heading', vl.heading,
                                'updated_at', vl.updated_at)
        from public.vehicles v
        left join public.vehicle_locations vl on vl.vehicle_id = v.id and vl.status <> 'OFFLINE'
       where v.driver_id = v_trip.driver_id
       limit 1
    ) end
  );
end;
$$;
