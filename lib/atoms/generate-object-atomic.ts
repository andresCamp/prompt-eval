import { atom } from 'jotai'
import { atomFamily, atomWithStorage, RESET } from 'jotai/utils'
import { generateId } from '@/components/prompt-playground/shared/utils'
import type { 
  GenerateObjectModelThread, 
  SchemaThread, 
  SystemPromptThread, 
  PromptDataThread, 
  GenerateObjectExecutionThread 
} from '@/components/generate-object-playground/types'

// Thread ID lists - these track which threads exist
export const modelThreadIdsAtom = atomWithStorage<string[]>('generate-object-model-thread-ids', [])
export const schemaThreadIdsAtom = atomWithStorage<string[]>('generate-object-schema-thread-ids', [])
export const systemPromptThreadIdsAtom = atomWithStorage<string[]>('generate-object-system-thread-ids', [])
export const promptDataThreadIdsAtom = atomWithStorage<string[]>('generate-object-prompt-thread-ids', [])

// Individual thread atom families - each thread is its own atom
export const modelThreadAtomFamily = atomFamily((threadId: string) =>
  atomWithStorage<GenerateObjectModelThread | null>(`generate-object-model-${threadId}`, null)
)

export const schemaThreadAtomFamily = atomFamily((threadId: string) =>
  atomWithStorage<SchemaThread | null>(`generate-object-schema-${threadId}`, null)
)

export const systemPromptThreadAtomFamily = atomFamily((threadId: string) =>
  atomWithStorage<SystemPromptThread | null>(`generate-object-system-${threadId}`, null)
)

export const promptDataThreadAtomFamily = atomFamily((threadId: string) =>
  atomWithStorage<PromptDataThread | null>(`generate-object-prompt-${threadId}`, null)
)

// Global settings atom
export const globalSettingsAtom = atomWithStorage('generate-object-settings', {
  temperature: 0.7,
  outputMode: 'object' as const
})

// Derived atoms - compute collections from individual threads
export const modelThreadsAtom = atom(
  (get) => {
    const ids = get(modelThreadIdsAtom)
    return ids.map(id => get(modelThreadAtomFamily(id))).filter(Boolean) as GenerateObjectModelThread[]
  }
)

export const schemaThreadsAtom = atom(
  (get) => {
    const ids = get(schemaThreadIdsAtom)
    return ids.map(id => get(schemaThreadAtomFamily(id))).filter(Boolean) as SchemaThread[]
  }
)

export const systemPromptThreadsAtom = atom(
  (get) => {
    const ids = get(systemPromptThreadIdsAtom)
    return ids.map(id => get(systemPromptThreadAtomFamily(id))).filter(Boolean) as SystemPromptThread[]
  }
)

export const promptDataThreadsAtom = atom(
  (get) => {
    const ids = get(promptDataThreadIdsAtom)
    return ids.map(id => get(promptDataThreadAtomFamily(id))).filter(Boolean) as PromptDataThread[]
  }
)

// Execution threads atom - computed from all thread combinations
export const executionThreadsAtom = atom(
  (get) => {
    const modelThreads = get(modelThreadsAtom).filter(t => t.visible)
    const schemaThreads = get(schemaThreadsAtom).filter(t => t.visible)
    const systemThreads = get(systemPromptThreadsAtom).filter(t => t.visible)
    const promptThreads = get(promptDataThreadsAtom).filter(t => t.visible)
    
    const executionThreads: GenerateObjectExecutionThread[] = []
    
    modelThreads.forEach(modelThread => {
      schemaThreads.forEach(schemaThread => {
        systemThreads.forEach(systemThread => {
          promptThreads.forEach(promptThread => {
            const name = `${modelThread.name} × ${schemaThread.name} × ${systemThread.name} × ${promptThread.name}`
            executionThreads.push({
              id: `${modelThread.id}-${schemaThread.id}-${systemThread.id}-${promptThread.id}`,
              name,
              modelThread,
              schemaThread,
              systemPromptThread: systemThread,
              promptDataThread: promptThread,
              visible: true,
              isRunning: false
            })
          })
        })
      })
    })
    
    return executionThreads
  }
)

// Helper atoms for adding threads
export const addModelThreadAtom = atom(
  null,
  (get, set) => {
    const currentIds = get(modelThreadIdsAtom)
    const newId = generateId()
    const newThread: GenerateObjectModelThread = {
      id: newId,
      name: `Model ${currentIds.length + 1}`,
      provider: 'openai',
      model: 'gpt-4o',
      visible: true
    }
    
    // Add to ID list
    set(modelThreadIdsAtom, [...currentIds, newId])
    // Create the thread
    set(modelThreadAtomFamily(newId), newThread)
  }
)

export const addSchemaThreadAtom = atom(
  null,
  (get, set) => {
    const currentIds = get(schemaThreadIdsAtom)
    const newId = generateId()
    const newThread: SchemaThread = {
      id: newId,
      name: `Schema ${currentIds.length + 1}`,
      schema: `z.object({
  name: z.string(),
  description: z.string(),
  category: z.string(),
  price: z.number(),
  inStock: z.boolean()
})`,
      visible: true
    }
    
    set(schemaThreadIdsAtom, [...currentIds, newId])
    set(schemaThreadAtomFamily(newId), newThread)
  }
)

export const addSystemPromptThreadAtom = atom(
  null,
  (get, set) => {
    const currentIds = get(systemPromptThreadIdsAtom)
    const newId = generateId()
    const newThread: SystemPromptThread = {
      id: newId,
      name: `System ${currentIds.length + 1}`,
      prompt: 'You are a data transformation assistant. Transform the input data into the specified schema format.',
      visible: true
    }
    
    set(systemPromptThreadIdsAtom, [...currentIds, newId])
    set(systemPromptThreadAtomFamily(newId), newThread)
  }
)

export const addPromptDataThreadAtom = atom(
  null,
  (get, set) => {
    const currentIds = get(promptDataThreadIdsAtom)
    const newId = generateId()
    const newThread: PromptDataThread = {
      id: newId,
      name: `Prompt ${currentIds.length + 1}`,
      prompt: `{
  "title": "Sample Product",
  "details": "Product description",
  "type": "Category",
  "cost": 0,
  "available": true
}`,
      visible: true
    }
    
    set(promptDataThreadIdsAtom, [...currentIds, newId])
    set(promptDataThreadAtomFamily(newId), newThread)
  }
)

// Helper atoms for updating threads
export const updateModelThreadAtom = atom(
  null,
  (get, set, { threadId, updates }: { threadId: string; updates: Partial<GenerateObjectModelThread> }) => {
    const currentThread = get(modelThreadAtomFamily(threadId))
    if (currentThread) {
      set(modelThreadAtomFamily(threadId), { ...currentThread, ...updates })
    }
  }
)

export const updateSchemaThreadAtom = atom(
  null,
  (get, set, { threadId, updates }: { threadId: string; updates: Partial<SchemaThread> }) => {
    const currentThread = get(schemaThreadAtomFamily(threadId))
    if (currentThread) {
      set(schemaThreadAtomFamily(threadId), { ...currentThread, ...updates })
    }
  }
)

export const updateSystemPromptThreadAtom = atom(
  null,
  (get, set, { threadId, updates }: { threadId: string; updates: Partial<SystemPromptThread> }) => {
    const currentThread = get(systemPromptThreadAtomFamily(threadId))
    if (currentThread) {
      set(systemPromptThreadAtomFamily(threadId), { ...currentThread, ...updates })
    }
  }
)

export const updatePromptDataThreadAtom = atom(
  null,
  (get, set, { threadId, updates }: { threadId: string; updates: Partial<PromptDataThread> }) => {
    const currentThread = get(promptDataThreadAtomFamily(threadId))
    if (currentThread) {
      set(promptDataThreadAtomFamily(threadId), { ...currentThread, ...updates })
    }
  }
)

// Helper atoms for deleting threads
export const deleteModelThreadAtom = atom(
  null,
  (get, set, threadId: string) => {
    const currentIds = get(modelThreadIdsAtom)
    // Remove from ID list
    set(modelThreadIdsAtom, currentIds.filter(id => id !== threadId))
    // Clean up the atom
    set(modelThreadAtomFamily(threadId), RESET)
    modelThreadAtomFamily.remove(threadId)
  }
)

export const deleteSchemaThreadAtom = atom(
  null,
  (get, set, threadId: string) => {
    const currentIds = get(schemaThreadIdsAtom)
    set(schemaThreadIdsAtom, currentIds.filter(id => id !== threadId))
    set(schemaThreadAtomFamily(threadId), RESET)
    schemaThreadAtomFamily.remove(threadId)
  }
)

export const deleteSystemPromptThreadAtom = atom(
  null,
  (get, set, threadId: string) => {
    const currentIds = get(systemPromptThreadIdsAtom)
    set(systemPromptThreadIdsAtom, currentIds.filter(id => id !== threadId))
    set(systemPromptThreadAtomFamily(threadId), RESET)
    systemPromptThreadAtomFamily.remove(threadId)
  }
)

export const deletePromptDataThreadAtom = atom(
  null,
  (get, set, threadId: string) => {
    const currentIds = get(promptDataThreadIdsAtom)
    set(promptDataThreadIdsAtom, currentIds.filter(id => id !== threadId))
    set(promptDataThreadAtomFamily(threadId), RESET)
    promptDataThreadAtomFamily.remove(threadId)
  }
)

// Initialize defaults if empty
export const initializeDefaultsAtom = atom(
  null,
  (get, set) => {
    const modelIds = get(modelThreadIdsAtom)
    const schemaIds = get(schemaThreadIdsAtom)  
    const systemIds = get(systemPromptThreadIdsAtom)
    const promptIds = get(promptDataThreadIdsAtom)
    
    if (modelIds.length === 0) {
      set(addModelThreadAtom)
    }
    
    if (schemaIds.length === 0) {
      set(addSchemaThreadAtom)
    }
    
    if (systemIds.length === 0) {
      set(addSystemPromptThreadAtom)
    }
    
    if (promptIds.length === 0) {
      set(addPromptDataThreadAtom)
    }
  }
)