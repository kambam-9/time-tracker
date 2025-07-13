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
  overtime_threshold_hours numeric(4,2) default 8.0,
  is_active  boolean default true,
  created_at timestamptz default now()
);

-- === TERMINALS (IP WHITELIST) ===
create table public.terminals (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  ip_cidr inet not null,             -- e.g. '192.168.1.100/32'
  location_lat numeric,
  location_lon numeric,
  radius_meters integer default 150,
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
  notes text,
  created_at timestamptz default now()
);

-- === SCHEDULES ===
create table public.schedules (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id) on delete cascade,
  day_of_week smallint check (day_of_week between 0 and 6),
  shift_start time,
  shift_end   time,
  created_at timestamptz default now()
);

-- === ALERTS ===
create table public.alerts (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid references employees(id),
  type text check (type in ('forgot_out','overtime','late_arrival','early_departure')),
  details jsonb,
  resolved boolean default false,
  created_at timestamptz default now()
);

-- === AUDIT LOGS ===
create table public.audit_logs (
  id bigserial primary key,
  actor_id uuid,                -- manager/user
  action text,
  target_table text,
  target_id uuid,
  old_data jsonb,
  new_data jsonb,
  ip_address inet,
  created_at timestamptz default now()
);

-- === RLS POLICIES ===
alter table employees enable row level security;
create policy "employees_select_own" on employees
  for select using (auth.uid() = user_id);

create policy "employees_select_managers" on employees
  for all using (
    exists (
      select 1 from auth.users 
      where auth.uid() = id 
      and raw_user_meta_data->>'role' = 'manager'
    )
  );

alter table clock_entries enable row level security;
create policy "clock_entries_select_own" on clock_entries
  for select using (
    employee_id in (
      select id from employees where user_id = auth.uid()
    )
  );

create policy "clock_entries_insert_own" on clock_entries
  for insert with check (
    employee_id in (
      select id from employees where user_id = auth.uid()
    )
  );

create policy "clock_entries_managers" on clock_entries
  for all using (
    exists (
      select 1 from auth.users 
      where auth.uid() = id 
      and raw_user_meta_data->>'role' = 'manager'
    )
  );

-- === FUNCTIONS ===
create or replace function detect_forgot_clockouts()
returns table(employee_id uuid, type text, details jsonb)
language sql
as $$
  select 
    ce.employee_id,
    'forgot_out'::text,
    jsonb_build_object(
      'clock_in', ce.clock_in,
      'expected_out', s.shift_end,
      'minutes_overdue', extract(epoch from (now() - (ce.clock_in::date + s.shift_end)))/60
    )
  from clock_entries ce
  join employees e on e.id = ce.employee_id
  join schedules s on s.employee_id = ce.employee_id 
    and s.day_of_week = extract(dow from ce.clock_in)
  where ce.clock_out is null
    and ce.clock_in::date = current_date
    and now() > (ce.clock_in::date + s.shift_end + interval '30 minutes')
    and not exists (
      select 1 from alerts a 
      where a.employee_id = ce.employee_id 
        and a.type = 'forgot_out'
        and a.created_at::date = current_date
    );
$$;

create or replace function detect_overtime()
returns table(employee_id uuid, type text, details jsonb)
language sql
as $$
  select 
    ce.employee_id,
    'overtime'::text,
    jsonb_build_object(
      'hours_worked', extract(epoch from (ce.clock_out - ce.clock_in))/3600,
      'threshold', e.overtime_threshold_hours,
      'date', ce.clock_in::date
    )
  from clock_entries ce
  join employees e on e.id = ce.employee_id
  where ce.clock_out is not null
    and extract(epoch from (ce.clock_out - ce.clock_in))/3600 > e.overtime_threshold_hours
    and not exists (
      select 1 from alerts a 
      where a.employee_id = ce.employee_id 
        and a.type = 'overtime'
        and a.created_at::date = ce.clock_in::date
    );
$$;