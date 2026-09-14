// ============================================================================
// STUDENT BRIDGE — CLIENT-SIDE REALTIME CLOUD SYNC
// Zero-dependency, browser-safe, and edge-compatible.
// Publishes and listens to the Global Cloud Sync Bus via fetch and SSE.
// ============================================================================

export const SYNC_TOPIC = "sb_prod_sync_miskrdires12_v1";
export const SYNC_BASE_URL = `https://ntfy.sh/${SYNC_TOPIC}`;

export interface SyncPayload {
  action: "UPSERT" | "DELETE" | "CLEAR" | "PHOTO_RETAKE_REQUIRED" | "RESEND_PHOTO_REQUEST" | "RESEND_PHOTO";
  student?: any;
  studentId?: string;
  fullName?: string;
  photoPath?: string;
  message?: string;
  timestamp: number;
}

/**
 * Publishes an upsert, deletion, or photo-retake event to the Global Cloud Sync Bus.
 * Safe to call from any client component or browser.
 */
export async function publishStudentSync(
  action: "UPSERT" | "DELETE" | "CLEAR" | "PHOTO_RETAKE_REQUIRED" | "RESEND_PHOTO_REQUEST" | "RESEND_PHOTO",
  studentOrId?: any
): Promise<boolean> {
  try {
    const payload: SyncPayload = {
      action,
      student: action === "UPSERT" ? studentOrId : undefined,
      studentId:
        action === "DELETE" || action === "PHOTO_RETAKE_REQUIRED" || action === "RESEND_PHOTO_REQUEST"
          ? typeof studentOrId === "string"
            ? studentOrId
            : studentOrId?.studentId
          : studentOrId?.studentId,
      fullName: studentOrId?.fullName,
      photoPath: studentOrId?.photoPath,
      message: studentOrId?.message,
      timestamp: Date.now(),
    };

    const res = await fetch(SYNC_BASE_URL, {
      method: "POST",
      headers: {
        Title: action === "PHOTO_RETAKE_REQUIRED" ? "PHOTO_RETAKE_REQUIRED" : `STUDENT_${action}`,
        Priority: "urgent",
        Tags: action === "PHOTO_RETAKE_REQUIRED" ? "warning,camera,retake" : "student,sync",
      },
      body: JSON.stringify(payload),
      cache: "no-store",
    });

    return res.ok;
  } catch (err) {
    console.warn("Notice: Client cloud sync publish skipped or offline:", err);
    return false;
  }
}

/**
 * Client-Side Hook: Subscribes to real-time push events from the Cloud Sync Bus.
 * Instantly triggers when any student is enrolled from any device (e.g. mobile phone).
 */
export function subscribeToCloudSync(
  onStudentUpsert: (student: any) => void,
  onStudentDelete?: (studentId: string) => void,
  onClearAll?: () => void,
  onRawEvent?: (payload: SyncPayload) => void
): () => void {
  if (typeof window === "undefined") return () => {};

  let eventSource: EventSource | null = null;
  let isClosed = false;

  try {
    eventSource = new EventSource(`${SYNC_BASE_URL}/sse`);

    eventSource.onmessage = async (e) => {
      if (isClosed) return;
      try {
        const item = JSON.parse(e.data);
        let payload: SyncPayload | null = null;

        if (item.attachment && item.attachment.url) {
          try {
            const attRes = await fetch(item.attachment.url);
            if (attRes.ok) payload = await attRes.json();
          } catch {}
        }

        if (!payload && item.message) {
          try {
            payload = JSON.parse(item.message);
          } catch {}
        }

        if (!payload || !payload.action) return;

        if (onRawEvent) {
          try {
            onRawEvent(payload);
          } catch {}
        }

        if (payload.action === "UPSERT" && payload.student) {
          onStudentUpsert(payload.student);
        } else if (payload.action === "DELETE" && payload.studentId && onStudentDelete) {
          onStudentDelete(payload.studentId);
        } else if (payload.action === "CLEAR" && onClearAll) {
          onClearAll();
        } else if (payload.action === "PHOTO_RETAKE_REQUIRED") {
          if (typeof window !== "undefined") {
            window.dispatchEvent(
              new CustomEvent("siliconlabs_notification", {
                detail: {
                  title: "Low Internet: Retake Photo",
                  desc:
                    payload.message ||
                    `Photo transmission failed for ${payload.fullName || payload.studentId}. Auto-deleted from receiver. Sender: please retake photo.`,
                  type: "warning",
                },
              })
            );
            window.dispatchEvent(
              new CustomEvent("siliconlabs_photo_retake_required", {
                detail: payload,
              })
            );
          }
        }
      } catch {}
    };

    eventSource.onerror = () => {
      // EventSource automatically retries on network disconnect
    };
  } catch {}

  return () => {
    isClosed = true;
    if (eventSource) {
      eventSource.close();
    }
  };
}
