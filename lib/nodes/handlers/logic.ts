
import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';

export const handleRiskCalculator: NodeHandler = async (node, context) => {
    const config = node.config || {};
    const weights = config.weights || { sanctions: 0.5, pep: 0.3, fraud: 0.2 };

    let score = 0;

    // Calculate score based on previous data
    if (context.data.aml?.SANCTIONS?.hit) score += weights.sanctions || 0;
    if (context.data.aml?.PEP?.hit) score += weights.pep || 0;
    if (context.data.fraudCheck?.passed === false) score += weights.fraud || 0;

    // Normalize
    score = Math.min(score, 1);

    let level = 'LOW';
    if (score > 0.7) level = 'HIGH';
    else if (score > 0.3) level = 'MEDIUM';

    return {
        riskScore: score,
        riskLevel: level,
        data: {
            risk: { score, level }
        }
    };
};

export const handleRiskGate: NodeHandler = async (node, context) => {
    // Passthrough, routing handled by compiler/runner logic
    return {};
};

export const handleDecision = (decision: string): NodeHandler => async (node, context) => {
    return {
        decision,
        data: {
            finalDecision: {
                status: decision,
                timestamp: new Date().toISOString()
            }
        }
    };
};

export const handleCallback: NodeHandler = async (node, context) => {
    const url = node.config?.url;
    if (url) {
        try {
            // Mock fetch
            // await fetch(url, { method: 'POST', body: JSON.stringify(context) });
            console.log(`Callback sent to ${url}`);
        } catch (e) {
            console.error("Callback failed", e);
        }
    }
    return {
        data: {
            callback: { sent: true, url }
        }
    };
};

export const handleAuditLog: NodeHandler = async (node, context) => {
    // The runner logs every node, but this is an explicit log step
    return {};
};

export const registerLogicHandlers = (register: (type: NodeType, handler: NodeHandler) => void) => {
    register(NodeType.RISK_CALCULATOR, handleRiskCalculator);
    register(NodeType.RISK_GATE, handleRiskGate);
    register(NodeType.DECISION_APPROVE, handleDecision('APPROVE'));
    register(NodeType.DECISION_REJECT, handleDecision('REJECT'));
    register(NodeType.DECISION_MANUAL_REVIEW, handleDecision('MANUAL_REVIEW'));
    register(NodeType.CALLBACK_WEBHOOK, handleCallback);
    register(NodeType.AUDIT_LOG, handleAuditLog);
};
