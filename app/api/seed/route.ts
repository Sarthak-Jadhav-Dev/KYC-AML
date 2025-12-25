
import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/db';
import { Tenant, Workflow } from '@/lib/models/definitions';
import { NodeType } from '@/lib/workflow/schema';

// GET /api/seed
export async function GET(req: NextRequest) {
    await dbConnect();

    // 1. Create Tenant
    await Tenant.deleteOne({ apiKeyHash: 'demo-api-key' });
    await Tenant.create({
        name: 'TechFiesta Demo',
        apiKeyHash: 'demo-api-key'
    });

    // 2. Create Template Workflow
    await Workflow.deleteMany({ tenantId: 'demo-tenant' });

    const nodes = [
        { id: '1', type: NodeType.KYC_CLIENT_REGISTRATION, position: { x: 100, y: 100 }, data: { label: 'Client Registration' } },
        { id: '2', type: NodeType.KYC_OCR_EXTRACT, position: { x: 100, y: 200 }, data: { label: 'OCR Extraction', config: { provider: 'mock' } } },
        { id: '3', type: NodeType.AML_SANCTIONS_SCREEN, position: { x: 100, y: 300 }, data: { label: 'Sanctions Check' } },
        { id: '4', type: NodeType.RISK_CALCULATOR, position: { x: 100, y: 400 }, data: { label: 'Risk Calc', config: { weights: { sanctions: 0.8 } } } },
        { id: '5', type: NodeType.RISK_GATE, position: { x: 100, y: 500 }, data: { label: 'Risk Gate', config: { routes: [{ condition: "riskLevel == 'HIGH'", targetNodeId: "7" }] } } },
        { id: '6', type: NodeType.DECISION_APPROVE, position: { x: -100, y: 600 }, data: { label: 'Approve' } },
        { id: '7', type: NodeType.DECISION_MANUAL_REVIEW, position: { x: 300, y: 600 }, data: { label: 'Manual Review' } },
    ];

    const edges = [
        { id: 'e1-2', source: '1', target: '2' },
        { id: 'e2-3', source: '2', target: '3' },
        { id: 'e3-4', source: '3', target: '4' },
        { id: 'e4-5', source: '4', target: '5' },
        // Gate has explicit routing in logic, but visual edges help
        { id: 'e5-6', source: '5', target: '6', label: 'Default' },
        { id: 'e5-7', source: '5', target: '7', label: 'High Risk' },
    ];

    const workflow = await Workflow.create({
        tenantId: 'demo-tenant',
        name: 'KYC Onboarding Demo',
        status: 'DRAFT',
        graphJson: { nodes, edges }
    });

    return NextResponse.json({ success: true, workflowId: workflow._id });
}
