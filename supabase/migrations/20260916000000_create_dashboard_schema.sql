-- Local schema milestone. No Auth integration or RLS policies in this migration.
-- Do not deploy until reviewed. API grants are intentionally withheld below.
begin;

create table public.farms (
  id uuid primary key default gen_random_uuid(),
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  timezone text not null default 'America/Los_Angeles'
    check (timezone = btrim(timezone) and char_length(timezone) between 1 and 100),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.profiles (
  -- Provision with the future auth.users UUID; Auth FK is a later migration.
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  full_name text not null check (full_name = btrim(full_name) and char_length(full_name) between 1 and 120),
  role text not null default 'member' check (role in ('admin', 'manager', 'member')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, id)
);

create table public.employees (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  full_name text not null check (full_name = btrim(full_name) and char_length(full_name) between 1 and 120),
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, id)
);

create table public.fields (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  name text not null check (name = btrim(name) and char_length(name) between 1 and 120),
  latitude double precision,
  longitude double precision,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, id),
  constraint fields_coordinates_check check (
    (latitude is null and longitude is null) or
    (latitude is not null and longitude is not null and
      latitude between -90 and 90 and longitude between -180 and 180)
  )
);
create unique index fields_farm_name_key on public.fields (farm_id, lower(name));

create table public.activity_logs (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  employee_id uuid not null,
  field_id uuid not null,
  activity_type text not null check (activity_type in ('Spraying', 'Harvesting', 'Planting', 'Irrigation', 'Scouting')),
  activity_date date not null check (isfinite(activity_date)),
  started_at timestamptz not null check (isfinite(started_at)),
  ended_at timestamptz not null check (isfinite(ended_at)),
  summary text not null check (char_length(btrim(summary)) > 0),
  response_accuracy numeric(5,2) not null check (response_accuracy between 0 and 100),
  review_status text not null default 'pending' check (review_status in ('pending', 'reviewed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, id),
  constraint activity_logs_time_order_check check (ended_at > started_at),
  constraint activity_logs_employee_fkey foreign key (farm_id, employee_id)
    references public.employees(farm_id, id) on delete restrict,
  constraint activity_logs_field_fkey foreign key (farm_id, field_id)
    references public.fields(farm_id, id) on delete restrict
);
-- Pending dashboard + month/date range + deterministic pagination later.
create index activity_logs_dashboard_idx on public.activity_logs (farm_id, review_status, activity_date, id);
create index activity_logs_employee_idx on public.activity_logs (farm_id, employee_id);
create index activity_logs_field_idx on public.activity_logs (farm_id, field_id);

create table public.recordings (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  activity_log_id uuid not null,
  -- Receipt/upload instant, matching the existing fixture recordedAt semantics.
  -- The spoken timestamp in the transcript is not authoritative capture metadata.
  recorded_at timestamptz not null check (isfinite(recorded_at)),
  is_new boolean not null default false,
  storage_bucket text,
  storage_path text,
  duration_seconds numeric(10,3) check (duration_seconds > 0 and duration_seconds < 10000000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint recordings_log_fkey foreign key (farm_id, activity_log_id)
    references public.activity_logs(farm_id, id) on delete cascade,
  constraint recordings_storage_check check (
    (storage_bucket is null and storage_path is null) or
    (storage_bucket is not null and storage_path is not null and
      storage_bucket = btrim(storage_bucket) and char_length(storage_bucket) > 0 and
      storage_path = btrim(storage_path) and char_length(storage_path) > 0)
  ),
  unique (storage_bucket, storage_path)
);
create index recordings_farm_recorded_idx on public.recordings (farm_id, recorded_at);
create index recordings_log_idx on public.recordings (farm_id, activity_log_id, recorded_at desc, id);

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  name text not null check (
    char_length(name) between 1 and 40 and
    name = regexp_replace(btrim(name), '[[:space:]]+', ' ', 'g')
  ),
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (farm_id, id),
  constraint tags_creator_fkey foreign key (farm_id, created_by)
    references public.profiles(farm_id, id) on delete set null (created_by)
);
create unique index tags_farm_name_key on public.tags (farm_id, lower(name));
create index tags_creator_idx on public.tags (farm_id, created_by) where created_by is not null;

create table public.activity_log_tags (
  id uuid primary key default gen_random_uuid(),
  farm_id uuid not null references public.farms(id) on delete restrict,
  activity_log_id uuid not null,
  tag_id uuid not null,
  created_by uuid,
  created_at timestamptz not null default now(),
  unique (farm_id, activity_log_id, tag_id),
  constraint activity_log_tags_log_fkey foreign key (farm_id, activity_log_id)
    references public.activity_logs(farm_id, id) on delete cascade,
  constraint activity_log_tags_tag_fkey foreign key (farm_id, tag_id)
    references public.tags(farm_id, id) on delete cascade,
  constraint activity_log_tags_creator_fkey foreign key (farm_id, created_by)
    references public.profiles(farm_id, id) on delete set null (created_by)
);
-- Reverse direction supports Needs Review filtering and tag deletion checks.
create index activity_log_tags_tag_idx on public.activity_log_tags (farm_id, tag_id, activity_log_id);
create index activity_log_tags_creator_idx on public.activity_log_tags (farm_id, created_by) where created_by is not null;

create function public.set_updated_at()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at = statement_timestamp();
  return new;
end;
$$;

-- Validate against PostgreSQL's timezone catalog on write, not in a cross-table CHECK.
create function public.validate_farm_timezone()
returns trigger language plpgsql set search_path = '' as $$
begin
  if not exists (select 1 from pg_catalog.pg_timezone_names where name = new.timezone) then
    raise exception 'Unknown farm timezone: %', new.timezone using errcode = '23514';
  end if;
  return new;
end;
$$;
create trigger farms_validate_timezone before insert or update of timezone on public.farms
  for each row execute function public.validate_farm_timezone();

do $$
declare table_name text;
begin
  foreach table_name in array array['farms', 'profiles', 'employees', 'fields', 'activity_logs', 'recordings', 'tags'] loop
    execute format('create trigger %I before update on public.%I for each row execute function public.set_updated_at()',
      table_name || '_updated_at', table_name);
  end loop;
end;
$$;

-- Supabase may assign default API grants. Withhold browser access until the
-- separate authorization milestone; this is not an RLS implementation.
revoke all on public.farms, public.profiles, public.employees, public.fields,
  public.activity_logs, public.recordings, public.tags, public.activity_log_tags
  from public, anon, authenticated;
revoke all on function public.set_updated_at(), public.validate_farm_timezone()
  from public, anon, authenticated;

comment on table public.profiles is 'Application membership only. Auth FK/provisioning and RLS are deferred; seed intentionally contains no profiles.';
comment on column public.recordings.recorded_at is 'Receipt/upload timestamp, exposed as recordedAt by the existing dashboard contract.';
comment on column public.recordings.storage_path is 'Object key, never a public or signed URL. NULL means no audio asset is available.';
comment on column public.fields.latitude is 'Field reference point, not a worker location or field boundary. Seed coordinates are unknown.';
comment on column public.activity_logs.activity_date is 'Explicit farm work date, independent of recording receipt and ingestion timestamps.';
comment on column public.tags.created_by is 'Nullable attribution, not ownership or authorization; NULL for system-created tags or deleted profiles.';
commit;
