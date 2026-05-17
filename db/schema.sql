-- Realtor Assistant — PostgreSQL Schema
-- Run once per instance: psql -U realtor -d realtor_agent -f db/schema.sql

-- Enable pgcrypto for credential encryption
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ============================================================
-- PROPERTIES — cached MLS listing data
-- ============================================================
CREATE TABLE IF NOT EXISTS properties (
    id              SERIAL PRIMARY KEY,
    mls_id          VARCHAR(50) UNIQUE NOT NULL,
    address         VARCHAR(500) NOT NULL,
    city            VARCHAR(100),
    state           VARCHAR(2) DEFAULT 'TX',
    zip             VARCHAR(10),
    price           INTEGER,
    beds            SMALLINT,
    baths           REAL,         -- 2.5 baths is common
    sqft            INTEGER,
    lot_size        VARCHAR(100),
    year_built      SMALLINT,
    property_type   VARCHAR(50) DEFAULT 'single-family',
    status          VARCHAR(50),  -- active, pending, sold, coming-soon
    dom             SMALLINT,     -- days on market
    list_date       DATE,
    sold_date       DATE,
    sold_price      INTEGER,
    school_district VARCHAR(200),
    features        JSONB,        -- pool, garage, fireplace, etc.
    raw_data        JSONB,        -- full raw response from MLS
    first_seen      TIMESTAMPTZ DEFAULT NOW(),
    last_updated    TIMESTAMPTZ DEFAULT NOW(),
    price_history   JSONB DEFAULT '[]'  -- [{date, price, event: "listed"|"drop"|"sold"}]
);

CREATE INDEX idx_properties_status ON properties(status);
CREATE INDEX idx_properties_city ON properties(city);
CREATE INDEX idx_properties_price ON properties(price);
CREATE INDEX idx_properties_list_date ON properties(list_date);
CREATE INDEX idx_properties_last_updated ON properties(last_updated);

-- ============================================================
-- TAX RECORDS — county appraisal district data
-- ============================================================
CREATE TABLE IF NOT EXISTS tax_records (
    id                  SERIAL PRIMARY KEY,
    property_id         INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    address             VARCHAR(500) NOT NULL,
    county              VARCHAR(100),
    assessed_value      INTEGER,
    land_value          INTEGER,
    improvement_value   INTEGER,
    tax_rate            REAL,
    annual_tax          INTEGER,
    exemptions          JSONB DEFAULT '[]',
    year                SMALLINT DEFAULT EXTRACT(YEAR FROM NOW()),
    fetched_at          TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tax_records_address ON tax_records(address);
CREATE INDEX idx_tax_records_fetched_at ON tax_records(fetched_at);

-- ============================================================
-- CLIENTS — active buyers and sellers
-- ============================================================
CREATE TABLE IF NOT EXISTS clients (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200) NOT NULL,
    type            VARCHAR(20) NOT NULL CHECK (type IN ('buyer', 'seller', 'both')),
    status          VARCHAR(50) DEFAULT 'active',  -- active, pending, closed, inactive
    email           VARCHAR(200),
    phone           VARCHAR(50),
    budget_min      INTEGER,
    budget_max      INTEGER,
    target_areas    TEXT[],
    beds_min        SMALLINT,
    baths_min       REAL,
    sqft_min        INTEGER,
    must_haves      TEXT[],
    nice_to_haves   TEXT[],
    dealbreakers    TEXT[],
    notes           TEXT,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    last_contact    TIMESTAMPTZ
);

CREATE INDEX idx_clients_status ON clients(status);
CREATE INDEX idx_clients_type ON clients(type);

-- ============================================================
-- CLIENT MATCHES — listing-to-client match history
-- ============================================================
CREATE TABLE IF NOT EXISTS client_matches (
    id              SERIAL PRIMARY KEY,
    client_id       INTEGER REFERENCES clients(id) ON DELETE CASCADE,
    property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    score           SMALLINT,     -- 0-100 match score
    match_reasons   TEXT[],       -- ["budget match", "location match", ...]
    alerted_at      TIMESTAMPTZ DEFAULT NOW(),
    status          VARCHAR(50) DEFAULT 'new'  -- new, viewed, contacted, dismissed
);

CREATE INDEX idx_client_matches_client ON client_matches(client_id);
CREATE INDEX idx_client_matches_property ON client_matches(property_id);
CREATE UNIQUE INDEX idx_client_matches_unique ON client_matches(client_id, property_id);

-- ============================================================
-- SAVED SEARCHES — persistent search criteria
-- ============================================================
CREATE TABLE IF NOT EXISTS saved_searches (
    id              SERIAL PRIMARY KEY,
    name            VARCHAR(200),
    area            VARCHAR(200) NOT NULL,
    min_price       INTEGER,
    max_price       INTEGER,
    min_beds        SMALLINT,
    min_baths       REAL,
    min_sqft        INTEGER,
    property_type   VARCHAR(50) DEFAULT 'single-family',
    features        JSONB,
    active          BOOLEAN DEFAULT TRUE,
    created_at      TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ALERTS — notification log (dedup)
-- ============================================================
CREATE TABLE IF NOT EXISTS alerts (
    id              SERIAL PRIMARY KEY,
    property_id     INTEGER REFERENCES properties(id) ON DELETE CASCADE,
    alert_type      VARCHAR(50) NOT NULL,  -- new_listing, price_drop, back_on_market, expiring
    old_value       VARCHAR(200),
    new_value       VARCHAR(200),
    sent_at         TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_alerts_property ON alerts(property_id);
CREATE INDEX idx_alerts_sent_at ON alerts(sent_at);
CREATE UNIQUE INDEX idx_alerts_dedup ON alerts(property_id, alert_type, sent_at);

-- ============================================================
-- CREDENTIALS — encrypted MLS and service credentials
-- ============================================================
CREATE TABLE IF NOT EXISTS credentials (
    id              SERIAL PRIMARY KEY,
    service         VARCHAR(100) NOT NULL,  -- mls, appraisal_district, gmail, etc.
    username        VARCHAR(200),
    encrypted_value BYTEA NOT NULL,         -- pgp_sym_encrypt(password, 'encryption_key')
    metadata        JSONB,
    created_at      TIMESTAMPTZ DEFAULT NOW(),
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_credentials_service ON credentials(service);
