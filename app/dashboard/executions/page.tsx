
"use client";

import React, { useEffect, useState, useCallback } from 'react';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { RefreshCw, Loader2 } from 'lucide-react';

export default function ExecutionsPage() {
    const [executions, setExecutions] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isRefreshing, setIsRefreshing] = useState(false);

    const fetchExecutions = useCallback(async (showRefreshing = false) => {
        if (showRefreshing) setIsRefreshing(true);
        else setIsLoading(true);

        try {
            const res = await fetch('/api/executions');
            const data = await res.json();
            setExecutions(Array.isArray(data) ? data : []);
        } catch (error) {
            console.error('Failed to fetch executions:', error);
            setExecutions([]);
        } finally {
            setIsLoading(false);
            setIsRefreshing(false);
        }
    }, []);

    useEffect(() => {
        fetchExecutions();

        // Auto-refresh on window focus
        const handleFocus = () => fetchExecutions(true);
        window.addEventListener('focus', handleFocus);

        // Auto-refresh every 30 seconds
        const interval = setInterval(() => fetchExecutions(true), 30000);

        return () => {
            window.removeEventListener('focus', handleFocus);
            clearInterval(interval);
        };
    }, [fetchExecutions]);

    return (
        <div className="p-8 space-y-6 overflow-auto">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
                    <p className="text-muted-foreground text-sm mt-1">
                        {executions.length} execution{executions.length !== 1 ? 's' : ''} found
                    </p>
                </div>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchExecutions(true)}
                    disabled={isRefreshing}
                    className="gap-2"
                >
                    {isRefreshing ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                        <RefreshCw className="h-4 w-4" />
                    )}
                    Refresh
                </Button>
            </div>

            {isLoading ? (
                <div className="border rounded-md p-8 text-center">
                    <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                    <p className="text-muted-foreground mt-2">Loading executions...</p>
                </div>
            ) : executions.length === 0 ? (
                <div className="border rounded-md p-8 text-center">
                    <p className="text-muted-foreground">No executions found.</p>
                    <p className="text-sm text-muted-foreground mt-1">Execute a workflow to see results here.</p>
                </div>
            ) : (
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>ID</TableHead>
                                <TableHead>Workflow ID</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead>Risk Level</TableHead>
                                <TableHead>Decision</TableHead>
                                <TableHead>Started At</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {executions.map((ex) => (
                                <TableRow key={ex._id}>
                                    <TableCell className="font-mono text-xs">{ex._id}</TableCell>
                                    <TableCell className="font-mono text-xs">{ex.workflowId}</TableCell>
                                    <TableCell>
                                        <Badge variant={ex.status === 'RUNNING' ? 'outline' : ex.status === 'DONE' ? 'default' : 'destructive'}>
                                            {ex.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        {ex.riskLevel && (
                                            <Badge variant={ex.riskLevel === 'HIGH' ? 'destructive' : ex.riskLevel === 'MEDIUM' ? 'secondary' : 'outline'}>
                                                {ex.riskLevel}
                                            </Badge>
                                        )}
                                    </TableCell>
                                    <TableCell>{ex.decision || '-'}</TableCell>
                                    <TableCell>{new Date(ex.startedAt).toLocaleString()}</TableCell>
                                    <TableCell>
                                        <Link href={'/dashboard/executions/' + ex._id}>
                                            <Button size="sm" variant="ghost">View</Button>
                                        </Link>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
            )}
        </div>
    );
}
