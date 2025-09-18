'use client';

import { useState } from 'react';
import { useAtom, useSetAtom } from 'jotai';
import { Button } from '@/components/ui/button';
import { ThreadLockButton } from '@/components/snapshot/ThreadLockButton';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  isLockedAtom,
  lockAtom,
  unlockAtom
} from '@/lib/atoms/generate-object-working';
import { Lock, Unlock } from 'lucide-react';

export function SnapshotTestButton() {
  const [testValue, setTestValue] = useState({ test: 'data', timestamp: Date.now() });
  const pageId = 'generate-object';
  
  const [isLocked] = useAtom(isLockedAtom);
  const lock = useSetAtom(lockAtom);
  const unlock = useSetAtom(unlockAtom);
  
  const handleTestClick = () => {
    console.log('=== SNAPSHOT TEST STARTED ===');
    console.log('Test value:', testValue);
    
    // Update test value to see if changes are detected
    setTestValue({ test: 'data', timestamp: Date.now() });
  };

  const handleClearStorage = () => {
    console.log('Clearing storage by calling unlock...');
    unlock();
  };

  const handleLockToggle = () => {
    if (isLocked) {
      unlock();
    } else {
      lock();
    }
  };

  return (
    <Card className="border-yellow-400 bg-yellow-50 dark:bg-yellow-900/20">
      <CardHeader>
        <CardTitle className="text-yellow-700 dark:text-yellow-400">
          🔧 Lock/Unlock Test Panel
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Button 
            onClick={handleLockToggle} 
            variant={isLocked ? "default" : "outline"} 
            size="sm"
            className="flex items-center gap-2"
          >
            {isLocked ? <Lock className="h-4 w-4" /> : <Unlock className="h-4 w-4" />}
            {isLocked ? 'Unlock Config' : 'Lock Config'}
          </Button>
          <Button onClick={handleTestClick} variant="outline" size="sm">
            Test Console Logs
          </Button>
          <Button onClick={handleClearStorage} variant="destructive" size="sm">
            Clear All Storage
          </Button>
        </div>
        
        <div className="text-xs text-muted-foreground space-y-1">
          <p><strong>Status:</strong> {isLocked ? '🔒 LOCKED (persists on refresh)' : '🔓 UNLOCKED (resets to defaults on refresh)'}</p>
          <p><strong>Instructions:</strong></p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li>Make changes to threads above</li>
            <li>Click "Lock Config" to save to localStorage</li>
            <li>Refresh page - changes should persist</li>
            <li>Click "Unlock Config" to clear localStorage</li>
            <li>Refresh page - should reset to defaults</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}