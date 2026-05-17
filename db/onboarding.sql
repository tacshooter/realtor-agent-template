-- Onboarding tracking — persists setup progress per user
-- Run: psql -U realtor -d realtor_agent -f db/onboarding.sql

CREATE TABLE IF NOT EXISTS onboarding_state (
    id              SERIAL PRIMARY KEY,
    user_id         VARCHAR(100) NOT NULL,    -- Telegram user ID
    user_name       VARCHAR(200),             -- Display name
    current_step    VARCHAR(50) NOT NULL DEFAULT 'welcome',
    -- Steps: welcome, email, calendar, mls, scheduling, preferences, done
    completed_steps TEXT[] DEFAULT '{}',
    integrations    JSONB DEFAULT '{}',       -- {email: {type, status}, calendar: {...}, mls: {...}}
    preferences     JSONB DEFAULT '{}',       -- {briefing_time, farm_areas, price_ranges, ...}
    started_at      TIMESTAMPTZ DEFAULT NOW(),
    completed_at    TIMESTAMPTZ,
    updated_at      TIMESTAMPTZ DEFAULT NOW()
);

CREATE UNIQUE INDEX idx_onboarding_user ON onboarding_state(user_id);
