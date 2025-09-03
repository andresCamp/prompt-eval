"use client";

import { atom } from "jotai";
import { atomWithStorage, createJSONStorage } from "jotai/utils";
import type {
  GenerateObjectExecutionThread,
  GenerateObjectModelThread,
  SchemaThread,
  SystemPromptThread,
  PromptDataThread,
  GenerateObjectResult,
} from "@/components/generate-object-playground/types";

// Simple atomFamily helper (avoids bringing an extra util)
function atomFamily<Param, Value>(
  init: (param: Param) => Value
) {
  const cache = new Map<string, Value>();
  return (param: Param) => {
    const key = JSON.stringify(param);
    if (cache.has(key)) return cache.get(key) as Value;
    const value = init(param);
    cache.set(key, value);
    return value;
  };
}

// Storage namespace helpers
function getPageNamespace(): string {
  if (typeof window !== 'undefined') {
    const ns = (window as unknown as { __PAGE_NS__?: string }).__PAGE_NS__;
    return ns || 'root';
  }
  return 'root';
}

function createPageScopedStorage() {
  return {
    getItem: (key: string) => {
      if (typeof window === 'undefined') return null;
      const ns = getPageNamespace();
      return localStorage.getItem(`snapshot:${ns}:${key}`);
    },
    setItem: (key: string, value: string) => {
      if (typeof window === 'undefined') return;
      const ns = getPageNamespace();
      localStorage.setItem(`snapshot:${ns}:${key}`, value);
    },
    removeItem: (key: string) => {
      if (typeof window === 'undefined') return;
      const ns = getPageNamespace();
      localStorage.removeItem(`snapshot:${ns}:${key}`);
    },
  };
}

const storage = createPageScopedStorage();
const snapKey = (key: string) => `go-snap:${key}`;
const modSnapKey = (key: string) => `go-mod-snap:${key}`;

export interface GenerateObjectSnapshot {
  threadId: string;
  modelThread: GenerateObjectModelThread;
  schemaThread: SchemaThread;
  systemPromptThread: SystemPromptThread;
  promptDataThread: PromptDataThread;
  result?: GenerateObjectResult;
  timestamp: number;
}

// Per-thread snapshot with persistence
export const snapshotAtomFamily = atomFamily((key: string) =>
  atomWithStorage<GenerateObjectSnapshot | null>(snapKey(key), null, storage)
);

// Utility to build a snapshot from a runtime thread
export function buildSnapshotFromThread(
  thread: GenerateObjectExecutionThread
): GenerateObjectSnapshot {
  return {
    threadId: thread.id,
    modelThread: thread.modelThread,
    schemaThread: thread.schemaThread,
    systemPromptThread: thread.systemPromptThread,
    promptDataThread: thread.promptDataThread,
    result: thread.result,
    timestamp: Date.now(),
  };
}

// Stable key for a GenerateObject execution column (persists across reloads)
export function getGenerateObjectThreadKey(
  thread: GenerateObjectExecutionThread,
  namespace?: string
): string {
  const base = [
    thread.modelThread.name,
    thread.schemaThread.name,
    thread.systemPromptThread.name,
    thread.promptDataThread.name,
  ].join("|#|");
  return namespace ? `${namespace}:${base}` : base;
}

// ---------------------------------------------
// Module-level (thread editors) locking & snapshots
// ---------------------------------------------

export type ModuleSection = 'model' | 'schema' | 'system' | 'prompt';

export type ModelModuleSnapshot = Pick<GenerateObjectModelThread, 'name' | 'provider' | 'model' | 'visible'> & { id?: string };
export type SchemaModuleSnapshot = Pick<SchemaThread, 'name' | 'schema' | 'schemaDescription' | 'visible'> & { id?: string };
export type SystemModuleSnapshot = Pick<SystemPromptThread, 'name' | 'prompt' | 'visible'> & { id?: string };
export type PromptModuleSnapshot = Pick<PromptDataThread, 'name' | 'prompt' | 'visible'> & { id?: string };

export type ModuleSnapshot =
  | { section: 'model'; data: ModelModuleSnapshot }
  | { section: 'schema'; data: SchemaModuleSnapshot }
  | { section: 'system'; data: SystemModuleSnapshot }
  | { section: 'prompt'; data: PromptModuleSnapshot };

export const moduleSnapshotAtomFamily = atomFamily((key: string) =>
  atomWithStorage<ModuleSnapshot | null>(modSnapKey(key), null, storage)
);

export function getModuleKey(
  section: ModuleSection,
  thread: GenerateObjectModelThread | SchemaThread | SystemPromptThread | PromptDataThread,
  namespace?: string
): string {
  const base = `${section}|#|${thread.name}`;
  return namespace ? `${namespace}:${base}` : base;
}

export function buildModuleSnapshot(
  section: ModuleSection,
  thread: GenerateObjectModelThread | SchemaThread | SystemPromptThread | PromptDataThread
): ModuleSnapshot {
  if (section === 'model') {
    const t = thread as GenerateObjectModelThread;
    return { section, data: { id: t.id, name: t.name, provider: t.provider, model: t.model, visible: t.visible } };
  }
  if (section === 'schema') {
    const t = thread as SchemaThread;
    return { section, data: { id: t.id, name: t.name, schema: t.schema, schemaDescription: t.schemaDescription, visible: t.visible } };
  }
  if (section === 'system') {
    const t = thread as SystemPromptThread;
    return { section, data: { id: t.id, name: t.name, prompt: t.prompt, visible: t.visible } };
  }
  // prompt
  const t = thread as PromptDataThread;
  return { section, data: { id: t.id, name: t.name, prompt: t.prompt, visible: t.visible } };
}

// Helpers to compute actual storage keys used by atomWithStorage for presence checks
export function getSnapshotStorageKey(key: string): string {
  const ns = getPageNamespace();
  return `snapshot:${ns}:${snapKey(key)}`;
}

export function getModuleSnapshotStorageKey(key: string): string {
  const ns = getPageNamespace();
  return `snapshot:${ns}:${modSnapKey(key)}`;
}


