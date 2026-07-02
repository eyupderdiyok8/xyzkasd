-- Add unit_cost to inventory_transactions
ALTER TABLE "inventory_transactions" ADD COLUMN IF NOT EXISTS "unit_cost" DECIMAL(10,2);

-- Add expenses to service_tickets
ALTER TABLE "service_tickets" ADD COLUMN IF NOT EXISTS "expenses" TEXT DEFAULT '[]';

-- Add photo_path to inventory_items
ALTER TABLE "inventory_items" ADD COLUMN IF NOT EXISTS "photo_path" TEXT;
