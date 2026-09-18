-- Disposable local PostgreSQL only. All test identities and writes roll back.
begin;
create or replace function pg_temp.assert_true(ok boolean, message text)
returns void language plpgsql as $$ begin
  if ok is distinct from true then raise exception 'Assertion failed: %', message; end if;
end $$;
create or replace function pg_temp.reject_sql(sql text, expected_state text)
returns void language plpgsql as $$ begin
  begin execute sql;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for %', expected_state, sql;
end $$;
insert into auth.users(id) values
 ('60000000-0000-4000-8000-000000000201'),
 ('60000000-0000-4000-8000-000000000202'),
 ('60000000-0000-4000-8000-000000000203'),
 ('60000000-0000-4000-8000-000000000204');
insert into auth.users(id, email, raw_user_meta_data) values
 ('60000000-0000-4000-8000-000000000205','worker@example.test',
  '{"signup_intent":"employee","full_name":"New Worker","role":"manager","farm_id":"00000000-0000-4000-8000-000000000002"}');
select pg_temp.assert_true((select role = 'employee' and farm_id = '00000000-0000-4000-8000-000000000001' and employee_id is not null
  from public.profiles where id = '60000000-0000-4000-8000-000000000205'), 'signup ignores forged role and farm');
select pg_temp.assert_true((select e.contact_email = 'worker@example.test'
  from public.employees e join public.profiles p on p.employee_id = e.id
  where p.id = '60000000-0000-4000-8000-000000000205'), 'signup copies real Auth email');
update auth.users set email = 'Changed.Worker@Example.Test'
  where id = '60000000-0000-4000-8000-000000000205';
select pg_temp.assert_true((select e.contact_email = 'changed.worker@example.test'
  from public.employees e join public.profiles p on p.employee_id = e.id
  where p.id = '60000000-0000-4000-8000-000000000205'), 'Auth email change updates contact');
insert into auth.users(id, email, raw_user_meta_data) values
 ('60000000-0000-4000-8000-000000000206','google.worker@example.test',
  '{"full_name":"Google Worker","role":"manager","farm_id":"00000000-0000-4000-8000-000000000002"}');
select pg_temp.assert_true((select role = 'employee' and full_name = 'Google Worker' and employee_id is not null
  from public.profiles where id = '60000000-0000-4000-8000-000000000206'), 'Google signup provisions an employee');
insert into public.farms(id, name) values ('00000000-0000-4000-8000-000000000002', 'Other Farm');
insert into public.employees(id,farm_id,full_name) values
 ('10000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000002','Other Worker'),
 ('10000000-0000-4000-8000-000000000098','00000000-0000-4000-8000-000000000002','Unmapped Worker');
insert into public.fields(id,farm_id,name) values
 ('30000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000002','OTHER FIELD');
insert into public.profiles(id,farm_id,full_name,role,employee_id) values
 ('60000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','Isaac Login','employee','10000000-0000-4000-8000-000000000001'),
 ('60000000-0000-4000-8000-000000000202','00000000-0000-4000-8000-000000000001','Manager','manager',null),
 ('60000000-0000-4000-8000-000000000203','00000000-0000-4000-8000-000000000002','Other Login','employee','10000000-0000-4000-8000-000000000099');
select pg_temp.reject_sql($q$insert into public.profiles(id,farm_id,full_name,role,employee_id) values ('60000000-0000-4000-8000-000000000204','00000000-0000-4000-8000-000000000001','Bad','employee','10000000-0000-4000-8000-000000000098')$q$,'23503');
select pg_temp.reject_sql($q$update public.profiles set employee_id = '10000000-0000-4000-8000-000000000001' where id = '60000000-0000-4000-8000-000000000202'$q$,'23514');
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000201","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.employees),'employee sees self only');
select pg_temp.assert_true((select count(*) = 4 from public.fields),'employee sees own farm fields');
select pg_temp.assert_true((select count(*) = 1 from public.activity_logs),'employee sees own logs only');
select pg_temp.assert_true((select count(*) = 0 from public.recordings),'employee cannot read recordings');
select pg_temp.assert_true((select count(*) = 0 from public.tags),'employee cannot read manager tags');
select pg_temp.assert_true((select count(*) = 1 from public.profiles),'employee sees only their own profile');
with changed as (update public.employees set contact_email = 'forged@example.test'
  where id = '10000000-0000-4000-8000-000000000001' returning id)
select pg_temp.assert_true(count(*) = 0, 'employee cannot edit own contact email') from changed;
select pg_temp.assert_true((select count(*) = 0 from public.activity_log_tags),'employee cannot read tag assignments');
insert into public.activity_logs(id,farm_id,employee_id,field_id,activity_type,activity_date,started_at,ended_at,summary,response_accuracy,review_status,submitted_by)
 values ('20000000-0000-4000-8000-000000000201','00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Spraying','2026-09-17','2026-09-17T13:00:00Z','2026-09-17T14:00:00Z','Employee submission',null,'pending','60000000-0000-4000-8000-000000000201');
select pg_temp.assert_true((select count(*) = 2 from public.activity_logs),'employee sees inserted log');
select pg_temp.reject_sql($q$insert into public.activity_logs(farm_id,employee_id,field_id,activity_type,activity_date,started_at,ended_at,summary,response_accuracy)
 values ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000002','30000000-0000-4000-8000-000000000001','Spraying','2026-09-17','2026-09-17T13:00:00Z','2026-09-17T14:00:00Z','Forged worker',0)$q$,'42501');
select pg_temp.reject_sql($q$insert into public.activity_logs(farm_id,employee_id,field_id,activity_type,activity_date,started_at,ended_at,summary,response_accuracy)
 values ('00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000099','30000000-0000-4000-8000-000000000099','Spraying','2026-09-17','2026-09-17T13:00:00Z','2026-09-17T14:00:00Z','Forged farm',0)$q$,'42501');
select pg_temp.reject_sql($q$insert into public.tags(farm_id,name,created_by) values ('00000000-0000-4000-8000-000000000001','Denied','60000000-0000-4000-8000-000000000201')$q$,'42501');
reset role;
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 14 from public.employees),'manager retains farm workers and both new signups');
select pg_temp.assert_true((select count(*) = 4 from public.profiles),'manager sees only same-farm profiles');
update public.employees set contact_email = 'isaac@example.test'
  where id = '10000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select contact_email = 'isaac@example.test' from public.employees
  where id = '10000000-0000-4000-8000-000000000001'), 'manager can add contact email');
with changed as (update public.employees set contact_email = 'other@example.test'
  where id = '10000000-0000-4000-8000-000000000099' returning id)
select pg_temp.assert_true(count(*) = 0, 'manager cannot edit other farm contact') from changed;
select pg_temp.reject_sql($q$update public.employees set full_name = 'Forged' where id = '10000000-0000-4000-8000-000000000001'$q$,'42501');
select pg_temp.reject_sql($q$update public.employees set contact_email = 'invalid-address' where id = '10000000-0000-4000-8000-000000000001'$q$,'23514');
select pg_temp.assert_true((select count(*) = 6 from public.activity_logs),'manager sees new employee log');
delete from public.activity_logs where id = '20000000-0000-4000-8000-000000000201';
select pg_temp.assert_true((select count(*) = 5 from public.activity_logs),'manager removes employee submission');
delete from public.activity_logs where id = '20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 5 from public.activity_logs),'manager cannot remove seeded design log');
select pg_temp.reject_sql($q$insert into public.activity_logs(farm_id,employee_id,field_id,activity_type,activity_date,started_at,ended_at,summary,response_accuracy)
 values ('00000000-0000-4000-8000-000000000001','10000000-0000-4000-8000-000000000001','30000000-0000-4000-8000-000000000001','Spraying','2026-09-17','2026-09-17T13:00:00Z','2026-09-17T14:00:00Z','Manager denied',0)$q$,'42501');
reset role;
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000203","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.fields),'other farm has own field only');
select pg_temp.assert_true((select count(*) = 1 from public.profiles),'other farm account sees only itself');
select pg_temp.assert_true((select count(*) = 0 from public.activity_logs),'other farm cannot read log');
reset role;

-- A recorded submission is atomic and its private object remains farm-scoped.
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000201","role":"authenticated"}',true);
set local role authenticated;
insert into storage.objects(bucket_id,name,owner_id) values
 ('toph-recordings','00000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000201/test.webm',
  '60000000-0000-4000-8000-000000000201');
select pg_temp.assert_true((select count(*) = 1 from storage.objects),'employee sees own recording object');
select pg_temp.assert_true(public.submit_recorded_activity(
  '30000000-0000-4000-8000-000000000001','Spraying','2026-09-17',
  '2026-09-17T13:00:00Z','2026-09-17T14:00:00Z',
  'Applied fertilizer to the north rows.','Checked nozzle pressure.',
  '00000000-0000-4000-8000-000000000001/60000000-0000-4000-8000-000000000201/test.webm',12
) is not null, 'employee creates a voice log');
select pg_temp.assert_true((select count(*) = 1 from public.activity_logs where transcript is not null and note is not null),
  'transcript and note persist');
select pg_temp.assert_true((select count(*) = 0 from public.recordings),'employee cannot browse recording metadata');
select pg_temp.assert_true((select count(*) = 1 from storage.objects),'linked recording remains visible to uploader');
reset role;
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000202","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true((select count(*) = 1 from public.recordings where storage_bucket = 'toph-recordings'),
  'manager sees recorded submission');
select pg_temp.assert_true((select count(*) = 1 from storage.objects), 'manager sees same-farm recording');
reset role;
rollback;
