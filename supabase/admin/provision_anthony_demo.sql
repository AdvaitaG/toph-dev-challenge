-- Trusted demo-data provisioning after Auth admin creates the confirmed user.
-- No password or privileged API key is stored here. This is data, not a schema
-- migration; seed.sql contains the reproducible Anthony Wells employee name.
begin;
do $$
begin
  if not exists (select 1 from auth.users where id = 'a78efc48-d743-47dc-a279-73435b9a1c8b'
    and lower(email) = 'advaita.guruprasad+employee@gmail.com') then
    raise exception 'Expected demo Auth user is missing';
  end if;
  update public.employees set full_name = 'Anthony Wells'
    where id = '10000000-0000-4000-8000-000000000006'
      and farm_id = '00000000-0000-4000-8000-000000000001'
      and full_name in ('Ethan Brooks', 'Anthony Wells');
  if not found then raise exception 'Expected Bays Ranch employee record is missing'; end if;
  insert into public.profiles(id, farm_id, full_name, role, employee_id)
  values ('a78efc48-d743-47dc-a279-73435b9a1c8b',
    '00000000-0000-4000-8000-000000000001', 'Anthony Wells', 'employee',
    '10000000-0000-4000-8000-000000000006')
  on conflict (id) do nothing;
  if not exists (select 1 from public.profiles where id = 'a78efc48-d743-47dc-a279-73435b9a1c8b'
    and farm_id = '00000000-0000-4000-8000-000000000001'
    and employee_id = '10000000-0000-4000-8000-000000000006'
    and role = 'employee') then
    raise exception 'Demo profile does not match the intended farm and employee';
  end if;
end $$;
commit;
