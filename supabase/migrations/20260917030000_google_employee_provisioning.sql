-- Every new email-bearing Auth account gets an employee profile. The existing
-- manager's confirmed email/Google identity links to her current Auth UUID;
-- a new signup can never request the manager role through user metadata.
begin;

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
  insert into public.employees(farm_id, full_name)
    values (demo_farm, display_name) returning id into worker_id;
  insert into public.profiles(id, farm_id, employee_id, full_name, role)
    values (new.id, demo_farm, worker_id, display_name, 'employee');
  return new;
end;
$$;

comment on function toph_private.provision_employee_signup() is
  'Provision any new email Auth identity as a Bays Ranch employee; existing verified manager identity keeps its profile when OAuth is linked.';
commit;
