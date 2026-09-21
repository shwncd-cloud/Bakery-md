/// Local queue for the two actions the architecture flagged as needing to
/// survive a brief connectivity drop: taking an order and recording a
/// payment. Not a general-purpose offline mode - just damage control for
/// short gaps, per the scope agreed during design.
export interface QueuedRequest {
  id: string;
  method: 'POST' | 'PATCH' | 'DELETE';
  path: string;
  body?: unknown;
  createdAt: number;
  kind: 'order-item' | 'payment';
}

const STORAGE_KEY = 'hornillas_outbox_v1';

export function getQueue(): QueuedRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as QueuedRequest[]) : [];
  } catch {
    return [];
  }
}

function saveQueue(queue: QueuedRequest[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Storage full or unavailable - nothing more we can do locally.
  }
}

export function enqueue(entry: Omit<QueuedRequest, 'id' | 'createdAt'>): QueuedRequest {
  const queued: QueuedRequest = { ...entry, id: crypto.randomUUID(), createdAt: Date.now() };
  saveQueue([...getQueue(), queued]);
  return queued;
}

export function removeFromQueue(id: string) {
  saveQueue(getQueue().filter((item) => item.id !== id));
}

export function queueLength(): number {
  return getQueue().length;
}
