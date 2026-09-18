-- Remote-safe catalog checks and read-only role probes. No users/data created.
begin read only;
do $$
begin
  if (select count(*) from pg_class c join pg_namespace n on n.oid=c.relnamespace
    where n.nspname='public' and c.relname in ('farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags')
    and c.relrowsecurity and not has_table_privilege('anon',c.oid,'SELECT')
    and not has_table_privilege('authenticated',c.oid,'UPDATE')) <> 8 then
    raise exception 'RLS or grants do not match the eight-table access model';
  end if;
  if not exists(select from pg_constraint where conrelid='public.profiles'::regclass
    and confrelid='auth.users'::regclass and conname='profiles_auth_user_fkey') then
    raise exception 'Missing Auth profile foreign key';
  end if;
  if exists(select from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='toph_private' and has_function_privilege('anon',p.oid,'EXECUTE')) then
    raise exception 'Anonymous execution of a private helper is allowed';
  end if;
end $$;
select c.relname as table_name, c.relrowsecurity as rls_enabled,
  has_table_privilege('anon', c.oid, 'SELECT') as anonymous_select,
  has_table_privilege('authenticated', c.oid, 'SELECT') as authenticated_select,
  has_table_privilege('authenticated', c.oid, 'INSERT') as authenticated_insert,
  has_table_privilege('authenticated', c.oid, 'UPDATE') as authenticated_update,
  has_table_privilege('authenticated', c.oid, 'DELETE') as authenticated_delete
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relname in
  ('farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags')
order by c.relname;
select tablename, policyname, cmd, roles, qual, with_check from pg_policies
where schemaname = 'public' and tablename in
  ('farms','profiles','employees','fields','activity_logs','recordings','tags','activity_log_tags')
order by tablename, policyname;
select conname, pg_get_constraintdef(oid) as definition from pg_constraint
where conrelid = 'public.profiles'::regclass and conname = 'profiles_auth_user_fkey';
select n.nspname, p.proname, p.prosecdef, p.proconfig,
  has_function_privilege('anon',p.oid,'EXECUTE') as anonymous_execute
from pg_proc p join pg_namespace n on n.oid = p.pronamespace where n.nspname = 'toph_private';
select set_config('request.jwt.claims','{}',true);
set local role authenticated;
select (select count(*) from public.farms) as farms_without_identity,
  (select count(*) from public.profiles) as profiles_without_identity,
  (select count(*) from public.activity_logs) as logs_without_identity,
  (select count(*) from public.tags) as tags_without_identity;
reset role;
rollback;
