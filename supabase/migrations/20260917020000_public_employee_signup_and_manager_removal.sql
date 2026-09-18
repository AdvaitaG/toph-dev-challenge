-- Open Bays Ranch demo signup grants only employee identity. Manager removal
-- applies only to logs created through the employee submission flow.
begin;

alter table public.activity_logs add column submitted_by uuid;
alter table public.activity_logs add constraint activity_logs_submitter_fkey
  foreign key (farm_id, submitted_by) references public.profiles(farm_id, id)
  on delete set null (submitted_by);
create index activity_logs_submitter_idx on public.activity_logs (farm_id, submitted_by)
  where submitted_by is not null;

drop policy employee_activity_create on public.activity_logs;
create policy employee_activity_create on public.activity_logs for insert to authenticated
  with check (farm_id = (select toph_private.current_farm_id())
    and employee_id = (select toph_private.current_employee_id())
    and submitted_by = (select auth.uid())
    and review_status = 'pending'
    and response_accuracy is null);

grant delete on public.activity_logs to authenticated;
create policy manager_delete_employee_activity on public.activity_logs for delete to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and submitted_by is not null);

create function toph_private.provision_employee_signup()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  display_name text;
  worker_id uuid;
  demo_farm constant uuid := '00000000-0000-4000-8000-000000000001';
begin
  if new.raw_user_meta_data ->> 'signup_intent' is distinct from 'employee' then
    return new;
  end if;
  display_name := pg_catalog.regexp_replace(pg_catalog.btrim(
    coalesce(new.raw_user_meta_data ->> 'full_name', '')), '[[:space:]]+', ' ', 'g');
  if pg_catalog.char_length(display_name) < 2 or pg_catalog.char_length(display_name) > 120 then
    raise exception 'Employee name must be between 2 and 120 characters' using errcode = '22023';
  end if;
  -- The form metadata never chooses a farm, role, employee ID, or privilege.
  insert into public.employees(farm_id, full_name)
    values (demo_farm, display_name) returning id into worker_id;
  insert into public.profiles(id, farm_id, employee_id, full_name, role)
    values (new.id, demo_farm, worker_id, display_name, 'employee');
  return new;
end;
$$;
alter function toph_private.provision_employee_signup() owner to postgres;
revoke all on function toph_private.provision_employee_signup() from public, anon, authenticated;
create trigger toph_employee_signup after insert on auth.users
  for each row execute function toph_private.provision_employee_signup();

comment on column public.activity_logs.submitted_by is 'Authenticated employee profile that submitted this text activity; NULL for original seeded logs.';
comment on policy manager_delete_employee_activity on public.activity_logs is 'Managers may remove same-farm employee submissions, while seeded/Figma records remain protected.';
commit;
