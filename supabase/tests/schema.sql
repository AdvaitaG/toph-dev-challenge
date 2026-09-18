-- Run against a freshly migrated and seeded LOCAL database; changes roll back.
begin;
create function pg_temp.assert_true(ok boolean, message text)
returns void language plpgsql as $$
begin
  if ok is distinct from true then raise exception 'Assertion failed: %', message; end if;
end;
$$;
create function pg_temp.reject_sql(sql text, expected_state text)
returns void language plpgsql as $$
begin
  begin
    execute sql;
  exception when others then
    if sqlstate = expected_state then return; end if;
    raise;
  end;
  raise exception 'Expected SQLSTATE % for %', expected_state, sql;
end;
$$;

select pg_temp.assert_true((select count(*) = 1 from public.farms), 'one farm');
select pg_temp.assert_true((select count(*) = 0 from public.profiles), 'no Auth/profile seeding');
select pg_temp.assert_true((select count(*) = 12 from public.employees where active), '12 active workers');
select pg_temp.assert_true((select count(*) = 4 from public.fields), 'four fields');
select pg_temp.assert_true((select count(*) = 5 from public.activity_logs), 'five logs');
select pg_temp.assert_true((select count(*) = 5 from public.recordings), 'five recording metadata rows');
select pg_temp.assert_true((select count(*) = 1 from public.tags where name = 'Needs Review'), 'reusable review vocabulary');
select pg_temp.assert_true((select count(*) = 0 from public.activity_log_tags), 'no visible tags in baseline');
select pg_temp.assert_true((select count(*) = 5 and count(*) filter (where r.is_new) = 1
  from public.recordings r join public.farms f on f.id = r.farm_id
  where r.recorded_at >= ('2026-04-22'::date::timestamp at time zone f.timezone)
    and r.recorded_at < ('2026-04-23'::date::timestamp at time zone f.timezone)), 'farm-local recording metrics 5 and 1');
select pg_temp.assert_true((select round(avg(l.response_accuracy)) = 90 from public.activity_logs l
  where exists (select 1 from public.recordings r where r.farm_id = l.farm_id and r.activity_log_id = l.id
    and r.recorded_at >= '2026-04-22T00:00:00-07:00' and r.recorded_at < '2026-04-23T00:00:00-07:00')), 'accuracy 90 without join multiplication');
select pg_temp.assert_true((select array_agg(e.full_name || '|' || l.activity_type || '|' || l.activity_date || '|' || f.name order by l.activity_date) = array[
  'Isaac Wang|Spraying|2026-04-19|FIELD A', 'Maya Patel|Harvesting|2026-04-20|FIELD B',
  'Liam Johnson|Planting|2026-04-21|FIELD C', 'Sophia Lee|Irrigation|2026-04-22|FIELD D']
  from public.activity_logs l join public.employees e on (e.farm_id, e.id) = (l.farm_id, l.employee_id)
  join public.fields f on (f.farm_id, f.id) = (l.farm_id, l.field_id) where l.review_status = 'pending'), 'four Figma rows');
select pg_temp.assert_true((select bool_and(storage_path is null and duration_seconds is null) from public.recordings), 'no fabricated audio');
select pg_temp.assert_true((select bool_and(latitude is null and longitude is null) from public.fields), 'no fabricated coordinates');

-- A second tenant proves integrity independently of future RLS.
insert into public.farms(id, name) values ('00000000-0000-4000-8000-000000000002', 'Test Farm');
insert into public.employees(id, farm_id, full_name) values ('10000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000002', 'Other Worker');
insert into public.fields(id, farm_id, name) values ('30000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000002', 'FIELD A');
insert into public.tags(id, farm_id, name) values ('50000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000002', 'Needs Review');
insert into public.profiles(id, farm_id, full_name) values ('60000000-0000-4000-8000-000000000099', '00000000-0000-4000-8000-000000000002', 'Other Manager');
select pg_temp.reject_sql($q$update public.activity_logs set employee_id = '10000000-0000-4000-8000-000000000099' where id = '20000000-0000-4000-8000-000000000001'$q$, '23503');
select pg_temp.reject_sql($q$update public.activity_logs set field_id = '30000000-0000-4000-8000-000000000099' where id = '20000000-0000-4000-8000-000000000001'$q$, '23503');
select pg_temp.reject_sql($q$update public.recordings set farm_id = '00000000-0000-4000-8000-000000000002'$q$, '23503');
select pg_temp.reject_sql($q$update public.tags set created_by = '60000000-0000-4000-8000-000000000099' where id = '50000000-0000-4000-8000-000000000001'$q$, '23503');
select pg_temp.reject_sql($q$insert into public.activity_log_tags(farm_id, activity_log_id, tag_id) values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000099')$q$, '23503');

select pg_temp.reject_sql($q$insert into public.tags(farm_id, name) values ('00000000-0000-4000-8000-000000000001', 'needs review')$q$, '23505');
select pg_temp.reject_sql($q$insert into public.tags(farm_id, name) values ('00000000-0000-4000-8000-000000000001', ' Needs Review ')$q$, '23514');
select pg_temp.reject_sql($q$insert into public.fields(farm_id, name) values ('00000000-0000-4000-8000-000000000001', 'field a')$q$, '23505');
select pg_temp.reject_sql($q$update public.fields set latitude = 10 where name = 'FIELD A'$q$, '23514');
select pg_temp.reject_sql($q$update public.fields set latitude = 91, longitude = 0$q$, '23514');
select pg_temp.reject_sql($q$update public.fields set latitude = 'NaN', longitude = 0$q$, '23514');
select pg_temp.reject_sql($q$update public.activity_logs set response_accuracy = 101$q$, '23514');
select pg_temp.reject_sql($q$update public.activity_logs set ended_at = started_at$q$, '23514');
select pg_temp.reject_sql($q$update public.activity_logs set review_status = 'unknown'$q$, '23514');
select pg_temp.reject_sql($q$update public.activity_logs set activity_type = 'unknown'$q$, '23514');
select pg_temp.reject_sql($q$update public.activity_logs set employee_id = null$q$, '23502');
select pg_temp.reject_sql($q$update public.recordings set storage_path = 'orphan.wav'$q$, '23514');
select pg_temp.reject_sql($q$update public.recordings set duration_seconds = -1$q$, '23514');
select pg_temp.reject_sql($q$update public.farms set timezone = 'Not/AZone'$q$, '23514');

-- Historical relationships restrict destructive parent deletion.
select pg_temp.reject_sql($q$delete from public.farms where id = '00000000-0000-4000-8000-000000000001'$q$, '23503');
select pg_temp.reject_sql($q$delete from public.employees where id = '10000000-0000-4000-8000-000000000001'$q$, '23503');
select pg_temp.reject_sql($q$delete from public.fields where id = '30000000-0000-4000-8000-000000000001'$q$, '23503');
insert into public.profiles(id, farm_id, full_name) values ('60000000-0000-4000-8000-000000000001', '00000000-0000-4000-8000-000000000001', 'Test Manager');
update public.tags set created_by = '60000000-0000-4000-8000-000000000001' where id = '50000000-0000-4000-8000-000000000001';
insert into public.activity_log_tags(farm_id, activity_log_id, tag_id, created_by) values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001', '60000000-0000-4000-8000-000000000001');
select pg_temp.reject_sql($q$insert into public.activity_log_tags(farm_id, activity_log_id, tag_id) values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000001', '50000000-0000-4000-8000-000000000001')$q$, '23505');
select pg_temp.reject_sql($q$update public.activity_log_tags set created_by = '60000000-0000-4000-8000-000000000099'$q$, '23503');
select pg_temp.reject_sql($q$update public.activity_log_tags set farm_id = '00000000-0000-4000-8000-000000000002'$q$, '23503');
delete from public.profiles where id = '60000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select created_by is null and farm_id = '00000000-0000-4000-8000-000000000001' from public.tags where id = '50000000-0000-4000-8000-000000000001'), 'deleted profile clears tag attribution only');
select pg_temp.assert_true((select created_by is null from public.activity_log_tags limit 1), 'deleted profile preserves assignment');
delete from public.activity_logs where id = '20000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 0 from public.recordings where activity_log_id = '20000000-0000-4000-8000-000000000001'), 'log cascades recordings');
select pg_temp.assert_true((select count(*) = 0 from public.activity_log_tags), 'log cascades assignments');
select pg_temp.assert_true((select count(*) = 2 from public.tags), 'log preserves shared tags');
insert into public.activity_log_tags(farm_id, activity_log_id, tag_id) values ('00000000-0000-4000-8000-000000000001', '20000000-0000-4000-8000-000000000002', '50000000-0000-4000-8000-000000000001');
delete from public.tags where id = '50000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select count(*) = 0 from public.activity_log_tags), 'tag cascades assignments');
select pg_temp.assert_true((select count(*) = 4 from public.activity_logs), 'tag preserves logs');
update public.employees set active = false where id = '10000000-0000-4000-8000-000000000001';
select pg_temp.assert_true((select updated_at > created_at from public.employees where id = '10000000-0000-4000-8000-000000000001'), 'update timestamp maintained');
select pg_temp.assert_true(not has_table_privilege('anon', 'public.activity_logs', 'SELECT'), 'no anonymous API grant before RLS');
select pg_temp.assert_true(not has_table_privilege('authenticated', 'public.tags', 'INSERT'), 'no authenticated write grant before RLS');
select pg_temp.assert_true((select not bool_or(relrowsecurity) from pg_class where oid in ('public.farms'::regclass, 'public.profiles'::regclass, 'public.employees'::regclass, 'public.fields'::regclass, 'public.activity_logs'::regclass, 'public.recordings'::regclass, 'public.tags'::regclass, 'public.activity_log_tags'::regclass)), 'RLS deferred as requested');
rollback;
