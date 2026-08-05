#!/usr/bin/env node
// Run TypeScript type-check and print errors
const { spawnSync } = require('child_process');
const r = spawnSync(
  process.platform === 'win32' ? 'node_modules\\.bin\\tsc.cmd' : 'node_modules/.bin/tsc',
  ['--noEmit', '--pretty', 'false'],
  { cwd: __dirname, encoding: 'utf8' }
);
if (r.stdout) process.stdout.write(r.stdout);
if (r.stderr) process.stderr.write(r.stderr);
process.exit(r.status || 0);
