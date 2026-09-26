import { createClient } from '@supabase/supabase-js';

/* Lead form → Supabase "leads" table.
   Only the anon/publishable key is used (SUPABASE_ANON_KEY). RLS on the
   table allows INSERT for anon and nothing else, so this key can write a
   lead but never read one back. See supabase/schema.sql. */

const REQUIRED = ['name', 'email', 'phone', 'brand', 'monthly_spend'];

function clean(value) {
  return typeof value === 'string' ? value.trim() : '';
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

  // No .select() after insert: anon has INSERT only, not SELECT.
  const { error } = await supabase.from('leads').insert({
    name: clean(body.name),
    email: clean(body.email),
    phone: clean(body.phone),
    brand: clean(body.brand),
    monthly_spend: clean(body.monthly_spend),
    message: clean(body.message) || null,
    source: 'mehbubsadik.online'
  });

  if (error) {
    console.error('submit-lead: Supabase insert failed', error);
    return res.status(500).json({ success: false, error: 'Could not save your brief. Please try again later.' });
  }

  return res.status(200).json({ success: true });
}
