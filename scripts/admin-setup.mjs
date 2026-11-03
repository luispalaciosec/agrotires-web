// Sets the admin password in .env.local. The password itself is never stored, only its hash.
import { randomBytes, scryptSync } from 'node:crypto';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { createInterface } from 'node:readline/promises';

const rl = createInterface({ input: process.stdin, output: process.stdout });
const password = await rl.question('New admin password (12+ characters): ');
rl.close();
if (password.length < 12) {
  console.error('The password must have at least 12 characters.');
  process.exit(1);
}

const salt = randomBytes(16).toString('hex');
const values = {
  STORE_DRIVER: 'local',
  ADMIN_PASSWORD_HASH: `${salt}:${scryptSync(password, salt, 64).toString('hex')}`,
  ADMIN_SESSION_SECRET: randomBytes(32).toString('hex'),
};

const file = '.env.local';
const kept = existsSync(file) ? readFileSync(file, 'utf8').split('\n').filter((l) => l.trim() && !Object.keys(values).some((k) => l.startsWith(`${k}=`))) : [];
writeFileSync(file, [...kept, ...Object.entries(values).map(([k, v]) => `${k}=${v}`)].join('\n') + '\n', { mode: 0o600 });
console.log('Saved to .env.local. Restart the server to apply it.');
