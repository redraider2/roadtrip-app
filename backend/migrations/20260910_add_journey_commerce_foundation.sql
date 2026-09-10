BEGIN;

CREATE TABLE IF NOT EXISTS destinations (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  city TEXT NOT NULL,
  state_code CHAR(2) NOT NULL,
  school TEXT,
  venue_id BIGINT,
  latitude NUMERIC(9,6) NOT NULL,
  longitude NUMERIC(9,6) NOT NULL,
  timezone TEXT NOT NULL,
  arrival_radius_miles NUMERIC(6,2) NOT NULL DEFAULT 15,
  market_radius_miles NUMERIC(6,2) NOT NULL DEFAULT 40,
  status TEXT NOT NULL DEFAULT 'planned',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT destinations_state_code_format CHECK (state_code ~ '^[A-Z]{2}$'),
  CONSTRAINT destinations_status_chk CHECK (status IN ('planned', 'pilot', 'active', 'paused')),
  CONSTRAINT destinations_latitude_range CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT destinations_longitude_range CHECK (longitude >= -180 AND longitude <= 180)
);

CREATE INDEX IF NOT EXISTS idx_destinations_status ON destinations(status);
CREATE INDEX IF NOT EXISTS idx_destinations_city_state ON destinations(city, state_code);

CREATE TABLE IF NOT EXISTS journey_states (
  id BIGSERIAL PRIMARY KEY,
  trip_id BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  current_latitude NUMERIC(9,6),
  current_longitude NUMERIC(9,6),
  route_progress_percent NUMERIC(5,2),
  distance_traveled_miles NUMERIC(8,2),
  distance_remaining_miles NUMERIC(8,2),
  duration_remaining_seconds INTEGER,
  estimated_arrival_utc TIMESTAMPTZ,
  journey_phase TEXT NOT NULL DEFAULT 'pre_trip',
  current_route_segment TEXT,
  next_stop_id BIGINT REFERENCES stops(id) ON DELETE SET NULL,
  recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT journey_phase_chk CHECK (
    journey_phase IN (
      'pre_trip',
      'departing',
      'en_route',
      'approaching_destination',
      'arrived',
      'game_weekend',
      'return_trip',
      'complete'
    )
  ),
  CONSTRAINT journey_progress_range CHECK (
    route_progress_percent IS NULL OR
    (route_progress_percent >= 0 AND route_progress_percent <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_journey_states_trip_recorded
  ON journey_states(trip_id, recorded_at DESC);

CREATE TABLE IF NOT EXISTS businesses (
  id BIGSERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT,
  website_url TEXT,
  description TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_businesses_category ON businesses(category);
CREATE INDEX IF NOT EXISTS idx_businesses_active ON businesses(is_active);

CREATE TABLE IF NOT EXISTS business_locations (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT NOT NULL REFERENCES businesses(id) ON DELETE CASCADE,
  destination_id BIGINT REFERENCES destinations(id) ON DELETE SET NULL,
  location_id BIGINT REFERENCES locations(id) ON DELETE SET NULL,
  name TEXT,
  address_text TEXT,
  latitude NUMERIC(9,6),
  longitude NUMERIC(9,6),
  directions_url TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_business_locations_destination
  ON business_locations(destination_id);
CREATE INDEX IF NOT EXISTS idx_business_locations_business
  ON business_locations(business_id);

CREATE TABLE IF NOT EXISTS campaigns (
  id BIGSERIAL PRIMARY KEY,
  business_id BIGINT REFERENCES businesses(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  campaign_type TEXT NOT NULL,
  start_at TIMESTAMPTZ,
  end_at TIMESTAMPTZ,
  status TEXT NOT NULL DEFAULT 'draft',
  priority INTEGER NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaigns_type_chk CHECK (
    campaign_type IN ('destination', 'route', 'event', 'network')
  ),
  CONSTRAINT campaigns_status_chk CHECK (
    status IN ('draft', 'active', 'paused', 'completed')
  ),
  CONSTRAINT campaigns_date_order CHECK (
    start_at IS NULL OR end_at IS NULL OR start_at <= end_at
  )
);

CREATE INDEX IF NOT EXISTS idx_campaigns_status_dates
  ON campaigns(status, start_at, end_at);

CREATE TABLE IF NOT EXISTS campaign_targets (
  id BIGSERIAL PRIMARY KEY,
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  destination_id BIGINT REFERENCES destinations(id) ON DELETE CASCADE,
  venue_id BIGINT,
  game_id BIGINT,
  journey_phase TEXT,
  category TEXT,
  min_progress_percent NUMERIC(5,2),
  max_progress_percent NUMERIC(5,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT campaign_target_progress_min_chk CHECK (
    min_progress_percent IS NULL OR
    (min_progress_percent >= 0 AND min_progress_percent <= 100)
  ),
  CONSTRAINT campaign_target_progress_max_chk CHECK (
    max_progress_percent IS NULL OR
    (max_progress_percent >= 0 AND max_progress_percent <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_campaign_targets_destination
  ON campaign_targets(destination_id);
CREATE INDEX IF NOT EXISTS idx_campaign_targets_campaign
  ON campaign_targets(campaign_id);

CREATE TABLE IF NOT EXISTS placements (
  id BIGSERIAL PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  surface TEXT NOT NULL,
  recommendation_type TEXT,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS campaign_placements (
  campaign_id BIGINT NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  placement_id BIGINT NOT NULL REFERENCES placements(id) ON DELETE CASCADE,
  PRIMARY KEY (campaign_id, placement_id)
);

CREATE TABLE IF NOT EXISTS interaction_events (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES users(id) ON DELETE SET NULL,
  trip_id BIGINT REFERENCES trips(id) ON DELETE CASCADE,
  destination_id BIGINT REFERENCES destinations(id) ON DELETE SET NULL,
  business_id BIGINT REFERENCES businesses(id) ON DELETE SET NULL,
  campaign_id BIGINT REFERENCES campaigns(id) ON DELETE SET NULL,
  placement_id BIGINT REFERENCES placements(id) ON DELETE SET NULL,
  game_id BIGINT,
  event_type TEXT NOT NULL,
  journey_phase TEXT,
  route_progress_percent NUMERIC(5,2),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  occurred_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT interaction_progress_range CHECK (
    route_progress_percent IS NULL OR
    (route_progress_percent >= 0 AND route_progress_percent <= 100)
  )
);

CREATE INDEX IF NOT EXISTS idx_interaction_events_trip_time
  ON interaction_events(trip_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_events_campaign_time
  ON interaction_events(campaign_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_events_business_time
  ON interaction_events(business_id, occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_interaction_events_type_time
  ON interaction_events(event_type, occurred_at DESC);

INSERT INTO placements (slug, name, surface, recommendation_type)
VALUES
  ('drive-next-stop', 'Drive Next Stop', 'drive', 'next_stop'),
  ('drive-meal', 'Drive Meal Recommendation', 'drive', 'meal'),
  ('destination-approach', 'Destination Approach', 'drive', 'destination'),
  ('trip-hq-featured', 'Trip HQ Featured Partner', 'trip_hq', 'featured_business'),
  ('game-day-featured', 'Game Day Featured Partner', 'game_day', 'featured_business'),
  ('destination-dining', 'Destination Dining', 'destination', 'meal')
ON CONFLICT (slug) DO NOTHING;

INSERT INTO destinations (
  slug,
  city,
  state_code,
  school,
  latitude,
  longitude,
  timezone,
  status
)
VALUES (
  'lubbock-tx',
  'Lubbock',
  'TX',
  'Texas Tech',
  33.5779,
  -101.8552,
  'America/Chicago',
  'pilot'
)
ON CONFLICT (slug) DO NOTHING;

COMMIT;
