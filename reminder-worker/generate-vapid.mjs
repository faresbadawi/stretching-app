// Erzeugt ein VAPID-Schlüsselpaar für Web Push.  Aufruf: node generate-vapid.mjs
// Der öffentliche Schlüssel kommt in wrangler.toml und js/config.js, der private nur als Secret (wrangler secret put VAPID_PRIVATE_KEY).
import crypto from 'node:crypto';
const { privateKey } = crypto.generateKeyPairSync('ec', { namedCurve: 'prime256v1' });
const jwk = privateKey.export({ format: 'jwk' });
const pub = Buffer.concat([Buffer.from([4]), Buffer.from(jwk.x, 'base64url'), Buffer.from(jwk.y, 'base64url')]);
console.log(JSON.stringify({ publicKey: pub.toString('base64url'), privateKey: jwk.d }));
