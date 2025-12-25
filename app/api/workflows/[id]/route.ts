
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Workflow } from '@/lib/models/definitions';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';

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
    const workflow = await Workflow.findById(id);
    if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(workflow);
}

// PUT /api/workflows/[id] - Save Graph
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();
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

    // Check authorization (if workflow has userId, user must match)
    if (existingWorkflow.userId && existingWorkflow.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
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

    // Find the workflow first to check ownership
    const existingWorkflow = await Workflow.findById(id);
    if (!existingWorkflow) {
        return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });
    }

    // Check authorization (if workflow has userId, user must match)
    if (existingWorkflow.userId && existingWorkflow.userId !== userId) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });
    }

    await Workflow.findByIdAndDelete(id);

    return NextResponse.json({ message: 'Workflow deleted successfully' });
}
