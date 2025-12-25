
import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';

// Mock TM Logic
export const handleTMSchemaValidate: NodeHandler = async (node, context) => {
    const txns = context.input.transactions || [];
    // Mock validation: check if 'amount' and 'currency' exist
    const valid = txns.filter((t: any) => t.amount && t.currency);
    return {
        data: {
            tm: {
                ...context.data.tm,
                validTransactions: valid,
                droppedCount: txns.length - valid.length
            }
        }
    };
};

export const handleTMDeduplicate: NodeHandler = async (node, context) => {
    const txns = context.data.tm?.validTransactions || [];
    // Mock dedupe by 'id'
    const seen = new Set();
    const unique = txns.filter((t: any) => {
        if (seen.has(t.id)) return false;
        seen.add(t.id);
        return true;
    });

    return {
        data: {
            tm: {
                ...context.data.tm,
                uniqueTransactions: unique,
                duplicateCount: txns.length - unique.length
            }
        }
    };
};

export const handleTMFXNormalize: NodeHandler = async (node, context) => {
    const txns = context.data.tm?.uniqueTransactions || [];
    // Mock rates
    const rates: any = { USD: 1, EUR: 1.1, GBP: 1.3 };
    const normalized = txns.map((t: any) => ({
        ...t,
        amountUSD: t.amount * (rates[t.currency] || 1)
    }));

    return {
        data: {
            tm: {
                ...context.data.tm,
                normalizedTransactions: normalized
            }
        }
    };
};

export const handleTMScenarioRule: NodeHandler = async (node, context) => {
    const txns = context.data.tm?.normalizedTransactions || [];
    const config = node.config || {};
    const threshold = config.amountThreshold || 10000;

    const alerts = txns.filter((t: any) => t.amountUSD > threshold).map((t: any) => ({
        type: 'HIGH_VALUE_TRANSACTION',
        transactionId: t.id,
        amount: t.amountUSD,
        threshold
    }));

    return {
        data: {
            tm: {
                ...context.data.tm,
                alerts: [...(context.data.tm?.alerts || []), ...alerts],
                alertCount: (context.data.tm?.alertCount || 0) + alerts.length
            }
        }
    };
};

export const registerTMHandlers = (register: (type: NodeType, handler: NodeHandler) => void) => {
    register(NodeType.TM_SCHEMA_VALIDATE, handleTMSchemaValidate);
    register(NodeType.TM_DEDUPLICATE, handleTMDeduplicate);
    register(NodeType.TM_FX_NORMALIZE, handleTMFXNormalize);
    register(NodeType.TM_SCENARIO_RULE, handleTMScenarioRule);
    register(NodeType.TM_CREATE_ALERT, (async (n, c) => ({ data: { output: c.data.tm?.alerts } })) as NodeHandler);
};
