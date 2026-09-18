-- A manual text entry has no transcription/question-answer accuracy score.
-- Existing scored recordings retain their values and dashboard metric.
begin;
alter table public.activity_logs alter column response_accuracy drop not null;
comment on column public.activity_logs.response_accuracy is 'Nullable: no model accuracy is available for a text-only employee submission.';
commit;
