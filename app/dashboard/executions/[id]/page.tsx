
"use client";

import React, { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';

export default function ExecutionDetailPage() {
  const { id } = useParams();
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    if (id) {
      fetch('/api/executions/' + id)
        .then(res => res.json())
        .then(setData);
    }
  }, [id]);

  if (!data) return <div className="p-8">Loading...</div>;

  const { execution, logs } = data;

  return (
    <div className="p-8 space-y-6 h-full flex flex-col overflow-hidden">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Execution Details</h1>
        <Badge className="text-lg" variant={execution.status === 'RUNNING' ? 'outline' : execution.status === 'DONE' ? 'default' : 'destructive'}>
          {execution.status}
        </Badge>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Results</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <div className="text-sm text-muted-foreground">Decision</div>
                <div className="font-semibold text-lg">{execution.decision || 'PENDING'}</div>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Risk Level</div>
                <Badge variant={execution.riskLevel === 'HIGH' ? 'destructive' : 'outline'}>{execution.riskLevel || '-'}</Badge>
              </div>
              <div>
                <div className="text-sm text-muted-foreground">Risk Score</div>
                <div className="font-mono">{execution.riskScore?.toFixed(2) || '0.00'}</div>
              </div>
            </div>
            <Separator />
            <div>
              <div className="text-sm text-muted-foreground mb-2">Final Output</div>
              <ScrollArea className="h-[200px] w-full rounded-md border p-2 bg-muted/50">
                <pre className="text-xs font-mono">{JSON.stringify(execution.output, null, 2)}</pre>
              </ScrollArea>
            </div>
          </CardContent>
        </Card>

        <Card className="flex flex-col h-[500px]">
          <CardHeader>
            <CardTitle>Audit Logs</CardTitle>
          </CardHeader>
          <CardContent className="flex-1 overflow-hidden">
            <ScrollArea className="h-full pr-4">
              <div className="space-y-4">
                {logs.map((log: any, i: number) => (
                  <div key={i} className="flex gap-4 items-start text-sm">
                    <div className="min-w-[80px] text-xs text-muted-foreground">
                      {new Date(log.timestamp).toLocaleTimeString()}
                    </div>
                    <div className="flex-1">
                      <div className="font-semibold">{log.type}</div>
                      <div className="text-xs text-muted-foreground">Node: {log.nodeId}</div>
                      {log.payload && (
                        <div className="mt-1 text-xs font-mono bg-muted p-1 rounded">
                          {JSON.stringify(log.payload).slice(0, 100)}...
                        </div>
                      )}
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <div className="text-sm text-muted-foreground">No logs found.</div>}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
