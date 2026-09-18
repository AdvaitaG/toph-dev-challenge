-- Managers may perform the sole review transition on their own farm's logs.
begin;

grant update (review_status) on public.activity_logs to authenticated;

create policy manager_approve_activity on public.activity_logs
  for update to authenticated
  using (
    farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and review_status = 'pending'
  )
  with check (
    farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and review_status = 'reviewed'
  );

comment on policy manager_approve_activity on public.activity_logs is
  'Manager-only, same-farm pending-to-reviewed transition. Column grant prevents edits to activity content.';

commit;
