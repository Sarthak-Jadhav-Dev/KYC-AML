
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Workflow, Execution } from '@/lib/models/definitions';
import { runWorkflowEngine } from '@/lib/workflow/runner';
import { initializeHandlers } from '@/lib/nodes/registry';

// Initialize handlers (safe to call multiple times)
initializeHandlers();

// POST /api/executions/start
export async function POST(req: NextRequest) {
    await dbConnect();
    const body = await req.json();
    const { workflowId, input } = body;

    const workflow = await Workflow.findById(workflowId);
    if (!workflow) return NextResponse.json({ error: 'Workflow not found' }, { status: 404 });

    // Use compiledJson. If missing, try to compile on fly or error.
    if (!workflow.compiledJson) {
        return NextResponse.json({ error: 'Workflow not deployed' }, { status: 400 });
    }

    // Create Execution Record
    const execution = await Execution.create({
        tenantId: workflow.tenantId || 'demo-tenant', // Ensure tenantId is propagated
        workflowId: workflow._id.toString(),
        status: 'RUNNING',
        input: input || {},
        startedAt: new Date(),
    });

    // Run Async (in MVP, await it to show result immediately)
    // In prod, use queue.
    await runWorkflowEngine(workflow.compiledJson, execution, input || {});

    return NextResponse.json(execution);
}
