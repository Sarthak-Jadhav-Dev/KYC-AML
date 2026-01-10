"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Users, Workflow, Share2, ExternalLink, Loader2 } from 'lucide-react';
import { ShareDialog } from '@/components/workflow/ShareDialog';

interface WorkflowWithCollaborators {
    _id: string;
    name: string;
    status: 'DRAFT' | 'DEPLOYED';
    accessType?: 'owner' | 'shared';
    role?: 'viewer' | 'editor' | 'admin';
    collaboratorCount?: number;
}

export default function TeamPage() {
    const [workflows, setWorkflows] = useState<WorkflowWithCollaborators[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [shareDialogOpen, setShareDialogOpen] = useState(false);
    const [selectedWorkflow, setSelectedWorkflow] = useState<WorkflowWithCollaborators | null>(null);

    const fetchWorkflowsWithCollaborators = async () => {
        setIsLoading(true);
        try {
            const res = await fetch('/api/workflows');
            if (res.ok) {
                const data = await res.json();

                // Fetch collaborator counts for owned workflows
                const workflowsWithCounts = await Promise.all(
                    data.map(async (wf: WorkflowWithCollaborators) => {
                        if (wf.accessType !== 'shared') {
                            try {
                                const collabRes = await fetch(`/api/workflows/${wf._id}/collaborators`);
                                if (collabRes.ok) {
                                    const collabData = await collabRes.json();
                                    return { ...wf, collaboratorCount: collabData.collaborators?.length || 0 };
                                }
                            } catch {
                                // Ignore errors, just don't add count
                            }
                        }
                        return wf;
                    })
                );

                setWorkflows(workflowsWithCounts);
            } else {
                toast.error('Failed to fetch workflows');
            }
        } catch {
            toast.error('Failed to fetch workflows');
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchWorkflowsWithCollaborators();
    }, []);

    const openShareDialog = (workflow: WorkflowWithCollaborators) => {
        setSelectedWorkflow(workflow);
        setShareDialogOpen(true);
    };

    const ownedWorkflows = workflows.filter(wf => wf.accessType !== 'shared');
    const sharedWorkflows = workflows.filter(wf => wf.accessType === 'shared');

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'admin': return 'default';
            case 'editor': return 'secondary';
            default: return 'outline';
        }
    };

    return (
        <div className="p-8 space-y-8 overflow-auto">
            <div>
                <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2">
                    <Users className="h-8 w-8" />
                    Team Management
                </h1>
                <p className="text-muted-foreground mt-1">
                    Manage collaborators and access for your workflows
                </p>
            </div>

            {isLoading ? (
                <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : (
                <>
                    {/* My Workflows Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">My Workflows</h2>
                            <Badge variant="secondary">{ownedWorkflows.length}</Badge>
                        </div>

                        {ownedWorkflows.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Workflow className="h-12 w-12 mb-4" />
                                    <p className="font-medium">No workflows yet</p>
                                    <p className="text-sm">Create a workflow to start collaborating</p>
                                    <Link href="/dashboard/workflows">
                                        <Button className="mt-4">Go to Workflows</Button>
                                    </Link>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {ownedWorkflows.map((wf) => (
                                    <Card key={wf._id} className="hover:shadow-md transition-shadow">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Workflow className="h-4 w-4" />
                                                        {wf.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1">
                                                        <Badge variant={wf.status === 'DEPLOYED' ? 'default' : 'secondary'} className="mr-2">
                                                            {wf.status}
                                                        </Badge>
                                                        {(wf.collaboratorCount ?? 0) > 0 && (
                                                            <span className="text-muted-foreground">
                                                                {wf.collaboratorCount} collaborator{wf.collaboratorCount !== 1 ? 's' : ''}
                                                            </span>
                                                        )}
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex gap-2">
                                            <Button
                                                variant="default"
                                                size="sm"
                                                className="gap-2"
                                                onClick={() => openShareDialog(wf)}
                                            >
                                                <Share2 className="h-4 w-4" />
                                                Manage Team
                                            </Button>
                                            <Link href={`/dashboard/workflows/${wf._id}/editor`}>
                                                <Button variant="outline" size="sm" className="gap-2">
                                                    <ExternalLink className="h-4 w-4" />
                                                    Open
                                                </Button>
                                            </Link>
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>

                    {/* Shared With Me Section */}
                    <section className="space-y-4">
                        <div className="flex items-center gap-2">
                            <h2 className="text-xl font-semibold">Shared With Me</h2>
                            <Badge variant="secondary">{sharedWorkflows.length}</Badge>
                        </div>

                        {sharedWorkflows.length === 0 ? (
                            <Card>
                                <CardContent className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                                    <Users className="h-12 w-12 mb-4" />
                                    <p className="font-medium">No shared workflows</p>
                                    <p className="text-sm">When someone shares a workflow with you, it will appear here</p>
                                </CardContent>
                            </Card>
                        ) : (
                            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                                {sharedWorkflows.map((wf) => (
                                    <Card key={wf._id} className="hover:shadow-md transition-shadow border-purple-500/20">
                                        <CardHeader>
                                            <div className="flex justify-between items-start">
                                                <div className="flex-1">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Workflow className="h-4 w-4" />
                                                        {wf.name}
                                                    </CardTitle>
                                                    <CardDescription className="mt-1 flex items-center gap-2">
                                                        <Badge variant={wf.status === 'DEPLOYED' ? 'default' : 'secondary'}>
                                                            {wf.status}
                                                        </Badge>
                                                        <Badge variant={getRoleBadgeVariant(wf.role || 'viewer')}>
                                                            {wf.role?.charAt(0).toUpperCase()}{wf.role?.slice(1)}
                                                        </Badge>
                                                    </CardDescription>
                                                </div>
                                            </div>
                                        </CardHeader>
                                        <CardContent className="flex gap-2">
                                            <Link href={`/dashboard/workflows/${wf._id}/editor`}>
                                                <Button variant="outline" size="sm" className="gap-2">
                                                    <ExternalLink className="h-4 w-4" />
                                                    {wf.role === 'viewer' ? 'View' : 'Open'}
                                                </Button>
                                            </Link>
                                            {wf.role === 'admin' && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="gap-2"
                                                    onClick={() => openShareDialog(wf)}
                                                >
                                                    <Share2 className="h-4 w-4" />
                                                    Team
                                                </Button>
                                            )}
                                        </CardContent>
                                    </Card>
                                ))}
                            </div>
                        )}
                    </section>
                </>
            )}

            {/* Share Dialog */}
            {selectedWorkflow && (
                <ShareDialog
                    workflowId={selectedWorkflow._id}
                    workflowName={selectedWorkflow.name}
                    open={shareDialogOpen}
                    onOpenChange={(open) => {
                        setShareDialogOpen(open);
                        if (!open) {
                            // Refresh after dialog closes
                            fetchWorkflowsWithCollaborators();
                        }
                    }}
                />
            )}
        </div>
    );
}
