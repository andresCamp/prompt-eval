'use client';

import { useAtom, useSetAtom } from 'jotai';
import { LockButton } from './LockButton';
import { getCellSnapshotAtoms } from '@/lib/atoms/snapshot-atoms';
import { compareCellSnapshots } from '@/lib/utils/snapshot';
import { useEffect, useMemo, useState } from 'react';

const DEBUG = true;

interface CellLockButtonProps {
  pageId: string;
  rowId: string;
  columnId: string;
  executionId: string;
  currentResult: {
    content: string;
    model: string;
    timestamp: number;
    usage?: {
      promptTokens: number;
      completionTokens: number;
      totalTokens: number;
    };
  };
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export function CellLockButton({
  pageId,
  rowId,
  columnId,
  executionId,
  currentResult,
  className,
  size = 'sm',
}: CellLockButtonProps) {
  const atoms = useMemo(() => {
    if (DEBUG) {
      console.log('[CellLockButton] Getting atoms:', {
        pageId,
        rowId,
        columnId,
        executionId
      });
    }
    return getCellSnapshotAtoms(pageId, rowId, columnId, executionId);
  }, [pageId, rowId, columnId, executionId]);

  const [snapshot] = useAtom(atoms.snapshotAtom);
  const [isLocked] = useAtom(atoms.isLockedAtom);
  const lock = useSetAtom(atoms.lockAtom);
  const unlock = useSetAtom(atoms.unlockAtom);
  
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (DEBUG) {
      console.log('[CellLockButton] Snapshot state:', {
        rowId,
        columnId,
        hasSnapshot: snapshot !== null,
        isLocked,
        snapshotKeys: snapshot ? Object.keys(snapshot) : null,
        snapshotResult: snapshot?.result ? Object.keys(snapshot.result) : null
      });
    }
  }, [snapshot, isLocked, rowId, columnId]);

  useEffect(() => {
    if (!snapshot || !isLocked) {
      setHasChanges(false);
      return;
    }

    const comparison = compareCellSnapshots(
      snapshot,
      {
        metadata: snapshot.metadata,
        rowId,
        columnId,
        executionId,
        result: currentResult,
        isLocked: true,
      }
    );

    if (DEBUG) {
      console.log('[CellLockButton] Comparison result:', {
        rowId,
        columnId,
        hasChanges: comparison.hasChanges,
        totalChanges: comparison.totalChanges
      });
    }

    setHasChanges(comparison.hasChanges);
  }, [snapshot, currentResult, isLocked, rowId, columnId, executionId]);

  const handleLock = () => {
    if (DEBUG) {
      console.log('[CellLockButton] Locking:', {
        rowId,
        columnId,
        executionId,
        currentResult,
        resultKeys: Object.keys(currentResult)
      });
    }
    lock(currentResult);
  };

  const handleUnlock = () => {
    if (DEBUG) {
      console.log('[CellLockButton] Unlocking:', { rowId, columnId, executionId });
    }
    unlock();
  };

  return (
    <LockButton
      isLocked={isLocked}
      hasChanges={hasChanges}
      onLock={handleLock}
      onUnlock={handleUnlock}
      size={size}
      className={className}
      showTooltip={true}
    />
  );
}