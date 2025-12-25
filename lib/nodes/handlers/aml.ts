
import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';

const checkList = (name: string, type: string) => {
    // Mock hits based on name keywords
    const nameLower = name.toLowerCase();

    if (type === 'SANCTIONS' && nameLower.includes('osama')) return true;
    if (type === 'PEP' && nameLower.includes('biden')) return true;
    if (type === 'MEDIA' && nameLower.includes('scandal')) return true;

    return false;
};

export const handleAMLScreen = (type: string): NodeHandler => async (node, context) => {
    const name = context.data.ocr?.extracted?.name || context.data.client?.givenName || "Unknown";
    const hit = checkList(name, type);

    return {
        data: {
            aml: {
                ...context.data.aml,
                [type]: {
                    hit,
                    matchedEntity: hit ? `Mock Entity (${name})` : null,
                    confidence: hit ? 0.95 : 0.0
                }
            }
        }
    };
};

export const registerAMLHandlers = (register: (type: NodeType, handler: NodeHandler) => void) => {
    register(NodeType.AML_SANCTIONS_SCREEN, handleAMLScreen('SANCTIONS'));
    register(NodeType.AML_PEP_SCREEN, handleAMLScreen('PEP'));
    register(NodeType.AML_WATCHLIST_SCREEN, handleAMLScreen('WATCHLIST'));
    register(NodeType.AML_ADVERSE_MEDIA_SCREEN, handleAMLScreen('MEDIA'));
};
