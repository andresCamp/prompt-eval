'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Eye, EyeOff, Plus, ChevronDown } from 'lucide-react';
import type { DataSet, VariableRow, ImagePromptThread } from './types';
import { addRow, updateRowValue, toggleRowVisibility } from './utils';

interface DataSetsSectionProps {
  dataSets: DataSet[];
  rows: VariableRow[];
  prompts: ImagePromptThread[];
  onRowsChange: (rows: VariableRow[]) => void;
  isOpen: boolean;
  onToggle: () => void;
}

export function DataSetsSection({
  dataSets,
  rows,
  prompts,
  onRowsChange,
  isOpen,
  onToggle,
}: DataSetsSectionProps) {
  if (dataSets.length === 0) {
    return (
      <Card className="border-2 border-purple-200">
        <CardHeader className="cursor-pointer" onClick={onToggle}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-lg">📊</span>
              <CardTitle>Data Sets (0)</CardTitle>
            </div>
            <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </div>
        </CardHeader>
        {isOpen && (
          <CardContent>
            <div className="text-center text-sm text-muted-foreground py-8">
              Add variables to prompts (e.g., {'{'}{'{'}color{'}'}) to create Data Sets automatically.
            </div>
          </CardContent>
        )}
      </Card>
    );
  }

  const totalRows = rows.length;
  const visibleRows = rows.filter(r => r.visible).length;

  return (
    <Card className="border-2 border-purple-200">
      <CardHeader className="cursor-pointer" onClick={onToggle}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">📊</span>
            <CardTitle>
              Data Sets ({dataSets.length}) · {visibleRows}/{totalRows} rows visible
            </CardTitle>
          </div>
          <ChevronDown className={`h-5 w-5 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </CardHeader>
      {isOpen && (
        <CardContent className="space-y-6">
          {dataSets.map(dataSet => (
            <DataSetView
              key={dataSet.id}
              dataSet={dataSet}
              rows={rows}
              prompts={prompts}
              onRowsChange={onRowsChange}
            />
          ))}
        </CardContent>
      )}
    </Card>
  );
}

interface DataSetViewProps {
  dataSet: DataSet;
  rows: VariableRow[];
  prompts: ImagePromptThread[];
  onRowsChange: (rows: VariableRow[]) => void;
}

function DataSetView({ dataSet, rows, prompts, onRowsChange }: DataSetViewProps) {
  // Find prompts using this Data Set
  const linkedPrompts = prompts.filter(p => p.dataSetId === dataSet.id && p.visible);
  const linkedPromptNames = linkedPrompts.map(p => p.name).join(', ');

  const handleAddRow = () => {
    // Create initial values for all variables in this Data Set
    const initialValues: Record<string, string> = {};
    dataSet.variableNames.forEach(varName => {
      initialValues[varName] = '';
    });
    onRowsChange(addRow(rows, initialValues));
  };

  const handleUpdateValue = (rowId: string, varName: string, value: string) => {
    onRowsChange(updateRowValue(rows, rowId, varName, value));
  };

  const handleToggleVisibility = (rowId: string) => {
    onRowsChange(toggleRowVisibility(rows, rowId));
  };

  // Check for unused variables (variables in rows but not in Data Set)
  const allVariablesInRows = new Set<string>();
  rows.forEach(row => {
    Object.keys(row.values).forEach(key => allVariablesInRows.add(key));
  });
  const unusedVariables = Array.from(allVariablesInRows).filter(
    v => !dataSet.variableNames.includes(v)
  );

  return (
    <div className="rounded-lg border border-purple-200 bg-purple-50/30 p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold">
              Data Set [{dataSet.variableNames.join(', ')}]
            </h3>
            {unusedVariables.length > 0 && (
              <Badge variant="outline" className="text-xs">
                ⚠️ {unusedVariables.length} unused variable{unusedVariables.length !== 1 ? 's' : ''}
              </Badge>
            )}
          </div>
          {linkedPrompts.length > 0 && (
            <p className="text-xs text-muted-foreground mt-1">
              Used by: {linkedPromptNames}
            </p>
          )}
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleAddRow}
          className="border-dashed"
        >
          <Plus className="h-4 w-4 mr-1" />
          Add Row
        </Button>
      </div>

      {/* Table */}
      {rows.length === 0 ? (
        <div className="text-center text-sm text-muted-foreground py-4">
          No rows yet. Click &quot;Add Row&quot; to start.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b">
                <th className="text-left py-2 px-2 font-medium w-16">#</th>
                {dataSet.variableNames.map(varName => (
                  <th key={varName} className="text-left py-2 px-2 font-medium">
                    {varName}
                  </th>
                ))}
                <th className="text-center py-2 px-2 font-medium w-20">Visible</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr
                  key={row.id}
                  className={`border-b ${!row.visible ? 'opacity-50' : ''}`}
                >
                  <td className="py-2 px-2 text-muted-foreground">{row.position}</td>
                  {dataSet.variableNames.map(varName => (
                    <td key={varName} className="py-2 px-2">
                      <Input
                        value={row.values[varName] ?? ''}
                        onChange={(e) => handleUpdateValue(row.id, varName, e.target.value)}
                        placeholder={`Enter ${varName}`}
                        className="h-8 text-sm"
                        disabled={!row.visible}
                      />
                    </td>
                  ))}
                  <td className="py-2 px-2 text-center">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleToggleVisibility(row.id)}
                      className="h-8 w-8"
                    >
                      {row.visible ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Show unused variables if any */}
      {unusedVariables.length > 0 && (
        <div className="text-xs text-muted-foreground pt-2 border-t">
          <p className="font-medium mb-1">Unused variables (toggle visibility off to hide):</p>
          <p>{unusedVariables.join(', ')}</p>
        </div>
      )}
    </div>
  );
}
