// Test-only Auth protocol double. No Supabase project or real users are touched.
import { createServer } from 'node:http';
import { createHmac, randomUUID } from 'node:crypto';
import { handleData } from './data-service.mjs';

const secret = randomUUID();
const sessions = new Map();
const confirmationCodes = new Map();
const audioObjects = new Map();
const manager = { id: '60000000-0000-4000-8000-000000000201', aud: 'authenticated', role: 'authenticated', email: 'tester@example.test', app_metadata: {}, user_metadata: {}, created_at: '2026-04-22T00:00:00Z' };
const employee = { ...manager, id: '60000000-0000-4000-8000-000000000202', email: 'anthony@example.test', user_metadata: { full_name: 'Anthony Wells', signup_intent: 'employee' } };
const googleEmployee = { ...manager, id: '60000000-0000-4000-8000-000000000203', email: 'google.worker@example.test', user_metadata: { full_name: 'Google Worker' } };
const users = new Map([[manager.email, manager], [employee.email, employee], [googleEmployee.email, googleEmployee]]);
const passwords = new Map([[manager.email, 'local-test-password'], [employee.email, 'local-test-password']]);
const b64 = (value) => Buffer.from(JSON.stringify(value)).toString('base64url');
function token(sessionId, user) {
  const text = `${b64({ alg: 'HS256', typ: 'JWT' })}.${b64({ sub: user.id, email: user.email, user_metadata: user.user_metadata, aud: 'authenticated', role: 'authenticated', session_id: sessionId, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600 })}`;
  return `${text}.${createHmac('sha256', secret).update(text).digest('base64url')}`;
}
function session(user, id = randomUUID()) {
  const refresh = randomUUID();
  sessions.set(refresh, { id, userId: user.id });
  return { access_token: token(id, user), refresh_token: refresh, token_type: 'bearer', expires_in: 3600, expires_at: Math.floor(Date.now() / 1000) + 3600, user };
}
function valid(bearer = '') {
  const [header, payload, signature] = bearer.replace(/^Bearer /, '').split('.');
  if (!header || !payload || !signature || createHmac('sha256', secret).update(`${header}.${payload}`).digest('base64url') !== signature) return false;
  const claims = JSON.parse(Buffer.from(payload, 'base64url'));
  return claims.exp > Date.now() / 1000 && [...sessions.values()].some((item) => item.id === claims.session_id && item.userId === claims.sub);
}
createServer(async (req, res) => {
  const url = new URL(req.url, 'http://127.0.0.1:54331');
  const send = (status, data) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(data)); };
  if (url.pathname === '/health') return send(200, { ready: true });
  if (url.pathname === '/auth/v1/settings') return send(200, { external: { google: true } });
  if (url.pathname.startsWith('/rest/v1/') || url.pathname === '/__test/control') {
    if (!valid(req.headers.authorization)) return send(401, { message: 'Invalid JWT' });
    const claims = JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], 'base64url'));
    return handleData(req, url, send, claims, audioObjects);
  }
  if (url.pathname.startsWith('/storage/v1/object/')) {
    if (url.pathname.startsWith('/storage/v1/object/sign/toph-recordings/') && req.method === 'GET' && url.searchParams.get('token') === 'local') {
      const path = decodeURIComponent(url.pathname.slice('/storage/v1/object/sign/toph-recordings/'.length));
      const object = audioObjects.get(path);
      if (!object) return send(404, { message: 'Recording missing' });
      res.writeHead(200, { 'Content-Type': object.mime, 'Content-Length': object.bytes.length });
      return res.end(object.bytes);
    }
    if (!valid(req.headers.authorization)) return send(401, { message: 'Invalid JWT' });
    const claims = JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], 'base64url'));
    const signed = url.pathname.startsWith('/storage/v1/object/sign/');
    const prefix = signed ? '/storage/v1/object/sign/toph-recordings/' : '/storage/v1/object/toph-recordings/';
    if (signed && req.method === 'POST') {
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      if (!audioObjects.has(path)) return send(404, { message: 'Recording missing' });
      return send(200, { signedURL: `/object/sign/toph-recordings/${path}?token=local` });
    }
    if (req.method === 'POST' && url.pathname.startsWith(prefix)) {
      const path = decodeURIComponent(url.pathname.slice(prefix.length));
      if (!path.includes(`/${claims.sub}/`)) return send(403, { message: 'Wrong uploader' });
      const parts = []; for await (const chunk of req) parts.push(chunk);
      const raw = Buffer.concat(parts);
      const boundary = req.headers['content-type']?.match(/boundary=([^;]+)/)?.[1];
      const end = boundary ? raw.lastIndexOf(Buffer.from(`\r\n--${boundary}`)) : -1;
      const headerEnd = end > 0 ? raw.lastIndexOf(Buffer.from('\r\n\r\n'), end) : -1;
      const bytes = headerEnd >= 0 && end > headerEnd ? raw.subarray(headerEnd + 4, end) : raw;
      audioObjects.set(path, { owner: claims.sub, bytes, mime: path.endsWith('.mp4') ? 'audio/mp4' : 'audio/webm' });
      return send(200, { Key: `toph-recordings/${path}`, Id: randomUUID() });
    }
    if (req.method === 'DELETE' && url.pathname === '/storage/v1/object/toph-recordings') {
      let raw = ''; for await (const chunk of req) raw += chunk;
      const paths = JSON.parse(raw).prefixes || [];
      for (const path of paths) audioObjects.delete(path);
      return send(200, paths.map((name) => ({ name })));
    }
    return send(404, { message: 'Unknown storage endpoint' });
  }
  if (url.pathname === '/auth/v1/authorize' && url.searchParams.get('provider') === 'google') {
    const redirectTo = url.searchParams.get('redirect_to');
    if (!redirectTo?.startsWith('http://127.0.0.1:3100/auth/callback')) return send(400, { msg: 'Invalid local redirect' });
    const user = req.headers.cookie?.includes('toph-test-oauth-manager=1') ? manager : googleEmployee;
    const code = randomUUID();
    confirmationCodes.set(code, user.id);
    const destination = new URL(redirectTo);
    destination.searchParams.set('code', code);
    res.writeHead(302, { Location: destination.toString() });
    return res.end();
  }
  if (url.pathname === '/auth/v1/signup') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    if (users.has(body.email)) return send(400, { code: 'user_already_exists', msg: 'Already registered' });
    const created = { ...manager, id: randomUUID(), email: body.email, user_metadata: body.data ?? {} };
    users.set(created.email, created);
    passwords.set(created.email, body.password);
    if (created.email.endsWith('@confirm.example.test')) {
      confirmationCodes.set('local-confirm-code', created.id);
      return send(200, { user: created, session: null });
    }
    return send(200, session(created));
  }
  if (url.pathname === '/auth/v1/token') {
    let raw = ''; for await (const chunk of req) raw += chunk;
    const body = JSON.parse(raw || '{}');
    if (url.searchParams.get('grant_type') === 'password') {
      if (users.has(body.email) && passwords.get(body.email) === body.password) return send(200, session(users.get(body.email)));
      return send(400, { code: 'invalid_credentials', msg: 'Invalid login credentials' });
    }
    if (url.searchParams.get('grant_type') === 'pkce') {
      const userId = confirmationCodes.get(body.auth_code);
      if (!userId || !body.code_verifier) return send(400, { code: 'bad_code_verifier', msg: 'Invalid confirmation code' });
      confirmationCodes.delete(body.auth_code);
      return send(200, session([...users.values()].find((item) => item.id === userId)));
    }
    const existing = sessions.get(body.refresh_token);
    if (!existing) return send(400, { code: 'refresh_token_not_found', msg: 'Invalid refresh token' });
    sessions.delete(body.refresh_token);
    const matchingUser = [...users.values()].find((item) => item.id === existing.userId);
    return send(200, session(matchingUser, existing.id));
  }
  if (url.pathname === '/auth/v1/user') {
    if (!valid(req.headers.authorization)) return send(401, { code: 'bad_jwt', msg: 'Invalid JWT' });
    const claims = JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], 'base64url'));
    return send(200, [...users.values()].find((item) => item.id === claims.sub));
  }
  if (url.pathname === '/auth/v1/logout') {
    if (!valid(req.headers.authorization)) return send(401, { code: 'bad_jwt', msg: 'Invalid JWT' });
    const claims = JSON.parse(Buffer.from(req.headers.authorization.split('.')[1], 'base64url'));
    for (const [key, item] of sessions) if (item.id === claims.session_id) sessions.delete(key);
    res.writeHead(204); return res.end();
  }
  return send(404, { msg: 'Unknown test endpoint' });
}).listen(54331, '127.0.0.1');
