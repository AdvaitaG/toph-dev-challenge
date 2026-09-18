-- Employee identity and same-farm, own-record submission. The existing
-- manager/administrator tag workflow and Auth-linked memberships remain intact.
begin;

alter table public.profiles add column employee_id uuid;
alter table public.profiles drop constraint profiles_role_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('admin', 'manager', 'member', 'employee'));
alter table public.profiles add constraint profiles_employee_role_check
  check ((role = 'employee') = (employee_id is not null));
alter table public.profiles add constraint profiles_employee_fkey
  foreign key (farm_id, employee_id) references public.employees(farm_id, id)
  on delete restrict;
create unique index profiles_employee_id_key on public.profiles (employee_id)
  where employee_id is not null;

-- A caller cannot choose their own employee ID: only trusted profile
-- provisioning can set it, and the helper returns it only for employee roles.
create function toph_private.current_employee_id()
returns uuid language sql stable security definer set search_path = '' as $$
  select employee_id from public.profiles
  where id = (select auth.uid()) and role = 'employee';
$$;
alter function toph_private.current_employee_id() owner to postgres;
revoke all on function toph_private.current_employee_id() from public, anon, authenticated;
grant execute on function toph_private.current_employee_id() to authenticated;

-- Managers keep their existing farm scope; employees see only themselves and
-- their own logs. Fields remain farm-readable so the form can list valid fields.
drop policy employees_read on public.employees;
create policy employees_read on public.employees for select to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and ((select toph_private.can_manage_farm())
      or id = (select toph_private.current_employee_id())));
drop policy activity_logs_read on public.activity_logs;
create policy activity_logs_read on public.activity_logs for select to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and ((select toph_private.can_manage_farm())
      or employee_id = (select toph_private.current_employee_id())));
drop policy recordings_read on public.recordings;
create policy recordings_read on public.recordings for select to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()));
drop policy tags_read on public.tags;
create policy tags_read on public.tags for select to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()));
drop policy activity_log_tags_read on public.activity_log_tags;
create policy activity_log_tags_read on public.activity_log_tags for select to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()));

-- Composite foreign keys on activity_logs also enforce field/employee farm
-- consistency. No manager or member activity-log INSERT policy exists.
grant insert on public.activity_logs to authenticated;
create policy employee_activity_create on public.activity_logs for insert to authenticated
  with check (farm_id = (select toph_private.current_farm_id())
    and employee_id = (select toph_private.current_employee_id())
    and review_status = 'pending');

comment on column public.profiles.employee_id is 'Trusted, unique link from an Auth profile with employee role to its same-farm employee record.';
comment on policy employee_activity_create on public.activity_logs is 'Employee may create a pending log only under their trusted profile farm and employee ID.';
commit;
