
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Workflow } from '@/lib/models/definitions';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';
import { canView, canEdit, canDelete, getWorkflowAccess } from '@/lib/auth/permissions';

// Helper to get current user ID from request
async function getUserId(req: NextRequest): Promise<string | null> {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
}

// GET /api/workflows/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();

    const userId = await getUserId(req);
    const workflow = await Workflow.findById(id);

    if (!workflow) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    // Check if user has access (owner or collaborator)
    const hasAccess = await canView(userId, id);
    if (!hasAccess && workflow.userId) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Get user's access info
    const access = await getWorkflowAccess(userId, id);

    return NextResponse.json({
        ...workflow.toObject(),
        userAccess: access,
    });
}

// PUT /api/workflows/[id] - Save Graph
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();

    const userId = await getUserId(req);

    // Check if user can edit
    const hasEditAccess = await canEdit(userId, id);
    if (!hasEditAccess) {
        return NextResponse.json({ error: 'Forbidden - Cannot edit this workflow' }, { status: 403 });
    }

    const body = await req.json();

    const workflow = await Workflow.findByIdAndUpdate(
        id,
        {
            graphJson: body.graphJson,
            updatedAt: new Date()
        },
        { new: true }
    );

    return NextResponse.json(workflow);
}

// PATCH /api/workflows/[id] - Update workflow name
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
    const userId = await getUserId(req);
    const body = await req.json();

    // Find the workflow first to check ownership
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check if user can edit
    const hasEditAccess = await canEdit(userId, id);
    if (!hasEditAccess) {
        return NextResponse.json({ error: 'Forbidden - Cannot edit this workflow' }, { status: 403 });
    }

    const updateData: Record<string, unknown> = { updatedAt: new Date() };

    if (body.name !== undefined) {
        updateData.name = body.name;
    }

    const workflow = await Workflow.findByIdAndUpdate(
        id,
        updateData,
        { new: true }
    );

    return NextResponse.json(workflow);
}

// DELETE /api/workflows/[id] - Delete workflow
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
    const userId = await getUserId(req);

    // Find the workflow first to check existence
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Only owner can delete
    const hasDeleteAccess = await canDelete(userId, id);
    if (!hasDeleteAccess) {
        return NextResponse.json({ error: 'Forbidden - Only owner can delete this workflow' }, { status: 403 });
    }

    await Workflow.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Workflow deleted successfully' });
}
