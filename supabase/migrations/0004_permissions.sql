-- =============================================================================
-- 0004_permissions.sql
-- Grants for authenticated and anon roles.
-- anon can execute share_snapshot to view shared trips via web link.
-- authenticated can execute all public RPCs.
-- =============================================================================

grant usage on schema public to anon, authenticated;
grant select on public.ranks to anon, authenticated;
grant select on public.routes to anon, authenticated;
grant select on public.departures to anon, authenticated;
grant select on public.associations to anon, authenticated;
grant select on public.app_settings to anon, authenticated;

-- Allow anon to call public trip share snapshot
grant execute on function public.share_snapshot(text) to anon, authenticated;

-- Allow authenticated users to invoke client RPCs
grant execute on function public.verify_operator(text, text, text, text) to authenticated;
grant execute on function public.list_ranks(double precision, double precision, double precision) to authenticated;
grant execute on function public.search_ranks(text) to authenticated;
grant execute on function public.upcoming_departures(uuid, int) to authenticated;
grant execute on function public.join_departure(uuid) to authenticated;
grant execute on function public.preview_charter(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.create_hail_request(double precision, double precision, double precision, double precision) to authenticated;
grant execute on function public.accept_hail(uuid) to authenticated;
grant execute on function public.advance_hail(uuid, text) to authenticated;
grant execute on function public.driver_dashboard() to authenticated;
grant execute on function public.marshal_queue(uuid) to authenticated;
grant execute on function public.marshal_verify_permit(text) to authenticated;
grant execute on function public.marshal_queue_vehicle(uuid, uuid) to authenticated;
grant execute on function public.marshal_depart(uuid) to authenticated;
grant execute on function public.create_share_token(uuid, int) to authenticated;
grant execute on function public.revoke_share_token(text) to authenticated;
grant execute on function public.report_lost_item(uuid, text, text, uuid) to authenticated;
grant execute on function public.list_lost_items(uuid, text) to authenticated;
grant execute on function public.publish_vehicle_location(double precision, double precision, double precision, double precision) to authenticated;
