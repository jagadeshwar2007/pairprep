#!/usr/bin/env node
/**
 * One-time, operator-run bootstrap of the application's single super admin.
 *
 *   npm run bootstrap:admin -- --email you@example.com
 *
 * Why this is safe:
 *   - It needs SUPABASE_SERVICE_ROLE_KEY, i.e. someone with server/operator access. It cannot be
 *     triggered from the browser, a public signup, a profile field or an email the browser sends.
 *   - It only PROMOTES an account that already exists (the person must have signed in with Google
 *     once), and asks you to retype the email to confirm.
 *   - The work is done by public.bootstrap_super_admin(), which only the service role can execute,
 *     refuses to run if a super admin already exists, and writes an audit entry. The database
 *     additionally guarantees there can never be a second super admin.
 *
 * Later ownership changes happen in the app: Admin > Settings > Transfer ownership.
 */
import { createInterface } from 'node:readline/promises';
import { stdin, stdout, argv, env, exit } from 'node:process';
import { createClient } from '@supabase/supabase-js';

function arg(name) {
  const i = argv.indexOf(`--${name}`);
  return i > -1 ? argv[i + 1] : undefined;
}

const email = (arg('email') ?? '').trim().toLowerCase();
const assumeYes = argv.includes('--yes');
const url = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!email || !email.includes('@')) {
  console.error('Usage: npm run bootstrap:admin -- --email you@example.com [--yes]');
  exit(2);
}
if (!url || !serviceKey) {
  console.error('NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set (put them in .env.local).');
  exit(2);
}

const admin = createClient(url, serviceKey, { auth: { persistSession: false, autoRefreshToken: false } });

const { data: profile, error: lookupError } = await admin
  .from('profiles')
  .select('id, email, full_name, account_status')
  .ilike('email', email.replace(/[\\%_]/g, (c) => `\\${c}`))
  .maybeSingle();

if (lookupError) {
  console.error('Could not look up the account:', lookupError.message);
  exit(1);
}
if (!profile) {
  console.error(`No account found for ${email}.\nSign in to the app with that Google account once, then run this again.`);
  exit(1);
}
if (profile.account_status !== 'active') {
  console.error(`The account ${email} is ${profile.account_status}; it cannot become the super admin.`);
  exit(1);
}

console.log(`\nAbout to make this account the ONE super admin of ${url}:`);
console.log(`  ${profile.full_name ?? '(no name)'} <${profile.email}>  [${profile.id}]\n`);

if (!assumeYes) {
  const rl = createInterface({ input: stdin, output: stdout });
  const answer = (await rl.question('Retype the email to confirm: ')).trim().toLowerCase();
  rl.close();
  if (answer !== email) {
    console.error('Confirmation did not match. Nothing was changed.');
    exit(1);
  }
}

const { error } = await admin.rpc('bootstrap_super_admin', { p_user_id: profile.id });
if (error) {
  if (error.message === 'conflict') {
    console.error('A super admin already exists. Use Admin > Settings > Transfer ownership instead.');
  } else {
    console.error('Bootstrap failed:', error.message, error.details ?? '');
  }
  exit(1);
}

console.log(`Done. ${profile.email} is now the super admin. Sign out and back in (or refresh) to see the admin panel.`);
