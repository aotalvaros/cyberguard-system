-- CyberGuard System - Migration 002
-- Adds phone column to users table for external notification support (EP-03)
-- ⚠️ HUMAN CHECK: idempotent — safe to re-run
ALTER TABLE users ADD COLUMN IF NOT EXISTS phone VARCHAR(20) DEFAULT NULL;
