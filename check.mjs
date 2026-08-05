import { execSync } from 'child_process';
try {
  execSync('node_modules/.bin/tsc --noEmit --pretty false', { stdio: 'pipe' });
  console.log('TYPE_CHECK_PASSED');
} catch (e) {
  process.stdout.write(e.stdout ?? '');
  process.stderr.write(e.stderr ?? '');
  process.exit(1);
}
