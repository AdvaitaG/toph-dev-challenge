// Optional linked-project smoke check. Reads credentials from environment only,
// creates two employee activities, checks both review decisions, then removes them.
import { readFileSync } from 'node:fs';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  TOPH_EMPLOYEE_EMAIL: employeeEmail, TOPH_EMPLOYEE_PASSWORD_FILE: passwordFile,
  TOPH_MANAGER_EMAIL: managerEmail, TOPH_MANAGER_PASSWORD: managerPassword } = process.env;
if (!url || !key || !employeeEmail || !passwordFile || !managerEmail || !managerPassword) {
  throw new Error('Set the employee/manager email and password environment values before running this check.');
}
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const employee = client();
const manager = client();
const requireData = (result, step) => {
  if (result.error || !result.data) throw new Error(`${step}: ${result.error?.message ?? 'no data'}`);
  return result.data;
};
const activityIds = [];
let farmId;
try {
  const employeeSession = requireData(await employee.auth.signInWithPassword({
    email: employeeEmail, password: readFileSync(passwordFile, 'utf8').trim(),
  }), 'Employee sign-in');
  const profile = requireData(await employee.from('profiles').select('farm_id, employee_id, role').eq('id', employeeSession.user.id).single(), 'Employee profile');
  if (profile.role !== 'employee' || !profile.employee_id) throw new Error('Demo account is not linked to an employee.');
  farmId = profile.farm_id;
  const fields = requireData(await employee.from('fields').select('id').eq('farm_id', farmId).limit(1), 'Farm fields');
  if (!fields.length) throw new Error('Farm has no field.');
  const managerSession = requireData(await manager.auth.signInWithPassword({ email: managerEmail, password: managerPassword }), 'Manager sign-in');
  const managerProfile = requireData(await manager.from('profiles').select('farm_id, role').eq('id', managerSession.user.id).single(), 'Manager profile');
  if (managerProfile.farm_id !== farmId || !['manager', 'admin'].includes(managerProfile.role)) throw new Error('Manager role/farm mismatch.');
  const summary = `Employee flow smoke check ${Date.now()}`;
  const submission = {
    farm_id: farmId, employee_id: profile.employee_id, field_id: fields[0].id,
    activity_type: 'Irrigation', activity_date: '2026-09-17',
    started_at: '2026-09-17T13:00:00Z', ended_at: '2026-09-17T14:00:00Z',
    response_accuracy: null, review_status: 'pending',
    submitted_by: employeeSession.user.id,
  };
  const inserted = requireData(await employee.from('activity_logs').insert({ ...submission, summary }).select('id').single(), 'First employee insert');
  activityIds.push(inserted.id);
  const second = requireData(await employee.from('activity_logs').insert({ ...submission, summary: `${summary} / denial` }).select('id').single(), 'Second employee insert');
  activityIds.push(second.id);
  const own = requireData(await employee.from('activity_logs').select('id, summary').eq('id', inserted.id).single(), 'Employee refresh read');
  if (own.summary !== summary) throw new Error('Employee refresh did not return the saved activity.');
  const visible = requireData(await manager.from('activity_logs').select('id, summary, submitted_by').eq('id', inserted.id).single(), 'Manager dashboard read');
  if (visible.summary !== summary || visible.submitted_by !== employeeSession.user.id) throw new Error('Manager read does not match the submitted activity.');
  const needsReview = requireData(await manager.from('tags').select('id').eq('farm_id', farmId).eq('name', 'Needs Review').single(), 'Needs Review tag');
  requireData(await manager.from('activity_log_tags').insert({ farm_id: farmId, activity_log_id: inserted.id,
    tag_id: needsReview.id, created_by: managerSession.user.id }).select('id').single(), 'Persistent tag insert');
  const blocked = await employee.from('activity_logs').update({ review_status: 'denied' }).eq('id', inserted.id).select('id');
  if (!blocked.error && blocked.data?.length) throw new Error('Employee could mutate a review decision.');
  const approved = requireData(await manager.from('activity_logs').update({ review_status: 'approved' }).eq('id', inserted.id).eq('review_status', 'pending').select('id'), 'Manager approval');
  const denied = requireData(await manager.from('activity_logs').update({ review_status: 'denied', denial_reason: 'Incorrect field selected' }).eq('id', second.id).eq('review_status', 'pending').select('id'), 'Manager denial');
  if (approved.length !== 1 || denied.length !== 1) throw new Error('A manager decision did not affect exactly one pending log.');
  const history = requireData(await manager.from('activity_logs').select('id, review_status, denial_reason').in('id', activityIds), 'Decision refresh read');
  if (history.find((row) => row.id === inserted.id)?.review_status !== 'approved' ||
      history.find((row) => row.id === second.id)?.review_status !== 'denied' ||
      history.find((row) => row.id === second.id)?.denial_reason !== 'Incorrect field selected') {
    throw new Error('The approval or denial was not persisted.');
  }
  const tagged = requireData(await manager.from('activity_log_tags').select('id').eq('activity_log_id', inserted.id).eq('tag_id', needsReview.id).single(), 'Tag refresh read');
  if (!tagged.id) throw new Error('Needs Review tag was not persisted.');
  const removed = requireData(await manager.from('activity_logs').delete().in('id', activityIds).select('id'), 'Manager removal');
  if (removed.length !== 2) throw new Error('Manager removal did not delete both activities.');
  activityIds.length = 0;
  const after = requireData(await manager.from('activity_logs').select('id').eq('farm_id', farmId).in('summary', [summary, `${summary} / denial`]), 'Removal refresh read');
  if (after.length !== 0) throw new Error('Removed activity remained visible.');
  console.log('PASS: live employee submit, employee decision denial, manager approve/deny, reason and tag persistence, and cleanup.');
} finally {
  // Only activities created by this script are eligible for cleanup.
  if (activityIds.length && farmId) await manager.from('activity_logs').delete().eq('farm_id', farmId).in('id', activityIds);
}
