
"use client";

import React, { useEffect, useState } from 'react';
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

export default function ExecutionsPage() {
    const [executions, setExecutions] = useState<any[]>([]);

    useEffect(() => {
        fetch('/api/executions')
            .then(res => res.json())
            .then(setExecutions);
    }, []);

    return (
        <div className="p-8 space-y-6 overflow-auto">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold tracking-tight">Executions</h1>
            </div>

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
        </div>
    );
}
