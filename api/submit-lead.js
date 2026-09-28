import { createClient } from '@supabase/supabase-js';

/* Lead form → Supabase "leads" table.
   Only the anon/publishable key is used (SUPABASE_ANON_KEY). RLS on the
   table allows INSERT for anon and nothing else, so this key can write a
   lead but never read one back. See supabase/schema.sql. */

const REQUIRED = ['name', 'email', 'phone', 'brand', 'monthly_spend'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
}

/* Cloudflare Turnstile: verifies the token the widget attaches as
   cf-turnstile-response. TURNSTILE_SECRET_KEY lives only in Vercel's
   env vars, never in this file. If the secret isn't set yet, the check
   is skipped so the form keeps working while the key is being added. */
async function verifyTurnstile(token, remoteip) {
  const secret = process.env.TURNSTILE_SECRET_KEY;
  if (!secret) return true;
  if (!token) return false;

  const params = new URLSearchParams({ secret, response: token });
  if (remoteip) params.set('remoteip', remoteip);

  try {
    const r = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params
    });
    const data = await r.json();
    return data.success === true;
  } catch (err) {
    console.error('submit-lead: Turnstile verification request failed', err);
    return false;
  }
}

async function readBody(req) {
  // Vercel parses JSON bodies into req.body; fall back to the raw stream.
  if (req.body && typeof req.body === 'object') return req.body;
  let raw = typeof req.body === 'string' ? req.body : '';
  if (!raw) {
    for await (const chunk of req) raw += chunk;
  }
  return raw ? JSON.parse(raw) : {};
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false, error: 'Method not allowed' });
  }

  let body;
  try {
    body = await readBody(req);
  } catch {
    return res.status(400).json({ success: false, error: 'Invalid JSON body' });
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) body = {};

  // Honeypot filled → a bot. Pretend it worked and drop it.
  if (clean(body._honey)) {
    return res.status(200).json({ success: true });
  }

  const remoteip = (req.headers['x-forwarded-for'] || '').split(',')[0].trim() || undefined;
  const humanPassed = await verifyTurnstile(body['cf-turnstile-response'], remoteip);
  if (!humanPassed) {
    return res.status(400).json({ success: false, error: 'Verification failed. Please try again.' });
  }

  const missing = REQUIRED.filter((field) => !clean(body[field]));
  if (missing.length) {
    return res.status(400).json({
      success: false,
      error: 'Missing required field(s): ' + missing.join(', ')
    });
  }

  const url = process.env.SUPABASE_URL;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  if (!url || !anonKey) {
    console.error('submit-lead: SUPABASE_URL or SUPABASE_ANON_KEY is not set');
    return res.status(500).json({ success: false, error: 'Could not save your brief. Please try again later.' });
  }

  const supabase = createClient(url, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false }
  });

  // The /agency-partner form sends lead_type "agency". It is tagged through
  // the existing source column (no schema change), and its lane choice is
  // folded into the message. Every other submission stays a brand lead.
  const isAgency = clean(body.lead_type) === 'agency';
  const service = clean(body.service);
  const message = isAgency && service
    ? ['Lane: ' + service, clean(body.message)].filter(Boolean).join('\n\n')
    : clean(body.message);

  // No .select() after insert: anon has INSERT only, not SELECT.
  const { error } = await supabase.from('leads').insert({
    name: clean(body.name),
    email: clean(body.email),
    phone: clean(body.phone),
    brand: clean(body.brand),
    monthly_spend: clean(body.monthly_spend),
    message: message || null,
    source: isAgency ? 'mehbubsadik.online/agency-partner' : 'mehbubsadik.online'
  });

  if (error) {
    console.error('submit-lead: Supabase insert failed', error);
    return res.status(500).json({ success: false, error: 'Could not save your brief. Please try again later.' });
  }

  return res.status(200).json({ success: true });
}
