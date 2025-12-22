'use client';

import { useAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { RotateCcw } from 'lucide-react';
import { totalCostAtom } from '@/lib/atoms/image-playground';

export function CostTracker() {
  const [totalCost, setTotalCost] = useAtom(totalCostAtom);

  const handleReset = () => {
    setTotalCost(0);
  };

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 rounded-md bg-background/80 backdrop-blur-sm border px-3 py-1.5 text-xs text-muted-foreground shadow-sm">
      <span>Total: ~${totalCost.toFixed(4)}</span>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-5 w-5"
        onClick={handleReset}
        title="Reset total cost"
      >
        <RotateCcw className="h-3 w-3" />
      </Button>
    </div>
  );
}
