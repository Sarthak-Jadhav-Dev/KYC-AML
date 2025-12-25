
import { registerHandler } from '../workflow/runner';
import { registerKYCHandlers } from './handlers/kyc';
import { registerAMLHandlers } from './handlers/aml';
import { registerLogicHandlers } from './handlers/logic';
import { registerTMHandlers } from './handlers/tm';

export function initializeHandlers() {
    registerKYCHandlers(registerHandler);
    registerAMLHandlers(registerHandler);
    registerLogicHandlers(registerHandler);
    registerTMHandlers(registerHandler);
}
