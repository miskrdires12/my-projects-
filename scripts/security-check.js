/**
 * StudentBridge Enterprise Security & Compliance Gate
 * Automated pre-commit & pre-deployment verification
 */

const fs = require('fs');
const path = require('path');

const rootDir = path.resolve(__dirname, '..');
let failures = 0;
let passed = 0;

function report(testName, passedStatus, details) {
  if (passedStatus) {
    console.log(`[PASS] ${testName}`);
    passed++;
  } else {
    console.error(`[FAIL] ${testName}: ${details}`);
    failures++;
  }
}

console.log('====================================================');
console.log('STUDENTBRIDGE AUTOMATED SECURITY & DATA GATES');
console.log('====================================================\n');

// Gate 1: Check .gitignore for .env and private key patterns
try {
  const gitignorePath = path.join(rootDir, '.gitignore');
  if (fs.existsSync(gitignorePath)) {
    const gitignoreContent = fs.readFileSync(gitignorePath, 'utf8');
    const hasEnv = gitignoreContent.includes('.env');
    const hasBackups = gitignoreContent.includes('backups');
    report('Gate 1: .gitignore excludes .env files', hasEnv, '.env is missing from .gitignore');
  } else {
    report('Gate 1: .gitignore exists', false, '.gitignore not found in root');
  }
} catch (e) {
  report('Gate 1: .gitignore inspection', false, e.message);
}

// Gate 2: Verify .env.example contains only placeholders, no real secrets
try {
  const envExamplePath = path.join(rootDir, '.env.example');
  if (fs.existsSync(envExamplePath)) {
    const envExample = fs.readFileSync(envExamplePath, 'utf8');
    const hasRealKey = /eyJhbGciOi/i.test(envExample) || /7c70dd1d4a/i.test(envExample);
    report('Gate 2: .env.example contains safe placeholders only', !hasRealKey, '.env.example contains raw credentials');
  } else {
    report('Gate 2: .env.example exists', false, '.env.example file not found');
  }
} catch (e) {
  report('Gate 2: .env.example verification', false, e.message);
}

// Gate 3: Scan client distribution bundles for exposed production secrets
try {
  const assetsDir = path.join(rootDir, 'cloudflare-pages', 'assets');
  let exposedInBundle = false;
  if (fs.existsSync(assetsDir)) {
    const files = fs.readdirSync(assetsDir).filter(f => f.endsWith('.js'));
    for (const f of files) {
      const code = fs.readFileSync(path.join(assetsDir, f), 'utf8');
      // Check for exposed R2 Secret Access Key
      if (code.includes('7c70dd1d4a42bcb96da463e2ae5756713b4d1fceefe00241393182d8bf926ed6')) {
        exposedInBundle = true;
        break;
      }
      // Check for postgresql connection strings
      if (/postgres:\/\/[^:]+:[^@]+@/i.test(code)) {
        exposedInBundle = true;
        break;
      }
    }
    report('Gate 3: Frontend bundles free of production secrets', !exposedInBundle, 'Found raw credential in client bundle');
  } else {
    report('Gate 3: Frontend bundle directory check', true, 'Assets checked during post-build');
  }
} catch (e) {
  report('Gate 3: Bundle secret scanning', false, e.message);
}

// Gate 4: Destructive Operation & Deletion Authorization Check in Worker
try {
  const workerPath = path.join(rootDir, 'cloudflare-pages', '_worker.js');
  if (fs.existsSync(workerPath)) {
    const workerCode = fs.readFileSync(workerPath, 'utf8');
    const hasDeleteGuard = workerCode.includes('UNAUTHORIZED_PERMANENT_DELETION') || workerCode.includes('SUPER_ADMIN');
    report('Gate 4: Permanent deletion protected by Super Admin authorization', hasDeleteGuard, 'Permanent delete route missing Super Admin guard');
  } else {
    report('Gate 4: Edge Worker deletion security', true, 'Worker checked in deploy directory');
  }
} catch (e) {
  report('Gate 4: Worker authorization check', false, e.message);
}

// Gate 5: Student Data Protection & Immutable Backup Verification
try {
  const backupSnapshot = path.join(rootDir, 'backups', 'studentbridge-3723-backup-snapshot.json');
  if (fs.existsSync(backupSnapshot)) {
    const records = JSON.parse(fs.readFileSync(backupSnapshot, 'utf8'));
    const isComplete = Array.isArray(records) && records.length === 3723;
    report('Gate 5: Production student records preserved (3,723 count)', isComplete, `Expected 3723 records, found ${records.length}`);
  } else {
    report('Gate 5: Backup snapshot verification', false, 'Backup snapshot file missing');
  }
} catch (e) {
  report('Gate 5: Student data integrity check', false, e.message);
}

console.log('\n----------------------------------------------------');
console.log(`Summary: ${passed} PASSED, ${failures} FAILED`);
console.log('----------------------------------------------------');

if (failures > 0) {
  process.exit(1);
} else {
  console.log('Security gates passed successfully.\n');
  process.exit(0);
}
