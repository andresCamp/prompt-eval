/**
 * Component for rendering variable input fields
 */

import React from 'react';
import { Label } from '@/components/ui/label';
import { Variable } from 'lucide-react';
import { CopyableInput } from './CopyableInput';

interface VariableInputsProps {
  variableNames: string[];
  variables?: Record<string, string>;
  onVariableChange: (variables: Record<string, string>) => void;
}

export function VariableInputs({
  variableNames,
  variables = {},
  onVariableChange,
}: VariableInputsProps) {
  if (variableNames.length === 0) {
    return null;
  }

  const handleVariableChange = (name: string, value: string) => {
    onVariableChange({
      ...variables,
      [name]: value,
    });
  };

  return (
    <div className="space-y-3 border-t pt-3">
      <div className="flex items-center gap-2 text-sm font-medium text-gray-600">
        <Variable className="h-4 w-4" />
        <span>Variables</span>
      </div>
      <div className="space-y-2">
        {variableNames.map((name) => (
          <div key={name} className="space-y-1">
            <Label htmlFor={`var-${name}`} className="text-xs text-gray-600">
              {`\${${name}}`}
            </Label>
            <CopyableInput
              id={`var-${name}`}
              value={variables[name] || ''}
              onChange={(e) => handleVariableChange(name, e.target.value)}
              onClear={() => handleVariableChange(name, '')}
              placeholder={`Enter value for ${name}`}
              className="text-sm"
              onClick={(e) => e.stopPropagation()}
            />
          </div>
        ))}
      </div>
    </div>
  );
}