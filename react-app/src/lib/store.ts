import { Student, User, Task, School, AuditLog, StudentCoreRequest, MistakeItem, UserRole, CardTemplate, PrintJob } from '@/types';
import { publishStudentSync, subscribeToStudentSync, getPhotoUrl, getPhotoEncodeClass } from './syncEngine';

export { getPhotoUrl, getPhotoEncodeClass, publishStudentSync, subscribeToStudentSync };

// Branch to School Mapping
export const BRANCH_SCHOOL_MAP: Record<string, string[]> = {
  'Addis Ababa': [
    'YMS 1', 'YMS 2', 'YMS 3', 'YMS 4',
    'School of America 1', 'School of America 2', 'School of America 3', 'School of America 4',
    'Adika Youth', 'Warka', 'Ferway', 'Sena Yerosen',
    'YMS', 'School of America'
  ],
  'Adama': ['Yacine', 'Debebech'],
  'Mojo': ['Mojo'],
  'Harar': [
    'High Tech 1', 'High Tech 2', 'High Tech 3', 'High Tech 4',
    'High Tech'
  ]
};

export const DEFAULT_BRANCHES = Object.keys(BRANCH_SCHOOL_MAP);

// Initial fallback schools strictly mapped to authorized branches
const DEFAULT_SCHOOLS: School[] = [
  { id: "sch_yms1", name: "YMS 1", location: "Addis Ababa", status: "Active", studentsCount: 420 },
  { id: "sch_yms2", name: "YMS 2", location: "Addis Ababa", status: "Active", studentsCount: 380 },
  { id: "sch_yms3", name: "YMS 3", location: "Addis Ababa", status: "Active", studentsCount: 310 },
  { id: "sch_yms4", name: "YMS 4", location: "Addis Ababa", status: "Active", studentsCount: 285 },
  { id: "sch_yms", name: "YMS", location: "Addis Ababa", status: "Active", studentsCount: 1245 },
  { id: "sch_soa1", name: "School of America 1", location: "Addis Ababa", status: "Active", studentsCount: 260 },
  { id: "sch_soa2", name: "School of America 2", location: "Addis Ababa", status: "Active", studentsCount: 240 },
  { id: "sch_soa3", name: "School of America 3", location: "Addis Ababa", status: "Active", studentsCount: 220 },
  { id: "sch_soa4", name: "School of America 4", location: "Addis Ababa", status: "Active", studentsCount: 190 },
  { id: "sch_soa", name: "School of America", location: "Addis Ababa", status: "Active", studentsCount: 756 },
  { id: "sch_adika", name: "Adika Youth", location: "Addis Ababa", status: "Active", studentsCount: 982 },
  { id: "sch_warka", name: "Warka", location: "Addis Ababa", status: "Active", studentsCount: 398 },
  { id: "sch_ferway", name: "Ferway", location: "Addis Ababa", status: "Active", studentsCount: 542 },
  { id: "sch_senayerosen", name: "Sena Yerosen", location: "Addis Ababa", status: "Active", studentsCount: 940 },
  { id: "sch_yacine", name: "Yacine", location: "Adama", status: "Active", studentsCount: 420 },
  { id: "sch_debebech", name: "Debebech", location: "Adama", status: "Active", studentsCount: 510 },
  { id: "sch_mojo", name: "Mojo", location: "Mojo", status: "Active", studentsCount: 360 },
  { id: "sch_hightech1", name: "High Tech 1", location: "Harar", status: "Active", studentsCount: 120 },
  { id: "sch_hightech2", name: "High Tech 2", location: "Harar", status: "Active", studentsCount: 110 },
  { id: "sch_hightech3", name: "High Tech 3", location: "Harar", status: "Active", studentsCount: 95 },
  { id: "sch_hightech4", name: "High Tech 4", location: "Harar", status: "Active", studentsCount: 85 },
  { id: "sch_hightech", name: "High Tech", location: "Harar", status: "Active", studentsCount: 380 }
];

export interface OperatorAccount extends User {
  password?: string;
}

// Authoritative 19 field accounts loaded from users.json + test aliases (Universal password: 12345678)
export const PRESET_OPERATORS: OperatorAccount[] = [
  {
    id: "cmu7b6rkh00002ggkkxg5ecd9",
    username: "miskrdires11",
    email: "miskrdires11@gmail.com",
    role: "SUPER_ADMIN",
    password: "sukuna24th",
    boundDeviceId: null,
    recordsEncoded: 709,
  },
  {
    id: "cmuvl71ji0000941kfotbx6om",
    username: "mebratadony",
    email: "mebratadony@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmumblpy10009g2k6j9rh5ffg",
    username: "yohannes",
    email: "yohannes@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 351,
  },
  {
    id: "cmuc9t7id0000101wsibwr8vi",
    username: "etsubmolla",
    email: "etsubmolla@gmail.com",
    role: "SENDER",
    password: "211219",
    boundDeviceId: null,
    recordsSentSingle: 638,
  },
  {
    id: "usr_etsubmola_alias",
    username: "etsubmola",
    email: "etsubmola@gmail.com",
    role: "SENDER",
    password: "211219",
    boundDeviceId: null,
    recordsSentSingle: 0,
  },
  {
    id: "cmuwb9gsb00002v1ky9k7bede",
    username: "adoni",
    email: "adoni@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 379,
  },
  {
    id: "cmuwbah7r00032v1ksdelhqag",
    username: "biruk",
    email: "biruk@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 267,
  },
  {
    id: "cmumbjn480003g2k6ycd2mzp3",
    username: "zemichael",
    email: "zemichael@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 483,
  },
  {
    id: "cmumd6g4y00043vo7wf1afj62",
    username: "abeni1",
    email: "abeni1@gmail.com",
    role: "SUPER_ADMIN",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 471,
  },
  {
    id: "cmumbid6b0000g2k6tub66ug0",
    username: "nebiyu",
    email: "nebiyu@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 61,
  },
  {
    id: "cmu80ooz8000611r3aum80oax",
    username: "yonatantesfa369",
    email: "yonatantesfa369@gmail.com",
    role: "RECEIVER",
    password: "12345678",
    boundDeviceId: null,
    recordsEncoded: 0,
  },
  {
    id: "cmudsq01z000b42rcrdlefo0y",
    username: "beki",
    email: "beki@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 3,
  },
  {
    id: "cmudqu6ue0004rrcc4ktw46n1",
    username: "colldwater340",
    email: "colldwater340@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 118,
  },
  {
    id: "cmumbkjf60006g2k6lvl8gba9",
    username: "simon",
    email: "simon@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 165,
  },
  {
    id: "cmuasu1mo0000dxwgl8i69x3j",
    username: "danaytesayas4",
    email: "danaytesayas4@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 2,
  },
  {
    id: "cmuq26kz90001q5dgcb3lu519",
    username: "miskrdires1",
    email: "miskrdires1@gmail.com",
    role: "ADMIN",
    password: "12345678",
    boundDeviceId: null,
  },
  {
    id: "cmukweowr00009pzsimqcm168",
    username: "yonatantesfa",
    email: "yonatantesfa@gmail.com",
    role: "RECEIVER",
    password: "12345678",
    boundDeviceId: null,
    recordsEncoded: 335,
  },
  {
    id: "cmua5dk5n00041tc43u1v7em9",
    username: "miskrdires12",
    email: "miskrdires12@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    recordsSentSingle: 677,
  },
  {
    id: "cmuxuut8t001s90y8x5t88jqt",
    username: "abeni",
    email: "abeni@gmail.com",
    role: "ADMIN",
    password: "12345678",
    boundDeviceId: null,
  },
  {
    id: "cmukwfk8v00039pzscdi4h0t9",
    username: "yonatan",
    email: "yonatan@gmail.com",
    role: "RECEIVER",
    password: "12345678",
    boundDeviceId: null,
    recordsEncoded: 7061,
  },
  {
    id: "usr_biruk1",
    username: "biruk1",
    email: "biruk1@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    school: "Sena Yerosen",
    recordsSentSingle: 0,
    recordsEncoded: 0,
    workSessionCount: 0,
  },
  {
    id: "usr_siliconlabstech",
    username: "siliconlabstech",
    email: "siliconlabstech@gmail.com",
    role: "SENDER",
    password: "12345678",
    boundDeviceId: null,
    school: "Sena Yerosen",
    recordsSentSingle: 0,
    recordsEncoded: 0,
    workSessionCount: 0,
  },
];

// Strict QR token payload format required by user:
// {"id":"SB-2026-50216","name":"Betelhem Tesfaye","roll":"","grade":"12D"}
export function generateStudentQrToken(student: Partial<Student>): string {
  return JSON.stringify({
    id: student.studentId || '',
    name: student.fullName || '',
    roll: student.rollNumber || '',
    grade: student.grade || ''
  });
}

// Generates the standard photo filename for a student
export function getStudentPhotoFileName(student: Partial<Student>): string {
  if (student.photoPath) {
    try {
      const cleanPath = student.photoPath.split('?')[0];
      const rawName = cleanPath.split('/').pop() || '';
      const decoded = decodeURIComponent(rawName);
      if (decoded && (decoded.toLowerCase().endsWith('.jpg') || decoded.toLowerCase().endsWith('.png') || decoded.toLowerCase().endsWith('.jpeg'))) {
        return decoded;
      }
    } catch {}
  }
  const safeName = (student.fullName || 'student').trim().replace(/[\/\\:*?"<>|]/g, '_');
  return `${student.studentId || 'STUDENT'}_${safeName}.jpg`;
}

// Generates the standard QR filename for a student
export function getStudentQrFileName(student: Partial<Student>): string {
  return `${student.studentId || 'STUDENT'}_qr.png`;
}

let memoryStudents: Student[] = [];
let memoryUsers: (User & { password?: string })[] = (() => {
  let deletedList: string[] = [];
  try {
    if (typeof localStorage !== 'undefined') {
      deletedList = JSON.parse(localStorage.getItem('sb_deleted_users') || '[]');
    }
  } catch (e) {}
  const isDeleted = (u: any) => {
    const uid = (u.id || '').toLowerCase();
    const em = (u.email || '').toLowerCase();
    const un = (u.username || '').toLowerCase();
    return deletedList.includes(uid) || deletedList.includes(em) || deletedList.includes(un);
  };

  const users: (User & { password?: string })[] = PRESET_OPERATORS
    .filter(u => !isDeleted(u) && !u.email.endsWith('@studentbridge.internal') && !u.id.startsWith('usr-admin-institutional') && !u.id.startsWith('usr-receiver-institutional') && !u.id.startsWith('usr-sender-institutional'))
    .map(u => ({ ...u, password: '12345678' }));
  try {
    if (typeof localStorage !== 'undefined') {
      const savedCustom = localStorage.getItem('sb_custom_users');
      if (savedCustom) {
        const customParsed = JSON.parse(savedCustom);
        if (Array.isArray(customParsed)) {
          const filteredCustom = customParsed.filter((cu: any) =>
            cu &&
            cu.email &&
            !isDeleted(cu) &&
            !cu.email.toLowerCase().endsWith('@studentbridge.internal') &&
            cu.id !== 'usr-admin-institutional' &&
            cu.id !== 'usr-receiver-institutional' &&
            cu.id !== 'usr-sender-institutional'
          );
          localStorage.setItem('sb_custom_users', JSON.stringify(filteredCustom));
          const existingIds = new Set(users.map(u => u.id));
          const existingEmails = new Set(users.map(u => u.email.toLowerCase()));
          filteredCustom.forEach((cu: any) => {
            if (!existingIds.has(cu.id) && !existingEmails.has(cu.email.toLowerCase())) {
              users.unshift({
                ...cu,
                password: cu.password || '12345678'
              });
            }
          });
        }
      }

      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      users.forEach(u => {
        const storedLock = locksMap[u.id] || (u.email && locksMap[u.email.toLowerCase()]) || (u.username && locksMap[u.username.toLowerCase()]);
        if (storedLock !== undefined) {
          u.boundDeviceId = storedLock;
        }
      });
    }
  } catch (e) {
    console.error('Error loading custom users from localStorage:', e);
  }

  // Strict role enforcement per authoritative specifications:
  // miskrdires11@gmail.com and abeni1@gmail.com are SUPER_ADMIN, senders include beki, biruk1, siliconlabstech, etc.
  users.forEach(u => {
    const em = (u.email || '').toLowerCase().trim();
    if (em === 'miskrdires11@gmail.com' || em === 'abeni1@gmail.com') {
      u.role = 'SUPER_ADMIN';
    } else if ([
      'mebratadony@gmail.com', 'yohannes@gmail.com', 'etsubmolla@gmail.com', 'etsubmola@gmail.com',
      'adoni@gmail.com', 'biruk@gmail.com', 'zemichael@gmail.com',
      'nebiyu@gmail.com', 'beki@gmail.com', 'colldwater340@gmail.com',
      'simon@gmail.com', 'danaytesayas4@gmail.com', 'miskrdires12@gmail.com',
      'biruk1@gmail.com', 'siliconlabstech@gmail.com'
    ].includes(em)) {
      u.role = 'SENDER';
    }
  });

  return users;
})();
let memorySchools: School[] = DEFAULT_SCHOOLS;
const DEFAULT_TASKS: Task[] = [
  {
    id: 'TSK-1001',
    title: 'Audit Grade 9 Biometric Portrait Alignment (3:4 ratio)',
    assignedTo: 'mebratadony',
    school: 'YMS',
    priority: 'High',
    deadline: '2026-10-18',
    status: 'In Progress'
  },
  {
    id: 'TSK-1002',
    title: 'Standardize Parent Emergency Contact Codes (+251 format)',
    assignedTo: 'yohannes',
    school: 'Adika Youth',
    priority: 'Medium',
    deadline: '2026-10-20',
    status: 'Pending'
  },
  {
    id: 'TSK-1003',
    title: 'Batch Hologram Verification for Senior Cards',
    assignedTo: 'etsubmolla',
    school: 'School of America',
    priority: 'High',
    deadline: '2026-10-16',
    status: 'Completed'
  },
  {
    id: 'TSK-1004',
    title: 'Biometric Station Queue Clearance & Sync Review',
    assignedTo: 'biruk',
    school: 'Warka',
    priority: 'Low',
    deadline: '2026-10-22',
    status: 'Pending'
  }
];

let memoryTasks: Task[] = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sb_admin_tasks') : null;
    return saved && JSON.parse(saved).length > 0 ? JSON.parse(saved) : DEFAULT_TASKS;
  } catch (e) {
    return DEFAULT_TASKS;
  }
})();
let memoryAuditLogs: AuditLog[] = [];

/**
 * Handles incoming real-time sync events from other browser tabs or remote field terminals.
 */
function upsertStudentFromSync(incoming: Student): void {
  if (!incoming || !incoming.studentId) return;

  const existingIdx = memoryStudents.findIndex(s => s.studentId === incoming.studentId || s.id === incoming.id);
  if (existingIdx !== -1) {
    memoryStudents[existingIdx] = { ...memoryStudents[existingIdx], ...incoming };
  } else {
    memoryStudents.unshift(incoming);
  }

  try {
    const existing: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
    const cIdx = existing.findIndex((s: Student) => s.studentId === incoming.studentId || s.id === incoming.id);
    if (cIdx !== -1) {
      existing[cIdx] = incoming;
    } else {
      existing.unshift(incoming);
    }
    localStorage.setItem('sb_custom_students', JSON.stringify(existing));
  } catch (e) {}

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange', { detail: incoming }));
  }
}

export async function initStore(): Promise<void> {
  // 1. Fetch live student records from server / Supabase PostgreSQL (All 3,723+ Records)
  try {
    const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
    const timeoutId = controller ? setTimeout(() => controller.abort(), 6000) : null;
    const res = await fetch('/api/students?all=true&limit=5000', {
      signal: controller ? controller.signal : undefined
    });
    if (timeoutId) clearTimeout(timeoutId);
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.students) && data.students.length > 0) {
        memoryStudents = data.students;
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
        }
      }
    }
  } catch (apiErr) {
    console.warn('Live API fetch failed, falling back to local dataset:', apiErr);
  }

  // 2. Fallback to /data/students.json if memoryStudents is still empty
  if (memoryStudents.length === 0) {
    try {
      const res = await fetch('/data/students.json');
      if (res.ok) {
        memoryStudents = await res.json();
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
        }
      }
    } catch (e) {
      console.warn('Could not load /data/students.json', e);
    }
  }

  // 3. Fetch live users from server / Supabase PostgreSQL
  try {
    const res = await fetch('/api/users');
    if (res.ok) {
      const loadedUsers: User[] = await res.json();
      if (Array.isArray(loadedUsers) && loadedUsers.length > 0) {
        let locksMap: Record<string, string> = {};
        try {
          locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
        } catch (e) {}

        loadedUsers.forEach(u => {
          const existing = memoryUsers.find(mu =>
            (mu.email && u.email && mu.email.toLowerCase() === u.email.toLowerCase()) ||
            mu.id === u.id ||
            (mu.username && u.username && mu.username.toLowerCase() === u.username.toLowerCase())
          );
          if (existing) {
            existing.boundDeviceId = u.boundDeviceId || null;
            if (u.boundDeviceId) {
              locksMap[existing.id] = u.boundDeviceId;
              if (existing.email) locksMap[existing.email.toLowerCase()] = u.boundDeviceId;
              if (existing.username) locksMap[existing.username.toLowerCase()] = u.boundDeviceId;
            } else {
              delete locksMap[existing.id];
              if (existing.email) delete locksMap[existing.email.toLowerCase()];
              if (existing.username) delete locksMap[existing.username.toLowerCase()];
            }
          } else {
            memoryUsers.push(u);
            if (u.boundDeviceId) {
              locksMap[u.id] = u.boundDeviceId;
              if (u.email) locksMap[u.email.toLowerCase()] = u.boundDeviceId;
              if (u.username) locksMap[u.username.toLowerCase()] = u.boundDeviceId;
            }
          }
        });

        try {
          localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
        } catch (e) {}
      }
    }
  } catch (e) {
    console.warn('Could not load /api/users', e);
  }

  // 4. Merge custom students from localStorage if any
  try {
    const custom = localStorage.getItem('sb_custom_students');
    if (custom) {
      const parsed = JSON.parse(custom);
      if (Array.isArray(parsed)) {
        // Merge without duplicates
        const existingIds = new Set(memoryStudents.map(s => s.studentId));
        parsed.forEach((s: Student) => {
          if (!existingIds.has(s.studentId)) {
            memoryStudents.unshift(s);
          }
        });
      }
    }
  } catch (e) {}

  // 5. Sync bound devices from localStorage if previously updated
  try {
    const savedLocks = localStorage.getItem('sb_device_locks');
    if (savedLocks) {
      const locksMap: Record<string, string | null> = JSON.parse(savedLocks);
      memoryUsers.forEach(u => {
        if (locksMap[u.id] !== undefined) {
          u.boundDeviceId = locksMap[u.id];
        }
      });
    }
  } catch (e) {}

  // 6. Connect Real-Time Dual-Channel Sync Bus (BroadcastChannel + ntfy Cloud SSE)
  if (typeof window !== 'undefined') {
    subscribeToStudentSync(
      (syncedStudent) => {
        upsertStudentFromSync(syncedStudent);
      },
      (deletedId) => {
        memoryStudents = memoryStudents.filter(s => s.studentId !== deletedId && s.id !== deletedId);
        window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
      }
    );

    import('@/lib/offlineQueue').then(({ syncOfflineQueue }) => {
      syncOfflineQueue().catch(() => {});
    });
  }
}

export function normalizeStudentData(s: Student): Student {
  if (!s) return s;
  const d = (s.createdAt || (s as any).registrationDate || (s as any).date || '').substring(0, 10);
  let school = s.school;
  let bloodType = s.bloodType;
  if (d >= '2026-10-14') {
    if ((school || '').toLowerCase() === 'yms') {
      school = 'YMS 1';
    }
    if (bloodType === 'O+') {
      bloodType = 'Unknown';
    }
  }
  return { ...s, school, bloodType };
}

export function getStudents(): Student[] {
  return memoryStudents.map(normalizeStudentData);
}

export function addStudent(newStudent: Student): void {
  // Ensure default and encoded fields
  if (!newStudent.status) newStudent.status = 'Accepted';
  if (!newStudent.location) newStudent.location = 'Addis Ababa';
  if (!newStudent.idProductionStatus) newStudent.idProductionStatus = 'READY';
  if (!newStudent.photoIntegrityStatus) {
    newStudent.photoIntegrityStatus = (newStudent.photoPath || newStudent.previewPath || newStudent.thumbnailPath) ? 'PHOTO_VERIFIED' : 'NO_PHOTO';
  }
  // QR Code payload token strictly adheres to required format: {"id":"...","name":"...","roll":"","grade":"..."}
  newStudent.qrCodeData = generateStudentQrToken(newStudent);
  if (!newStudent.recordHistory || newStudent.recordHistory.length === 0) {
    newStudent.recordHistory = [
      {
        date: new Date().toISOString().replace('T', ' ').substring(0, 16),
        action: 'Initial Submission',
        user: getCurrentUser()?.username || 'Field Operator',
        role: 'Sender',
        notes: 'Initial student identity registration and biometric capture'
      }
    ];
  }

  const existingIdx = memoryStudents.findIndex(s => s.studentId === newStudent.studentId || s.id === newStudent.id);
  if (existingIdx !== -1) {
    memoryStudents[existingIdx] = { ...memoryStudents[existingIdx], ...newStudent };
  } else {
    memoryStudents.unshift(newStudent);
  }

  if (newStudent.senderName) {
    const sUser = memoryUsers.find(
      u => u.username.toLowerCase() === newStudent.senderName?.toLowerCase()
    );
    if (sUser) {
      sUser.recordsSentSingle = (sUser.recordsSentSingle || 0) + 1;
    }
  }

  try {
    const existing: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
    const cIdx = existing.findIndex((s: Student) => s.studentId === newStudent.studentId || s.id === newStudent.id);
    if (cIdx !== -1) {
      existing[cIdx] = newStudent;
    } else {
      existing.unshift(newStudent);
    }
    localStorage.setItem('sb_custom_students', JSON.stringify(existing));
  } catch (e) {}

  addAuditLog({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: getCurrentUser()?.username || 'Field Operator',
    station: 'Sender',
    action: 'Student Registration',
    entity: newStudent.studentId,
    details: `Registered ${newStudent.fullName} for ${newStudent.school || 'YMS'}`
  });

  // Broadcast across all open tabs, windows, and cloud remote receivers
  publishStudentSync('UPSERT', newStudent);
}

export function updateStudent(id: string, updates: Partial<Student>): void {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    const existing = memoryStudents[index];
    const history = existing.recordHistory || [];
    history.unshift({
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'Data Correction',
      user: getCurrentUser()?.username || 'Receiver Analyst',
      role: getCurrentUser()?.role || 'Receiver',
      notes: updates.grade ? `Updated grade to ${updates.grade}` : 'Updated student record fields'
    });

    memoryStudents[index] = {
      ...existing,
      ...updates,
      recordHistory: history,
      updatedAt: new Date().toISOString()
    };

    // Update in localStorage as well
    try {
      const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
      const cIdx = custom.findIndex(s => s.id === id || s.studentId === id);
      if (cIdx !== -1) {
        custom[cIdx] = memoryStudents[index];
        localStorage.setItem('sb_custom_students', JSON.stringify(custom));
      }
    } catch (e) {}

    // Persist update to Supabase PostgreSQL in background
    fetch('/api/students', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        id: memoryStudents[index].id,
        studentId: memoryStudents[index].studentId,
        ...updates
      })
    }).catch(err => {
      console.warn('Could not sync update to server, queued offline:', err);
      import('@/lib/offlineQueue').then(({ queueOfflineOperation }) => {
        queueOfflineOperation('UPDATE_STUDENT', { id: memoryStudents[index].id, ...updates });
      });
    });

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Updated',
      entity: memoryStudents[index].studentId,
      details: `Updated record for ${memoryStudents[index].fullName}`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }

    // Broadcast across all connected stations and open tabs in real-time
    publishStudentSync('UPSERT', memoryStudents[index]);
  }
}

export async function deleteStudent(id: string, permanent: boolean = false): Promise<boolean> {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  const student = index !== -1 ? memoryStudents[index] : null;
  const targetId = student?.studentId || id;
  const targetDbId = student?.id || id;

  if (permanent) {
    // 1. PERMANENT PURGE: Remove completely from memory and local storage
    if (index !== -1) {
      memoryStudents.splice(index, 1);
    } else {
      memoryStudents = memoryStudents.filter(s => s.id !== id && s.studentId !== id);
    }
    try {
      const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
      const filtered = custom.filter(s => s.id !== targetDbId && s.studentId !== targetId && s.id !== id && s.studentId !== id);
      localStorage.setItem('sb_custom_students', JSON.stringify(filtered));
    } catch (e) {}

    // Persist permanent purge to Cloudflare (R2 photo deletion & Supabase PostgreSQL delete)
    try {
      const curUser = getCurrentUser();
      const res = await fetch(`/api/students?id=${encodeURIComponent(targetId)}&permanent=true`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'X-Station-Role': curUser?.role || 'SUPER_ADMIN'
        }
      });
      if (!res.ok) {
        console.warn('Server delete response status:', res.status);
      }
    } catch (err) {
      console.warn('Could not sync permanent delete to server, queued offline:', err);
      try {
        const { queueOfflineOperation } = await import('@/lib/offlineQueue');
        queueOfflineOperation('DELETE_STUDENT', { id: targetDbId, studentId: targetId, permanent: true });
      } catch (qErr) {}
    }

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Permanently Deleted',
      entity: targetId,
      details: `Purged record & Cloudflare R2 portrait for ${student?.fullName || targetId}`
    });

    publishStudentSync('DELETE', targetId);

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
    return true;
  } else {
    // 2. TEMPORARY DELETE (Soft Delete: Hide only from station system view, preserve data in Cloudflare)
    if (student) {
      student.receiverHidden = true;
      student.hiddenAt = new Date().toISOString();
    }

    try {
      const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
      const cIdx = custom.findIndex(s => s.id === targetDbId || s.studentId === targetId || s.id === id || s.studentId === id);
      if (cIdx !== -1) {
        custom[cIdx].receiverHidden = true;
        custom[cIdx].hiddenAt = new Date().toISOString();
        localStorage.setItem('sb_custom_students', JSON.stringify(custom));
      }
    } catch (e) {}

    // Sync soft delete to server
    try {
      const res = await fetch(`/api/students?id=${encodeURIComponent(targetId)}&permanent=false`, {
        method: 'DELETE'
      });
      if (!res.ok) {
        console.warn('Server temporary delete status:', res.status);
      }
    } catch (err) {
      console.warn('Could not sync soft delete to server:', err);
    }

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Hidden from System',
      entity: targetId,
      details: `Temporarily hidden from station directory: ${student?.fullName || targetId}`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
    return true;
  }
}

export async function restoreStudent(id: string): Promise<boolean> {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  const student = index !== -1 ? memoryStudents[index] : null;
  const targetId = student?.studentId || id;
  const targetDbId = student?.id || id;

  if (student) {
    student.receiverHidden = false;
    student.hiddenAt = null as any;
  }

  try {
    const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
    const cIdx = custom.findIndex(s => s.id === targetDbId || s.studentId === targetId || s.id === id || s.studentId === id);
    if (cIdx !== -1) {
      custom[cIdx].receiverHidden = false;
      custom[cIdx].hiddenAt = null as any;
      localStorage.setItem('sb_custom_students', JSON.stringify(custom));
    }
  } catch (e) {}

  try {
    const res = await fetch(`/api/students?id=${encodeURIComponent(targetId)}&action=restore`, {
      method: 'DELETE'
    });
    if (!res.ok) {
      console.warn('Server restore status:', res.status);
    }
  } catch (err) {
    console.warn('Could not sync restore to server:', err);
  }

  addAuditLog({
    timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
    user: getCurrentUser()?.username || 'Receiver',
    station: 'Receiver',
    action: 'Student Restored',
    entity: targetId,
    details: `Restored to active directory: ${student?.fullName || targetId}`
  });

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }
  return true;
}

export function getUsers(): User[] {
  return memoryUsers;
}

export function addUser(newUser: User & { password?: string; branch?: string; school?: string }): void {
  if (!newUser.password) newUser.password = '12345678';
  if (!newUser.createdAt) newUser.createdAt = new Date().toISOString();
  if (newUser.recordsSentSingle === undefined) newUser.recordsSentSingle = 0;
  if (newUser.recordsEncoded === undefined) newUser.recordsEncoded = 0;
  if (newUser.workSessionCount === undefined) newUser.workSessionCount = 0;

  const emailLower = (newUser.email || '').toLowerCase().trim();
  const usernameLower = (newUser.username || '').toLowerCase().trim();

  const existingIdx = memoryUsers.findIndex(
    u => u.id === newUser.id ||
         (emailLower && u.email.toLowerCase() === emailLower) ||
         (usernameLower && u.username.toLowerCase() === usernameLower)
  );

  if (existingIdx !== -1) {
    memoryUsers[existingIdx] = { ...memoryUsers[existingIdx], ...newUser };
  } else {
    memoryUsers.unshift(newUser);
  }

  // Remove from sb_deleted_users if user is re-provisioned/added
  try {
    const deletedList: string[] = JSON.parse(localStorage.getItem('sb_deleted_users') || '[]');
    const updated = deletedList.filter(d =>
      d !== newUser.id.toLowerCase() &&
      d !== emailLower &&
      d !== usernameLower
    );
    localStorage.setItem('sb_deleted_users', JSON.stringify(updated));
  } catch (e) {}

  // Persist to localStorage
  try {
    const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
    const cIdx = custom.findIndex(
      u => u.id === newUser.id ||
           (emailLower && u.email.toLowerCase() === emailLower) ||
           (usernameLower && u.username.toLowerCase() === usernameLower)
    );
    if (cIdx !== -1) {
      custom[cIdx] = { ...custom[cIdx], ...newUser };
    } else {
      custom.unshift(newUser);
    }
    localStorage.setItem('sb_custom_users', JSON.stringify(custom));
  } catch (e) {}

  // Sync to API / Edge Worker
  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(newUser)
  }).catch(() => {});

  // Broadcast event
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: newUser }));
  }
}

export function updateUser(id: string, updates: Partial<User & { password?: string }>): void {
  const targetId = id.toLowerCase();
  const index = memoryUsers.findIndex(u => u.id.toLowerCase() === targetId || u.email.toLowerCase() === targetId || u.username.toLowerCase() === targetId);
  if (index !== -1) {
    memoryUsers[index] = { ...memoryUsers[index], ...updates };
    try {
      const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
      const cIdx = custom.findIndex(u => u.id.toLowerCase() === targetId || u.email.toLowerCase() === targetId || u.username.toLowerCase() === targetId);
      if (cIdx !== -1) {
        custom[cIdx] = { ...custom[cIdx], ...updates };
        localStorage.setItem('sb_custom_users', JSON.stringify(custom));
      }
    } catch (e) {}

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(memoryUsers[index])
    }).catch(() => {});

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: memoryUsers[index] }));
    }
  }
}

export function deleteUser(id: string): void {
  const norm = (id || '').toLowerCase().trim();
  const index = memoryUsers.findIndex(u =>
    (u.id && u.id.toLowerCase() === norm) ||
    (u.email && u.email.toLowerCase() === norm) ||
    (u.username && u.username.toLowerCase() === norm)
  );

  let deletedUser: User | null = null;
  if (index !== -1) {
    deletedUser = memoryUsers[index];
    memoryUsers.splice(index, 1);
  }

  let boundDevice = deletedUser?.boundDeviceId || null;

  // Remove from sb_custom_users
  try {
    const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
    const filtered = custom.filter(u => {
      const match = (u.id && u.id.toLowerCase() === norm) ||
                    (u.email && u.email.toLowerCase() === norm) ||
                    (u.username && u.username.toLowerCase() === norm);
      if (match && !boundDevice) {
        boundDevice = u.boundDeviceId || null;
      }
      return !match;
    });
    localStorage.setItem('sb_custom_users', JSON.stringify(filtered));
  } catch (e) {}

  // Check stored locks for boundDevice if not yet found
  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    if (!boundDevice) {
      boundDevice = locksMap[norm] || (deletedUser?.id && locksMap[deletedUser.id]) || (deletedUser?.email && locksMap[deletedUser.email.toLowerCase()]) || null;
    }
  } catch (e) {}

  const targetId = deletedUser?.id || id;
  const targetEmail = (deletedUser?.email || (norm.includes('@') ? norm : '')).toLowerCase();
  const targetUsername = (deletedUser?.username || (!norm.includes('@') ? norm : '')).toLowerCase();

  // 1. Permanently record deletion in sb_deleted_users so it never resurrects on refresh
  try {
    const deleted: string[] = JSON.parse(localStorage.getItem('sb_deleted_users') || '[]');
    if (targetId && !deleted.includes(targetId.toLowerCase())) deleted.push(targetId.toLowerCase());
    if (targetEmail && !deleted.includes(targetEmail)) deleted.push(targetEmail);
    if (targetUsername && !deleted.includes(targetUsername)) deleted.push(targetUsername);
    localStorage.setItem('sb_deleted_users', JSON.stringify(deleted));
  } catch (e) {}

  // 2. Clear ALL hardware device locks and device occupations to completely FREE the physical terminal!
  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    delete locksMap[targetId];
    delete locksMap[norm];
    if (targetEmail) delete locksMap[targetEmail];
    if (targetUsername) delete locksMap[targetUsername];

    const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
    if (boundDevice) {
      delete occupations[boundDevice];
      Object.keys(locksMap).forEach(key => {
        if (locksMap[key] === boundDevice) delete locksMap[key];
      });
    }
    Object.keys(occupations).forEach(devId => {
      if (
        occupations[devId] === targetEmail ||
        occupations[devId] === targetUsername ||
        occupations[devId] === targetId ||
        occupations[devId] === norm
      ) {
        delete occupations[devId];
      }
    });

    localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));
  } catch (e) {}

  // 3. Notify Cloudflare edge worker to purge locks and free the workstation
  fetch(`/api/users?id=${encodeURIComponent(targetId)}&email=${encodeURIComponent(targetEmail)}&username=${encodeURIComponent(targetUsername)}&deviceId=${encodeURIComponent(boundDevice || '')}`, {
    method: 'DELETE'
  }).catch(() => {});

  fetch('/api/auth/reset-lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: targetId, email: targetEmail, username: targetUsername, deviceId: boundDevice })
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: { id: targetId, deleted: true } }));
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }
}

export function resetUserHardwareLock(userId: string): void {
  const norm = (userId || '').toLowerCase().trim();
  const u = memoryUsers.find(x =>
    (x.id && x.id.toLowerCase() === norm) ||
    (x.username && x.username.toLowerCase() === norm) ||
    (x.email && x.email.toLowerCase() === norm)
  );

  const targetId = u?.id || userId;
  const targetEmail = (u?.email || (norm.includes('@') ? norm : '')).toLowerCase();
  const targetUsername = (u?.username || (!norm.includes('@') ? norm : '')).toLowerCase();
  const boundDevice = u?.boundDeviceId || null;

  memoryUsers.forEach(x => {
    if (
      (x.id && x.id.toLowerCase() === norm) ||
      (x.username && x.username.toLowerCase() === norm) ||
      (x.email && x.email.toLowerCase() === norm) ||
      (targetId && x.id === targetId) ||
      (targetEmail && x.email && x.email.toLowerCase() === targetEmail) ||
      (targetUsername && x.username && x.username.toLowerCase() === targetUsername)
    ) {
      x.boundDeviceId = null;
    }
  });

  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    delete locksMap[targetId];
    delete locksMap[userId];
    delete locksMap[norm];
    if (targetUsername) delete locksMap[targetUsername];
    if (targetEmail) delete locksMap[targetEmail];

    const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
    if (boundDevice) {
      delete occupations[boundDevice];
      Object.keys(locksMap).forEach(k => {
        if (locksMap[k] === boundDevice) delete locksMap[k];
      });
    }
    Object.keys(occupations).forEach(devId => {
      if (
        occupations[devId] === targetEmail ||
        occupations[devId] === targetUsername ||
        occupations[devId] === targetId ||
        occupations[devId] === norm
      ) {
        delete occupations[devId];
      }
    });

    localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));

    // Also update custom users list in localStorage
    const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
    custom.forEach(cu => {
      if (
        (cu.id && cu.id.toLowerCase() === norm) ||
        (cu.username && cu.username.toLowerCase() === norm) ||
        (cu.email && cu.email.toLowerCase() === norm) ||
        (targetId && cu.id === targetId) ||
        (targetEmail && cu.email && cu.email.toLowerCase() === targetEmail) ||
        (targetUsername && cu.username && cu.username.toLowerCase() === targetUsername)
      ) {
        cu.boundDeviceId = null;
      }
    });
    localStorage.setItem('sb_custom_users', JSON.stringify(custom));
  } catch (e) {}

  // Synchronize unbind with edge worker
  fetch('/api/auth/reset-lock', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: targetId, email: targetEmail, username: targetUsername, deviceId: boundDevice })
  }).catch(() => {});

  fetch('/api/auth/unbind', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userId: targetId, email: targetEmail, username: targetUsername, deviceId: boundDevice })
  }).catch(() => {});

  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: targetId, email: targetEmail, username: targetUsername, boundDeviceId: null })
  }).catch(() => {});

  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('studentbridge_userchange', { detail: { id: targetId, boundDeviceId: null } }));
    window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
  }
}

export function setUserHardwareLock(userId: string, deviceId: string): void {
  const norm = userId.toLowerCase();
  const u = memoryUsers.find(x => x.id.toLowerCase() === norm || x.username.toLowerCase() === norm || x.email.toLowerCase() === norm);
  if (u) {
    u.boundDeviceId = deviceId;
    try {
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      locksMap[u.id] = deviceId;
      locksMap[u.email.toLowerCase()] = deviceId;
      locksMap[u.username.toLowerCase()] = deviceId;
      localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));

      // Record device occupation by this user email
      const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
      occupations[deviceId] = u.email.toLowerCase();
      localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));

      // Also update custom users list
      const custom: (User & { password?: string })[] = JSON.parse(localStorage.getItem('sb_custom_users') || '[]');
      custom.forEach(cu => {
        if (
          (cu.id && cu.id.toLowerCase() === norm) ||
          (cu.username && cu.username.toLowerCase() === norm) ||
          (cu.email && cu.email.toLowerCase() === norm)
        ) {
          cu.boundDeviceId = deviceId;
        }
      });
      localStorage.setItem('sb_custom_users', JSON.stringify(custom));
    } catch (e) {}

    // Synchronize hardware terminal lock to edge worker
    fetch('/api/auth/bind-lock', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: u.id, email: u.email, username: u.username, deviceId })
    }).catch(() => {});

    fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...u, boundDeviceId: deviceId })
    }).catch(() => {});
  }
}

/**
 * Strict 1-Device Hardware Lock Policy:
 * 1 email/user is strictly bound to 1 physical device. Any secondary device is rejected.
 * When logged in on the SAME device, login always succeeds with zero friction.
 * If user is deleted or device is disconnected, the device is completely freed for other user emails.
 */
export function checkDeviceLock(user: User, currentDeviceId: string): { allowed: boolean; boundDeviceId?: string; reason?: string } {
  if (!user) return { allowed: false, reason: 'Unrecognized user account' };

  // Super Admin is never blocked by hardware locks
  if (user.role === 'SUPER_ADMIN' || user.email?.toLowerCase() === 'miskrdires11@gmail.com') {
    return { allowed: true, boundDeviceId: currentDeviceId };
  }

  // 1. Check if this USER is bound to a device
  let boundId: string | null = user.boundDeviceId || null;
  try {
    const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
    const stored = locksMap[user.id] || locksMap[user.email?.toLowerCase()] || locksMap[user.username?.toLowerCase()] || null;
    if (!boundId && stored) {
      boundId = stored;
    }
  } catch (e) {}

  // If user is already bound to a hardware device:
  if (boundId) {
    // CRITICAL: If logging in from the SAME device, ALWAYS ALLOW!
    if (boundId === currentDeviceId) {
      return { allowed: true, boundDeviceId: currentDeviceId };
    }
    // Attempting to log in from a DIFFERENT, unauthorized device:
    return {
      allowed: false,
      boundDeviceId: boundId,
      reason: `Access Denied: Account "${user.email}" is strictly hardware-locked to workstation (${boundId}). Access from this unauthorized workstation (${currentDeviceId}) is rejected. An administrator must disconnect the previous device first.`
    };
  }

  // 2. Check if THIS PHYSICAL DEVICE is occupied by ANOTHER active operator
  try {
    const occupations = JSON.parse(localStorage.getItem('sb_device_occupations') || '{}');
    const occupiedByEmail = occupations[currentDeviceId];
    if (occupiedByEmail && occupiedByEmail.toLowerCase() !== user.email?.toLowerCase()) {
      // Check if that user still exists and is still bound to this device
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      const otherUserLock = locksMap[occupiedByEmail.toLowerCase()];
      const otherUserExists = memoryUsers.some(u => u.email?.toLowerCase() === occupiedByEmail.toLowerCase());

      if (otherUserExists && otherUserLock === currentDeviceId) {
        return {
          allowed: false,
          boundDeviceId: currentDeviceId,
          reason: `Access Denied: This physical workstation (${currentDeviceId}) is currently bound to operator "${occupiedByEmail}". Disconnect that device in Admin or delete the previous operator before signing in with "${user.email}".`
        };
      } else {
        // Stale occupation - clear it
        delete occupations[currentDeviceId];
        localStorage.setItem('sb_device_occupations', JSON.stringify(occupations));
      }
    }
  } catch (e) {}

  // Device is free, user is unbound: allowed!
  return { allowed: true, boundDeviceId: currentDeviceId };
}

// ----------------------------------------------------
// Mistake Correction Logs & Senders Notification Feed
// ----------------------------------------------------
export interface CorrectionLog {
  id: string;
  studentId: string;
  studentName: string;
  senderId?: string;
  senderName?: string;
  actionType: 'PHOTO_CORRECTED' | 'PHONE_FORMATTED' | 'DATA_UPDATED' | 'MISTAKE_RESOLVED';
  description: string;
  resolvedBy: string;
  timestamp: string;
}

export function getCorrectionLogs(senderIdentifier?: string): CorrectionLog[] {
  try {
    const raw = localStorage.getItem('sb_correction_logs');
    const logs: CorrectionLog[] = raw ? JSON.parse(raw) : [];
    if (!senderIdentifier) return logs;
    const norm = senderIdentifier.toLowerCase().trim();
    return logs.filter(l =>
      (l.senderName && l.senderName.toLowerCase().trim() === norm) ||
      (l.senderId && l.senderId.toLowerCase().trim() === norm)
    );
  } catch (e) {
    return [];
  }
}

export function addCorrectionLog(log: Omit<CorrectionLog, 'id' | 'timestamp'>): void {
  try {
    const logs: CorrectionLog[] = JSON.parse(localStorage.getItem('sb_correction_logs') || '[]');
    const newLog: CorrectionLog = {
      ...log,
      id: `corr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString()
    };
    logs.unshift(newLog);
    localStorage.setItem('sb_correction_logs', JSON.stringify(logs.slice(0, 100)));
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_correction_event', { detail: newLog }));
    }
  } catch (e) {}
}

export function getTasks(): Task[] {
  return memoryTasks;
}

export function addTask(task: Task): void {
  memoryTasks.unshift(task);
  try {
    localStorage.setItem('sb_admin_tasks', JSON.stringify(memoryTasks));
  } catch (e) {}
}

export function updateTaskStatus(id: string, status: Task['status']): void {
  const t = memoryTasks.find(x => x.id === id);
  if (t) {
    t.status = status;
    try {
      localStorage.setItem('sb_admin_tasks', JSON.stringify(memoryTasks));
    } catch (e) {}
  }
}

export function getSchools(): School[] {
  return memorySchools;
}

export function addSchool(school: School): void {
  memorySchools.push(school);
}

export function getAuditLogs(): AuditLog[] {
  return memoryAuditLogs;
}

export function addAuditLog(log: AuditLog): void {
  memoryAuditLogs.unshift(log);
}

const DEFAULT_CARD_TEMPLATES: CardTemplate[] = [
  {
    id: 'tmpl-cr80-minimal',
    name: 'CR80 Official Minimalist (Standard)',
    description: 'ISO/IEC 7810 ID-1 standard (85.6mm × 53.98mm). Clean white background with Silicon Labs lime header, security QR, and barcode.',
    orientation: 'LANDSCAPE',
    theme: 'MINIMAL_WHITE',
    widthMm: 85.6,
    heightMm: 53.98,
    primaryColor: '#85E510',
  },
  {
    id: 'tmpl-cr80-executive',
    name: 'Executive Academic Credential',
    description: 'Charcoal border, verified watermark, dual security QR, and official signature line for high school and university students.',
    orientation: 'LANDSCAPE',
    theme: 'EXECUTIVE_CHARCOAL',
    widthMm: 85.6,
    heightMm: 53.98,
    primaryColor: '#202833',
  },
  {
    id: 'tmpl-cr80-portrait',
    name: 'Vertical Campus Access Badge',
    description: 'Portrait orientation ID card with large student photograph, instant scan barcode, and prominent grade/campus indicators.',
    orientation: 'PORTRAIT',
    theme: 'CAMPUS_VERTICAL',
    widthMm: 53.98,
    heightMm: 85.6,
    primaryColor: '#85E510',
  }
];

let memoryPrintJobs: PrintJob[] = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sb_print_jobs') : null;
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
  }
})();

export function getCardTemplates(): CardTemplate[] {
  return DEFAULT_CARD_TEMPLATES;
}

export function getPrintJobs(): PrintJob[] {
  return memoryPrintJobs;
}

export function addPrintJob(job: PrintJob): void {
  memoryPrintJobs.unshift(job);
  try {
    localStorage.setItem('sb_print_jobs', JSON.stringify(memoryPrintJobs));
  } catch (e) {}
}

export function updateStudentIdProductionStatus(studentId: string, status: string, cardSerialNumber?: string): void {
  const index = memoryStudents.findIndex(s => s.id === studentId || s.studentId === studentId);
  if (index !== -1) {
    const student = memoryStudents[index];
    student.idProductionStatus = status;
    if (cardSerialNumber) student.cardSerialNumber = cardSerialNumber;

    const history = student.recordHistory || [];
    history.unshift({
      date: new Date().toISOString().replace('T', ' ').substring(0, 16),
      action: 'ID Production Update',
      user: getCurrentUser()?.username || 'Receiver Operator',
      role: 'Receiver',
      notes: `Updated ID production status to ${status}${cardSerialNumber ? ` (Card Serial: ${cardSerialNumber})` : ''}`
    });
    student.recordHistory = history;

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver Operator',
      station: 'Receiver',
      action: 'ID Production',
      entity: student.studentId,
      details: `Transitioned ID production status to ${status} for ${student.fullName}`
    });
  }
}

export function getMistakes(): MistakeItem[] {
  const mistakes: MistakeItem[] = [];
  const seenIds = new Set<string>();

  memoryStudents.forEach((s) => {
    if (!s.photoPath && !s.previewPath) {
      mistakes.push({
        id: s.id,
        studentId: s.studentId,
        name: s.fullName,
        school: s.school,
        type: 'Missing Photo',
        severity: 'High',
        date: s.createdAt ? s.createdAt.substring(0, 10) : '2026-10-13',
        status: 'Open',
        sender: (s as any).senderOperator || (s as any).sender || (s as any).operator || 'Field Sender',
        senderId: s.senderId || (s as any).senderUsername
      });
    }

    if (seenIds.has(s.studentId)) {
      mistakes.push({
        id: s.id,
        studentId: s.studentId,
        name: s.fullName,
        school: s.school,
        type: 'Duplicate ID',
        severity: 'High',
        date: '2026-10-13',
        status: 'Open',
        sender: (s as any).senderOperator || (s as any).sender || (s as any).operator || 'Field Sender',
        senderId: s.senderId || (s as any).senderUsername
      });
    } else {
      seenIds.add(s.studentId);
    }

    if (s.phone && s.phone.replace(/\D/g, '').length < 9) {
      mistakes.push({
        id: s.id,
        studentId: s.studentId,
        name: s.fullName,
        school: s.school,
        type: 'Invalid Phone Number',
        severity: 'Medium',
        date: '2026-10-13',
        status: 'Open',
        sender: (s as any).senderOperator || (s as any).sender || (s as any).operator || 'Field Sender',
        senderId: s.senderId || (s as any).senderUsername
      });
    }
  });

  return mistakes;
}

// Authentication Session State with 3-hour persistence guarantee
export function getCurrentUser(): User | null {
  try {
    const saved = localStorage.getItem('sb_auth_user');
    if (!saved) return null;
    const user: User = JSON.parse(saved);
    const loginTimeStr = localStorage.getItem('sb_auth_time');
    if (loginTimeStr) {
      const loginTime = parseInt(loginTimeStr, 10);
      const threeHoursMs = 3 * 60 * 60 * 1000;
      // If session expired after 3 hours
      if (Date.now() - loginTime > threeHoursMs) {
        localStorage.removeItem('sb_auth_user');
        localStorage.removeItem('sb_auth_time');
        return null;
      }
    }
    return user;
  } catch (e) {}
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('sb_auth_user', JSON.stringify(user));
    localStorage.setItem('sb_auth_time', Date.now().toString());
  } else {
    localStorage.removeItem('sb_auth_user');
    localStorage.removeItem('sb_auth_time');
  }
}

export function getOrCreateDeviceId(): string {
  let devId = localStorage.getItem('sb_device_id');
  if (!devId) {
    devId = 'DEV-SILICON-' + Math.random().toString(36).substring(2, 8).toUpperCase();
    localStorage.setItem('sb_device_id', devId);
  }
  return devId;
}

// ----------------------------------------------------
// Sender Transmission Telemetry & Historical Metrics
// ----------------------------------------------------
export interface SenderMetrics {
  id: string;
  username: string;
  email: string;
  role: string;
  school?: string;
  boundDeviceId: string | null;
  status: 'Active' | 'Idle' | 'Locked';
  efficiency: number; // Percentage e.g. 98.4%
  mistakesCount: number;
  today: number;
  week: number;
  month: number;
  total: number;
  lastActive: string;
}

export function getSenderMetrics(senderIdentifier: string): SenderMetrics {
  const norm = (senderIdentifier || '').toLowerCase().trim();
  const user = memoryUsers.find(
    u => u.username.toLowerCase() === norm || u.email.toLowerCase() === norm
  );

  const now = new Date();
  const todayPrefix = now.toISOString().split('T')[0];
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // Match live records in memory
  const matchingStudents = memoryStudents.filter(s => {
    const sName = (s.senderName || '').toLowerCase().trim();
    return sName === norm || (user && sName === user.username.toLowerCase());
  });

  const liveToday = matchingStudents.filter(s => s.createdAt && s.createdAt.startsWith(todayPrefix)).length;
  const liveWeek = matchingStudents.filter(s => s.createdAt && new Date(s.createdAt) >= sevenDaysAgo).length;
  const liveMonth = matchingStudents.filter(s => s.createdAt && new Date(s.createdAt) >= thirtyDaysAgo).length;

  const baseRecorded = user?.recordsSentSingle || 0;
  const total = Math.max(baseRecorded, matchingStudents.length);

  // Strict live daily count: when a new day starts (e.g. tomorrow), today strictly starts at 0!
  const today = liveToday;
  const week = liveWeek > 0 ? liveWeek : (total > 0 ? Math.min(total, Math.max(today, Math.round(total * 0.15))) : 0);
  const month = liveMonth > 0 ? liveMonth : total;

  // Mistakes count & quality efficiency calculation
  const mistakesCount = matchingStudents.filter(s => {
    const hasPhoto = s.photoPath && !s.photoPath.includes('avatar') && !s.photoPath.includes('placeholder');
    const hasValidPhone = s.phone && /^\+251[0-9]{9}$/.test(s.phone.replace(/[\s\-]/g, ''));
    return !hasPhoto || !hasValidPhone || s.hasMistake;
  }).length;

  // High-fidelity quality rating (clean transmissions ratio)
  const efficiency = total > 0
    ? Math.max(85, Math.min(100, Math.round((1 - (mistakesCount / Math.max(total, 1))) * 1000) / 10))
    : 100;

  const status: 'Active' | 'Idle' | 'Locked' = user?.boundDeviceId
    ? (today > 0 ? 'Active' : 'Idle')
    : 'Active';

  return {
    id: user?.id || `usr-${norm}`,
    username: user?.username || senderIdentifier,
    email: user?.email || `${norm}@gmail.com`,
    role: user?.role || 'SENDER',
    school: user?.school || user?.branch,
    boundDeviceId: user?.boundDeviceId || null,
    status,
    efficiency,
    mistakesCount,
    today,
    week,
    month,
    total,
    lastActive: (user as any)?.lastActiveAt || (user as any)?.lastLoginAt || new Date().toISOString()
  };
}

export function getAllSendersMetrics(): SenderMetrics[] {
  const senders = memoryUsers.filter(u => u.role === 'SENDER');
  return senders.map(u => getSenderMetrics(u.username));
}

