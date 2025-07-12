-- === EMPLOYEES & AUTH ===
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users (id) on delete cascade,
  first_name text not null,
  last_name  text not null,
  pin_hash   text not null,          -- bcrypt hash
  department text,
  location   text,
  hourly_rate numeric(10,2),
  is_active  boolean default true
);

-- === TERMINALS (IP WHITELIST) ===
create table public.terminals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ip_cidr inet not null,             -- e.g. '192.168.1.100/32'
  created_at timestamptz default now()
);

-- === CLOCK ENTRIES ===
create table public.clock_entries (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  clock_in  timestamptz,
  clock_out timestamptz,
  in_lat  numeric,
  in_lon  numeric,
  out_lat numeric,
  out_lon numeric,
  source text check (source in ('terminal','mobile','offline')),
  flagged boolean default false,     -- fraud / discrepancy
  created_at timestamptz default now()
);

-- === SCHEDULES ===
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  shift_start time,
  shift_end   time
);

-- === ALERTS ===
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  type text check (type in ('forgot_out','overtime')),
  details jsonb,
  created_at timestamptz default now()
);

-- === AUDIT LOGS ===
create table public.audit_logs (
  id bigserial primary key,
  actor uuid,                -- manager/user
  action text,
  target text,
  old_data jsonb,
  new_data jsonb,
  created_at timestamptz default now()
);

-- === RLS POLICIES ===
alter table employees enable row level security;
create policy "emp self" on employees
  for select using (auth.uid() = user_id);

alter table clock_entries enable row level security;
create policy "clock self " on clock_entries
  for select using (employee_id in (select id from employees where user_id = auth.uid()));

-- managers (role = 'manager') get full access
create role manager; -- create in Supabase dashboard
grant all on all tables in schema public to manager;
