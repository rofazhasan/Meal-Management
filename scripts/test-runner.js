import fs from 'fs';
import path from 'path';
import { pathToFileURL } from 'url';

async function runAllTests() {
  console.log('\n======================================================');
  console.log('       MEAL MANAGEMENT SYSTEM - UNIT TEST SUITE       ');
  console.log('======================================================\n');

  const testsDir = path.resolve(process.cwd(), 'tests');
  if (!fs.existsSync(testsDir)) {
    console.error(`Tests directory not found at ${testsDir}`);
    process.exit(1);
  }

  const testFiles = fs.readdirSync(testsDir).filter(f => f.endsWith('.test.js'));
  if (testFiles.length === 0) {
    console.error('No .test.js files found in tests/');
    process.exit(1);
  }

  let totalTests = 0;
  let totalPassed = 0;
  let totalFailed = 0;
  const startTime = Date.now();

  for (const file of testFiles) {
    const filePath = path.join(testsDir, file);
    console.log(`\n▶ Running Suite: [${file}]`);
    console.log('------------------------------------------------------');
    
    try {
      const fileUrl = pathToFileURL(filePath).href;
      const testModule = await import(fileUrl);
      
      if (typeof testModule.runSuite !== 'function') {
        console.warn(`⚠️ Warning: ${file} does not export a runSuite() function.`);
        continue;
      }

      const suiteResult = await testModule.runSuite();
      totalTests += suiteResult.total || 0;
      totalPassed += suiteResult.passed || 0;
      totalFailed += suiteResult.failed || 0;

    } catch (err) {
      console.error(`❌ Fatal Error running suite ${file}:`, err);
      totalFailed++;
      totalTests++;
    }
  }

  const duration = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log('\n======================================================');
  console.log('                    TEST SUMMARY                      ');
  console.log('======================================================');
  console.log(`  Total Suites  : ${testFiles.length}`);
  console.log(`  Total Tests   : ${totalTests}`);
  console.log(`  Passed        : ${totalPassed} ✅`);
  console.log(`  Failed        : ${totalFailed} ${totalFailed > 0 ? '❌' : ''}`);
  console.log(`  Duration      : ${duration}s`);
  console.log('======================================================\n');

  if (totalFailed > 0) {
    console.error('❌ UNIT TESTS FAILED');
    process.exit(1);
  } else {
    console.log('✅ ALL UNIT TESTS PASSED SUCCESSFULLY!');
    process.exit(0);
  }
}

runAllTests().catch((err) => {
  console.error('Test runner encountered an unhandled exception:', err);
  process.exit(1);
});
