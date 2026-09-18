-- Replace the old reviewed state with explicit final decisions.
begin;

alter table public.activity_logs add column denial_reason text;
alter table public.activity_logs drop constraint activity_logs_review_status_check;
update public.activity_logs set review_status = 'approved' where review_status = 'reviewed';
alter table public.activity_logs add constraint activity_logs_review_status_check
  check (review_status in ('pending', 'approved', 'denied'));
alter table public.activity_logs add constraint activity_logs_denial_reason_check
  check (denial_reason is null or (
    review_status = 'denied'
    and denial_reason = btrim(denial_reason)
    and char_length(denial_reason) between 1 and 200
  ));

grant update (denial_reason) on public.activity_logs to authenticated;
drop policy manager_approve_activity on public.activity_logs;
create policy manager_decide_activity on public.activity_logs
  for update to authenticated
  using (
    farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and review_status = 'pending'
  )
  with check (
    farm_id = (select toph_private.current_farm_id())
    and (select toph_private.can_manage_farm())
    and review_status in ('approved', 'denied')
  );

comment on column public.activity_logs.denial_reason is
  'Optional manager reason, at most 200 characters, for a denied activity.';
comment on policy manager_decide_activity on public.activity_logs is
  'Manager-only, same-farm pending-to-approved or pending-to-denied decision. Column grants prevent activity-content edits.';

commit;
