"use client";

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';
import { MoreVertical, Pencil, Trash2, Play, Plus, Share2, Users } from 'lucide-react';
import { ShareDialog } from '@/components/workflow/ShareDialog';

interface Workflow {
  _id: string;
  name: string;
  status: 'DRAFT' | 'DEPLOYED';
  version: number;
  updatedAt: string;
  accessType?: 'owner' | 'shared';
  role?: 'viewer' | 'editor' | 'admin';
}

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  // Edit dialog state
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [editingWorkflow, setEditingWorkflow] = useState<Workflow | null>(null);
  const [editName, setEditName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

  // Delete dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingWorkflow, setDeletingWorkflow] = useState<Workflow | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Share dialog state
  const [shareDialogOpen, setShareDialogOpen] = useState(false);
  const [sharingWorkflow, setSharingWorkflow] = useState<Workflow | null>(null);

  const fetchWorkflows = () => {
    setIsLoading(true);
    fetch('/api/workflows')
      .then(res => res.json())
      .then(data => {
        setWorkflows(data);
        setIsLoading(false);
      })
      .catch(() => {
        toast.error("Failed to fetch workflows");
        setIsLoading(false);
      });
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const handleCreate = async () => {
    try {
      const res = await fetch('/api/workflows', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: "New Workflow" })
      });
      const data = await res.json();
      router.push('/dashboard/workflows/' + data._id + '/editor');
    } catch {
      toast.error("Failed to create workflow");
    }
  };

  // Edit workflow name
  const openEditDialog = (workflow: Workflow) => {
    setEditingWorkflow(workflow);
    setEditName(workflow.name);
    setEditDialogOpen(true);
  };

  const handleEditSubmit = async () => {
    if (!editingWorkflow || !editName.trim()) return;

    setIsEditing(true);
    try {
      const res = await fetch(`/api/workflows/${editingWorkflow._id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() })
      });

      if (res.ok) {
        toast.success('Workflow renamed successfully');
        setEditDialogOpen(false);
        fetchWorkflows();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to rename workflow');
      }
    } catch {
      toast.error('Failed to rename workflow');
    } finally {
      setIsEditing(false);
    }
  };

  // Delete workflow
  const openDeleteDialog = (workflow: Workflow) => {
    setDeletingWorkflow(workflow);
    setDeleteDialogOpen(true);
  };

  // Share workflow
  const openShareDialog = (workflow: Workflow) => {
    setSharingWorkflow(workflow);
    setShareDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deletingWorkflow) return;

    setIsDeleting(true);
    try {
      const res = await fetch(`/api/workflows/${deletingWorkflow._id}`, {
        method: 'DELETE'
      });

      if (res.ok) {
        toast.success('Workflow deleted successfully');
        setDeleteDialogOpen(false);
        fetchWorkflows();
      } else {
        const data = await res.json();
        toast.error(data.error || 'Failed to delete workflow');
      }
    } catch {
      toast.error('Failed to delete workflow');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="p-8 space-y-6 overflow-auto">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workflows</h1>
          <p className="text-muted-foreground mt-1">Create and manage your KYC/AML compliance workflows</p>
        </div>
        <Button onClick={handleCreate} className="gap-2 bg-linear-to-r from-purple-500 to-blue-600 hover:from-purple-600 hover:to-blue-700">
          <Plus className="h-4 w-4" />
          New Workflow
        </Button>
      </div>

      {isLoading ? (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardHeader>
                <div className="h-5 bg-muted rounded w-3/4"></div>
                <div className="h-4 bg-muted rounded w-1/4 mt-2"></div>
              </CardHeader>
              <CardFooter>
                <div className="h-8 bg-muted rounded w-20"></div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {workflows.map((wf) => (
            <Card key={wf._id} className="hover:shadow-lg transition-all duration-300 group border-border/50 hover:border-border">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <CardTitle className="text-lg group-hover:text-primary transition-colors">{wf.name}</CardTitle>
                  <div className="flex items-center gap-2">
                    <Badge variant={wf.status === 'DEPLOYED' ? 'default' : 'secondary'}>
                      {wf.status}
                    </Badge>
                    {wf.accessType === 'shared' && (
                      <Badge variant="outline" className="gap-1">
                        <Users className="h-3 w-3" />
                        {wf.role}
                      </Badge>
                    )}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity">
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => openShareDialog(wf)} className="gap-2">
                          <Share2 className="h-4 w-4" />
                          Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => openEditDialog(wf)} className="gap-2">
                          <Pencil className="h-4 w-4" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={'/dashboard/workflows/' + wf._id + '/editor'} className="gap-2">
                            <Play className="h-4 w-4" />
                            Edit Workflow
                          </Link>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {wf.accessType !== 'shared' && (
                          <DropdownMenuItem
                            onClick={() => openDeleteDialog(wf)}
                            className="gap-2 text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        )}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                </div>
                <CardDescription className="flex items-center gap-2">
                  <span>Version {wf.version}</span>
                  <span className="text-muted-foreground/50">•</span>
                  <span>Updated {new Date(wf.updatedAt).toLocaleDateString()}</span>
                </CardDescription>
              </CardHeader>
              <CardFooter className="flex justify-end gap-2">
                <Link href={'/dashboard/workflows/' + wf._id + '/editor'}>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                </Link>
              </CardFooter>
            </Card>
          ))}
          {workflows.length === 0 && (
            <div className="col-span-full text-center py-16 text-muted-foreground border border-dashed rounded-lg bg-muted/20">
              <div className="mx-auto w-12 h-12 rounded-full bg-muted flex items-center justify-center mb-4">
                <Plus className="h-6 w-6" />
              </div>
              <p className="font-medium">No workflows found</p>
              <p className="text-sm mt-1">Create your first workflow to get started.</p>
              <Button onClick={handleCreate} className="mt-4 gap-2">
                <Plus className="h-4 w-4" />
                Create Workflow
              </Button>
            </div>
          )}
        </div>
      )}

      {/* Edit Name Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Workflow</DialogTitle>
            <DialogDescription>
              Enter a new name for this workflow.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Workflow Name</Label>
              <Input
                id="name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Enter workflow name"
                onKeyDown={(e) => e.key === 'Enter' && handleEditSubmit()}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEditSubmit} disabled={isEditing || !editName.trim()}>
              {isEditing ? 'Saving...' : 'Save'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Workflow</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{deletingWorkflow?.name}&quot;? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm} disabled={isDeleting}>
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      {/* Share Dialog */}
      {sharingWorkflow && (
        <ShareDialog
          workflowId={sharingWorkflow._id}
          workflowName={sharingWorkflow.name}
          open={shareDialogOpen}
          onOpenChange={setShareDialogOpen}
        />
      )}
    </div>
  );
}
