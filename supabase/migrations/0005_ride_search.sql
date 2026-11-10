-- =============================================================================
-- 0005_ride_search.sql
-- Destination-aware ride search (commuters see nearest matching rides without
-- hailing) and targeted hails (drivers see commuters who hailed THEM and are
-- heading the same way). No payment data anywhere.
-- =============================================================================

alter table public.vehicle_locations
  add column if not exists dest_lat double precision,
  add column if not exists dest_lng double precision,
  add column if not exists dest_name text,
  add column if not exists seats_available int not null default 15;

alter table public.hail_requests
  add column if not exists target_driver_id uuid references public.users (id) on delete set null,
  add column if not exists dropoff_name text;

create index if not exists hail_requests_target_idx on public.hail_requests (target_driver_id, status);

-- Haversine distance in km (cheap, no PostGIS needed for these small sets)
create or replace function public._km(a_lat double precision, a_lng double precision,
                                      b_lat double precision, b_lng double precision)
returns double precision language sql immutable as $$
  select 6371 * 2 * asin(sqrt(
    power(sin(radians(b_lat - a_lat) / 2), 2) +
    cos(radians(a_lat)) * cos(radians(b_lat)) * power(sin(radians(b_lng - a_lng) / 2), 2)));
$$;

-- Nearest rides (to the commuter) whose destination is within p_radius_km of where the commuter is going.
create or replace function public.nearby_rides(
  p_lat double precision, p_lng double precision,
  p_dest_lat double precision, p_dest_lng double precision,
  p_radius_km double precision default 5)
returns table (vehicle_id uuid, license_plate text, driver_id uuid, lat double precision, lng double precision,
               dest_name text, seats_available int, status text, distance_km numeric, eta_mins int)
language plpgsql stable security definer set search_path = public
as $$
begin
  perform public._require_auth();
  return query
  select vl.vehicle_id, v.license_plate::text, vl.driver_id, vl.lat, vl.lng, vl.dest_name,
         vl.seats_available, vl.status::text,
         round((public._km(p_lat, p_lng, vl.lat, vl.lng) * 1.3)::numeric, 1),
         greatest(1, round(public._km(p_lat, p_lng, vl.lat, vl.lng) * 1.3 / 35 * 60))::int
  from public.vehicle_locations vl
  join public.vehicles v on v.id = vl.vehicle_id
  where vl.status in ('IDLE', 'EN_ROUTE')
    and vl.seats_available > 0
    and vl.updated_at > now() - interval '2 minutes'
    and vl.dest_lat is not null
    and public._km(vl.dest_lat, vl.dest_lng, p_dest_lat, p_dest_lng) <= p_radius_km
  order by public._km(p_lat, p_lng, vl.lat, vl.lng)
  limit 10;
end;
$$;

-- Hails addressed to the calling driver, heading roughly where the driver is heading.
create or replace function public.driver_targeted_hails(p_radius_km double precision default 5)
returns table (id uuid, commuter_id uuid, pickup_lat double precision, pickup_lng double precision,
               dropoff_lat double precision, dropoff_lng double precision, dropoff_name text,
               distance_km numeric, fare_estimate_zar numeric, offered_at timestamptz)
language plpgsql stable security definer set search_path = public, extensions
as $$
declare
  v_uid uuid := public._require_auth();
  v_dlat double precision; v_dlng double precision;
begin
  select dest_lat, dest_lng into v_dlat, v_dlng from public.vehicle_locations where driver_id = v_uid;
  return query
  select h.id, h.commuter_id,
         st_y(h.pickup_location::geometry), st_x(h.pickup_location::geometry),
         st_y(h.dropoff_location::geometry), st_x(h.dropoff_location::geometry),
         h.dropoff_name, h.distance_km, h.fare_estimate_zar, h.offered_at
  from public.hail_requests h
  where h.target_driver_id = v_uid
    and h.status = 'SEARCHING'
    and (v_dlat is null or public._km(v_dlat, v_dlng,
           st_y(h.dropoff_location::geometry), st_x(h.dropoff_location::geometry)) <= p_radius_km)
  order by h.offered_at desc;
end;
$$;

revoke all on function public._km(double precision, double precision, double precision, double precision) from public, anon, authenticated;
grant execute on function public.nearby_rides(double precision, double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.driver_targeted_hails(double precision) to authenticated;
