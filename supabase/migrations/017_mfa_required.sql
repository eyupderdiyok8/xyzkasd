-- Add MFA (Two-Factor Authentication) required flag to tenants
ALTER TABLE "tenants" ADD COLUMN IF NOT EXISTS "mfa_required" BOOLEAN NOT NULL DEFAULT false;
