-- Read-only deployment verification; safe to run on the linked project.
with farm as (
  select id, timezone from public.farms where id = '00000000-0000-4000-8000-000000000001'
), day_recordings as (
  select r.* from public.recordings r join farm f on f.id = r.farm_id
  where recorded_at >= ('2026-04-22'::date::timestamp at time zone f.timezone)
    and recorded_at < ('2026-04-23'::date::timestamp at time zone f.timezone)
)
select
  (select count(*) from public.farms) as farms,
  (select count(*) from public.profiles) as profiles,
  (select count(*) from public.employees where farm_id in (select id from farm) and active) as active_workers,
  (select count(*) from public.fields where farm_id in (select id from farm)) as fields,
  (select count(*) from public.activity_logs where farm_id in (select id from farm)) as logs,
  (select count(*) from public.activity_logs where farm_id in (select id from farm) and review_status = 'pending') as pending_logs,
  (select count(*) from day_recordings) as todays_recordings,
  (select count(*) from day_recordings where is_new) as new_recordings,
  (select round(avg(response_accuracy)) from public.activity_logs l where exists
    (select 1 from day_recordings r where r.farm_id = l.farm_id and r.activity_log_id = l.id)) as accuracy,
  (select count(*) from public.tags where farm_id in (select id from farm)) as tags,
  (select count(*) from public.activity_log_tags where farm_id in (select id from farm)) as tag_assignments,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname in
    ('farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags')) as application_tables,
  (select count(*) from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r' and c.relname in
    ('farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags')
    and (has_table_privilege('anon', c.oid, 'SELECT') or has_table_privilege('authenticated', c.oid, 'SELECT')))
    as tables_with_browser_read_grants;
