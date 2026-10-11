import { Student, User, Task, School, AuditLog, StudentCoreRequest, MistakeItem, UserRole, CardTemplate, PrintJob } from '@/types';
import { publishStudentSync, subscribeToStudentSync, getPhotoUrl, getPhotoEncodeClass } from './syncEngine';

export { getPhotoUrl, getPhotoEncodeClass, publishStudentSync, subscribeToStudentSync };

// Initial fallback schools
const DEFAULT_SCHOOLS: School[] = [
  { id: "sch_yms", name: "YMS", location: "Addis Ababa", status: "Active", studentsCount: 1245 },
  { id: "sch_adika", name: "Adika Youth", location: "Addis Ababa", status: "Active", studentsCount: 982 },
  { id: "sch_soa", name: "School of America", location: "Addis Ababa", status: "Active", studentsCount: 756 },
  { id: "sch_ferway", name: "Ferway", location: "Addis Ababa", status: "Active", studentsCount: 542 },
  { id: "sch_warka", name: "Warka", location: "Addis Ababa", status: "Active", studentsCount: 398 },
  { id: "sch_yacine", name: "Yacine", location: "Adama", status: "Active", studentsCount: 420 },
  { id: "sch_debebech", name: "Debebech", location: "Adama", status: "Active", studentsCount: 510 },
  { id: "sch_hightech", name: "High Tech", location: "Harar", status: "Active", studentsCount: 380 }
];

const DEFAULT_TASKS: Task[] = [];

export interface OperatorAccount extends User {
  password?: string;
}

export const PRESET_OPERATORS: OperatorAccount[] = [
  {
    id: "cmua5dk5n00041tc43u1v7em9",
    username: "miskrdires12",
    email: "miskrdires12@gmail.com",
    role: "SENDER",
    password: "sender123",
    boundDeviceId: null,
    recordsSentSingle: 499,
  },
  {
    id: "usr-sender-1",
    username: "Loza Bereket",
    email: "loza.bereket@siliconlabs.et",
    role: "SENDER",
    password: "sender123",
    boundDeviceId: null,
    recordsSentSingle: 28,
  },
  {
    id: "cmukweowr00009pzsimqcm168",
    username: "yonatantesfa",
    email: "yonatantesfa@gmail.com",
    role: "RECEIVER",
    password: "receiver123",
    boundDeviceId: null,
    recordsEncoded: 335,
  },
  {
    id: "usr-receiver-1",
    username: "Alemu Tadesse",
    email: "alemu.tadesse@siliconlabs.et",
    role: "RECEIVER",
    password: "receiver123",
    boundDeviceId: null,
    recordsEncoded: 3578,
  },
  {
    id: "cmuq26kz90001q5dgcb3lu519",
    username: "miskrdires1",
    email: "miskrdires1@gmail.com",
    role: "ADMIN",
    password: "admin123",
    boundDeviceId: null,
  },
  {
    id: "usr-admin-1",
    username: "Getnet Kassa",
    email: "admin.addis@siliconlabs.et",
    role: "ADMIN",
    password: "admin123",
    boundDeviceId: null,
  },
  {
    id: "cmu7b6rkh00002ggkkxg5ecd9",
    username: "miskrdires11",
    email: "miskrdires11@gmail.com",
    role: "SUPER_ADMIN",
    password: "admin123",
    boundDeviceId: null,
  },
  {
    id: "usr-super-2",
    username: "root_superadmin",
    email: "superadmin@siliconlabs.et",
    role: "SUPER_ADMIN",
    password: "super123",
    boundDeviceId: null,
  }
];

let memoryStudents: Student[] = [];
let memoryUsers: User[] = [...PRESET_OPERATORS];
let memorySchools: School[] = DEFAULT_SCHOOLS;
let memoryTasks: Task[] = (() => {
  try {
    const saved = typeof localStorage !== 'undefined' ? localStorage.getItem('sb_admin_tasks') : null;
    return saved ? JSON.parse(saved) : [];
  } catch (e) {
    return [];
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
    const res = await fetch('/api/students?all=true&limit=5000');
    if (res.ok) {
      const data = await res.json();
      if (data && Array.isArray(data.students) && data.students.length > 0) {
        memoryStudents = data.students;
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
        const existingEmails = new Set(memoryUsers.map(u => u.email.toLowerCase()));
        loadedUsers.forEach(u => {
          if (!existingEmails.has(u.email.toLowerCase())) {
            memoryUsers.push(u);
          }
        });
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

export function getStudents(): Student[] {
  return memoryStudents;
}

export function addStudent(newStudent: Student): void {
  // Ensure default and encoded fields
  if (!newStudent.status) newStudent.status = 'Accepted';
  if (!newStudent.location) newStudent.location = 'Addis Ababa';
  if (!newStudent.idProductionStatus) newStudent.idProductionStatus = 'READY';
  if (!newStudent.photoIntegrityStatus) {
    newStudent.photoIntegrityStatus = (newStudent.photoPath || newStudent.previewPath || newStudent.thumbnailPath) ? 'PHOTO_VERIFIED' : 'NO_PHOTO';
  }
  if (!newStudent.qrCodeData) {
    newStudent.qrCodeData = JSON.stringify({
      id: newStudent.studentId,
      name: newStudent.fullName,
      grade: newStudent.grade || '',
      school: newStudent.school || '',
      status: 'Accepted',
      verified: true,
      issuer: 'Silicon Labs StudentBridge'
    });
  }
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
  }
}

export function deleteStudent(id: string, permanent: boolean = false): void {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    const student = memoryStudents[index];

    if (permanent) {
      // 1. PERMANENT PURGE: Remove completely from memory and local storage
      const deleted = memoryStudents.splice(index, 1)[0];
      try {
        const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
        const filtered = custom.filter(s => s.id !== id && s.studentId !== id);
        localStorage.setItem('sb_custom_students', JSON.stringify(filtered));
      } catch (e) {}

      // Persist permanent purge to Cloudflare (R2 photo deletion & Supabase PostgreSQL delete)
      fetch(`/api/students?id=${encodeURIComponent(id)}&permanent=true`, {
        method: 'DELETE'
      }).catch(err => {
        console.warn('Could not sync permanent delete to server, queued offline:', err);
        import('@/lib/offlineQueue').then(({ queueOfflineOperation }) => {
          queueOfflineOperation('DELETE_STUDENT', { id, studentId: deleted.studentId, permanent: true });
        });
      });

      addAuditLog({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: getCurrentUser()?.username || 'Receiver',
        station: 'Receiver',
        action: 'Student Permanently Deleted',
        entity: deleted.studentId,
        details: `Purged record & Cloudflare R2 portrait for ${deleted.fullName}`
      });
    } else {
      // 2. TEMPORARY DELETE (Soft Delete: Hide only from station system view, preserve data in Cloudflare)
      student.receiverHidden = true;
      student.hiddenAt = new Date().toISOString();

      try {
        const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
        const cIdx = custom.findIndex(s => s.id === id || s.studentId === id);
        if (cIdx !== -1) {
          custom[cIdx].receiverHidden = true;
          custom[cIdx].hiddenAt = student.hiddenAt;
          localStorage.setItem('sb_custom_students', JSON.stringify(custom));
        }
      } catch (e) {}

      // Sync soft delete to server
      fetch(`/api/students?id=${encodeURIComponent(id)}&permanent=false`, {
        method: 'DELETE'
      }).catch(err => {
        console.warn('Could not sync soft delete to server:', err);
      });

      addAuditLog({
        timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
        user: getCurrentUser()?.username || 'Receiver',
        station: 'Receiver',
        action: 'Student Hidden from System',
        entity: student.studentId,
        details: `Temporarily hidden from station directory: ${student.fullName}`
      });
    }

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
  }
}

export function restoreStudent(id: string): void {
  const index = memoryStudents.findIndex(s => s.id === id || s.studentId === id);
  if (index !== -1) {
    const student = memoryStudents[index];
    student.receiverHidden = false;
    student.hiddenAt = null as any;

    try {
      const custom: Student[] = JSON.parse(localStorage.getItem('sb_custom_students') || '[]');
      const cIdx = custom.findIndex(s => s.id === id || s.studentId === id);
      if (cIdx !== -1) {
        custom[cIdx].receiverHidden = false;
        custom[cIdx].hiddenAt = null as any;
        localStorage.setItem('sb_custom_students', JSON.stringify(custom));
      }
    } catch (e) {}

    fetch(`/api/students?id=${encodeURIComponent(id)}&action=restore`, {
      method: 'DELETE'
    }).catch(err => {
      console.warn('Could not sync restore to server:', err);
    });

    addAuditLog({
      timestamp: new Date().toISOString().replace('T', ' ').substring(0, 19),
      user: getCurrentUser()?.username || 'Receiver',
      station: 'Receiver',
      action: 'Student Restored',
      entity: student.studentId,
      details: `Restored to active directory: ${student.fullName}`
    });

    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange'));
    }
  }
}

export function getUsers(): User[] {
  return memoryUsers;
}

export function resetUserHardwareLock(userId: string): void {
  const u = memoryUsers.find(x => x.id === userId || x.username === userId || x.email === userId);
  if (u) {
    u.boundDeviceId = null;
    try {
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      locksMap[u.id] = null;
      localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    } catch (e) {}
  }
}

export function setUserHardwareLock(userId: string, deviceId: string): void {
  const u = memoryUsers.find(x => x.id === userId || x.username === userId || x.email === userId);
  if (u) {
    u.boundDeviceId = deviceId;
    try {
      const locksMap = JSON.parse(localStorage.getItem('sb_device_locks') || '{}');
      locksMap[u.id] = deviceId;
      localStorage.setItem('sb_device_locks', JSON.stringify(locksMap));
    } catch (e) {}
  }
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
        status: 'Open'
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
        status: 'Open'
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
        status: 'Open'
      });
    }
  });

  return mistakes;
}

// Authentication Session State
export function getCurrentUser(): User | null {
  try {
    const saved = localStorage.getItem('sb_auth_user');
    if (saved) return JSON.parse(saved);
  } catch (e) {}
  return null;
}

export function setCurrentUser(user: User | null): void {
  if (user) {
    localStorage.setItem('sb_auth_user', JSON.stringify(user));
  } else {
    localStorage.removeItem('sb_auth_user');
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
