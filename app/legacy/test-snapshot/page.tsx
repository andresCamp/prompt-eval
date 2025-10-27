'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ThreadLockButton } from '@/components/snapshot/ThreadLockButton';
import { CellLockButton } from '@/components/snapshot/CellLockButton';
import { SnapshotIndicator } from '@/components/snapshot/SnapshotIndicator';
import { createCleanupManager } from '@/lib/utils/cleanup';
import { createRecoveryManager } from '@/lib/utils/recovery';
import { useAtom } from 'jotai';
import { 
  totalLockedCellsAtom, 
  totalLockedThreadsAtom 
} from '@/lib/atoms/snapshot-atoms';

export default function TestSnapshotPage() {
  const pageId = 'test-page-1';
  
  // Thread test states
  const [threadValue, setThreadValue] = useState('Initial thread value');
  const [threadLocked, setThreadLocked] = useState(false);
  
  // Cell test states
  const [cellContent, setCellContent] = useState('Initial cell content');
  const [cellModel] = useState('gpt-4o');
  
  // Global stats
  const [totalLockedCells] = useAtom(totalLockedCellsAtom);
  const [totalLockedThreads] = useAtom(totalLockedThreadsAtom);
  
  // Test results
  const [testResults, setTestResults] = useState<string[]>([]);

  const addTestResult = (result: string) => {
    setTestResults(prev => [...prev, `${new Date().toLocaleTimeString()}: ${result}`]);
  };

  const testCleanup = async () => {
    const cleanup = createCleanupManager(pageId);
    const result = await cleanup.performCleanup({
      pageId,
      includeOrphaned: true,
      maxAge: 60000, // Clean snapshots older than 1 minute
      dryRun: false
    });
    addTestResult(`Cleanup: ${result.totalCleaned} items cleaned, ${result.bytesFreed} bytes freed`);
  };

  const testRecovery = async () => {
    const recovery = createRecoveryManager(pageId);
    const result = await recovery.recoverSnapshots();
    addTestResult(`Recovery: ${result.recovered} recovered, ${result.failed} failed`);
  };

  const testBackupRestore = async () => {
    const recovery = createRecoveryManager(pageId);
    
    // Create backup
    const backup = await recovery.backupSnapshots();
    addTestResult(`Backup created: ${backup.length} bytes`);
    
    // Simulate restore
    const result = await recovery.restoreSnapshots(backup);
    addTestResult(`Restore: ${result.recovered} restored, ${result.failed} failed`);
  };

  const testStorageStats = () => {
    const cleanup = createCleanupManager(pageId);
    const stats = cleanup.getStorageStats();
    addTestResult(`Stats: ${stats.totalSnapshots} snapshots, ${stats.totalSize} bytes`);
  };

  const cellResult = {
    content: cellContent,
    model: cellModel,
    timestamp: Date.now(),
    usage: {
      promptTokens: 100,
      completionTokens: 50,
      totalTokens: 150
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <h1 className="text-3xl font-bold">Snapshot System Test Page</h1>
      
      {/* Global Statistics */}
      <Card>
        <CardHeader>
          <CardTitle>Global Statistics</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2">
          <div>Total Locked Threads: {totalLockedThreads}</div>
          <div>Total Locked Cells: {totalLockedCells}</div>
          <SnapshotIndicator 
            state={threadLocked ? 'locked' : 'unlocked'} 
            changeCount={0}
          />
        </CardContent>
      </Card>

      {/* Thread Snapshot Test */}
      <Card>
        <CardHeader>
          <CardTitle>Thread Snapshot Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Input
              value={threadValue}
              onChange={(e) => setThreadValue(e.target.value)}
              placeholder="Enter thread value"
              className="flex-1"
            />
            <ThreadLockButton
              pageId={pageId}
              threadType="model"
              threadId="test-thread-1"
              currentValue={threadValue}
              onLockChange={(locked) => {
                setThreadLocked(locked);
                addTestResult(`Thread ${locked ? 'locked' : 'unlocked'}`);
              }}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Status: {threadLocked ? '🔒 Locked' : '🔓 Unlocked'}
          </div>
        </CardContent>
      </Card>

      {/* Cell Snapshot Test */}
      <Card>
        <CardHeader>
          <CardTitle>Cell Snapshot Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-start gap-2">
            <Textarea
              value={cellContent}
              onChange={(e) => setCellContent(e.target.value)}
              placeholder="Enter cell content"
              className="flex-1"
              rows={3}
            />
            <CellLockButton
              pageId={pageId}
              rowId="row-1"
              columnId="col-1"
              executionId="exec-1"
              currentResult={cellResult}
            />
          </div>
          <div className="text-sm text-muted-foreground">
            Model: {cellModel} | Tokens: {cellResult.usage.totalTokens}
          </div>
        </CardContent>
      </Card>

      {/* System Operations */}
      <Card>
        <CardHeader>
          <CardTitle>System Operations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={testCleanup} variant="outline">
              Test Cleanup
            </Button>
            <Button onClick={testRecovery} variant="outline">
              Test Recovery
            </Button>
            <Button onClick={testBackupRestore} variant="outline">
              Test Backup/Restore
            </Button>
            <Button onClick={testStorageStats} variant="outline">
              Get Storage Stats
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Test Results */}
      <Card>
        <CardHeader>
          <CardTitle>Test Results</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-1 font-mono text-sm max-h-64 overflow-y-auto">
            {testResults.length === 0 ? (
              <div className="text-muted-foreground">No test results yet</div>
            ) : (
              testResults.map((result, i) => (
                <div key={i} className="py-1 border-b last:border-0">
                  {result}
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}