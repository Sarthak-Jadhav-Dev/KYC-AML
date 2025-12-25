
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Execution } from '@/lib/models/definitions';

// GET /api/executions (List)
export async function GET(req: NextRequest) {
    await dbConnect();
    // Filter by tenant/workflow if needed
    const executions = await Execution.find({ tenantId: 'demo-tenant' }).sort({ startedAt: -1 }).limit(50);
    return NextResponse.json(executions);
}
