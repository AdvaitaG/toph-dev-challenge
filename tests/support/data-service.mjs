// Loopback test double for PostgREST. Real RLS is verified separately with SQL
// and the linked project; this exercises the production query/action code.
import { randomUUID } from 'node:crypto';
import { demoFarm, demoEmployees, demoActivityLogs } from '../../src/lib/demo/fixtures.ts';
import { dateInTimezone } from '../../src/lib/format.ts';

const stores = new Map();
function initial(userId) {
  const fields = ['FIELD A', 'FIELD B', 'FIELD C', 'FIELD D'].map((name, i) => ({ id: `30000000-0000-4000-8000-00000000000${i + 1}`, farm_id: demoFarm.id, name, latitude: null, longitude: null }));
  return {
    farms: [demoFarm],
    profiles: [{ id: userId, farm_id: demoFarm.id, role: 'manager', employee_id: null, full_name: 'Test Manager' }],
    employees: demoEmployees.map((e) => ({ id: e.id, farm_id: e.farmId, full_name: e.name, active: e.active,
      contact_email: e.name === 'Anthony Wells' ? 'anthony@example.test' : null })),
    fields,
    activity_logs: demoActivityLogs.map((l) => ({ id: l.id, farm_id: demoFarm.id, employee_id: l.employeeId, field_id: fields.find((f) => f.name === l.field).id, activity_type: l.activityType, activity_date: l.activityDate, started_at: l.startedAt, ended_at: l.endedAt, summary: l.summary, response_accuracy: l.responseAccuracy, review_status: l.reviewStatus, denial_reason: l.denialReason, submitted_by: null, created_at: l.recordedAt })),
    recordings: demoActivityLogs.map((l, i) => ({ id: `40000000-0000-4000-8000-00000000000${i + 1}`, farm_id: demoFarm.id, activity_log_id: l.id, recorded_at: l.recordedAt, is_new: l.isNew, storage_bucket: null, storage_path: null })),
    tags: [{ id: '50000000-0000-4000-8000-000000000001', farm_id: demoFarm.id, name: 'Needs Review' }],
    activity_log_tags: [],
  };
}
export async function handleData(req, url, send, claims, audioObjects) {
  // New signup accounts keep their rows across logout/login; the fixed test
  // accounts stay isolated per session so parallel specs cannot share writes.
  const storeKey = ['tester@example.test', 'anthony@example.test'].includes(claims.email) ? claims.session_id : claims.sub;
  let store = stores.get(storeKey);
  if (!store) {
    store = initial(claims.sub);
    if (claims.email !== 'tester@example.test') {
      const existing = claims.email === 'anthony@example.test';
      const workerId = existing ? demoEmployees[5].id : randomUUID();
      const name = claims.user_metadata?.full_name ?? 'Employee';
      if (!existing) store.employees.push({ id: workerId, farm_id: demoFarm.id, full_name: name, active: true, contact_email: claims.email });
      store.profiles[0] = { id: claims.sub, farm_id: demoFarm.id, role: 'employee', employee_id: workerId, full_name: name };
    }
    stores.set(storeKey, store);
  }
  if (url.pathname === '/__test/control') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const config = JSON.parse(raw);
    if (config.noProfile) store.profiles = [];
    if (config.member) store.profiles[0].role = 'member';
    if (config.addEmployeeAccount) {
      const workerId = randomUUID();
      store.employees.push({ id: workerId, farm_id: demoFarm.id, full_name: 'AGP', active: true, contact_email: 'agp@example.test' });
      store.profiles.push({ id: randomUUID(), farm_id: demoFarm.id, role: 'employee', employee_id: workerId, full_name: 'AGP' });
    }
    if (config.addSubmittedLog || config.addSecondSubmittedLog) store.activity_logs.push({
      id: randomUUID(), farm_id: demoFarm.id, employee_id: demoEmployees[5].id,
      field_id: store.fields[config.addSecondSubmittedLog ? 1 : 0].id, activity_type: config.addSecondSubmittedLog ? 'Planting' : 'Irrigation', activity_date: '2026-04-22',
      started_at: '2026-04-22T13:00:00Z', ended_at: '2026-04-22T14:00:00Z',
      summary: config.addSecondSubmittedLog ? 'Anthony planted the second field.' : 'Anthony checked the irrigation lines.', response_accuracy: null,
      review_status: 'pending', denial_reason: null, submitted_by: '60000000-0000-4000-8000-000000000202', created_at: new Date().toISOString(),
    });
    if (config.addCurrentMonthLog) store.activity_logs.push({
      id: randomUUID(), farm_id: demoFarm.id, employee_id: demoEmployees[5].id,
      field_id: store.fields[0].id, activity_type: 'Spraying',
      activity_date: dateInTimezone(new Date().toISOString(), demoFarm.timezone),
      started_at: new Date().toISOString(), ended_at: new Date(Date.now() + 3600_000).toISOString(),
      summary: 'Current-month activity for filter verification.', response_accuracy: null,
      review_status: 'pending', denial_reason: null, submitted_by: '60000000-0000-4000-8000-000000000202', created_at: new Date().toISOString(),
    });
    if (config.addRecordedLog) {
      const id = randomUUID();
      const path = `${demoFarm.id}/60000000-0000-4000-8000-000000000202/${randomUUID()}.webm`;
      store.activity_logs.push({
        id, farm_id: demoFarm.id, employee_id: demoEmployees[5].id,
        field_id: store.fields[0].id, activity_type: 'Spraying', activity_date: '2026-09-17',
        started_at: '2026-09-17T13:00:00Z', ended_at: '2026-09-17T14:00:00Z',
        summary: 'Transcript: Sprayed the north field', response_accuracy: null,
        review_status: 'pending', denial_reason: null, submitted_by: '60000000-0000-4000-8000-000000000202', created_at: new Date().toISOString(),
      });
      store.recordings.push({ id: randomUUID(), farm_id: demoFarm.id, activity_log_id: id,
        recorded_at: new Date().toISOString(), is_new: true, storage_bucket: 'toph-recordings', storage_path: path });
      audioObjects.set(path, { owner: '60000000-0000-4000-8000-000000000202', mime: 'audio/webm', bytes: Buffer.from(config.addRecordedLog, 'base64') });
    }
    store.failReads = !!config.failReads;
    store.failWrites = !!config.failWrites;
    return send(200, { ok: true });
  }
  if (url.pathname === '/rest/v1/rpc/submit_recorded_activity' && req.method === 'POST') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const input = JSON.parse(raw);
    if (store.profiles[0]?.role !== 'employee' ||
        audioObjects.get(input.p_storage_path)?.owner !== claims.sub) return send(403, { code: '42501', message: 'Voice upload denied' });
    const id = randomUUID();
    store.activity_logs.push({
      id, farm_id: demoFarm.id, employee_id: store.profiles[0].employee_id,
      field_id: input.p_field_id, activity_type: input.p_activity_type,
      activity_date: input.p_activity_date, started_at: input.p_started_at,
      ended_at: input.p_ended_at,
      summary: [input.p_transcript && `Transcript: ${input.p_transcript}`, input.p_note && `Note: ${input.p_note}`].filter(Boolean).join('\n\n'),
      transcript: input.p_transcript || null, note: input.p_note || null,
      response_accuracy: null, review_status: 'pending', denial_reason: null, submitted_by: claims.sub,
      created_at: new Date().toISOString(),
    });
    store.recordings.push({ id: randomUUID(), farm_id: demoFarm.id, activity_log_id: id,
      recorded_at: new Date().toISOString(), is_new: true,
      storage_bucket: 'toph-recordings', storage_path: input.p_storage_path });
    return send(200, id);
  }
  const table = url.pathname.split('/').at(-1);
  if (!Array.isArray(store[table])) return send(404, { message: 'Unknown table' });
  if (store.failReads && table !== 'profiles' && req.method === 'GET') return send(503, { message: 'Test read failure' });
  const match = (row) => [...url.searchParams].every(([key, value]) => {
    if (value.startsWith('eq.')) return String(row[key]) === value.slice(3);
    if (value.startsWith('ilike.')) return String(row[key]).toLowerCase() === value.slice(6).replace(/\\([\\%_])/g, '$1').toLowerCase();
    return true;
  });
  const project = (rows) => {
    const select = url.searchParams.get('select');
    return !select || select === '*' ? rows : rows.map((row) => Object.fromEntries(select.split(',').map((key) => [key, row[key]])));
  };
  const single = (rows) => {
    if (!req.headers.accept?.includes('application/vnd.pgrst.object+json')) return send(200, project(rows));
    return rows.length === 1 ? send(200, project(rows)[0]) : send(406, { code: 'PGRST116', details: `The result contains ${rows.length} rows`, message: 'Not one row' });
  };
  if (req.method === 'GET') {
    let rows = store[table].filter(match);
    if (store.profiles[0]?.role === 'employee') {
      if (table === 'employees') rows = rows.filter((row) => row.id === store.profiles[0].employee_id);
      if (table === 'activity_logs') rows = rows.filter((row) => row.employee_id === store.profiles[0].employee_id);
      if (['recordings', 'tags', 'activity_log_tags'].includes(table)) rows = [];
    }
    rows.sort((a, b) => a.id.localeCompare(b.id));
    const offset = Number(url.searchParams.get('offset') ?? 0);
    const limit = Number(url.searchParams.get('limit') ?? 1000);
    return single(rows.slice(offset, offset + limit));
  }
  if (store.failWrites) return send(503, { message: 'Test write failure' });
  if (req.method === 'PATCH' && table === 'employees') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const changes = JSON.parse(raw);
    if (!['manager', 'admin'].includes(store.profiles[0]?.role) ||
        Object.keys(changes).length !== 1 || !Object.hasOwn(changes, 'contact_email')) {
      return send(403, { code: '42501', message: 'Employee contact update denied' });
    }
    const updated = store.employees.filter(match);
    for (const row of updated) row.contact_email = changes.contact_email;
    return single(updated);
  }
  if (req.method === 'PATCH' && table === 'activity_logs') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const changes = JSON.parse(raw);
    if (!['manager', 'admin'].includes(store.profiles[0]?.role) ||
        !['approved', 'denied'].includes(changes.review_status) ||
        Object.keys(changes).some((key) => !['review_status', 'denial_reason'].includes(key)) ||
        (changes.denial_reason != null && (changes.review_status !== 'denied' || changes.denial_reason.length > 200 || changes.denial_reason.trim() !== changes.denial_reason))) {
      return send(403, { code: '42501', message: 'Activity decision denied' });
    }
    const updated = store.activity_logs.filter((row) => match(row) && row.farm_id === demoFarm.id && row.review_status === 'pending');
    for (const row of updated) { row.review_status = changes.review_status; row.denial_reason = changes.denial_reason ?? null; }
    return send(200, updated.map((row) => projectRow(row, url)));
  }
  if (req.method === 'POST' && table === 'activity_logs') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const row = JSON.parse(raw);
    if (store.profiles[0]?.role !== 'employee' || row.farm_id !== demoFarm.id || row.employee_id !== store.profiles[0].employee_id || row.submitted_by !== claims.sub || row.review_status !== 'pending' || row.response_accuracy !== null || !store.fields.some((item) => item.id === row.field_id)) return send(403, { code: '42501', message: 'Employee scope denied' });
    const created = { ...row, id: randomUUID(), denial_reason: null, created_at: new Date().toISOString() };
    store.activity_logs.push(created);
    return req.headers.prefer?.includes('return=representation') ? send(201, projectRow(created, url)) : send(201, null);
  }
  if (req.method === 'DELETE' && table === 'activity_logs') {
    if (!['manager', 'admin'].includes(store.profiles[0]?.role)) return send(403, { code: '42501', message: 'Manager required' });
    const removed = store.activity_logs.filter((row) => match(row) && row.submitted_by);
    store.activity_logs = store.activity_logs.filter((row) => !removed.includes(row));
    return send(200, removed.map((row) => projectRow(row, url)));
  }
  if (!['manager', 'admin'].includes(store.profiles[0]?.role)) return send(403, { code: '42501', message: 'Read only' });
  if (req.method === 'DELETE' && table === 'activity_log_tags') {
    store[table] = store[table].filter((row) => !match(row));
    return send(200, null);
  }
  if (req.method !== 'POST' || !['tags', 'activity_log_tags'].includes(table)) return send(403, { message: 'Unsupported write' });
  let raw = ''; for await (const chunk of req) raw += chunk;
  const row = JSON.parse(raw);
  if (row.farm_id !== demoFarm.id || row.created_by !== claims.sub) return send(403, { code: '42501', message: 'Invalid scope' });
  const duplicate = store[table].some((existing) => table === 'tags' ? existing.name.toLowerCase() === row.name.toLowerCase() : existing.activity_log_id === row.activity_log_id && existing.tag_id === row.tag_id);
  if (duplicate) return send(409, { code: '23505', message: 'Duplicate' });
  const created = { ...row, id: randomUUID(), created_at: new Date().toISOString() };
  store[table].push(created);
  return req.headers.prefer?.includes('return=representation') ? single([created]) : send(201, null);
}

function projectRow(row, url) {
  const select = url.searchParams.get('select');
  return !select || select === '*' ? row : Object.fromEntries(select.split(',').map((key) => [key, row[key]]));
}
