'use strict';

// ─── YOUR FILE — implement this ───────────────────────────────────────────────
// Export handleWebhook(req, res), used by POST /webhooks in app.js.
// Also export _processedIds (your Set or Map) for test inspection/reset.
//
// Steps (in order):
//  1. Verify HMAC-SHA256 signature
//     - Signature header: req.headers['x-webhook-signature'] → 'sha256=<hex>'
//     - Compute: crypto.createHmac('sha256', WEBHOOK_SECRET).update(req.body).digest('hex')
//     - Compare: crypto.timingSafeEqual(Buffer.from(expected,'hex'), Buffer.from(received,'hex'))
//     - Mismatch or missing → res.status(401).json({ error: 'Invalid signature' })
//
//  2. Parse body: const event = JSON.parse(req.body)
//
//  3. Idempotency: if _processedIds.has(event.id) → res.status(200).json({ status: 'already_processed' })
//
//  4. Mark: _processedIds.add(event.id)
//
//  5. Acknowledge: res.status(200).json({ status: 'received' })
//     Then call handleEvent(event) inside setImmediate(() => { ... })


// TODO: implement
const crypto = require('node:crypto');
const { handleEvent } = require('./eventHandlers');

const _processedIds = new Set();

function verifySignature(rawBody, sigHeader, secret){
  if(!sigHeader) return false;

  if(!sigHeader.startsWith('sha256=')) return false;
  const received = sigHeader.slice('sha256='.length);

  if(!/^[0-9a-f]{64}$/i.test(received)) return false;

  const expected = crypto
    .createHmac('sha256', secret)
    .update(rawBody)
    .digest('hex');

  const expectedBuf = Buffer.from(expected, 'hex');
  const receivedBuf = Buffer.from(received, 'hex');

  if(expectedBuf.length !== receivedBuf.length) return false;

  return crypto.timingSafeEqual(expectedBuf, receivedBuf);
}

async function handleWebhook(req, res) {
  const secret = process.env.WEBHOOK_SECRET;
  if (!secret) {
    return res.status(500).json({ error: 'Webhook secret is not configured' });
  }

  // 1. Verify HMAC-SHA256 signature over raw body Buffer
  const sig = req.headers['x-webhook-signature'];
  if (!verifySignature(req.body, sig, secret)) {
    return res.status(401).json({ error: 'Invalid signature' });
  }

  // 2. Parse the body after verification
  let event;
  try {
    event = JSON.parse(req.body);
  } catch (err) {
    if (err instanceof SyntaxError) {
      return res.status(400).json({ error: 'Invalid JSON' });
    }
    throw err;
  }

  // 3. Idempotency: skip already-processed events
  if (_processedIds.has(event.id)) {
    return res.status(200).json({ status: 'already_processed' });
  }

  // 4. Mark as processed (before acknowledging, to avoid race on concurrent replays)
  _processedIds.add(event.id);

  // 5. Acknowledge immediately: before any slow work
  res.status(200).json({ status: 'received' });

  // 6. Process after the response is sent
  setImmediate(async () => {
    try {
      await handleEvent(event);
    } catch (err) {
      console.error(`[webhook] handleEvent failed for ${event.id}:`, err.message);
    }
  });
}

module.exports = { handleWebhook, _processedIds };