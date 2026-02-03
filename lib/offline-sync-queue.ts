// Offline-first sync queue for cross-device sync
// Queues operations when offline, syncs when online

interface SyncQueueItem {
  id: string;
  operation: 'add_like' | 'remove_like' | 'add_bookmark' | 'remove_bookmark' | 'add_history' | 'add_search';
  table_name: string;
  video_id?: string;
  data: any;
  created_at: number;
  synced: boolean;
}

const QUEUE_KEY = 'pulse-sync-queue';
const MAX_QUEUE_SIZE = 1000;

/**
 * Add an operation to the offline sync queue
 */
export function addToOfflineQueue(
  operation: SyncQueueItem['operation'],
  tableName: string,
  data: any,
  videoId?: string
): SyncQueueItem {
  const queue = getOfflineQueue();

  const item: SyncQueueItem = {
    id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    operation,
    table_name: tableName,
    video_id: videoId,
    data,
    created_at: Date.now(),
    synced: false,
  };

  queue.push(item);

  // Keep queue size manageable
  if (queue.length > MAX_QUEUE_SIZE) {
    queue.shift();
  }

  localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  return item;
}

/**
 * Get all unsynced items from the offline queue
 */
export function getOfflineQueue(): SyncQueueItem[] {
  if (typeof window === 'undefined') return [];

  try {
    const queue = localStorage.getItem(QUEUE_KEY);
    return queue ? JSON.parse(queue) : [];
  } catch (error) {
    console.error('Error reading offline queue:', error);
    return [];
  }
}

/**
 * Get unsynced items from the offline queue
 */
export function getUnsyncedQueueItems(): SyncQueueItem[] {
  return getOfflineQueue().filter((item) => !item.synced);
}

/**
 * Mark an item as synced
 */
export function markQueueItemAsSynced(itemId: string): void {
  const queue = getOfflineQueue();
  const item = queue.find((q) => q.id === itemId);

  if (item) {
    item.synced = true;
    localStorage.setItem(QUEUE_KEY, JSON.stringify(queue));
  }
}

/**
 * Clear synced items from the queue
 */
export function clearSyncedQueueItems(): void {
  const queue = getOfflineQueue();
  const unsyncedQueue = queue.filter((item) => !item.synced);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(unsyncedQueue));
}

/**
 * Remove a specific item from the queue
 */
export function removeQueueItem(itemId: string): void {
  const queue = getOfflineQueue();
  const filteredQueue = queue.filter((item) => item.id !== itemId);
  localStorage.setItem(QUEUE_KEY, JSON.stringify(filteredQueue));
}

/**
 * Clear the entire queue
 */
export function clearOfflineQueue(): void {
  localStorage.removeItem(QUEUE_KEY);
}

/**
 * Sync all unsynced items with the backend
 */
export async function syncOfflineQueue(
  getAuthToken: () => Promise<string>
): Promise<{ synced: number; failed: number }> {
  const unsyncedItems = getUnsyncedQueueItems();

  if (unsyncedItems.length === 0) {
    return { synced: 0, failed: 0 };
  }

  let synced = 0;
  let failed = 0;

  for (const item of unsyncedItems) {
    try {
      const token = await getAuthToken();

      // Map queue operations to API endpoints
      const endpoint =
        item.operation.includes('like') || item.operation.includes('bookmark')
          ? `/api/sync/${item.operation.includes('like') ? 'liked' : 'bookmarks'}`
          : item.operation.includes('history')
            ? '/api/sync/history'
            : '/api/sync/search';

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: item.operation.includes('add') ? 'add' : 'remove',
          track: item.data,
          query: item.operation === 'add_search' ? item.data.query : undefined,
        }),
      });

      if (response.ok) {
        markQueueItemAsSynced(item.id);
        synced++;
      } else {
        failed++;
        console.error(`Failed to sync queue item ${item.id}:`, await response.text());
      }
    } catch (error) {
      failed++;
      console.error(`Error syncing queue item ${item.id}:`, error);
    }
  }

  // Clean up synced items
  clearSyncedQueueItems();

  return { synced, failed };
}

/**
 * Check if there are unsynced items
 */
export function hasUnsyncedItems(): boolean {
  return getUnsyncedQueueItems().length > 0;
}

/**
 * Get queue statistics
 */
export function getQueueStats() {
  const queue = getOfflineQueue();
  const unsynced = getUnsyncedQueueItems();

  return {
    total: queue.length,
    unsynced: unsynced.length,
    synced: queue.length - unsynced.length,
  };
}
