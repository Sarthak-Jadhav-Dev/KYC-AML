"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Crown, Trash2, UserPlus, Users, Loader2 } from 'lucide-react';

interface Collaborator {
    id: string;
    userId: string;
    email: string;
    name: string;
    role: 'viewer' | 'editor' | 'admin';
    status: string;
    invitedAt: string;
}

interface Owner {
    userId: string;
    email: string;
    name: string;
    role: 'owner';
}

interface UserAccess {
    hasAccess: boolean;
    role: 'owner' | 'admin' | 'editor' | 'viewer' | null;
    permissions: string[];
}

interface ShareDialogProps {
    workflowId: string;
    workflowName: string;
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

export function ShareDialog({ workflowId, workflowName, open, onOpenChange }: ShareDialogProps) {
    const [owner, setOwner] = useState<Owner | null>(null);
    const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
    const [currentUserAccess, setCurrentUserAccess] = useState<UserAccess | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [inviteEmail, setInviteEmail] = useState('');
    const [inviteRole, setInviteRole] = useState<'viewer' | 'editor' | 'admin'>('viewer');
    const [isInviting, setIsInviting] = useState(false);
    const [updatingId, setUpdatingId] = useState<string | null>(null);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchCollaborators = useCallback(async () => {
        setIsLoading(true);
        try {
            const res = await fetch(`/api/workflows/${workflowId}/collaborators`);
            if (res.ok) {
                const data = await res.json();
                setOwner(data.owner);
                setCollaborators(data.collaborators);
                setCurrentUserAccess(data.currentUserAccess);
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to fetch collaborators');
            }
        } catch {
            toast.error('Failed to fetch collaborators');
        } finally {
            setIsLoading(false);
        }
    }, [workflowId]);

    useEffect(() => {
        if (open) {
            fetchCollaborators();
        }
    }, [open, fetchCollaborators]);

    const handleInvite = async () => {
        if (!inviteEmail.trim()) {
            toast.error('Please enter an email address');
            return;
        }

        setIsInviting(true);
        try {
            const res = await fetch(`/api/workflows/${workflowId}/collaborators`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email: inviteEmail.trim(), role: inviteRole }),
            });

            if (res.ok) {
                toast.success('Collaborator invited successfully');
                setInviteEmail('');
                fetchCollaborators();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to invite collaborator');
            }
        } catch {
            toast.error('Failed to invite collaborator');
        } finally {
            setIsInviting(false);
        }
    };

    const handleRoleChange = async (collaborator: Collaborator, newRole: string) => {
        setUpdatingId(collaborator.id);
        try {
            const res = await fetch(`/api/workflows/${workflowId}/collaborators/${collaborator.userId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ role: newRole }),
            });

            if (res.ok) {
                toast.success('Role updated successfully');
                fetchCollaborators();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to update role');
            }
        } catch {
            toast.error('Failed to update role');
        } finally {
            setUpdatingId(null);
        }
    };

    const handleRemove = async (collaborator: Collaborator) => {
        setDeletingId(collaborator.id);
        try {
            const res = await fetch(`/api/workflows/${workflowId}/collaborators/${collaborator.userId}`, {
                method: 'DELETE',
            });

            if (res.ok) {
                toast.success('Collaborator removed successfully');
                fetchCollaborators();
            } else {
                const error = await res.json();
                toast.error(error.error || 'Failed to remove collaborator');
            }
        } catch {
            toast.error('Failed to remove collaborator');
        } finally {
            setDeletingId(null);
        }
    };

    const canManage = currentUserAccess?.permissions.includes('manage_collaborators') ?? false;

    const getRoleBadgeVariant = (role: string) => {
        switch (role) {
            case 'owner': return 'default';
            case 'admin': return 'secondary';
            case 'editor': return 'outline';
            default: return 'outline';
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Share &quot;{workflowName}&quot;
                    </DialogTitle>
                    <DialogDescription>
                        Invite collaborators and manage their access to this workflow.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Invite Section */}
                    {canManage && (
                        <div className="space-y-3">
                            <Label className="text-sm font-medium">Invite new collaborator</Label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="Enter email address"
                                    value={inviteEmail}
                                    onChange={(e) => setInviteEmail(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
                                    className="flex-1"
                                />
                                <Select value={inviteRole} onValueChange={(v) => setInviteRole(v as typeof inviteRole)}>
                                    <SelectTrigger className="w-32">
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="viewer">Viewer</SelectItem>
                                        <SelectItem value="editor">Editor</SelectItem>
                                        <SelectItem value="admin">Admin</SelectItem>
                                    </SelectContent>
                                </Select>
                                <Button onClick={handleInvite} disabled={isInviting} className="gap-2">
                                    {isInviting ? <Loader2 className="h-4 w-4 animate-spin" /> : <UserPlus className="h-4 w-4" />}
                                    Invite
                                </Button>
                            </div>
                        </div>
                    )}

                    {/* Collaborators List */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Team members</Label>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-8">
                                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                            </div>
                        ) : (
                            <div className="border rounded-lg">
                                <Table>
                                    <TableHeader>
                                        <TableRow>
                                            <TableHead>User</TableHead>
                                            <TableHead>Role</TableHead>
                                            {canManage && <TableHead className="w-16">Actions</TableHead>}
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {/* Owner Row */}
                                        {owner && (
                                            <TableRow>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-yellow-400 to-orange-500 flex items-center justify-center text-white text-sm font-medium">
                                                            {owner.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium flex items-center gap-1">
                                                                {owner.name}
                                                                <Crown className="h-3 w-3 text-yellow-500" />
                                                            </div>
                                                            <div className="text-sm text-muted-foreground">{owner.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant={getRoleBadgeVariant('owner')}>Owner</Badge>
                                                </TableCell>
                                                {canManage && <TableCell />}
                                            </TableRow>
                                        )}

                                        {/* Collaborator Rows */}
                                        {collaborators.map((collab) => (
                                            <TableRow key={collab.id}>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <div className="w-8 h-8 rounded-full bg-linear-to-br from-purple-500 to-blue-600 flex items-center justify-center text-white text-sm font-medium">
                                                            {collab.name.charAt(0).toUpperCase()}
                                                        </div>
                                                        <div>
                                                            <div className="font-medium">{collab.name}</div>
                                                            <div className="text-sm text-muted-foreground">{collab.email}</div>
                                                        </div>
                                                    </div>
                                                </TableCell>
                                                <TableCell>
                                                    {canManage ? (
                                                        <Select
                                                            value={collab.role}
                                                            onValueChange={(v) => handleRoleChange(collab, v)}
                                                            disabled={updatingId === collab.id}
                                                        >
                                                            <SelectTrigger className="w-28">
                                                                <SelectValue />
                                                            </SelectTrigger>
                                                            <SelectContent>
                                                                <SelectItem value="viewer">Viewer</SelectItem>
                                                                <SelectItem value="editor">Editor</SelectItem>
                                                                <SelectItem value="admin">Admin</SelectItem>
                                                            </SelectContent>
                                                        </Select>
                                                    ) : (
                                                        <Badge variant={getRoleBadgeVariant(collab.role)}>
                                                            {collab.role.charAt(0).toUpperCase() + collab.role.slice(1)}
                                                        </Badge>
                                                    )}
                                                </TableCell>
                                                {canManage && (
                                                    <TableCell>
                                                        <Button
                                                            variant="ghost"
                                                            size="icon"
                                                            onClick={() => handleRemove(collab)}
                                                            disabled={deletingId === collab.id}
                                                            className="text-destructive hover:text-destructive hover:bg-destructive/10"
                                                        >
                                                            {deletingId === collab.id ? (
                                                                <Loader2 className="h-4 w-4 animate-spin" />
                                                            ) : (
                                                                <Trash2 className="h-4 w-4" />
                                                            )}
                                                        </Button>
                                                    </TableCell>
                                                )}
                                            </TableRow>
                                        ))}

                                        {/* Empty State */}
                                        {!owner && collaborators.length === 0 && (
                                            <TableRow>
                                                <TableCell colSpan={canManage ? 3 : 2} className="text-center py-8 text-muted-foreground">
                                                    No team members yet. Invite someone to collaborate!
                                                </TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            </div>
                        )}
                    </div>

                    {/* Role Descriptions */}
                    <div className="text-xs text-muted-foreground space-y-1 bg-muted/30 p-3 rounded-lg">
                        <p><strong>Viewer:</strong> Can view workflow and executions (read-only)</p>
                        <p><strong>Editor:</strong> Can edit workflow nodes and connections</p>
                        <p><strong>Admin:</strong> Full access including managing collaborators</p>
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Close
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
