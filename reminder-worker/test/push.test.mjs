import test from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { buildPushPayload } from '@block65/webcrypto-web-push';

const b64u = (b) => Buffer.from(b).toString('base64url');

test('Push-Nachricht wird verschlüsselt und mit VAPID-Kopfzeilen gebaut', async () => {
  const vapidKey = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const jwk = vapidKey.privateKey.export({ format: 'jwk' });
  const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
  const client = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
  const cj = client.publicKey.export({ format: 'jwk' });
  const cpub = Buffer.concat([Buffer.from([4]), Buffer.from(cj.x, 'base64url'), Buffer.from(cj.y, 'base64url')]);
  const sub = { endpoint: 'https://fcm.googleapis.com/fcm/send/test', expirationTime: null, keys: { p256dh: b64u(cpub), auth: b64u(crypto.randomBytes(16)) } };
  const p = await buildPushPayload({ data: JSON.stringify({ title: 'x', body: 'y' }), options: { ttl: 60 } },
    sub, { subject: 'https://example.org', publicKey: b64u(pub), privateKey: jwk.d });
  assert.equal(p.method.toUpperCase(), 'POST');
  assert.match(p.headers.authorization, /^vapid t=.+, k=/);
  assert.equal(p.headers['content-encoding'], 'aes128gcm');
  assert.ok(p.body.byteLength > 100);
});
