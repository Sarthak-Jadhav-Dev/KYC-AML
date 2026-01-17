
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
    provider: z.enum(['opensanctions', 'mock']).default('opensanctions'),
    apiKey: z.string().optional(),
    matchThreshold: z.number().min(0).max(100).default(80),
    useFuzzyMatching: z.boolean().default(true),
    enableDemoFallback: z.boolean().default(true),
    datasets: z.array(z.string()).optional(), // e.g., ['crime', 'peps', 'sanctions']
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

// TM Schema Validate Config - Full validation configuration
const TMSchemaConfigSchema = z.object({
    requiredFields: z.array(z.string()).default([
        'txn_id', 'customer_id', 'timestamp', 'amount', 'currency', 'direction', 'channel'
    ]),
    allowedCurrencies: z.array(z.string()).default(['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AED', 'SGD', 'CHF']),
    allowedChannels: z.array(z.string()).default(['UPI', 'CARD', 'WIRE', 'WALLET', 'ACH', 'SWIFT', 'RTGS']),
    allowedDirections: z.array(z.string()).default(['IN', 'OUT']),
    maxFutureTimestampDriftMs: z.number().default(300000), // 5 minutes
    mode: z.enum(['strict', 'lenient']).default('strict'),
    enrichDefaults: z.boolean().default(true),
});

// TM FX Normalize Config - Currency normalization settings
const TMFXConfigSchema = z.object({
    baseCurrency: z.string().default('USD'),
    fxRates: z.record(z.string(), z.number()).optional(), // Custom rates override
    roundingDecimals: z.number().default(2),
    missingRateBehavior: z.enum(['block', 'warn', 'fallback']).default('warn'),
    fallbackRate: z.number().default(1),
});

// TM Deduplicate Config - Deduplication strategy
const TMDeduplicateConfigSchema = z.object({
    keyStrategy: z.enum(['txn_id', 'hash', 'both']).default('txn_id'),
    hashFields: z.array(z.string()).default(['customer_id', 'amount', 'timestamp', 'counterparty_id']),
    ttlDays: z.number().default(30),
    duplicateBehavior: z.enum(['drop', 'log', 'alert']).default('drop'),
});

// TM Scenario Rule Config - Comprehensive rule configuration
const TMScenarioRuleSchema = z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(['HIGH_VALUE', 'HIGH_FREQUENCY', 'VELOCITY', 'STRUCTURING', 'HIGH_RISK_CORRIDOR', 'UNUSUAL_PATTERN']),
    enabled: z.boolean().default(true),
    amountThreshold: z.number().optional(),
    countThreshold: z.number().optional(),
    velocityThreshold: z.number().optional(),
    structuringBand: z.number().optional(), // epsilon for structuring detection
    riskCountries: z.array(z.string()).optional(),
    riskMerchantCategories: z.array(z.string()).optional(),
    windowMinutes: z.number().default(60),
    severity: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
    requireAllConditions: z.boolean().default(false),
});

const TMScenarioConfigSchema = z.object({
    windowMinutes: z.number().default(60),
    rules: z.array(TMScenarioRuleSchema).optional(),
    minimumTriggers: z.number().default(1),
    cooldownMinutes: z.number().optional(),
    // Default rules will be applied in the handler if no rules are configured
});

// TM Create Alert Config - Alert creation and routing
const TMCreateAlertConfigSchema = z.object({
    groupingWindowMinutes: z.number().default(30),
    severityPriorityMap: z.record(z.string(), z.number()).default({
        'CRITICAL': 1,
        'HIGH': 2,
        'MEDIUM': 3,
        'LOW': 4,
    }),
    routingRules: z.array(z.object({
        condition: z.string(),
        queue: z.string(),
    })).optional(),
    slaMinutesByPriority: z.record(z.string(), z.number()).default({
        '1': 60,      // 1 hour for P1
        '2': 240,     // 4 hours for P2
        '3': 1440,    // 24 hours for P3
        '4': 4320,    // 72 hours for P4
    }),
    webhookUrl: z.string().url().optional(),
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
            TMFXConfigSchema,
            TMDeduplicateConfigSchema,
            TMScenarioConfigSchema,
            TMCreateAlertConfigSchema,
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
