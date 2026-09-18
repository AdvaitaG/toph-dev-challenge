-- Trusted Auth identity -> administrator-provisioned profile -> farm scope.
begin;

alter table public.profiles alter column id drop default;
alter table public.profiles add constraint profiles_auth_user_fkey
  foreign key (id) references auth.users(id) on delete cascade;

-- Not exposed through PostgREST. No user-supplied farm/user parameters.
create schema if not exists toph_private authorization postgres;
revoke all on schema toph_private from public, anon, authenticated;
grant usage on schema toph_private to authenticated;

create function toph_private.current_farm_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select farm_id from public.profiles where id = (select auth.uid());
$$;
create function toph_private.can_manage_farm()
returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce((select role in ('admin', 'manager') from public.profiles
    where id = (select auth.uid())), false);
$$;
alter function toph_private.current_farm_id() owner to postgres;
alter function toph_private.can_manage_farm() owner to postgres;
revoke all on function toph_private.current_farm_id(), toph_private.can_manage_farm() from public, anon, authenticated;
grant execute on function toph_private.current_farm_id(), toph_private.can_manage_farm() to authenticated;

alter table public.farms enable row level security;
alter table public.profiles enable row level security;
alter table public.employees enable row level security;
alter table public.fields enable row level security;
alter table public.activity_logs enable row level security;
alter table public.recordings enable row level security;
alter table public.tags enable row level security;
alter table public.activity_log_tags enable row level security;

revoke all on public.farms, public.profiles, public.employees, public.fields,
  public.activity_logs, public.recordings, public.tags, public.activity_log_tags
  from public, anon, authenticated;
grant select on public.farms, public.profiles, public.employees, public.fields,
  public.activity_logs, public.recordings, public.tags, public.activity_log_tags to authenticated;
grant insert on public.tags, public.activity_log_tags to authenticated;
grant delete on public.activity_log_tags to authenticated;

create policy farms_read on public.farms for select to authenticated
  using (id = (select toph_private.current_farm_id()));
-- Users need only their own membership, not other dashboard users' profiles.
create policy profiles_read_self on public.profiles for select to authenticated
  using (id = (select auth.uid()));
create policy employees_read on public.employees for select to authenticated
  using (farm_id = (select toph_private.current_farm_id()));
create policy fields_read on public.fields for select to authenticated
  using (farm_id = (select toph_private.current_farm_id()));
create policy activity_logs_read on public.activity_logs for select to authenticated
  using (farm_id = (select toph_private.current_farm_id()));
create policy recordings_read on public.recordings for select to authenticated
  using (farm_id = (select toph_private.current_farm_id()));
create policy tags_read on public.tags for select to authenticated
  using (farm_id = (select toph_private.current_farm_id()));
create policy activity_log_tags_read on public.activity_log_tags for select to authenticated
  using (farm_id = (select toph_private.current_farm_id()));

create policy tags_create on public.tags for insert to authenticated
  with check (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and created_by = (select auth.uid()));
create policy activity_log_tags_attach on public.activity_log_tags for insert to authenticated
  with check (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and created_by = (select auth.uid()));
create policy activity_log_tags_detach on public.activity_log_tags for delete to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()));

-- No client INSERT/UPDATE/DELETE on profiles: users cannot select their own
-- farm, promote themselves, or bootstrap access through editable metadata.
-- No tag UPDATE/DELETE: definitions are shared; remove an assignment instead.
-- Composite foreign keys additionally reject cross-farm log/tag/creator links.
comment on table public.profiles is 'Auth-linked farm membership. Provision only through trusted administration; client writes are prohibited.';
comment on function toph_private.current_farm_id() is 'Returns only the verified current user profile farm; NULL when no membership exists. Never reads user-editable metadata.';
commit;
