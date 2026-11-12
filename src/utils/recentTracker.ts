import { GOVERNMENT_DOC_TYPES, GovernmentDocType } from './filenameGenerator';

export interface TrackedDownloadRecord {
  id: string;
  docType: GovernmentDocType;
  stampNumber: string;
  fullStampText: string;
  filename: string;
  subject: string;
  downloadedAt: string; // ISO timestamp
  selectedPages: number[];
  totalPages: number;
}

export interface RecentTrackerState {
  lastByType: Partial<Record<GovernmentDocType, TrackedDownloadRecord>>;
  history: TrackedDownloadRecord[];
}

const STORAGE_KEY = 'docstamp_recent_tracker_v1';
const MAX_HISTORY_ITEMS = 30;

export function createEmptyTrackerState(): RecentTrackerState {
  return {
    lastByType: {},
    history: [],
  };
}

export function loadRecentTracker(): RecentTrackerState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return createEmptyTrackerState();
    const parsed = JSON.parse(raw) as RecentTrackerState;
    return {
      lastByType: parsed?.lastByType || {},
      history: Array.isArray(parsed?.history) ? parsed.history : [],
    };
  } catch (err) {
    console.warn('Could not read recent tracker from localStorage:', err);
    return createEmptyTrackerState();
  }
}

export function saveRecentTracker(state: RecentTrackerState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (err) {
    console.warn('Could not save recent tracker to localStorage:', err);
  }
}

export function recordStampedDownload(
  currentState: RecentTrackerState,
  entry: Omit<TrackedDownloadRecord, 'id' | 'downloadedAt'>
): RecentTrackerState {
  const newRecord: TrackedDownloadRecord = {
    ...entry,
    id: `trk_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    downloadedAt: new Date().toISOString(),
  };

  const nextState: RecentTrackerState = {
    lastByType: {
      ...currentState.lastByType,
      [entry.docType]: newRecord,
    },
    history: [newRecord, ...currentState.history].slice(0, MAX_HISTORY_ITEMS),
  };

  saveRecentTracker(nextState);
  return nextState;
}

export function clearRecentTracker(): RecentTrackerState {
  const empty = createEmptyTrackerState();
  saveRecentTracker(empty);
  return empty;
}

export function removeTrackedHistoryItem(
  currentState: RecentTrackerState,
  id: string
): RecentTrackerState {
  const remainingHistory = currentState.history.filter((item) => item.id !== id);
  const nextLastByType: Partial<Record<GovernmentDocType, TrackedDownloadRecord>> = {};

  for (const type of GOVERNMENT_DOC_TYPES) {
    const latestForType = remainingHistory.find((item) => item.docType === type);
    if (latestForType) {
      nextLastByType[type] = latestForType;
    }
  }

  const nextState: RecentTrackerState = {
    lastByType: nextLastByType,
    history: remainingHistory,
  };
  saveRecentTracker(nextState);
  return nextState;
}

export function formatRelativeTime(isoString: string): string {
  try {
    const timestamp = new Date(isoString).getTime();
    const diffSec = Math.floor((Date.now() - timestamp) / 1000);
    if (diffSec < 10) return 'Just now';
    if (diffSec < 60) return `${diffSec}s ago`;
    const diffMin = Math.floor(diffSec / 60);
    if (diffMin < 60) return `${diffMin}m ago`;
    const diffHr = Math.floor(diffMin / 60);
    if (diffHr < 24) return `${diffHr}h ago`;
    const diffDays = Math.floor(diffHr / 24);
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Date(isoString).toLocaleDateString();
  } catch {
    return '';
  }
}

export function formatFullTimestamp(isoString: string): string {
  try {
    return new Date(isoString).toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}
