-- Disposable local database only. Auth identities and writes roll back.
begin;
create or replace function pg_temp.assert_true(ok boolean, message text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create or replace function pg_temp.reject_sql(sql text, expected_state text)
returns void language plpgsql as $$
begin
  begin execute sql;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for %', expected_state, sql;
end;
$$;
-- SECURITY INVOKER tests execute the reads with the actor's real DB role.
create function pg_temp.assert_scope(expected_farm uuid, expected_user uuid)
returns void language plpgsql as $$
declare t text; n integer; wrong integer;
begin
  select count(*) into n from public.farms;
  perform pg_temp.assert_true(n = case when expected_farm is null then 0 else 1 end, 'farm count');
  perform pg_temp.assert_true(not exists(select from public.farms where id <> expected_farm), 'farm isolation');
  perform pg_temp.assert_true(not exists(select from public.profiles where id <> expected_user), 'profiles self only');
  select count(*) into n from public.profiles;
  perform pg_temp.assert_true(n = case when expected_farm is null then 0 else 1 end, 'profile visibility');
  foreach t in array array['employees','fields','activity_logs','recordings','tags','activity_log_tags'] loop
    execute format('select count(*), count(*) filter (where farm_id <> $1) from public.%I', t) into n, wrong using expected_farm;
    perform pg_temp.assert_true(wrong = 0, t || ' cross-farm read');
    perform pg_temp.assert_true(case when expected_farm is null then n = 0 else n > 0 end, t || ' expected rows');
  end loop;
end;
$$;

insert into auth.users(id) values
 ('60000000-0000-4000-8000-000000000101'),
 ('60000000-0000-4000-8000-000000000102'),
 ('60000000-0000-4000-8000-000000000103'),
 ('60000000-0000-4000-8000-000000000104');
insert into public.farms(id, name) values ('00000000-0000-4000-8000-000000000002', 'Other Farm');
insert into public.profiles(id,farm_id,full_name,role) values
 ('60000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Admin A','admin'),
 ('60000000-0000-4000-8000-000000000102','00000000-0000-4000-8000-000000000001','Member A','member'),
 ('60000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000002','Manager B','manager');
insert into public.employees(id,farm_id,full_name) values ('10000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000002','Worker B');
insert into public.fields(id,farm_id,name) values ('30000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000002','FIELD B');
insert into public.activity_logs(id,farm_id,employee_id,field_id,activity_type,activity_date,started_at,ended_at,summary,response_accuracy)
 values ('20000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000002','10000000-0000-4000-8000-000000000099','30000000-0000-4000-8000-000000000099','Spraying','2026-04-22','2026-04-22T13:00:00Z','2026-04-22T14:00:00Z','Other farm work',80);
insert into public.recordings(farm_id,activity_log_id,recorded_at) values ('00000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000099','2026-04-22T17:00:00Z');
insert into public.tags(id,farm_id,name) values ('50000000-0000-4000-8000-000000000099','00000000-0000-4000-8000-000000000002','Needs Review');
insert into public.activity_log_tags(farm_id,activity_log_id,tag_id) values
 ('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000001','50000000-0000-4000-8000-000000000001'),
 ('00000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000099','50000000-0000-4000-8000-000000000099');

set local role anon;
do $$ declare t text; begin
  foreach t in array array['farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags'] loop
    perform pg_temp.reject_sql(format('select * from public.%I',t), '42501');
    perform pg_temp.reject_sql(format('delete from public.%I',t), '42501');
  end loop;
end $$;
select pg_temp.reject_sql('select toph_private.current_farm_id()', '42501');
reset role;

select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_scope('00000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000101');
insert into public.tags(id,farm_id,name,created_by) values ('50000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','Admin label','60000000-0000-4000-8000-000000000101');
insert into public.activity_log_tags(id,farm_id,activity_log_id,tag_id,created_by) values ('70000000-0000-4000-8000-000000000101','00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000101','60000000-0000-4000-8000-000000000101');
select pg_temp.assert_true((select count(*) = 1 from public.activity_log_tags where id = '70000000-0000-4000-8000-000000000101'), 'admin attachment saved');
select pg_temp.reject_sql($q$insert into public.tags(farm_id,name,created_by) values ('00000000-0000-4000-8000-000000000002','Attack','60000000-0000-4000-8000-000000000101')$q$,'42501');
select pg_temp.reject_sql($q$insert into public.tags(farm_id,name,created_by) values ('00000000-0000-4000-8000-000000000001','Spoof','60000000-0000-4000-8000-000000000102')$q$,'42501');
select pg_temp.reject_sql($q$insert into public.tags(farm_id,name) values ('00000000-0000-4000-8000-000000000001','Null creator')$q$,'42501');
select pg_temp.reject_sql($q$insert into public.activity_log_tags(farm_id,activity_log_id,tag_id,created_by) values ('00000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000099','50000000-0000-4000-8000-000000000099','60000000-0000-4000-8000-000000000101')$q$,'42501');
select pg_temp.reject_sql($q$insert into public.activity_log_tags(farm_id,activity_log_id,tag_id,created_by) values ('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000099','60000000-0000-4000-8000-000000000101')$q$,'23503');
select pg_temp.reject_sql($q$insert into public.activity_log_tags(farm_id,activity_log_id,tag_id,created_by) values ('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000099','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000101')$q$,'23503');
do $$ declare n integer; begin
  delete from public.activity_log_tags where farm_id = '00000000-0000-4000-8000-000000000002';
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 0, 'cross-farm delete affects zero rows');
  delete from public.activity_log_tags where id = '70000000-0000-4000-8000-000000000101';
  get diagnostics n = row_count;
  perform pg_temp.assert_true(n = 1, 'admin can detach own farm tag');
end $$;
-- Even admins cannot rewrite membership or seeded dashboard records via the API.
do $$ declare t text; begin
  foreach t in array array['farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags'] loop
    perform pg_temp.reject_sql(format('update public.%I set id = id',t),'42501');
  end loop;
  foreach t in array array['farms','profiles','employees','fields','activity_logs','recordings'] loop
    perform pg_temp.reject_sql(format('insert into public.%I default values',t),'42501');
    perform pg_temp.reject_sql(format('delete from public.%I',t),'42501');
  end loop;
end $$;
select pg_temp.reject_sql('delete from public.tags','42501');
reset role;

-- A member may read but forged editable metadata must not promote them.
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000102","role":"authenticated","user_metadata":{"role":"admin","farm_id":"00000000-0000-4000-8000-000000000002"}}',true);
set local role authenticated;
select pg_temp.assert_scope('00000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000102');
select pg_temp.assert_true(not toph_private.can_manage_farm(),'metadata cannot promote member');
select pg_temp.reject_sql($q$insert into public.tags(farm_id,name,created_by) values ('00000000-0000-4000-8000-000000000001','Member label','60000000-0000-4000-8000-000000000102')$q$,'42501');
select pg_temp.reject_sql($q$insert into public.activity_log_tags(farm_id,activity_log_id,tag_id,created_by) values ('00000000-0000-4000-8000-000000000001','20000000-0000-4000-8000-000000000002','50000000-0000-4000-8000-000000000001','60000000-0000-4000-8000-000000000102')$q$,'42501');
do $$ declare n integer; begin delete from public.activity_log_tags; get diagnostics n = row_count;
 perform pg_temp.assert_true(n = 0,'member cannot detach tags'); end $$;
select pg_temp.reject_sql($q$update public.profiles set role = 'admin'$q$,'42501');
reset role;

select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_scope('00000000-0000-4000-8000-000000000002','60000000-0000-4000-8000-000000000103');
insert into public.tags(id,farm_id,name,created_by) values ('50000000-0000-4000-8000-000000000103','00000000-0000-4000-8000-000000000002','Manager label','60000000-0000-4000-8000-000000000103');
insert into public.activity_log_tags(farm_id,activity_log_id,tag_id,created_by) values ('00000000-0000-4000-8000-000000000002','20000000-0000-4000-8000-000000000099','50000000-0000-4000-8000-000000000103','60000000-0000-4000-8000-000000000103');
reset role;

-- Authenticated but unprovisioned: no default Bays Ranch access.
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000104","role":"authenticated","user_metadata":{"farm_id":"00000000-0000-4000-8000-000000000001","role":"admin"}}',true);
set local role authenticated;
select pg_temp.assert_scope(null,'60000000-0000-4000-8000-000000000104');
select pg_temp.reject_sql($q$insert into public.profiles(id,farm_id,full_name,role) values ('60000000-0000-4000-8000-000000000104','00000000-0000-4000-8000-000000000001','Attack','admin')$q$,'42501');
select pg_temp.reject_sql($q$insert into public.tags(farm_id,name,created_by) values ('00000000-0000-4000-8000-000000000001','Attack','60000000-0000-4000-8000-000000000104')$q$,'42501');
reset role;
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select pg_temp.assert_scope(null,null);
reset role;

-- DB membership changes take effect without waiting for stale JWT metadata.
update public.profiles set role = 'member' where id = '60000000-0000-4000-8000-000000000101';
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000101","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_true(not toph_private.can_manage_farm(),'demotion immediately effective');
reset role;
delete from auth.users where id = '60000000-0000-4000-8000-000000000103';
select pg_temp.assert_true(not exists(select from public.profiles where id = '60000000-0000-4000-8000-000000000103'),'Auth deletion removes membership');
select pg_temp.assert_true((select created_by is null from public.tags where id = '50000000-0000-4000-8000-000000000103'),'Auth deletion preserves labels');
select set_config('request.jwt.claims','{"sub":"60000000-0000-4000-8000-000000000103","role":"authenticated"}',true);
set local role authenticated;
select pg_temp.assert_scope(null,'60000000-0000-4000-8000-000000000103');
reset role;
rollback;
