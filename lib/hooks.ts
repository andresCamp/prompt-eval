"use client";

import { useAtom } from "jotai";
import { RESET } from "jotai/utils";
import { snapshotAtomFamily, moduleSnapshotAtomFamily, type GenerateObjectSnapshot, type ModuleSnapshot } from "@/lib/atoms";

/**
 * usePersistentLock
 * Unified lock manager. There is no explicit lock atom; the existence of a snapshot implies "locked".
 * Pass an id (storage key) and optional type ('cell' | 'module') to operate.
 */
export function usePersistentLock(id: string, type: "cell" | "module" = "cell") {
  // Always create both atoms so hooks order is stable
  const [cellSnap, setCellSnap] = useAtom(snapshotAtomFamily(id));
  const [moduleSnap, setModuleSnap] = useAtom(moduleSnapshotAtomFamily(id));

  const isModule = type === "module";
  const snap = (isModule ? moduleSnap : cellSnap) as GenerateObjectSnapshot | ModuleSnapshot | null;
  const setSnap = isModule ? setModuleSnap : setCellSnap;

  const isLocked = !!snap;
  const lockWith = (snapshot: GenerateObjectSnapshot | ModuleSnapshot) => setSnap(snapshot as GenerateObjectSnapshot & ModuleSnapshot);
  const unlock = () => setSnap(RESET as unknown as GenerateObjectSnapshot & ModuleSnapshot);

  return { isLocked, lockWith, unlock };
}


