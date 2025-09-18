export interface SnapshotMetadata {
  id: string;
  timestamp: number;
  version: number;
  hash: string;
  pageId: string;
  userId?: string;
}

export interface ThreadSnapshot<T = any> {
  metadata: SnapshotMetadata;
  type: 'model' | 'data' | 'system' | 'initial' | 'user';
  threadId: string;
  value: T;
  isLocked: boolean;
}

export interface CellSnapshot {
  metadata: SnapshotMetadata;
  rowId: string;
  columnId: string;
  executionId: string;
  result: {
    content: string;
    model: string;
    timestamp: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  isLocked: boolean;
}

export interface ModuleSnapshot {
  metadata: SnapshotMetadata;
  threads: {
    models: ThreadSnapshot[];
    data: ThreadSnapshot[];
    systemPrompts: ThreadSnapshot[];
    initialMessages: ThreadSnapshot[];
    userMessages: ThreadSnapshot[];
  };
  cells: CellSnapshot[];
}

export interface SnapshotDiff<T = any> {
  type: 'added' | 'removed' | 'modified' | 'unchanged';
  path: string;
  oldValue?: T;
  newValue?: T;
  changes?: SnapshotDiff[];
}

export interface SnapshotComparison {
  hasChanges: boolean;
  totalChanges: number;
  diffs: SnapshotDiff[];
  summary: {
    added: number;
    removed: number;
    modified: number;
    unchanged: number;
  };
}

export type SnapshotState = 'unlocked' | 'locked' | 'modified' | 'error';

export interface SnapshotManager {
  lock: () => void;
  unlock: () => void;
  reset: () => void;
  compare: () => SnapshotComparison | null;
  getState: () => SnapshotState;
  hasSnapshot: () => boolean;
}