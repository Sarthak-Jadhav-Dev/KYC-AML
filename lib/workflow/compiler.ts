
import { WorkflowGraph, WorkflowNode, NodeType } from './schema';

export interface CompiledNode {
    id: string;
    type: NodeType;
    config: any;
    next: string[]; // Default next nodes
    routes?: { condition: string; targetId: string }[]; // For conditional nodes
}

export interface CompiledWorkflow {
    entryNodeId: string;
    nodes: Record<string, CompiledNode>;
}

export function compileWorkflow(graph: WorkflowGraph): { compiled: CompiledWorkflow; code: string } {
    // Safety: Ensure graph has nodes and edges arrays
    const nodes = graph?.nodes || [];
    const edges = graph?.edges || [];

    // Handle empty workflow
    if (nodes.length === 0) {
        return {
            compiled: { entryNodeId: '', nodes: {} },
            code: '// Empty workflow - add nodes to generate code'
        };
    }

    const nodesById = new Map<string, WorkflowNode>();
    nodes.forEach((n) => nodesById.set(n.id, n));

    const edgesBySource = new Map<string, any[]>();
    edges.forEach((e) => {
        const existing = edgesBySource.get(e.source) || [];
        existing.push(e);
        edgesBySource.set(e.source, existing);
    });

    // 1. Find Entry Node (Assuming implicit or explicit "START" or just the first node with no incoming edges? 
    // Requirement says "entryNodeId" in JSON, but editor might just have a Start node or user picks one.
    // We'll look for a node with type KYC_CLIENT_REGISTRATION as entry for now if not specified? 
    // Actually, for MVP, let's assume the first node in the array is entry or look for one with no incoming edges (DAG root).

    // Find roots
    const targets = new Set(edges.map(e => e.target));
    const roots = nodes.filter(n => !targets.has(n.id));

    if (roots.length === 0 && nodes.length > 0) {
        throw new Error("Cycle detected or no entry node found.");
    }

    // Pivot: Use the first root as entry
    const entryNode = roots[0];
    if (!entryNode) {
        if (nodes.length === 0) return { compiled: { entryNodeId: '', nodes: {} }, code: '' };
        throw new Error("No entry node found.");
    }

    const compiledNodes: Record<string, CompiledNode> = {};

    nodes.forEach((node) => {
        const outboundEdges = edgesBySource.get(node.id) || [];
        const nextIds = outboundEdges.map(e => e.target);

        const compiledNode: CompiledNode = {
            id: node.id,
            type: node.type as NodeType,
            config: node.data.config || {},
            next: nextIds,
        };

        // Handle Risk Gate Routes specifically
        if (node.type === NodeType.RISK_GATE) {
            // The config has routes: [{ id, condition, targetNodeId }] (from schema logic)
            // But edges connect them physically. 
            // We need to map the config routes to the actual edges or rely on config 'to' mapping.
            // The schema says Risk Gate config: { routes: [{ if: .., to: nodeId }] }
            // So we trust the config for conditional logic. 
            // Ensure edges exist for visualization, but runtime uses config.
            const config = node.data.config as any;
            if (config && config.routes) {
                compiledNode.routes = config.routes.map((r: any) => ({
                    condition: r.condition || r.if, // handle diverse naming
                    targetId: r.targetNodeId || r.to,
                }));
            }
        }

        compiledNodes[node.id] = compiledNode;
    });

    const compiled: CompiledWorkflow = {
        entryNodeId: entryNode.id,
        nodes: compiledNodes,
    };

    const code = generatesTypeScript(compiled);

    return { compiled, code };
}

function generatesTypeScript(compiled: CompiledWorkflow): string {
    let code = `
import { ExecutionContext } from './types';

export async function runWorkflow(context: ExecutionContext) {
  let currentNodeId = "${compiled.entryNodeId}";
  
  while (currentNodeId) {
    switch (currentNodeId) {`;

    Object.values(compiled.nodes).forEach((node) => {
        code += `
      case "${node.id}": // ${node.type}
        // Config: ${JSON.stringify(node.config)}
        await executeNode("${node.type}", context, ${JSON.stringify(node.config)});
        currentNodeId = ${getNextNodeLogic(node)};
        break;`;
    });

    code += `
      default:
        return; // End of workflow
    }
  }
}`;

    return code;
}

function getNextNodeLogic(node: CompiledNode): string {
    if (node.routes && node.routes.length > 0) {
        // Generate conditional logic string
        const checks = node.routes.map(r => `(evaluate("${r.condition}", context) ? "${r.targetId}" : null)`).join(' || ');
        // Validation: make sure it covers default case. 
        // Usually one route is "true" (default).
        return `${checks} || null`;
    }

    if (node.next.length > 0) {
        return `"${node.next[0]}"`; // Linear flow
    }

    return "null";
}
