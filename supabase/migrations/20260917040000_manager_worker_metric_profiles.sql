-- Managers may count employee accounts in their own farm. Employees continue
-- to see only their own profile; no profile write permissions are added.
begin;

create policy profiles_read_farm_manager on public.profiles for select to authenticated
  using (farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm()));

comment on policy profiles_read_farm_manager on public.profiles is
  'Allow managers to read same-farm memberships for active-account reporting without exposing other farms or adding profile writes.';
commit;
