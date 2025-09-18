'use client';

import { useAtom, useSetAtom } from 'jotai';
import { LockButton } from './LockButton';
import { getThreadSnapshotAtoms } from '@/lib/atoms/snapshot-atoms';
import { compareThreadSnapshots } from '@/lib/utils/snapshot';
import { useEffect, useMemo, useState } from 'react';

const DEBUG = true;

interface ThreadLockButtonProps {
  pageId: string;
  threadType: 'model' | 'data' | 'system' | 'initial' | 'user';
  threadId: string;
  currentValue: unknown;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
  onLockChange?: (isLocked: boolean) => void;
}

export function ThreadLockButton({
  pageId,
  threadType,
  threadId,
  currentValue,
  className,
  size = 'sm',
  onLockChange,
}: ThreadLockButtonProps) {
  const atoms = useMemo(() => {
    if (DEBUG) {
      console.log('[ThreadLockButton] Getting atoms:', {
        pageId,
        threadType,
        threadId
      });
    }
    return getThreadSnapshotAtoms(pageId, threadType, threadId);
  }, [pageId, threadType, threadId]);

  const [snapshot] = useAtom(atoms.snapshotAtom);
  const [isLocked] = useAtom(atoms.isLockedAtom);
  const lock = useSetAtom(atoms.lockAtom);
  const unlock = useSetAtom(atoms.unlockAtom);
  
  const [hasChanges, setHasChanges] = useState(false);

  useEffect(() => {
    if (DEBUG) {
      console.log('[ThreadLockButton] Lock state changed:', {
        threadId,
        isLocked,
        snapshot: snapshot ? Object.keys(snapshot) : null
      });
    }
    onLockChange?.(isLocked);
  }, [isLocked, onLockChange, threadId, snapshot]);

  useEffect(() => {
    if (!snapshot || !isLocked) {
      setHasChanges(false);
      return;
    }

    const comparison = compareThreadSnapshots(
      snapshot,
      {
        metadata: snapshot.metadata,
        type: threadType,
        threadId,
        value: currentValue,
        isLocked: true,
      }
    );

    if (DEBUG) {
      console.log('[ThreadLockButton] Comparison result:', {
        threadId,
        hasChanges: comparison.hasChanges,
        totalChanges: comparison.totalChanges
      });
    }

    setHasChanges(comparison.hasChanges);
  }, [snapshot, currentValue, isLocked, threadType, threadId]);

  const handleLock = () => {
    if (DEBUG) {
      console.log('[ThreadLockButton] Locking:', {
        threadId,
        currentValue,
        valueType: typeof currentValue,
        valueKeys: currentValue ? Object.keys(currentValue) : null
      });
    }
    lock(currentValue);
  };

  const handleUnlock = () => {
    if (DEBUG) {
      console.log('[ThreadLockButton] Unlocking:', { threadId });
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