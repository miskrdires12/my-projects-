// ============================================================================
// STUDENTBRIDGE — REAL-TIME CLOUD & CROSS-TAB SYNC ENGINE
// Silicon Labs • Dual-Channel Real-Time Bridge
// 1. BroadcastChannel: 0ms real-time sync across local browser tabs & windows
// 2. ntfy.sh Global Bus: Real-time SSE sync across mobile phones & remote receiver terminals
// ============================================================================

import { Student } from '@/types';

export const SYNC_TOPIC = 'sb_prod_sync_cloudflare_r2_v1';
export const SYNC_BASE_URL = `https://ntfy.sh/${SYNC_TOPIC}`;
export const R2_PUBLIC_BASE_URL = 'https://pub-93e8bf84c42949ec88306f456caa0fc9.r2.dev';

export interface SyncPayload {
  action: 'UPSERT' | 'DELETE' | 'PING';
  student?: Student;
  studentId?: string;
  timestamp: number;
}

/**
 * Universal photo URL resolver.
 * Prevents double-prefixing URLs that are already absolute or base64.
 */
export function getPhotoUrl(pathOrUrl?: string | null): string | null {
  if (!pathOrUrl || typeof pathOrUrl !== 'string') return null;
  const trimmed = pathOrUrl.trim();
  if (!trimmed) return null;

  // Already a full URL or data URI
  if (trimmed.startsWith('data:') || trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // Relative R2 object key (e.g. "9C/SB-2026-10492_Abebe.jpg")
  const clean = trimmed.replace(/^\/+/, '');
  return `${R2_PUBLIC_BASE_URL}/${clean}`;
}

/**
 * Encoded / Unencoded classifier.
 * Students with verified biometric photos are "Encoded" (ready for ID encoding & printing).
 */
export function getPhotoEncodeClass(student: Student): 'Encoded' | 'Unencoded' {
  if (student.photoIntegrityStatus === 'PHOTO_VERIFIED') return 'Encoded';
  if (student.photoPath && student.photoPath.trim().length > 0) return 'Encoded';
  if (student.previewPath && student.previewPath.trim().length > 0) return 'Encoded';
  if (student.thumbnailPath && student.thumbnailPath.trim().length > 0) return 'Encoded';
  return 'Unencoded';
}

// Local BroadcastChannel instance for cross-tab communication
let broadcastChannel: BroadcastChannel | null = null;
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  try {
    broadcastChannel = new BroadcastChannel('studentbridge_sync_channel');
  } catch (e) {
    console.warn('BroadcastChannel initialization skipped:', e);
  }
}

/**
 * Publishes an upsert or deletion event to both local cross-tab bus and global cloud sync bus.
 */
export async function publishStudentSync(
  action: 'UPSERT' | 'DELETE',
  studentOrId: Student | string
): Promise<boolean> {
  try {
    const student = typeof studentOrId !== 'string' ? studentOrId : undefined;
    const studentId = typeof studentOrId === 'string' ? studentOrId : studentOrId.studentId;

    const payload: SyncPayload = {
      action,
      student,
      studentId,
      timestamp: Date.now()
    };

    // 1. Broadcast locally across browser tabs (0ms)
    if (broadcastChannel) {
      try {
        broadcastChannel.postMessage(payload);
      } catch (bcErr) {
        console.warn('BroadcastChannel post warning:', bcErr);
      }
    }

    // 2. Dispatch local DOM event for same-window reactive listeners
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('studentbridge_datachange', { detail: payload }));
    }

    // 3. Broadcast to Global Cloud Sync Bus (cross-device: phone -> PC Receiver)
    fetch(SYNC_BASE_URL, {
      method: 'POST',
      headers: {
        Title: action === 'UPSERT' ? `STUDENT_ENROLLED_${studentId}` : `STUDENT_DELETED_${studentId}`,
        Priority: 'urgent',
        Tags: 'student,sync,encoded'
      },
      body: JSON.stringify(payload),
      cache: 'no-store'
    }).catch(err => {
      console.warn('Cloud sync publish notice:', err);
    });

    return true;
  } catch (err) {
    console.warn('publishStudentSync error:', err);
    return false;
  }
}

/**
 * Subscribes Receiver Station to real-time sync events from both local tabs and remote devices.
 */
export function subscribeToStudentSync(
  onUpsert: (student: Student) => void,
  onDelete?: (studentId: string) => void
): () => void {
  if (typeof window === 'undefined') return () => {};

  let isSubscribed = true;

  // 1. Listen to Local BroadcastChannel (cross-tab)
  const handleBcMessage = (event: MessageEvent<SyncPayload>) => {
    if (!isSubscribed || !event.data) return;
    const payload = event.data;
    if (payload.action === 'UPSERT' && payload.student) {
      onUpsert(payload.student);
    } else if (payload.action === 'DELETE' && payload.studentId && onDelete) {
      onDelete(payload.studentId);
    }
  };

  if (broadcastChannel) {
    broadcastChannel.addEventListener('message', handleBcMessage);
  }

  // 2. Listen to Window DOM event (same window)
  const handleDomEvent = (event: Event) => {
    if (!isSubscribed) return;
    const custom = event as CustomEvent<SyncPayload>;
    if (custom.detail) {
      if (custom.detail.action === 'UPSERT' && custom.detail.student) {
        onUpsert(custom.detail.student);
      } else if (custom.detail.action === 'DELETE' && custom.detail.studentId && onDelete) {
        onDelete(custom.detail.studentId);
      }
    }
  };
  window.addEventListener('studentbridge_datachange', handleDomEvent);

  // 3. Connect to Global Cloud Sync Bus via Server-Sent Events (SSE)
  let eventSource: EventSource | null = null;
  try {
    eventSource = new EventSource(`${SYNC_BASE_URL}/sse`);
    eventSource.onmessage = (event) => {
      if (!isSubscribed) return;
      try {
        const raw = JSON.parse(event.data);
        // ntfy message envelope wraps user body inside .message
        const payload: SyncPayload = typeof raw.message === 'string' ? JSON.parse(raw.message) : raw;
        if (payload.action === 'UPSERT' && payload.student) {
          onUpsert(payload.student);
        } else if (payload.action === 'DELETE' && payload.studentId && onDelete) {
          onDelete(payload.studentId);
        }
      } catch (parseErr) {
        // Ping or non-JSON message, safely ignore
      }
    };
    eventSource.onerror = () => {
      // Automatic browser reconnect handled by EventSource
    };
  } catch (sseErr) {
    console.warn('Cloud EventSource setup skipped:', sseErr);
  }

  // Return unsubscribe cleanup function
  return () => {
    isSubscribed = false;
    if (broadcastChannel) {
      broadcastChannel.removeEventListener('message', handleBcMessage);
    }
    window.removeEventListener('studentbridge_datachange', handleDomEvent);
    if (eventSource) {
      eventSource.close();
    }
  };
}
