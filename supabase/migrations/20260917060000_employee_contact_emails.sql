-- Keep contact addresses on farm employees, not in browser-accessible auth.users.
-- Seed workers have no supplied email; managers can add one without inventing it.
begin;

alter table public.employees add column contact_email text;
alter table public.employees add constraint employees_contact_email_check
  check (contact_email is null or (
    contact_email = pg_catalog.lower(pg_catalog.btrim(contact_email))
    and pg_catalog.char_length(contact_email) between 3 and 254
    and contact_email ~ '^[^[:space:]@]+@[^[:space:]@]+[.][^[:space:]@]+$'
  ));

-- Existing employee accounts, including Google users, gain their actual Auth
-- email. The original Figma workers remain NULL until a manager supplies one.
update public.employees e
set contact_email = pg_catalog.lower(pg_catalog.btrim(u.email))
from public.profiles p join auth.users u on u.id = p.id
where p.employee_id = e.id and p.farm_id = e.farm_id
  and p.role = 'employee' and u.email is not null;

-- A signed-in manager may edit only this contact column, only within the farm.
grant update (contact_email) on public.employees to authenticated;
create policy manager_update_employee_contact on public.employees for update to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()))
  with check (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()));

-- New email and Google signups provision their employee contact address.
create or replace function toph_private.provision_employee_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  display_name text;
  worker_id uuid;
  demo_farm constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  if new.email is null then
    return new;
  end if;
  display_name := pg_catalog.regexp_replace(pg_catalog.btrim(
    coalesce(nullif(new.raw_user_meta_data ->> 'full_name', ''),
             nullif(new.raw_user_meta_data ->> 'name', ''),
             pg_catalog.split_part(new.email, '@', 1))), '[[:space:]]+', ' ', 'g');
  if pg_catalog.char_length(display_name) < 2 then
    display_name := 'Employee';
  end if;
  display_name := pg_catalog.left(display_name, 120);
  insert into public.employees(farm_id, full_name, contact_email)
    values (demo_farm, display_name, pg_catalog.lower(pg_catalog.btrim(new.email)))
    returning id into worker_id;
  insert into public.profiles(id, farm_id, employee_id, full_name, role)
    values (new.id, demo_farm, worker_id, display_name, 'employee');
  return new;
end;
$$;
alter function toph_private.provision_employee_signup() owner to postgres;

-- If an account email changes later, keep its employee contact in sync.
create function toph_private.sync_employee_contact_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.employees e
    set contact_email = case when new.email is null then null
      else pg_catalog.lower(pg_catalog.btrim(new.email)) end
  from public.profiles p
  where p.id = new.id and p.role = 'employee'
    and p.employee_id = e.id and p.farm_id = e.farm_id;
  return new;
end;
$$;
alter function toph_private.sync_employee_contact_email() owner to postgres;
revoke all on function toph_private.sync_employee_contact_email() from public, anon, authenticated;
create trigger toph_employee_email_changed after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function toph_private.sync_employee_contact_email();

comment on column public.employees.contact_email is
  'Manager-visible contact address. NULL for seed workers without a supplied email; copied from Auth for linked employee accounts.';
commit;
