-- Private employee voice recordings with editable transcripts and optional notes.
begin;

alter table public.activity_logs add column transcript text;
alter table public.activity_logs add column note text;
alter table public.activity_logs add constraint activity_logs_transcript_length
  check (transcript is null or char_length(transcript) between 1 and 5000);
alter table public.activity_logs add constraint activity_logs_note_length
  check (note is null or char_length(note) between 1 and 2000);

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
  values ('toph-recordings', 'toph-recordings', false, 2621440,
    array['audio/webm', 'audio/mp4', 'audio/ogg'])
  on conflict (id) do update set public = false, file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

-- Object keys are always farm ID / uploader ID / random filename. A worker
-- cannot upload into another farm or another worker's folder.
create policy toph_voice_upload on storage.objects for insert to authenticated
  with check (bucket_id = 'toph-recordings'
    and split_part(name, '/', 1) = (select toph_private.current_farm_id())::text
    and split_part(name, '/', 2) = (select auth.uid())::text
    and (select toph_private.current_employee_id()) is not null);
create policy toph_voice_read on storage.objects for select to authenticated
  using (bucket_id = 'toph-recordings'
    and split_part(name, '/', 1) = (select toph_private.current_farm_id())::text
    and ((select toph_private.can_manage_farm())
      or split_part(name, '/', 2) = (select auth.uid())::text));

grant insert on public.recordings to authenticated;
create policy employee_recording_create on public.recordings for insert to authenticated
  with check (farm_id = (select toph_private.current_farm_id())
    and storage_bucket = 'toph-recordings'
    and split_part(storage_path, '/', 2) = (select auth.uid())::text
    and exists (select 1 from public.activity_logs l
      where l.id = activity_log_id and l.farm_id = farm_id
        and l.submitted_by = (select auth.uid())
        and l.employee_id = (select toph_private.current_employee_id())));

-- Both database rows commit or roll back together. The caller's RLS remains
-- in force (SECURITY INVOKER); no service-role key is used by the app.
create function public.submit_recorded_activity(
  p_field_id uuid, p_activity_type text, p_activity_date date,
  p_started_at timestamptz, p_ended_at timestamptz,
  p_transcript text, p_note text, p_storage_path text,
  p_duration_seconds numeric
) returns uuid language plpgsql security invoker set search_path = '' as $$
declare
  v_farm_id uuid := (select toph_private.current_farm_id());
  v_employee_id uuid := (select toph_private.current_employee_id());
  v_user_id uuid := (select auth.uid());
  v_transcript text := nullif(pg_catalog.btrim(p_transcript), '');
  v_note text := nullif(pg_catalog.btrim(p_note), '');
  v_log_id uuid;
begin
  if v_farm_id is null or v_employee_id is null or v_user_id is null then
    raise exception 'Employee access required' using errcode = '42501';
  end if;
  if (v_transcript is null and v_note is null)
    or pg_catalog.char_length(coalesce(v_transcript, '')) > 5000
    or pg_catalog.char_length(coalesce(v_note, '')) > 2000 then
    raise exception 'A transcript or note is required within length limits' using errcode = '22023';
  end if;
  if p_duration_seconds <= 0 or p_duration_seconds > 90 then
    raise exception 'Recording duration is invalid' using errcode = '22023';
  end if;
  if pg_catalog.split_part(p_storage_path, '/', 1) <> v_farm_id::text
    or pg_catalog.split_part(p_storage_path, '/', 2) <> v_user_id::text
    or not exists (select 1 from storage.objects o where o.bucket_id = 'toph-recordings'
      and o.name = p_storage_path and o.owner_id = v_user_id::text) then
    raise exception 'Recording upload is unavailable' using errcode = '42501';
  end if;
  insert into public.activity_logs (
    farm_id, employee_id, field_id, activity_type, activity_date,
    started_at, ended_at, summary, transcript, note,
    response_accuracy, review_status, submitted_by
  ) values (
    v_farm_id, v_employee_id, p_field_id, p_activity_type, p_activity_date,
    p_started_at, p_ended_at,
    pg_catalog.concat_ws(E'\n\n',
      case when v_transcript is not null then 'Transcript: ' || v_transcript end,
      case when v_note is not null then 'Note: ' || v_note end),
    v_transcript, v_note, null, 'pending', v_user_id
  ) returning id into v_log_id;
  insert into public.recordings (
    farm_id, activity_log_id, recorded_at, is_new,
    storage_bucket, storage_path, duration_seconds
  ) values (
    v_farm_id, v_log_id, pg_catalog.statement_timestamp(), true,
    'toph-recordings', p_storage_path, p_duration_seconds
  );
  return v_log_id;
end;
$$;
revoke all on function public.submit_recorded_activity(
  uuid, text, date, timestamptz, timestamptz, text, text, text, numeric
) from public, anon;
grant execute on function public.submit_recorded_activity(
  uuid, text, date, timestamptz, timestamptz, text, text, text, numeric
) to authenticated;

-- An employee can remove a failed upload only while no recording references it.
create function toph_private.recording_path_in_use(p_path text)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.recordings
    where storage_bucket = 'toph-recordings' and storage_path = p_path);
$$;
alter function toph_private.recording_path_in_use(text) owner to postgres;
revoke all on function toph_private.recording_path_in_use(text) from public, anon, authenticated;
grant execute on function toph_private.recording_path_in_use(text) to authenticated;
create policy toph_voice_delete on storage.objects for delete to authenticated
  using (bucket_id = 'toph-recordings'
    and split_part(name, '/', 1) = (select toph_private.current_farm_id())::text
    and ((select toph_private.can_manage_farm())
      or (split_part(name, '/', 2) = (select auth.uid())::text
        and not toph_private.recording_path_in_use(name))));

commit;
