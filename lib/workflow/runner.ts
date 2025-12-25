
import { CompiledWorkflow, CompiledNode } from './compiler';
import { NodeType } from './schema';
import { IExecution, IAuditEvent } from '../models/definitions';

// Context passed between nodes
export interface ExecutionContext {
    executionId: string;
    tenantId: string;
    input: any;
    // State accumulation
    data: Record<string, any>; // e.g., data.ocr.name
    riskScore: number;
    riskLevel: string;
    decision: string | null;
}

// Handler signature
export type NodeHandler = (
    node: CompiledNode,
    context: ExecutionContext
) => Promise<Partial<ExecutionContext>>;

// Registry of handlers (will be populated by importing handlers)
const handlers: Record<string, NodeHandler> = {};

export function registerHandler(type: NodeType, handler: NodeHandler) {
    handlers[type] = handler;
}

export async function runWorkflowEngine(
    workflow: CompiledWorkflow,
    execution: any, // Mongoose doc
    initialInput: any
) {
    const context: ExecutionContext = {
        executionId: execution._id.toString(),
        tenantId: execution.tenantId,
        input: initialInput,
        data: {},
        riskScore: 0,
        riskLevel: 'LOW',
        decision: null
    };

    let currentNodeId: string | null = workflow.entryNodeId;
    const maxSteps = 50; // Safety brake
    let steps = 0;

    try {
        while (currentNodeId && steps < maxSteps) {
            steps++;
            const node:any = workflow.nodes[currentNodeId];
            if (!node) break;

            // Audit Start
            // await createAuditLog(context, node.id, 'NODE_START'); // Optimization: batch or fire-and-forget

            const handler = handlers[node.type];
            if (handler) {
                // Execute Handler
                const updates = await handler(node, context);
                // Merge updates
                Object.assign(context, updates);
                if (updates.data) {
                    context.data = { ...context.data, ...updates.data };
                }
            } else {
                console.warn(`No handler for type ${node.type}`);
            }

            // Determine Next
            let nextId: string | null = null;
            if (node.routes) {
                // Evaluate conditions
                for (const route of node.routes) {
                    if (evaluateCondition(route.condition, context)) {
                        nextId = route.targetId;
                        break;
                    }
                }
            } else if (node.next && node.next.length > 0) {
                nextId = node.next[0];
            }

            currentNodeId = nextId;
        }

        execution.status = 'DONE';
        execution.output = context.data;
        execution.riskScore = context.riskScore;
        execution.riskLevel = context.riskLevel;
        execution.decision = context.decision;
        await execution.save();

    } catch (error) {
        console.error("Execution failed", error);
        execution.status = 'FAILED';
        await execution.save();
    }
}

// Simple safe evaluator
function evaluateCondition(condition: string, context: ExecutionContext): boolean {
    if (condition === 'true') return true;

    // Basic parser for "riskLevel == 'HIGH'", "riskScore > 0.5"
    // Security: Do NOT use eval. Use Function with restricted scope or regex parser.
    // For MVP hackathon, we can use a very simple controlled evaluator.

    try {
        // Replace variable names with context values
        // This is fragile but works for "riskScore > 0.5"
        const keys = ['riskScore', 'riskLevel'];
        let safeExpr = condition;

        // Simple string replacement (careful with overlaps)
        safeExpr = safeExpr.replace(/riskScore/g, String(context.riskScore));
        safeExpr = safeExpr.replace(/riskLevel/g, `'${context.riskLevel}'`);

        // Evaluate using Function constructor (still risky, better to use 'expr-eval' lib but strictly no eval)
        // Requirement says: "Restricted evaluator... identifiers from context"
        // We will use a Function with NO access to global scope? JS Function still has access.
        // For MVP demonstration, assume inputs are from trusted admin (user).
        // Better: manual parsing.

        // Manual parsing for MVP speed:
        // Support: ==, >, <

        if (condition.includes('==')) {
            const parts = condition.split('==').map(s => s.trim().replace(/'/g, "").replace(/"/g, ""));
            const val = context[parts[0] as keyof ExecutionContext];
            return String(val) === parts[1];
        }

        if (condition.includes('>')) {
            const parts = condition.split('>').map(s => s.trim());
            const val = context[parts[0] as keyof ExecutionContext];
            return Number(val) > Number(parts[1]);
        }

        if (condition.includes('<')) {
            const parts = condition.split('<').map(s => s.trim());
            const val = context[parts[0] as keyof ExecutionContext];
            return Number(val) < Number(parts[1]);
        }

        return false;

    } catch (e) {
        return false;
    }
}
