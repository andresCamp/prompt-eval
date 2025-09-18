/**
 * @fileoverview Configuration section containing all collapsible prompt cards
 */

import { Database, Settings, MessageSquare, User } from 'lucide-react';
import { CollapsibleCard } from './shared/CollapsibleCard';

/**
 * Props for ConfigSection component
 */
interface ConfigSectionProps {
  // Content state
  biographerData: string;
  systemPrompt: string;
  initialMessage: string;
  userMessage: string;
  
  // Open/close state
  openSections: {
    data: boolean;
    systemPrompt: boolean;
    initialMessage: boolean;
    userMessage: boolean;
  };
  
  // Copy state
  copiedStates: Record<string, boolean>;
  
  // Handlers
  onToggleSection: (section: 'data' | 'systemPrompt' | 'initialMessage' | 'userMessage') => void;
  onSystemPromptChange: (value: string) => void;
  onInitialMessageChange: (value: string) => void;
  onUserMessageChange: (value: string) => void;
  onCopy: (text: string, buttonId: string) => void;
}

/**
 * Configuration section containing all collapsible prompt cards
 * Includes Data, System Prompt, Initial Message, and User Message cards
 */
export function ConfigSection({
  biographerData,
  systemPrompt,
  initialMessage,
  userMessage,
  openSections,
  copiedStates,
  onToggleSection,
  onSystemPromptChange,
  onInitialMessageChange,
  onUserMessageChange,
  onCopy
}: ConfigSectionProps) {
  return (
    <div className="space-y-6">
      {/* Data Card */}
      <CollapsibleCard
        id="data"
        name="Data"
        onNameChange={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        canDelete={false}
        borderColor="border-gray-200"
        subtitle="Biographer data"
        icon={<Database className="h-4 w-4" />}
        onCopy={() => onCopy(biographerData, 'data')}
        copied={copiedStates['data']}
      >
        <div className="p-4 min-h-[400px] bg-gray-50 rounded">
          <pre className="text-sm text-gray-600 whitespace-pre-wrap">
            {biographerData || "Biographer data will appear here..."}
          </pre>
        </div>
      </CollapsibleCard>

      {/* System Prompt Card */}
      <CollapsibleCard
        id="system-prompt"
        name="System Prompt"
        onNameChange={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        canDelete={false}
        borderColor="border-gray-200"
        subtitle="System prompt"
        icon={<Settings className="h-4 w-4" />}
        onCopy={() => onCopy(systemPrompt, 'system-prompt')}
        copied={copiedStates['system-prompt']}
      >
        <div className="p-4 min-h-[200px]">
          <textarea
            className="w-full min-h-[200px] p-2 border rounded resize-none"
            value={systemPrompt}
            onChange={(e) => onSystemPromptChange(e.target.value)}
            placeholder="Enter system prompt..."
          />
        </div>
      </CollapsibleCard>

      {/* Initial Message Card */}
      <CollapsibleCard
        id="initial-message"
        name="Initial Message"
        onNameChange={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        canDelete={false}
        borderColor="border-gray-200"
        subtitle="Initial message"
        icon={<MessageSquare className="h-4 w-4" />}
        onCopy={() => onCopy(initialMessage, 'initial-message')}
        copied={copiedStates['initial-message']}
      >
        <div className="p-4 min-h-[100px]">
          <textarea
            className="w-full min-h-[100px] p-2 border rounded resize-none"
            value={initialMessage}
            onChange={(e) => onInitialMessageChange(e.target.value)}
            placeholder="Enter initial message..."
          />
        </div>
      </CollapsibleCard>

      {/* User Message Card */}
      <CollapsibleCard
        id="user-message"
        name="User Message"
        onNameChange={() => {}}
        onDuplicate={() => {}}
        onDelete={() => {}}
        canDelete={false}
        borderColor="border-gray-200"
        subtitle="User message"
        icon={<User className="h-4 w-4" />}
        onCopy={() => onCopy(userMessage, 'user-message')}
        copied={copiedStates['user-message']}
      >
        <div className="p-4 min-h-[120px]">
          <textarea
            className="w-full min-h-[120px] p-2 border rounded resize-none"
            value={userMessage}
            onChange={(e) => onUserMessageChange(e.target.value)}
            placeholder="Enter user message..."
          />
        </div>
      </CollapsibleCard>
    </div>
  );
} 