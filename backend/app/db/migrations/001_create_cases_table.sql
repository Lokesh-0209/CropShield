-- CropShield Database Schema Migration
-- Migration 001: Create cases table
-- Description: Stores crop-disease diagnostic cases reported from the field.

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TABLE IF NOT EXISTS cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    crop VARCHAR(100) NOT NULL,
    growth_stage VARCHAR(100) NOT NULL,
    latitude DOUBLE PRECISION NOT NULL,
    longitude DOUBLE PRECISION NOT NULL,
    location_name VARCHAR(255) NOT NULL,
    symptoms TEXT NOT NULL,
    image_url TEXT,
    disease VARCHAR(150),
    confidence DOUBLE PRECISION,
    risk_score DOUBLE PRECISION,
    risk_level VARCHAR(50),
    status VARCHAR(50) NOT NULL DEFAULT 'PENDING_ANALYSIS',
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    verified_at TIMESTAMPTZ,
    officer_note TEXT
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_cases_status ON cases(status);
CREATE INDEX IF NOT EXISTS idx_cases_crop ON cases(crop);
CREATE INDEX IF NOT EXISTS idx_cases_created_at ON cases(created_at DESC);
