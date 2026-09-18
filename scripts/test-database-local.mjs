// Disposable PostgreSQL only: no environment file, linked project, or remote URL is read.
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { setTimeout } from 'node:timers/promises';

const container = `toph-schema-test-${process.pid}`;
const docker = (args, input) => execFileSync('docker', args, { input, encoding: 'utf8', stdio: ['pipe', 'pipe', 'pipe'] });
const sql = (input) => docker(['exec', '-i', container, 'psql', '-X', '-U', 'postgres', '-v', 'ON_ERROR_STOP=1', '-q'], input);
let started = false;
try {
  docker(['run', '--detach', '--rm', '--name', container, '--network', 'none', '--env', 'POSTGRES_HOST_AUTH_METHOD=trust', 'postgres:17']);
  started = true;
  let ready = false;
  for (let i = 0; i < 30; i++) {
    try { docker(['exec', container, 'pg_isready', '-U', 'postgres']); ready = true; break; }
    catch { await setTimeout(1000); }
  }
  if (!ready) throw new Error('Local PostgreSQL failed to become ready.');
  // Supabase API role names only; no authentication service or users are created.
  sql('create role anon; create role authenticated;');
  sql(readFileSync(new URL('../supabase/tests/auth-stub.sql', import.meta.url), 'utf8'));
  const dir = new URL('../supabase/migrations/', import.meta.url);
  for (const file of readdirSync(dir).filter((f) => f.endsWith('.sql')).sort()) {
    sql(readFileSync(new URL(file, dir), 'utf8'));
    console.log(`Applied ${file}`);
    if (file === '20260916000000_create_dashboard_schema.sql') {
      const seed = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
      // This checkpoint runs before the later reviewed -> approved migration.
      // Preserve its historical constraint while testing the baseline schema.
      const legacySeed = seed.replace(", 'approved',", ", 'reviewed',");
      sql(legacySeed);
      sql(legacySeed);
      sql(readFileSync(new URL('../supabase/tests/schema.sql', import.meta.url), 'utf8'));
      console.log('PASS: baseline schema, seed replay, and integrity checks.');
    }
    if (file === '20260916010000_enable_farm_rls.sql') {
      sql(readFileSync(new URL('../supabase/tests/rls.sql', import.meta.url), 'utf8'));
      console.log('PASS: original farm RLS, roles, missing membership, and Auth deletion.');
    }
  }
  const seed = readFileSync(new URL('../supabase/seed.sql', import.meta.url), 'utf8');
  sql(seed);
  sql(seed); // Replay must not duplicate or overwrite existing IDs.
  sql(readFileSync(new URL('../supabase/tests/employee-flow.sql', import.meta.url), 'utf8'));
  console.log('PASS: employee identity, own-log insert, manager visibility, and cross-farm denials.');
  sql(readFileSync(new URL('../supabase/tests/review-workflow.sql', import.meta.url), 'utf8'));
  console.log('PASS: manager approval and denial, final-state protection, employee denial, and cross-farm denial.');
} catch (error) {
  console.error(error.stderr?.toString() || error.message);
  process.exitCode = 1;
} finally {
  if (started) docker(['stop', container]);
}
