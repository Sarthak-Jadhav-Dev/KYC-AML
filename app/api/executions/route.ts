
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Execution } from '@/lib/models/definitions';

// GET /api/executions (List)
export async function GET(req: NextRequest) {
    await dbConnect();
    const { searchParams } = new URL(req.url);
    const workflowId = searchParams.get('workflowId');

    const query: any = { tenantId: 'demo-tenant' };
    if (workflowId) {
        query.workflowId = workflowId;
    }

    const executions = await Execution.find(query).sort({ startedAt: -1 }).limit(50);
    return NextResponse.json(executions);
}
