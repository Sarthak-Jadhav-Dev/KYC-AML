import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Collaborator } from '@/lib/models/Collaborator';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';
import { canManageCollaborators, getWorkflowAccess } from '@/lib/auth/permissions';

// Helper to get current user ID from request
async function getUserId(req: NextRequest): Promise<string | null> {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
}

// PATCH /api/workflows/[id]/collaborators/[userId] - Update collaborator role
export async function PATCH(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { id: workflowId, userId: collaboratorUserId } = await params;
    await dbConnect();

    const currentUserId = await getUserId(req);
    if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage collaborators
    const canManage = await canManageCollaborators(currentUserId, workflowId);
    if (!canManage) {
        return NextResponse.json({ error: 'Forbidden - Cannot manage collaborators' }, { status: 403 });
    }

    const body = await req.json();
    const { role } = body;

    if (!role || !['viewer', 'editor', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Find and update the collaborator
    const collaborator = await Collaborator.findOneAndUpdate(
        { workflowId, userId: collaboratorUserId },
        { role },
        { new: true }
    );

    if (!collaborator) {
        return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    return NextResponse.json({
        id: collaborator._id.toString(),
        userId: collaborator.userId,
        email: collaborator.email,
        name: collaborator.name,
        role: collaborator.role,
        status: collaborator.status,
        invitedAt: collaborator.invitedAt,
    });
}

// DELETE /api/workflows/[id]/collaborators/[userId] - Remove collaborator
export async function DELETE(
    req: NextRequest,
    { params }: { params: Promise<{ id: string; userId: string }> }
) {
    const { id: workflowId, userId: collaboratorUserId } = await params;
    await dbConnect();

    const currentUserId = await getUserId(req);
    if (!currentUserId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Users can remove themselves, or managers can remove others
    const access = await getWorkflowAccess(currentUserId, workflowId);
    const isSelf = currentUserId === collaboratorUserId;
    const canManage = access.permissions.includes('manage_collaborators');

    if (!isSelf && !canManage) {
        return NextResponse.json({ error: 'Forbidden - Cannot remove collaborators' }, { status: 403 });
    }

    // Find and delete the collaborator
    const collaborator = await Collaborator.findOneAndDelete({
        workflowId,
        userId: collaboratorUserId,
    });

    if (!collaborator) {
        return NextResponse.json({ error: 'Collaborator not found' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Collaborator removed successfully' });
}
