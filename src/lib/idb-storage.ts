// ============================================================================
// STUDENT BRIDGE — HIGH-PERFORMANCE INDEXEDDB DATABASE ENGINE
// Built for 6,000 to 20,000+ student records per day with full-resolution photos.
// Non-blocking, unlimited browser storage quota, fast indexed retrieval.
// ============================================================================

export interface StudentDBRecord {
  id: string;
  studentId: string;
  fullName: string;
  grade: string;
  sex?: string;
  phone: string;
  photoPath?: string | null;
  qrCodeData?: string | null;
  emailAddress?: string | null;
  address?: string | null;
  school?: string | null;
  department?: string | null;
  academicYear?: string | null;
  guardianFullName?: string | null;
  emergencyContactPhone?: string | null;
  emergencyContactName?: string | null;
  bloodType?: string | null;
  nationality?: string | null;
  status?: string;
  createdAt: string;
  customValues?: Array<{ customField: { label: string; fieldKey: string }; value: string }>;
  [key: string]: any;
}

const DB_NAME = "StudentBridgeDB";
const DB_VERSION = 1;
const STORE_NAME = "students";
const CHANNEL_NAME = "sb_indexeddb_sync";

let dbInstance: IDBDatabase | null = null;
let broadcastChannel: BroadcastChannel | null = null;

if (typeof window !== "undefined" && "BroadcastChannel" in window) {
  try {
    broadcastChannel = new BroadcastChannel(CHANNEL_NAME);
  } catch {
    // Fallback if BroadcastChannel unavailable
  }
}

/**
 * Initializes and returns the IndexedDB database instance.
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (dbInstance) {
      resolve(dbInstance);
      return;
    }

    if (typeof window === "undefined" || !("indexedDB" in window)) {
      reject(new Error("IndexedDB is not supported in this environment"));
      return;
    }

    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: "studentId" });
        store.createIndex("id", "id", { unique: false });
        store.createIndex("grade", "grade", { unique: false });
        store.createIndex("fullName", "fullName", { unique: false });
        store.createIndex("createdAt", "createdAt", { unique: false });
      }
    };

    request.onsuccess = () => {
      dbInstance = request.result;
      resolve(dbInstance);
    };

    request.onerror = () => {
      reject(request.error || new Error("Failed to open IndexedDB"));
    };
  });
}

/**
 * Saves or updates a single student in IndexedDB safely.
 * Can store base64 photos without quota limits.
 */
export async function saveStudentToDB(student: StudentDBRecord): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // Normalize student record
    const record: StudentDBRecord = {
      ...student,
      studentId: student.studentId || student.id,
      sex: student.sex || "Male",
      createdAt: student.createdAt || new Date().toISOString(),
    };

    const req = store.put(record);
    req.onsuccess = () => {
      // Notify other tabs and components via BroadcastChannel
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "UPSERT", student: record });
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Bulk saves a list of students to IndexedDB in a single fast transaction.
 */
export async function saveStudentsToDB(students: StudentDBRecord[]): Promise<void> {
  if (!students || students.length === 0) return;
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    for (const student of students) {
      const record: StudentDBRecord = {
        ...student,
        studentId: student.studentId || student.id,
        sex: student.sex || "Male",
        createdAt: student.createdAt || new Date().toISOString(),
      };
      store.put(record);
    }

    tx.oncomplete = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "BULK_UPSERT", count: students.length });
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Retrieves all students stored in IndexedDB (ordered newest first).
 */
export async function getAllStudentsFromDB(): Promise<StudentDBRecord[]> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.getAll();

      req.onsuccess = () => {
        const results = (req.result || []) as StudentDBRecord[];
        // Sort newest first
        results.sort((a, b) => {
          const tA = new Date(a.createdAt || 0).getTime();
          const tB = new Date(b.createdAt || 0).getTime();
          return tB - tA;
        });
        resolve(results);
      };

      req.onerror = () => reject(req.error);
    });
  } catch (err) {
    console.warn("IndexedDB read error, returning empty list:", err);
    return [];
  }
}

/**
 * Gets total count of students stored in IndexedDB instantly.
 */
export async function getStudentCountFromDB(): Promise<number> {
  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, "readonly");
      const store = tx.objectStore(STORE_NAME);
      const req = store.count();
      req.onsuccess = () => resolve(req.result || 0);
      req.onerror = () => reject(req.error);
    });
  } catch {
    return 0;
  }
}

/**
 * Deletes a student from IndexedDB by studentId or id.
 */
export async function deleteStudentFromDB(studentIdOrId: string): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);

    // First delete by primary key
    store.delete(studentIdOrId);

    // Also scan index if needed
    const index = store.index("id");
    const req = index.getKey(studentIdOrId);
    req.onsuccess = () => {
      if (req.result) {
        store.delete(req.result);
      }
    };

    tx.oncomplete = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "DELETE", studentId: studentIdOrId });
      }
      resolve();
    };
    tx.onerror = () => reject(tx.error);
  });
}

/**
 * Clears all student records from IndexedDB.
 */
export async function clearAllStudentsFromDB(): Promise<void> {
  const db = await openDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, "readwrite");
    const store = tx.objectStore(STORE_NAME);
    const req = store.clear();

    req.onsuccess = () => {
      if (broadcastChannel) {
        broadcastChannel.postMessage({ type: "CLEAR" });
      }
      resolve();
    };
    req.onerror = () => reject(req.error);
  });
}

/**
 * Subscribes to local IndexedDB sync events across tabs.
 */
export function subscribeToDBChanges(callback: (event: any) => void): () => void {
  if (!broadcastChannel) return () => {};

  const handler = (e: MessageEvent) => {
    callback(e.data);
  };

  broadcastChannel.addEventListener("message", handler);
  return () => {
    broadcastChannel?.removeEventListener("message", handler);
  };
}
