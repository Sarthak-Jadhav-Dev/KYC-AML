
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Workflow } from '@/lib/models/definitions';
import { compileWorkflow } from '@/lib/workflow/compiler';

// POST /api/workflows/[id]/deploy
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    await dbConnect();

    const workflow = await Workflow.findById(id);
    if (!workflow) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    try {
        const { compiled, code } = compileWorkflow(workflow.graphJson);

        workflow.compiledJson = compiled;
        workflow.generatedCodeTs = code;
        workflow.status = 'DEPLOYED';
        workflow.version += 1;
        workflow.updatedAt = new Date();

        await workflow.save();

        return NextResponse.json({ success: true, workflow });
    } catch (error: any) {
        return NextResponse.json({ error: error.message }, { status: 400 });
    }
}
