\set ON_ERROR_STOP on

BEGIN;

DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS location_tags CASCADE;
DROP TABLE IF EXISTS tags CASCADE;
DROP TABLE IF EXISTS stops CASCADE;
DROP TABLE IF EXISTS trips CASCADE;
DROP TABLE IF EXISTS locations CASCADE;
DROP TABLE IF EXISTS users CASCADE;

CREATE TABLE users (
  id                  BIGSERIAL PRIMARY KEY,
  username            TEXT NOT NULL UNIQUE,
  email               TEXT NOT NULL UNIQUE,
  password_hash       TEXT NOT NULL,
  preferred_language  TEXT NOT NULL DEFAULT 'en',
  currency_code       CHAR(3) NOT NULL DEFAULT 'USD',
  created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT preferred_language_format CHECK (preferred_language ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  CONSTRAINT currency_code_format CHECK (currency_code ~ '^[A-Z]{3}$')
);

CREATE INDEX idx_users_created_at ON users(created_at);

CREATE TABLE locations (
  id            BIGSERIAL PRIMARY KEY,
  name          TEXT NOT NULL,
  location_type TEXT NOT NULL,
  latitude      NUMERIC(9,6) NOT NULL,
  longitude     NUMERIC(9,6) NOT NULL,
  timezone      TEXT NOT NULL,
  country_code  CHAR(2) NOT NULL,
  admin_1       TEXT,
  admin_2       TEXT,
  locality      TEXT,
  postal_code   TEXT,
  address_line1 TEXT,
  address_line2 TEXT,
  description   TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT country_code_format CHECK (country_code ~ '^[A-Z]{2}$'),
  CONSTRAINT latitude_range CHECK (latitude >= -90 AND latitude <= 90),
  CONSTRAINT longitude_range CHECK (longitude >= -180 AND longitude <= 180),
  CONSTRAINT location_type_not_blank CHECK (BTRIM(location_type) <> ''),
  CONSTRAINT timezone_not_blank CHECK (BTRIM(timezone) <> '')
);

CREATE INDEX idx_locations_country ON locations(country_code);
CREATE INDEX idx_locations_type ON locations(location_type);
CREATE INDEX idx_locations_locality ON locations(locality);
CREATE INDEX idx_locations_lat_lng ON locations(latitude, longitude);

CREATE TABLE trips (
  id             BIGSERIAL PRIMARY KEY,
  user_id        BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title          TEXT NOT NULL,
  start_location TEXT NOT NULL,
  end_location   TEXT NOT NULL,
  notes          TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT trip_title_not_blank CHECK (BTRIM(title) <> ''),
  CONSTRAINT trip_start_location_not_blank CHECK (BTRIM(start_location) <> ''),
  CONSTRAINT trip_end_location_not_blank CHECK (BTRIM(end_location) <> '')
);

CREATE INDEX idx_trips_user ON trips(user_id);
CREATE INDEX idx_trips_start_location ON trips(start_location);

CREATE TABLE stops (
  id            BIGSERIAL PRIMARY KEY,
  trip_id       BIGINT NOT NULL REFERENCES trips(id) ON DELETE CASCADE,
  location_id   BIGINT NOT NULL REFERENCES locations(id) ON DELETE RESTRICT,
  order_index   INT NOT NULL DEFAULT 0,
  arrive_at_utc TIMESTAMPTZ,
  depart_at_utc TIMESTAMPTZ,
  notes         TEXT,
  CONSTRAINT order_index_nonnegative CHECK (order_index >= 0),
  CONSTRAINT stop_date_order CHECK (arrive_at_utc IS NULL OR depart_at_utc IS NULL OR arrive_at_utc <= depart_at_utc),
  CONSTRAINT stops_trip_order_unique UNIQUE (trip_id, order_index)
);

CREATE INDEX idx_stops_trip ON stops(trip_id);
CREATE INDEX idx_stops_location ON stops(location_id);

CREATE TABLE reviews (
  id           BIGSERIAL PRIMARY KEY,
  user_id      BIGINT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  location_id  BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  rating       SMALLINT NOT NULL,
  comment      TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT rating_range CHECK (rating BETWEEN 1 AND 5),
  CONSTRAINT one_review_per_user_location UNIQUE (user_id, location_id)
);

CREATE INDEX idx_reviews_location ON reviews(location_id);
CREATE INDEX idx_reviews_user ON reviews(user_id);
CREATE INDEX idx_reviews_created ON reviews(created_at);

CREATE TABLE tags (
  id           BIGSERIAL PRIMARY KEY,
  slug         TEXT NOT NULL UNIQUE,
  display_name TEXT,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT slug_format CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$')
);

CREATE TABLE location_tags (
  location_id BIGINT NOT NULL REFERENCES locations(id) ON DELETE CASCADE,
  tag_id      BIGINT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  PRIMARY KEY (location_id, tag_id)
);

CREATE INDEX idx_location_tags_tag ON location_tags(tag_id);

COMMIT;
