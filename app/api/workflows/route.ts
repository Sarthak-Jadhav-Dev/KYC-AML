
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Workflow } from '@/lib/models/definitions';
import { Collaborator } from '@/lib/models/Collaborator';
import { verifyToken, getTokenFromHeaders } from '@/lib/auth/auth';

// Helper to get current user ID from request
async function getUserId(req: NextRequest): Promise<string | null> {
    const token = getTokenFromHeaders(req.headers);
    if (!token) return null;
    const payload = verifyToken(token);
    return payload?.userId || null;
}

// GET /api/workflows
export async function GET(req: NextRequest) {
    await dbConnect();
    const userId = await getUserId(req);

    if (!userId) {
        // If not authenticated, get demo tenant workflows
        const workflows = await Workflow.find({ tenantId: 'demo-tenant' }).sort({ updatedAt: -1 });
        return NextResponse.json(workflows);
    }

    // Get workflows the user owns
    const ownedWorkflows = await Workflow.find({ userId }).sort({ updatedAt: -1 });

    // Get workflow IDs where user is a collaborator
    const collaborations = await Collaborator.find({ userId, status: 'accepted' });
    const sharedWorkflowIds = collaborations.map(c => c.workflowId);

    // Get shared workflows
    const sharedWorkflows = await Workflow.find({ _id: { $in: sharedWorkflowIds } }).sort({ updatedAt: -1 });

    // Mark workflows with their access type
    const ownedWithType = ownedWorkflows.map(w => ({
        ...w.toObject(),
        accessType: 'owner' as const,
    }));

    const sharedWithType = sharedWorkflows.map(w => {
        const collab = collaborations.find(c => c.workflowId === w._id.toString());
        return {
            ...w.toObject(),
            accessType: 'shared' as const,
            role: collab?.role || 'viewer',
        };
    });

    // Combine and return all workflows
    const allWorkflows = [...ownedWithType, ...sharedWithType];
    return NextResponse.json(allWorkflows);
}

// POST /api/workflows
export async function POST(req: NextRequest) {
    await dbConnect();
    const userId = await getUserId(req);
    const body = await req.json();

    const workflow = await Workflow.create({
        tenantId: userId || 'demo-tenant',
        userId: userId || undefined,
        name: body.name || 'Untitled Workflow',
        status: 'DRAFT',
        graphJson: { nodes: [], edges: [] }
    });
    return NextResponse.json(workflow);
}
