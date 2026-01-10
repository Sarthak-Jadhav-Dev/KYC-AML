import dbConnect from '@/lib/db';
import { Workflow } from '@/lib/models/definitions';
import { Collaborator, CollaboratorRole } from '@/lib/models/Collaborator';

export type Permission = 'view' | 'edit' | 'manage_collaborators' | 'delete';

// Role -> Permissions mapping
const ROLE_PERMISSIONS: Record<CollaboratorRole | 'owner', Permission[]> = {
    owner: ['view', 'edit', 'manage_collaborators', 'delete'],
    admin: ['view', 'edit', 'manage_collaborators'],
    editor: ['view', 'edit'],
    viewer: ['view'],
};

export interface WorkflowAccess {
    hasAccess: boolean;
    role: CollaboratorRole | 'owner' | null;
    permissions: Permission[];
}

/**
 * Get the user's access level for a workflow
 */
export async function getWorkflowAccess(
    userId: string | null,
    workflowId: string
): Promise<WorkflowAccess> {
    if (!userId) {
        return { hasAccess: false, role: null, permissions: [] };
    }

    await dbConnect();

    // Check if user is the owner
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
        return { hasAccess: false, role: null, permissions: [] };
    }

    if (workflow.userId === userId) {
        return {
            hasAccess: true,
            role: 'owner',
            permissions: ROLE_PERMISSIONS.owner,
        };
    }

    // Check if user is a collaborator
    const collaborator = await Collaborator.findOne({
        workflowId,
        userId,
        status: 'accepted',
    });

    if (collaborator) {
        return {
            hasAccess: true,
            role: collaborator.role,
            permissions: ROLE_PERMISSIONS[collaborator.role],
        };
    }

    return { hasAccess: false, role: null, permissions: [] };
}

/**
 * Check if user has a specific permission for a workflow
 */
export async function checkWorkflowPermission(
    userId: string | null,
    workflowId: string,
    permission: Permission
): Promise<boolean> {
    const access = await getWorkflowAccess(userId, workflowId);
    return access.permissions.includes(permission);
}

/**
 * Check if user can view the workflow
 */
export async function canView(userId: string | null, workflowId: string): Promise<boolean> {
    return checkWorkflowPermission(userId, workflowId, 'view');
}

/**
 * Check if user can edit the workflow
 */
export async function canEdit(userId: string | null, workflowId: string): Promise<boolean> {
    return checkWorkflowPermission(userId, workflowId, 'edit');
}

/**
 * Check if user can manage collaborators for the workflow
 */
export async function canManageCollaborators(userId: string | null, workflowId: string): Promise<boolean> {
    return checkWorkflowPermission(userId, workflowId, 'manage_collaborators');
}

/**
 * Check if user can delete the workflow
 */
export async function canDelete(userId: string | null, workflowId: string): Promise<boolean> {
    return checkWorkflowPermission(userId, workflowId, 'delete');
}

/**
 * Get role permissions
 */
export function getRolePermissions(role: CollaboratorRole | 'owner'): Permission[] {
    return ROLE_PERMISSIONS[role] || [];
}
