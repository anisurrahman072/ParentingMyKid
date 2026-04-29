'use strict';

/**
 * Runs `npx eas-cli` with retries when Expo's GraphQL API fails due to
 * transient TLS/TCP issues (ECONNRESET, EPIPE, timeouts, etc.).
 */
const { spawn } = require('node:child_process');
const path = require('node:path');

const mobileRoot = path.join(__dirname, '..');
const argv = process.argv.slice(2);

if (argv.length === 0) {
  console.error('Usage: node scripts/eas-with-retry.cjs <eas-args...>');
  console.error('Example: node scripts/eas-with-retry.cjs build --profile development --platform android');
  process.exit(1);
}

const MAX_ATTEMPTS = 4;
const RETRY_RE =
  /ECONNRESET|EPIPE|ETIMEDOUT|ENETUNREACH|ENOTFOUND|socket hang up|GraphQL request failed|fetch failed|ECONNABORTED/i;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function runAttempt() {
  return new Promise((resolve) => {
    const chunks = [];
    const child = spawn('npx', ['eas-cli', ...argv], {
      cwd: mobileRoot,
      stdio: ['inherit', 'pipe', 'pipe'],
      shell: process.platform === 'win32',
      env: process.env,
    });

    child.stdout.on('data', (d) => {
      process.stdout.write(d);
      chunks.push(d);
    });
    child.stderr.on('data', (d) => {
      process.stderr.write(d);
      chunks.push(d);
    });
    child.on('close', (code) => {
      resolve({ code: code ?? 1, output: Buffer.concat(chunks).toString('utf8') });
    });
    child.on('error', (err) => {
      const msg = String(err);
      process.stderr.write(msg + '\n');
      resolve({ code: 1, output: msg });
    });
  });
}

(async () => {
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    const { code, output } = await runAttempt();
    if (code === 0) process.exit(0);

    const transient = RETRY_RE.test(output);
    if (attempt < MAX_ATTEMPTS && transient) {
      const delayMs = Math.min(3000 * attempt, 15000);
      console.error(
        `\n[eas-with-retry] Expo API connection failed (attempt ${attempt}/${MAX_ATTEMPTS}). Retrying in ${delayMs}ms...\n`,
      );
      await sleep(delayMs);
      continue;
    }
    process.exit(code);
  }
})();
