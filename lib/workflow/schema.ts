
import { z } from 'zod';

// Node Types
export enum NodeType {
    // KYC
    KYC_CLIENT_REGISTRATION = 'KYC_CLIENT_REGISTRATION',
    KYC_DOCUMENT_UPLOAD = 'KYC_DOCUMENT_UPLOAD',
    KYC_OCR_EXTRACT = 'KYC_OCR_EXTRACT',
    KYC_DOCUMENT_FRAUD_CHECK = 'KYC_DOCUMENT_FRAUD_CHECK',
    KYC_BIOMETRIC_LIVENESS = 'KYC_BIOMETRIC_LIVENESS',
    KYC_FACE_MATCH = 'KYC_FACE_MATCH',

    // AML
    AML_SANCTIONS_SCREEN = 'AML_SANCTIONS_SCREEN',
    AML_PEP_SCREEN = 'AML_PEP_SCREEN',
    AML_WATCHLIST_SCREEN = 'AML_WATCHLIST_SCREEN',
    AML_ADVERSE_MEDIA_SCREEN = 'AML_ADVERSE_MEDIA_SCREEN',

    // Risk & Logic
    RISK_CALCULATOR = 'RISK_CALCULATOR',
    RISK_GATE = 'RISK_GATE',

    // Decisions / Actions
    DECISION_APPROVE = 'DECISION_APPROVE',
    DECISION_REJECT = 'DECISION_REJECT',
    DECISION_MANUAL_REVIEW = 'DECISION_MANUAL_REVIEW',
    CALLBACK_WEBHOOK = 'CALLBACK_WEBHOOK',
    AUDIT_LOG = 'AUDIT_LOG',

    // Transaction Monitoring
    TM_SCHEMA_VALIDATE = 'TM_SCHEMA_VALIDATE',
    TM_SCENARIO_RULE = 'TM_SCENARIO_RULE',
    TM_CREATE_ALERT = 'TM_CREATE_ALERT',
    TM_FX_NORMALIZE = 'TM_FX_NORMALIZE',
    TM_DEDUPLICATE = 'TM_DEDUPLICATE'
}

// Config Schemas
const OCRConfigSchema = z.object({
    provider: z.string().default('mock'),
    fields: z.array(z.string()).default(['name', 'dob', 'docNumber']),
});

const AMLConfigSchema = z.object({
    provider: z.string().default('mock'),
    matchThreshold: z.number().min(0).max(1).default(0.8),
});

const RiskCalculatorConfigSchema = z.object({
    weights: z.record(z.string(), z.number()), // e.g., { "sanctions": 0.5 }
    // Optional thresholds for immediate classification
    thresholds: z.object({
        high: z.number().optional(),
        medium: z.number().optional(),
    }).optional(),
});

const RiskGateRouteSchema = z.object({
    id: z.string(),
    condition: z.string(), // "riskLevel == 'HIGH'"
    targetNodeId: z.string(),
});

const RiskGateConfigSchema = z.object({
    routes: z.array(RiskGateRouteSchema),
});

const CallbackConfigSchema = z.object({
    url: z.string().url(),
    method: z.enum(['GET', 'POST', 'PUT']).default('POST'),
});

const TMSchemaConfigSchema = z.object({
    requiredFields: z.array(z.string()),
});

const TMScenarioConfigSchema = z.object({
    windowMinutes: z.number(),
    amountThreshold: z.number().optional(),
    velocityThreshold: z.number().optional(),
});

// Generic Node Schema
export const WorkflowNodeSchema = z.object({
    id: z.string(),
    type: z.nativeEnum(NodeType), // Use zod's nativeEnum for strict validation
    position: z.object({ x: z.number(), y: z.number() }),
    data: z.object({
        label: z.string().optional(),
        config: z.union([
            OCRConfigSchema,
            AMLConfigSchema,
            RiskCalculatorConfigSchema,
            RiskGateConfigSchema,
            CallbackConfigSchema,
            TMSchemaConfigSchema,
            TMScenarioConfigSchema,
            z.record(z.string(), z.any()), // Fallback for nodes with no specific config
        ]).optional(),
    }),
});

export const WorkflowEdgeSchema = z.object({
    id: z.string(),
    source: z.string(),
    target: z.string(),
    type: z.string().optional(),
    label: z.string().optional(),
});

export const WorkflowGraphSchema = z.object({
    nodes: z.array(WorkflowNodeSchema),
    edges: z.array(WorkflowEdgeSchema),
});

export type WorkflowGraph = z.infer<typeof WorkflowGraphSchema>;
export type WorkflowNode = z.infer<typeof WorkflowNodeSchema>;
