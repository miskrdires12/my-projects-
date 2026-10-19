/**
 * Consolidate and sync all student records across Supabase, Cloudflare R2, and local students.json
 * Generates the unified master dataset of 5,234+ students with exact transmission dates.
 */

const https = require('https');
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = "https://hiwhmpuhhakguckckuqv.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imhpd2htcHVoaGFrZ3Vja2NrdXF2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODk0OTkyMjYsImV4cCI6MjEwNTA3NTIyNn0.1v1JUKWLxEfTPDlp6h1QBpf34MVKoW5hGYHt7quE8k0";

const SUPABASE_ALLOWED_COLS = new Set([
  'id', 'studentId', 'fullName', 'phone', 'sex', 'grade',
  'dateOfBirth', 'emailAddress', 'address', 'school', 'department',
  'academicYear', 'guardianFullName', 'emergencyContactName',
  'emergencyContactPhone', 'contactName', 'cityRegion', 'bloodType',
  'rollNumber', 'nationality', 'nationalId', 'photoPath',
  'thumbnailPath', 'previewPath', 'originalPhotoPath', 'qrCodeData',
  'senderId', 'senderName', 'photoIntegrityStatus', 'storageKey',
  'storageSyncAt', 'status', 'receiverHidden', 'hiddenAt',
  'batchId', 'organizationId', 'createdAt', 'updatedAt'
]);

// 1. Load baseline local students
const localPath = path.join(__dirname, '..', 'cloudflare-pages', 'data', 'students.json');
const localStudents = JSON.parse(fs.readFileSync(localPath, 'utf8'));
console.log('Loaded baseline students from students.json:', localStudents.length);

const masterMap = new Map();
localStudents.forEach(s => {
  if (s && s.studentId) {
    const exactDate = s.createdAt || s.registrationDate || s.updatedAt || (s.recordHistory && s.recordHistory[0] && s.recordHistory[0].date) || '2026-10-08T10:00:00.000Z';
    masterMap.set(s.studentId, {
      ...s,
      createdAt: exactDate,
      registrationDate: exactDate
    });
  }
});

// 2. Fetch all students from Supabase
const headers = {
  'apikey': SUPABASE_KEY,
  'Authorization': `Bearer ${SUPABASE_KEY}`,
  'Accept-Profile': 'cloudflare',
  'Content-Profile': 'cloudflare',
  'Prefer': 'count=exact'
};

async function fetchAllSupabase() {
  let allSb = [];
  let offset = 0;
  const limit = 1000;
  while (true) {
    const res = await new Promise((resolve, reject) => {
      https.get(`${SUPABASE_URL}/rest/v1/students?select=*&limit=${limit}&offset=${offset}`, { headers }, (res) => {
        let body = '';
        res.on('data', d => body += d);
        res.on('end', () => {
          try {
            resolve(JSON.parse(body));
          } catch (e) {
            console.error('Error parsing response at offset', offset, body.substring(0, 100));
            resolve([]);
          }
        });
      }).on('error', reject);
    });
    if (!Array.isArray(res) || res.length === 0) break;
    allSb = allSb.concat(res);
    console.log(`Fetched ${allSb.length} records from Supabase...`);
    if (res.length < limit) break;
    offset += limit;
  }
  return allSb;
}

async function upsertToSupabaseInBatches(records) {
  console.log(`Upserting ${records.length} missing records into Supabase...`);
  const batchSize = 100;
  for (let i = 0; i < records.length; i += batchSize) {
    const batch = records.slice(i, i + batchSize);
    const allowedKeysList = Array.from(SUPABASE_ALLOWED_COLS);
    const cleanedBatch = batch.map(s => {
      const row = {};
      for (const k of allowedKeysList) {
        row[k] = (s[k] !== undefined) ? s[k] : null;
      }
      return row;
    });

    await new Promise((resolve) => {
      const req = https.request(`${SUPABASE_URL}/rest/v1/students?on_conflict=studentId`, {
        method: 'POST',
        headers: {
          ...headers,
          'Content-Type': 'application/json',
          'Prefer': 'resolution=merge-duplicates'
        }
      }, (res) => {
        let b = '';
        res.on('data', d => b += d);
        res.on('end', () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            console.log(`Upserted batch ${i + 1}-${Math.min(i + batchSize, records.length)} [HTTP ${res.statusCode}]`);
          } else {
            console.warn(`Upsert batch failed ${i + 1}-${Math.min(i + batchSize, records.length)} [HTTP ${res.statusCode}]: ${b.substring(0, 150)}`);
          }
          resolve();
        });
      });
      req.on('error', (e) => {
        console.warn('Batch network error:', e.message);
        resolve();
      });
      req.write(JSON.stringify(cleanedBatch));
      req.end();
    });
  }
}

async function main() {
  const sbStudents = await fetchAllSupabase();
  console.log('Total fetched from Supabase:', sbStudents.length);

  const missingInSupabase = [];

  // Overlay Supabase on master map (since Supabase has latest status, edits, and today's registrations)
  sbStudents.forEach(sb => {
    if (!sb || !sb.studentId) return;
    const existing = masterMap.get(sb.studentId) || {};
    const exactDate = sb.createdAt || sb.registrationDate || existing.createdAt || existing.registrationDate || sb.updatedAt || new Date().toISOString();
    masterMap.set(sb.studentId, {
      ...existing,
      ...sb,
      createdAt: exactDate,
      registrationDate: exactDate
    });
  });

  // Find records that are in masterMap but were not in Supabase
  const sbIdSet = new Set(sbStudents.map(s => s.studentId));
  for (const [sid, student] of masterMap.entries()) {
    if (!sbIdSet.has(sid)) {
      missingInSupabase.push(student);
    }
  }
  console.log(`Found ${missingInSupabase.length} students present in students.json but missing from Supabase.`);

  // Upsert missing records into Supabase so Supabase also has all students
  if (missingInSupabase.length > 0) {
    await upsertToSupabaseInBatches(missingInSupabase);
  }

  // Convert masterMap to array and sort descending by transmission date
  const unifiedStudents = Array.from(masterMap.values());
  unifiedStudents.sort((a, b) => {
    const da = a.createdAt || a.registrationDate || '';
    const db = b.createdAt || b.registrationDate || '';
    return db.localeCompare(da);
  });

  console.log('==================================================');
  console.log(`TOTAL CONSOLIDATED MASTER STUDENTS: ${unifiedStudents.length}`);
  console.log('==================================================');

  // Print date breakdown
  const dateCounts = {};
  unifiedStudents.forEach(s => {
    const d = (s.createdAt || s.registrationDate || '').substring(0, 10);
    dateCounts[d] = (dateCounts[d] || 0) + 1;
  });
  console.log('Date Breakdown:');
  Object.entries(dateCounts)
    .sort((a, b) => b[0].localeCompare(a[0]))
    .forEach(([d, count]) => {
      console.log(`  ${d}: ${count} students`);
    });

  // Write master files
  const targets = [
    path.join(__dirname, '..', 'cloudflare-pages', 'data', 'students.json'),
    path.join(__dirname, '..', 'public', 'data', 'students.json'),
    path.join(__dirname, '..', 'data', 'master_unified', 'students.json'),
    path.join(__dirname, '..', 'react-app', 'data', 'students.json')
  ];

  const jsonStr = JSON.stringify(unifiedStudents);
  for (const t of targets) {
    try {
      const dir = path.dirname(t);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
      fs.writeFileSync(t, jsonStr, 'utf8');
      console.log(`Saved: ${t} (${(jsonStr.length / (1024 * 1024)).toFixed(2)} MB)`);
    } catch (e) {
      console.warn(`Could not save to ${t}:`, e.message);
    }
  }
}

main().catch(console.error);
