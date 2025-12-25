
import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';

// Mock Data Generators
const generateIdentity = () => ({
    givenName: "John",
    familyName: "Doe",
    dob: "1990-01-01",
    docNumber: "A12345678",
    nationality: "US"
});

export const handleClientRegistration: NodeHandler = async (node, context) => {
    // Input: Client provided data
    const input = context.input || {};
    return {
        data: {
            client: {
                ...generateIdentity(),
                ...input,
                registeredAt: new Date().toISOString()
            }
        }
    };
};

export const handleDocumentUpload: NodeHandler = async (node, context) => {
    // Mock upload handling
    return {
        data: {
            document: {
                type: "PASSPORT",
                url: "https://example.com/mock-doc.jpg",
                uploadedAt: new Date().toISOString()
            }
        }
    };
};

export const handleOCRExtract: NodeHandler = async (node, context) => {
    // Simulate processing time
    // await new Promise(r => setTimeout(r, 500));

    const client = context.data.client || generateIdentity();

    return {
        data: {
            ocr: {
                rawText: "MOCK PASSPORT DATA...",
                extracted: {
                    name: `${client.givenName} ${client.familyName}`,
                    dob: client.dob,
                    docNumber: client.docNumber,
                    expiry: "2030-01-01",
                    mrz: "P<USA..."
                }
            }
        }
    };
};

export const handleFraudCheck: NodeHandler = async (node, context) => {
    // Mock logic: fail if name is "Fraud"
    const name = context.data.ocr?.extracted?.name || "";
    const isSuspicious = name.toLowerCase().includes("fraud");

    return {
        data: {
            fraudCheck: {
                passed: !isSuspicious,
                tamperScore: isSuspicious ? 0.9 : 0.05,
                details: isSuspicious ? ["Font mismatch detected"] : ["No tampering detected"]
            }
        }
    };
};

export const handleBiometricLiveness: NodeHandler = async (node, context) => {
    return {
        data: {
            biometrics: {
                livenessPassed: true,
                faceMatchScore: 0.98,
                confidence: "HIGH"
            }
        }
    };
};

export const handleFaceMatch: NodeHandler = async (node, context) => {
    return {
        data: {
            faceMatch: {
                match: true,
                score: 0.99
            }
        }
    };
};

export const registerKYCHandlers = (register: (type: NodeType, handler: NodeHandler) => void) => {
    register(NodeType.KYC_CLIENT_REGISTRATION, handleClientRegistration);
    register(NodeType.KYC_DOCUMENT_UPLOAD, handleDocumentUpload);
    register(NodeType.KYC_OCR_EXTRACT, handleOCRExtract);
    register(NodeType.KYC_DOCUMENT_FRAUD_CHECK, handleFraudCheck);
    register(NodeType.KYC_BIOMETRIC_LIVENESS, handleBiometricLiveness);
    register(NodeType.KYC_FACE_MATCH, handleFaceMatch);
};
