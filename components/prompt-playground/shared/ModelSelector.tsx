/**
 * @fileoverview Provider and model selection components using combobox pattern
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Check, ChevronsUpDown } from 'lucide-react';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { AVAILABLE_PROVIDERS, AVAILABLE_MODELS, SelectorProps } from './types';

/**
 * Provider selection combobox component
 * Allows selection of AI provider (OpenAI, Anthropic, etc.)
 */
export function ProviderSelector({ value, onValueChange, onClick }: SelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-32 justify-between"
          onClick={onClick}
        >
          {value
            ? AVAILABLE_PROVIDERS.find((provider) => provider.value === value)?.label
            : "Select provider..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-32 p-0">
        <Command>
          <CommandInput placeholder="Search provider..." className="h-9" />
          <CommandList>
            <CommandEmpty>No provider found.</CommandEmpty>
            <CommandGroup>
              {AVAILABLE_PROVIDERS.map((provider) => (
                <CommandItem
                  key={provider.value}
                  value={provider.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {provider.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === provider.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}

/**
 * Model selection combobox component
 * Allows selection of AI model (GPT-4o, GPT-4o Mini, etc.)
 */
export function ModelSelector({ value, onValueChange, onClick }: SelectorProps) {
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          role="combobox"
          aria-expanded={open}
          className="w-48 justify-between"
          onClick={onClick}
        >
          {value
            ? AVAILABLE_MODELS.find((model) => model.value === value)?.label
            : "Select model..."}
          <ChevronsUpDown className="opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-48 p-0">
        <Command>
          <CommandInput placeholder="Search model..." className="h-9" />
          <CommandList>
            <CommandEmpty>No model found.</CommandEmpty>
            <CommandGroup>
              {AVAILABLE_MODELS.map((model) => (
                <CommandItem
                  key={model.value}
                  value={model.value}
                  onSelect={(currentValue) => {
                    onValueChange(currentValue === value ? "" : currentValue);
                    setOpen(false);
                  }}
                >
                  {model.label}
                  <Check
                    className={cn(
                      "ml-auto",
                      value === model.value ? "opacity-100" : "opacity-0"
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
} 