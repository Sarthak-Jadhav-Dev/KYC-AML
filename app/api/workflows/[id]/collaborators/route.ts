import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Collaborator } from '@/lib/models/Collaborator';
import { Workflow } from '@/lib/models/definitions';
import { User } from '@/lib/models/User';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';
import { canManageCollaborators, getWorkflowAccess } from '@/lib/auth/permissions';

// Helper to get current user ID from request
async function getUserId(req: NextRequest): Promise<string | null> {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
}

// GET /api/workflows/[id]/collaborators - List all collaborators
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: workflowId } = await params;
    await dbConnect();

    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user has access to view the workflow
    const access = await getWorkflowAccess(userId, workflowId);
    if (!access.hasAccess) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get the workflow owner info
    const workflow = await Workflow.findById(workflowId);
    if (!workflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Get owner details
    let owner = null;
    if (workflow.userId) {
        const ownerUser = await User.findById(workflow.userId);
        if (ownerUser) {
            owner = {
                userId: ownerUser._id.toString(),
                email: ownerUser.email,
                name: ownerUser.name,
                role: 'owner' as const,
            };
        }
    }

    // Get all collaborators
    const collaborators = await Collaborator.find({ workflowId }).sort({ invitedAt: -1 });

    const collaboratorList = collaborators.map(c => ({
        id: c._id.toString(),
        userId: c.userId,
        email: c.email,
        name: c.name,
        role: c.role,
        status: c.status,
        invitedAt: c.invitedAt,
    }));

    return NextResponse.json({
        owner,
        collaborators: collaboratorList,
        currentUserAccess: access,
    });
}

// POST /api/workflows/[id]/collaborators - Invite a collaborator
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id: workflowId } = await params;
    await dbConnect();

    const userId = await getUserId(req);
    if (!userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check if user can manage collaborators
    const canManage = await canManageCollaborators(userId, workflowId);
    if (!canManage) {
        return NextResponse.json({ error: 'Forbidden - Cannot manage collaborators' }, { status: 403 });
    }

    const body = await req.json();
    const { email, role } = body;

    if (!email || !role) {
        return NextResponse.json({ error: 'Email and role are required' }, { status: 400 });
    }

    if (!['viewer', 'editor', 'admin'].includes(role)) {
        return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }

    // Find the user to invite
    const userToInvite = await User.findOne({ email: email.toLowerCase() });
    if (!userToInvite) {
        return NextResponse.json({ error: 'User not found with that email' }, { status: 404 });
    }

    // Check if user is the owner
    const workflow = await Workflow.findById(workflowId);
    if (workflow?.userId === userToInvite._id.toString()) {
        return NextResponse.json({ error: 'Cannot add workflow owner as collaborator' }, { status: 400 });
    }

    // Check if already a collaborator
    const existingCollaborator = await Collaborator.findOne({
        workflowId,
        userId: userToInvite._id.toString(),
    });

    if (existingCollaborator) {
        return NextResponse.json({ error: 'User is already a collaborator' }, { status: 400 });
    }

    // Create the collaborator
    const collaborator = await Collaborator.create({
        workflowId,
        userId: userToInvite._id.toString(),
        email: userToInvite.email,
        name: userToInvite.name,
        role,
        invitedBy: userId,
        status: 'accepted', // Auto-accept for now
    });

    return NextResponse.json({
        id: collaborator._id.toString(),
        userId: collaborator.userId,
        email: collaborator.email,
        name: collaborator.name,
        role: collaborator.role,
        status: collaborator.status,
        invitedAt: collaborator.invitedAt,
    }, { status: 201 });
}
