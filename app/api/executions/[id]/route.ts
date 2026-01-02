
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Execution, AuditEvent } from '@/lib/models/definitions';

// GET /api/executions/[id]
export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();

    // Validate ObjectId format to prevent CastError
    const { isValid } = await import('mongoose').then(m => m.Types.ObjectId);
    if (!isValid(id)) {
        return NextResponse.json({ error: 'Invalid execution ID format' }, { status: 400 });
    }

    const execution = await Execution.findById(id);
    if (!execution) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Fetch logs
    const logs = await AuditEvent.find({ executionId: id }).sort({ timestamp: 1 });

    return NextResponse.json({ execution, logs });
}
