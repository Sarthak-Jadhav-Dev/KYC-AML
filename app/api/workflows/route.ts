
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

// GET /api/workflows
export async function GET(req: NextRequest) {
    await dbConnect();
    const userId = await getUserId(req);

    // If authenticated, get user's workflows, otherwise get demo tenant workflows
    const query = userId
        ? { userId }
        : { tenantId: 'demo-tenant' };

    const workflows = await Workflow.find(query).sort({ updatedAt: -1 });
    return NextResponse.json(workflows);
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
