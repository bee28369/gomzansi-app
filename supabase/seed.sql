-- =============================================================================
-- seed.sql: South African Minibus Taxi Network Seed Data
-- =============================================================================

-- 1. App settings
insert into public.app_settings (key, value, description) values
  ('charter_base_zar', 80.00, 'Base callout fare in ZAR for private minibus charter'),
  ('charter_per_km_zar', 14.50, 'Per kilometer indicative rate for private minibus charter'),
  ('charter_min_zar', 120.00, 'Minimum charter fare in ZAR')
on conflict (key) do update set value = excluded.value;

-- 2. Major Taxi Associations
insert into public.associations (id, code, name, province, contact_phone) values
  ('11111111-1111-1111-1111-111111111101', 'SANTACO', 'South African National Taxi Council', 'National', '+27123211091'),
  ('11111111-1111-1111-1111-111111111102', 'CODETA', 'Congress of Democratic Taxi Associations', 'Western Cape', '+27213876543'),
  ('11111111-1111-1111-1111-111111111103', 'CATA', 'Cape Amalgamated Taxi Association', 'Western Cape', '+27219512345'),
  ('11111111-1111-1111-1111-111111111104', 'NANDUWE', 'Nancefield Dube West Taxi Association', 'Gauteng', '+27119821234'),
  ('11111111-1111-1111-1111-111111111105', 'TOPTA', 'Thembisa Overseas Passengers Taxi Association', 'Gauteng', '+27119256789')
on conflict (code) do nothing;

-- 3. Major South African Taxi Ranks with PostGIS Points
insert into public.ranks (id, name, location) values
  ('22222222-2222-2222-2222-222222222001', 'Bree Street Taxi Rank (JHB CBD)', ST_SetSRID(ST_MakePoint(28.0371, -26.2001), 4326)),
  ('22222222-2222-2222-2222-222222222002', 'Noord Street / MTN Taxi Rank (JHB)', ST_SetSRID(ST_MakePoint(28.0468, -26.1974), 4326)),
  ('22222222-2222-2222-2222-222222222003', 'Baragwanath / Chris Hani Rank (Soweto)', ST_SetSRID(ST_MakePoint(27.9392, -26.2612), 4326)),
  ('22222222-2222-2222-2222-222222222004', 'Pan Africa Taxi Rank (Alexandra)', ST_SetSRID(ST_MakePoint(28.0934, -26.1045), 4326)),
  ('22222222-2222-2222-2222-222222222005', 'Sandton City Taxi Rank', ST_SetSRID(ST_MakePoint(28.0519, -26.1082), 4326)),
  ('22222222-2222-2222-2222-222222222006', 'Bosman Street Taxi Rank (Pretoria CBD)', ST_SetSRID(ST_MakePoint(28.1873, -25.7554), 4326)),
  ('22222222-2222-2222-2222-222222222007', 'Station Deck Taxi Rank (Cape Town CBD)', ST_SetSRID(ST_MakePoint(18.4253, -33.9234), 4326)),
  ('22222222-2222-2222-2222-222222222008', 'Bellville Taxi Rank (Cape Town)', ST_SetSRID(ST_MakePoint(18.6292, -33.9011), 4326)),
  ('22222222-2222-2222-2222-222222222009', 'Warwick Avenue Taxi Rank (Durban CBD)', ST_SetSRID(ST_MakePoint(31.0152, -29.8558), 4326))
on conflict (name) do nothing;

-- 4. Active Minibus Routes between Ranks
insert into public.routes (id, origin_rank_id, destination_rank_id, estimated_duration_mins) values
  ('33333333-3333-3333-3333-333333333001', '22222222-2222-2222-2222-222222222001', '22222222-2222-2222-2222-222222222003', 35), -- Bree to Baragwanath
  ('33333333-3333-3333-3333-333333333002', '22222222-2222-2222-2222-222222222002', '22222222-2222-2222-2222-222222222004', 30), -- Noord to Pan Africa (Alex)
  ('33333333-3333-3333-3333-333333333003', '22222222-2222-2222-2222-222222222004', '22222222-2222-2222-2222-222222222005', 18), -- Alex to Sandton
  ('33333333-3333-3333-3333-333333333004', '22222222-2222-2222-2222-222222222001', '22222222-2222-2222-2222-222222222006', 55), -- Bree to Bosman (JHB-PTA)
  ('33333333-3333-3333-3333-333333333005', '22222222-2222-2222-2222-222222222007', '22222222-2222-2222-2222-222222222008', 40)  -- Station Deck to Bellville
on conflict (origin_rank_id, destination_rank_id) do nothing;

-- 5. Operator Registry for Testing Verification
insert into public.operator_registry (phone_number, role, association_id, license_number, vehicle_plate, full_name, active) values
  ('+27821110001', 'DRIVER', '11111111-1111-1111-1111-111111111104', 'GP-PRDP-784210', 'ND 452-981', 'Sipho Zulu', true),
  ('+27821110002', 'DRIVER', '11111111-1111-1111-1111-111111111105', 'GP-PRDP-883192', 'CA 890-412', 'Bongani Khumalo', true),
  ('+27821110003', 'MARSHAL', '11111111-1111-1111-1111-111111111101', 'MSH-JHB-001', null, 'Bra Moss Nkosi', true),
  ('+27821110004', 'MARSHAL', '11111111-1111-1111-1111-111111111102', 'MSH-CPT-002', null, 'Lwazi Dlamini', true)
on conflict (license_number) do nothing;
