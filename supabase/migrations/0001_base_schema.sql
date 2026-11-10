-- =============================================================================
-- 0001_base_schema.sql
-- Base relational schema exactly as specified for gomzansi (Supabase / PostGIS).
-- Application-specific extensions, RLS and RPCs are layered on in 0002.
-- =============================================================================

-- Enable PostGIS extension for spatial queries
CREATE EXTENSION IF NOT EXISTS postgis;

-- Users Table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    phone_number VARCHAR(20) UNIQUE NOT NULL,
    role VARCHAR(20) CHECK (role IN ('COMMUTER', 'DRIVER', 'MARSHAL', 'ADMIN')) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- User Credentials / Association Meta
CREATE TABLE user_credentials (
    user_id UUID REFERENCES users(id) ON DELETE CASCADE PRIMARY KEY,
    is_verified BOOLEAN DEFAULT FALSE,
    association_id UUID,
    license_number VARCHAR(50) UNIQUE
);

-- Vehicles Table
CREATE TABLE vehicles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    license_plate VARCHAR(20) UNIQUE NOT NULL,
    capacity INT DEFAULT 15,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ranks & Routes (Geospatial)
CREATE TABLE ranks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(100) NOT NULL,
    location GEOGRAPHY(Point, 4326) NOT NULL
);

CREATE TABLE routes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    origin_rank_id UUID REFERENCES ranks(id),
    destination_rank_id UUID REFERENCES ranks(id),
    estimated_duration_mins INT
);

-- Shared Trips / Manifest
CREATE TABLE trips (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commuter_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES users(id),
    route_id UUID REFERENCES routes(id),
    status VARCHAR(20) CHECK (status IN ('SCHEDULED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED')) DEFAULT 'SCHEDULED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Ride-Hailing Requests (Charters)
CREATE TABLE hail_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    commuter_id UUID REFERENCES users(id),
    driver_id UUID REFERENCES users(id) ON DELETE SET NULL,
    pickup_location GEOGRAPHY(Point, 4326) NOT NULL,
    dropoff_location GEOGRAPHY(Point, 4326) NOT NULL,
    status VARCHAR(30) CHECK (status IN ('SEARCHING', 'ACCEPTED', 'EN_ROUTE', 'COMPLETED', 'CANCELLED')) DEFAULT 'SEARCHING',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Secure Trip Sharing Tokens
CREATE TABLE trip_share_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE CASCADE,
    token_hash VARCHAR(64) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Lost and Found
CREATE TABLE lost_and_found (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    trip_id UUID REFERENCES trips(id) ON DELETE SET NULL,
    reporter_id UUID REFERENCES users(id) ON DELETE CASCADE,
    item_category VARCHAR(50) CHECK (item_category IN ('PHONE', 'BAG', 'WALLET', 'DOCUMENTS', 'OTHER')) NOT NULL,
    item_description TEXT NOT NULL,
    pickup_rank_id UUID REFERENCES ranks(id),
    status VARCHAR(20) CHECK (status IN ('OPEN', 'CLAIMED', 'ARCHIVED')) DEFAULT 'OPEN',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
