-- Add service_parts to service_tickets (generic parts changed during service)
ALTER TABLE "service_tickets" ADD COLUMN IF NOT EXISTS "service_parts" TEXT DEFAULT '[]';
