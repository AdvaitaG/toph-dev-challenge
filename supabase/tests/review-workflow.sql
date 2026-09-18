-- Disposable database verification; all identities and mutations roll back.
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
 ('60000000-0000-4000-8000-000000000301'),
 ('60000000-0000-4000-8000-000000000302'),
 ('60000000-0000-4000-8000-000000000303');
insert into public.farms(id,name) values ('00000000-0000-4000-8000-000000000003','Review Test Farm');
insert into public.profiles(id,farm_id,full_name,role,employee_id) values
 ('60000000-0000-4000-8000-000000000301','00000000-0000-4000-8000-000000000001','Manager','manager',null),
 ('60000000-0000-4000-8000-000000000302','00000000-0000-4000-8000-000000000001','Worker','employee','10000000-0000-4000-8000-000000000001'),
 ('60000000-0000-4000-8000-000000000303','00000000-0000-4000-8000-000000000003','Other Manager','manager',null);

select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000302","role":"authenticated"}',true);
set local role authenticated;
with changed as (update public.activity_logs set review_status = 'approved'
  where id = '20000000-0000-4000-8000-000000000001' returning id)
select pg_temp.assert_true(count(*) = 0, 'employee cannot approve') from changed;
with changed as (update public.activity_logs set review_status = 'denied'
  where id = '20000000-0000-4000-8000-000000000002' returning id)
select pg_temp.assert_true(count(*) = 0, 'employee cannot deny') from changed;
reset role;

select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000303","role":"authenticated"}',true);
set local role authenticated;
with changed as (update public.activity_logs set review_status = 'approved'
  where id = '20000000-0000-4000-8000-000000000001' returning id)
select pg_temp.assert_true(count(*) = 0, 'other farm manager cannot approve') from changed;
with changed as (update public.activity_logs set review_status = 'denied'
  where id = '20000000-0000-4000-8000-000000000002' returning id)
select pg_temp.assert_true(count(*) = 0, 'other farm manager cannot deny') from changed;
reset role;

select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000301","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.reject_sql($q$update public.activity_logs set summary = 'Forged'
  where id = '20000000-0000-4000-8000-000000000001'$q$,'42501');
with changed as (update public.activity_logs set review_status = 'approved'
  where id = '20000000-0000-4000-8000-000000000001' and review_status = 'pending' returning id)
select pg_temp.assert_true(count(*) = 1, 'manager approves pending own-farm log') from changed;
select pg_temp.assert_true((select review_status = 'approved' from public.activity_logs
  where id = '20000000-0000-4000-8000-000000000001'), 'approved log remains in history');
with changed as (update public.activity_logs set review_status = 'denied', denial_reason = 'Incorrect field selected'
  where id = '20000000-0000-4000-8000-000000000002' and review_status = 'pending' returning id)
select pg_temp.assert_true(count(*) = 1, 'manager denies pending own-farm log') from changed;
select pg_temp.assert_true((select review_status = 'denied' and denial_reason = 'Incorrect field selected'
  from public.activity_logs where id = '20000000-0000-4000-8000-000000000002'), 'denied log and reason remain in history');
with changed as (update public.activity_logs set review_status = 'pending'
  where id = '20000000-0000-4000-8000-000000000001' returning id)
select pg_temp.assert_true(count(*) = 0, 'approved log cannot revert to pending') from changed;
with changed as (update public.activity_logs set review_status = 'approved'
  where id = '20000000-0000-4000-8000-000000000002' returning id)
select pg_temp.assert_true(count(*) = 0, 'denied log cannot be approved later') from changed;
reset role;
rollback;
