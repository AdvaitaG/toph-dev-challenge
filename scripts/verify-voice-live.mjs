// Optional linked-project smoke check. Uses user-scoped clients and cleans up
// its own activity and audio object; no privileged key or fixture fallback.
import { readFileSync } from 'node:fs';
import { chromium } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

process.loadEnvFile('.env.local');
const { NEXT_PUBLIC_SUPABASE_URL: url, NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: key,
  TOPH_EMPLOYEE_EMAIL: employeeEmail, TOPH_EMPLOYEE_PASSWORD_FILE: passwordFile,
  TOPH_MANAGER_EMAIL: managerEmail, TOPH_MANAGER_PASSWORD: managerPassword } = process.env;
if (!url || !key || !employeeEmail || !passwordFile || !managerEmail || !managerPassword) {
  throw new Error('Set the employee and manager smoke-check credentials through environment variables.');
}
const client = () => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const employee = client();
const manager = client();
const requireData = (result, step) => {
  if (result.error || !result.data) throw new Error(`${step}: ${result.error?.message ?? 'no data'}`);
  return result.data;
};
let logId;
let path;
let browser;
try {
  const employeeSession = requireData(await employee.auth.signInWithPassword({
    email: employeeEmail, password: readFileSync(passwordFile, 'utf8').trim(),
  }), 'Employee sign-in');
  const profile = requireData(await employee.from('profiles').select('farm_id, employee_id, role')
    .eq('id', employeeSession.user.id).single(), 'Employee profile');
  if (profile.role !== 'employee' || !profile.employee_id) throw new Error('Employee role is missing.');
  const fields = requireData(await employee.from('fields').select('id').eq('farm_id', profile.farm_id).limit(1), 'Farm fields');
  if (!fields.length) throw new Error('No farm field is available.');
  const managerSession = requireData(await manager.auth.signInWithPassword({
    email: managerEmail, password: managerPassword,
  }), 'Manager sign-in');
  const managerProfile = requireData(await manager.from('profiles').select('farm_id, role')
    .eq('id', managerSession.user.id).single(), 'Manager profile');
  if (managerProfile.farm_id !== profile.farm_id || !['manager', 'admin'].includes(managerProfile.role)) {
    throw new Error('Manager role or farm does not match.');
  }

  browser = await chromium.launch({ channel: 'chrome', headless: true });
  const page = await browser.newPage();
  const bytes = Buffer.from(await page.evaluate(async () => {
    const context = new AudioContext();
    const oscillator = context.createOscillator();
    const destination = context.createMediaStreamDestination();
    oscillator.connect(destination);
    oscillator.start();
    const recorder = new MediaRecorder(destination.stream, { mimeType: 'audio/webm' });
    const chunks = [];
    recorder.ondataavailable = (event) => { if (event.data.size) chunks.push(event.data); };
    const finished = new Promise((resolve) => { recorder.onstop = () => resolve(new Blob(chunks)); });
    recorder.start();
    await new Promise((resolve) => setTimeout(resolve, 500));
    recorder.stop();
    const blob = await finished;
    oscillator.stop();
    await context.close();
    return Array.from(new Uint8Array(await blob.arrayBuffer()));
  }));
  if (!bytes.length) throw new Error('Generated recording is empty.');
  await browser.close(); browser = undefined;

  path = `${profile.farm_id}/${employeeSession.user.id}/${crypto.randomUUID()}.webm`;
  requireData(await employee.storage.from('toph-recordings').upload(path, bytes, {
    contentType: 'audio/webm', upsert: false,
  }), 'Private audio upload');
  const transcript = `Voice smoke check ${Date.now()}`;
  logId = requireData(await employee.rpc('submit_recorded_activity', {
    p_field_id: fields[0].id, p_activity_type: 'Spraying', p_activity_date: '2026-09-17',
    p_started_at: '2026-09-17T13:00:00Z', p_ended_at: '2026-09-17T14:00:00Z',
    p_transcript: transcript, p_note: 'Temporary test note.',
    p_storage_path: path, p_duration_seconds: 0.5,
  }), 'Atomic voice submission');
  const own = requireData(await employee.from('activity_logs').select('id, transcript, note')
    .eq('id', logId).single(), 'Employee refresh read');
  if (own.transcript !== transcript || own.note !== 'Temporary test note.') throw new Error('Saved employee text differs.');
  const managerLog = requireData(await manager.from('activity_logs').select('id, transcript')
    .eq('id', logId).single(), 'Manager log read');
  if (managerLog.transcript !== transcript) throw new Error('Manager cannot see saved transcript.');
  const recording = requireData(await manager.from('recordings').select('storage_bucket, storage_path')
    .eq('activity_log_id', logId).single(), 'Manager recording read');
  const signed = requireData(await manager.storage.from(recording.storage_bucket)
    .createSignedUrl(recording.storage_path, 60), 'Manager signed playback URL');
  const playback = await fetch(signed.signedUrl);
  if (!playback.ok || Buffer.compare(Buffer.from(await playback.arrayBuffer()), bytes) !== 0) {
    throw new Error('Manager playback did not return the uploaded audio.');
  }
  const removed = requireData(await manager.from('activity_logs').delete().eq('id', logId).select('id'), 'Manager removal');
  if (removed.length !== 1) throw new Error('Manager could not remove the submitted activity.');
  logId = undefined;
  const deletedAudio = requireData(await manager.storage.from('toph-recordings').remove([path]), 'Audio cleanup');
  if (deletedAudio.length !== 1) throw new Error('Audio object was not removed.');
  path = undefined;
  console.log('PASS: live employee voice upload, atomic submission, refresh, manager signed playback, and cleanup.');
} finally {
  if (browser) await browser.close();
  if (logId) await manager.from('activity_logs').delete().eq('id', logId);
  if (path) await manager.storage.from('toph-recordings').remove([path]);
}
