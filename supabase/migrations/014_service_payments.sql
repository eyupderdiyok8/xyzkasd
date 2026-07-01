-- 014_service_payments.sql
-- Ödeme / Tahsilat tablosu

create table if not exists service_payments (
  id                text primary key default gen_random_uuid()::text,
  ticket_id         text not null references service_tickets(id) on delete cascade,
  tenant_id         text not null references tenants(id) on delete cascade,
  customer_id       text not null references customers(id),
  amount            decimal(10,2) not null,
  payment_method    text not null check (payment_method in ('CASH','CREDIT_CARD','BANK_TRANSFER','PROMISSORY_NOTE','DEFERRED')),
  status            text not null default 'PAID' check (status in ('PAID','PENDING','OVERDUE')),
  installment_count int,
  paid_at           timestamptz,
  due_date          timestamptz,
  notes             text,
  created_by        text,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_service_payments_ticket_id   on service_payments(ticket_id);
create index if not exists idx_service_payments_tenant_id   on service_payments(tenant_id);
create index if not exists idx_service_payments_customer_id on service_payments(customer_id);
create index if not exists idx_service_payments_status      on service_payments(status);
create index if not exists idx_service_payments_method      on service_payments(payment_method);

-- RLS
alter table service_payments enable row level security;
drop policy if exists service_payments_tenant_isolation on service_payments;
create policy service_payments_tenant_isolation on service_payments
  for all using (public.is_same_tenant(tenant_id));
