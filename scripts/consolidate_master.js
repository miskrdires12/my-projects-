const fs = require('fs');

const backupDir = 'backups/emergency_audit_2026-10-17T15-11-49-982Z';
const sbStudents = JSON.parse(fs.readFileSync(backupDir + '/supabase_students.json'));
const r2Students = JSON.parse(fs.readFileSync(backupDir + '/r2_live_registry.json'));
const localStudents = JSON.parse(fs.readFileSync('backups/pre_hardening_20261017/students.json'));

const studentMap = new Map();

function normalizeStudent(s) {
  if (!s || !s.studentId) return null;
  return {
    id: s.id || ('cf_' + Math.random().toString(36).substring(2, 10)),
    studentId: String(s.studentId).trim(),
    name: s.name || s.fullName || 'Unknown Student',
    gender: s.gender || 'Not specified',
    schoolName: s.schoolName || s.school || 'Unassigned School',
    department: s.department || 'General',
    branch: s.branch || 'Addis Ababa',
    photoUrl: s.photoUrl || '',
    phone: s.phone || '',
    createdBy: s.createdBy || 'SYSTEM',
    deviceSignature: s.deviceSignature || '',
    createdAt: s.createdAt || new Date().toISOString(),
    updatedAt: s.updatedAt || new Date().toISOString()
  };
}

localStudents.forEach(s => {
  const norm = normalizeStudent(s);
  if (norm) studentMap.set(norm.studentId, norm);
});

r2Students.forEach(s => {
  const norm = normalizeStudent(s);
  if (norm) {
    const existing = studentMap.get(norm.studentId) || {};
    studentMap.set(norm.studentId, { ...existing, ...norm });
  }
});

sbStudents.forEach(s => {
  const norm = normalizeStudent(s);
  if (norm) {
    const existing = studentMap.get(norm.studentId) || {};
    studentMap.set(norm.studentId, { ...existing, ...norm });
  }
});

const mergedStudents = Array.from(studentMap.values());
console.log('Total unified merged students:', mergedStudents.length);

// Merge users
const sbUsers = JSON.parse(fs.readFileSync(backupDir + '/supabase_users.json'));
const r2Users = JSON.parse(fs.readFileSync(backupDir + '/r2_provisioned_users.json'));
const localUsers = JSON.parse(fs.readFileSync('backups/pre_hardening_20261017/users.json'));

const userMap = new Map();
function normalizeUser(u) {
  if (!u || (!u.username && !u.email)) return null;
  const username = (u.username || u.email.split('@')[0]).trim();
  const email = (u.email || (username + '@gmail.com')).trim().toLowerCase();
  return {
    id: u.id || ('usr_' + Math.random().toString(36).substring(2, 10)),
    username: username,
    email: email,
    role: u.role || 'SENDER',
    password: u.password || u.passwordHash || 'pbkdf2_sha256$260000$default',
    branch: u.branch || 'Addis Ababa',
    lockedDeviceId: u.lockedDeviceId || u.boundDevice || null,
    totalRecordsProcessed: u.totalRecordsProcessed || u.recordsProcessed || 0,
    recordsProcessedToday: 0,
    lastActiveAt: u.lastActiveAt || new Date().toISOString(),
    createdAt: u.createdAt || new Date().toISOString(),
    updatedAt: u.updatedAt || new Date().toISOString()
  };
}

localUsers.forEach(u => {
  const norm = normalizeUser(u);
  if (norm) userMap.set(norm.email, norm);
});

r2Users.forEach(u => {
  const norm = normalizeUser(u);
  if (norm) {
    const existing = userMap.get(norm.email) || {};
    userMap.set(norm.email, { ...existing, ...norm });
  }
});

sbUsers.forEach(u => {
  const norm = normalizeUser(u);
  if (norm) {
    const existing = userMap.get(norm.email) || {};
    userMap.set(norm.email, { ...existing, ...norm });
  }
});

const mergedUsers = Array.from(userMap.values());
console.log('Total unified merged users:', mergedUsers.length);

fs.mkdirSync('data/master_unified', { recursive: true });
fs.writeFileSync('data/master_unified/students.json', JSON.stringify(mergedStudents, null, 2));
fs.writeFileSync('data/master_unified/users.json', JSON.stringify(mergedUsers, null, 2));

fs.mkdirSync('cloudflare-pages/data', { recursive: true });
fs.writeFileSync('cloudflare-pages/data/students.json', JSON.stringify(mergedStudents));
fs.writeFileSync('cloudflare-pages/data/users.json', JSON.stringify(mergedUsers));
console.log('Successfully wrote unified datasets to data/master_unified and cloudflare-pages/data');
