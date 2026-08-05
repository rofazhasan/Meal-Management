import { spawnSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
const __dirname = dirname(fileURLToPath(import.meta.url));
const r = spawnSync(
  'node_modules/.bin/tsc',
  ['--noEmit', '--pretty', 'false'],
  { cwd: __dirname, encoding: 'utf8' }
);
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status || 0);
