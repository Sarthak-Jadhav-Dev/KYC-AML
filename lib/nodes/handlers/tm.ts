/**
 * Transaction Monitoring Node Handlers
 * Comprehensive implementation for AML/compliance transaction monitoring
 */

import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';
import {
    Transaction,
    ValidationError,
    ValidationWarning,
    RuleHit,
    Alert,
    Severity,
    AlertPriority,
    RuleType,
    ScenarioRule,
    CustomerContext,
    AggregatedMetrics,
    TMSchemaValidateConfig,
    TMFXNormalizeConfig,
    TMDeduplicateConfig,
    TMScenarioRuleConfig,
    TMCreateAlertConfig,
    FXRates,
} from '../tm-types';

// ============================================
// Helper Functions
// ============================================

const generateId = (): string => {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

const hashString = (str: string): string => {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36);
};

// In-memory stores for simulation (would be Redis/DB in production)
const deduplicationStore: Map<string, { txn_id: string; timestamp: Date; ttl: Date }> = new Map();
const alertGroupingStore: Map<string, { alert_id: string; timestamp: Date; count: number }> = new Map();

// Default FX rates (mock - would come from external service)
const DEFAULT_FX_RATES: FXRates = {
    USD: 1.0,
    EUR: 1.08,
    GBP: 1.26,
    INR: 0.012,
    JPY: 0.0067,
    AED: 0.27,
    SGD: 0.74,
    CHF: 1.12,
    CAD: 0.74,
    AUD: 0.65,
};

// Default scenario rules when none configured
const DEFAULT_SCENARIO_RULES: ScenarioRule[] = [
    {
        id: 'HIGH_VALUE_DEFAULT',
        name: 'High Value Transaction',
        type: 'HIGH_VALUE',
        enabled: true,
        amountThreshold: 10000,
        windowMinutes: 60,
        severity: 'HIGH',
    },
    {
        id: 'HIGH_FREQ_DEFAULT',
        name: 'High Frequency Activity',
        type: 'HIGH_FREQUENCY',
        enabled: true,
        countThreshold: 10,
        windowMinutes: 60,
        severity: 'MEDIUM',
    },
    {
        id: 'VELOCITY_DEFAULT',
        name: 'Velocity Spike',
        type: 'VELOCITY',
        enabled: true,
        velocityThreshold: 50000,
        windowMinutes: 10,
        severity: 'HIGH',
    },
    {
        id: 'STRUCTURING_DEFAULT',
        name: 'Potential Structuring',
        type: 'STRUCTURING',
        enabled: true,
        amountThreshold: 10000,
        structuringBand: 500, // Transactions between 9500-10000
        windowMinutes: 1440, // 24 hours
        severity: 'HIGH',
    },
    {
        id: 'HIGH_RISK_CORRIDOR',
        name: 'High Risk Corridor',
        type: 'HIGH_RISK_CORRIDOR',
        enabled: true,
        riskCountries: ['IR', 'KP', 'SY', 'CU', 'VE'],
        windowMinutes: 60,
        severity: 'CRITICAL',
    },
];

// ISO 3166-1 alpha-2 country codes (subset for validation)
const VALID_COUNTRY_CODES = new Set([
    'US', 'GB', 'DE', 'FR', 'IN', 'JP', 'CN', 'CA', 'AU', 'SG', 'AE', 'CH',
    'NL', 'BE', 'IT', 'ES', 'SE', 'NO', 'DK', 'FI', 'IR', 'KP', 'SY', 'CU', 'VE'
]);

// ============================================
// TM_SCHEMA_VALIDATE Handler
// ============================================

export const handleTMSchemaValidate: NodeHandler = async (node, context) => {
    const config: TMSchemaValidateConfig = {
        requiredFields: ['txn_id', 'customer_id', 'timestamp', 'amount', 'currency', 'direction', 'channel'],
        allowedCurrencies: ['USD', 'EUR', 'GBP', 'INR', 'JPY', 'AED', 'SGD', 'CHF'],
        allowedChannels: ['UPI', 'CARD', 'WIRE', 'WALLET', 'ACH', 'SWIFT', 'RTGS'],
        allowedDirections: ['IN', 'OUT'],
        maxFutureTimestampDriftMs: 300000, // 5 minutes
        mode: 'strict',
        enrichDefaults: true,
        ...node.config
    };

    const transactions: Transaction[] = context.input.transactions || [];
    const validTransactions: Transaction[] = [];
    const invalidTransactions: Transaction[] = [];
    const allErrors: { txn_id: string; errors: ValidationError[] }[] = [];
    const allWarnings: { txn_id: string; warnings: ValidationWarning[] }[] = [];

    for (const txn of transactions) {
        const errors: ValidationError[] = [];
        const warnings: ValidationWarning[] = [];

        // 1. Required field validation
        for (const field of config.requiredFields) {
            if (txn[field as keyof Transaction] === undefined || txn[field as keyof Transaction] === null) {
                errors.push({
                    field,
                    code: 'REQUIRED_FIELD_MISSING',
                    message: `Required field '${field}' is missing`
                });
            }
        }

        // 2. Type validation
        if (txn.timestamp) {
            const parsedDate = new Date(txn.timestamp);
            if (isNaN(parsedDate.getTime())) {
                errors.push({
                    field: 'timestamp',
                    code: 'INVALID_TIMESTAMP',
                    message: 'Timestamp is not parseable as a valid date'
                });
            }
        }

        if (txn.amount !== undefined && (typeof txn.amount !== 'number' || isNaN(txn.amount))) {
            errors.push({
                field: 'amount',
                code: 'INVALID_AMOUNT_TYPE',
                message: 'Amount must be a valid number'
            });
        }

        if (txn.currency && typeof txn.currency !== 'string') {
            errors.push({
                field: 'currency',
                code: 'INVALID_CURRENCY_TYPE',
                message: 'Currency must be a string'
            });
        }

        // 3. Range checks
        if (typeof txn.amount === 'number' && txn.amount <= 0) {
            errors.push({
                field: 'amount',
                code: 'INVALID_AMOUNT_RANGE',
                message: 'Amount must be greater than 0'
            });
        }

        if (txn.timestamp) {
            const txnTime = new Date(txn.timestamp).getTime();
            const now = Date.now();
            if (txnTime > now + config.maxFutureTimestampDriftMs) {
                errors.push({
                    field: 'timestamp',
                    code: 'FUTURE_TIMESTAMP',
                    message: `Timestamp is too far in the future (max drift: ${config.maxFutureTimestampDriftMs}ms)`
                });
            }
        }

        // 4. Enum checks
        if (txn.currency && !config.allowedCurrencies.includes(txn.currency)) {
            if (config.mode === 'strict') {
                errors.push({
                    field: 'currency',
                    code: 'UNSUPPORTED_CURRENCY',
                    message: `Currency '${txn.currency}' is not in the allowed list`
                });
            } else {
                warnings.push({
                    field: 'currency',
                    code: 'UNKNOWN_CURRENCY',
                    message: `Currency '${txn.currency}' is not in the allowed list`
                });
            }
        }

        if (txn.direction && !config.allowedDirections.includes(txn.direction)) {
            errors.push({
                field: 'direction',
                code: 'INVALID_DIRECTION',
                message: `Direction must be one of: ${config.allowedDirections.join(', ')}`
            });
        }

        if (txn.channel && !config.allowedChannels.includes(txn.channel)) {
            if (config.mode === 'strict') {
                errors.push({
                    field: 'channel',
                    code: 'UNSUPPORTED_CHANNEL',
                    message: `Channel '${txn.channel}' is not in the allowed list`
                });
            } else {
                warnings.push({
                    field: 'channel',
                    code: 'UNKNOWN_CHANNEL',
                    message: `Channel '${txn.channel}' is not in the allowed list`
                });
            }
        }

        // 5. Cross-field consistency
        if (!txn.currency) {
            errors.push({
                field: 'currency',
                code: 'MISSING_CURRENCY',
                message: 'Currency is required for amount processing'
            });
        }

        if (txn.counterparty_country && !VALID_COUNTRY_CODES.has(txn.counterparty_country)) {
            warnings.push({
                field: 'counterparty_country',
                code: 'INVALID_COUNTRY_CODE',
                message: `Country code '${txn.counterparty_country}' is not a valid ISO-3166 code`
            });
        }

        // 6. Enrichment defaults
        let enrichedTxn = { ...txn };
        if (config.enrichDefaults) {
            enrichedTxn = {
                ...txn,
                merchant_category: txn.merchant_category || 'UNKNOWN',
                purpose_code: txn.purpose_code || undefined,
                validation_status: errors.length === 0 ? 'VALID' : 'INVALID',
                validation_errors: errors.map(e => e.message),
                validation_warnings: warnings.map(w => w.message),
            };
        }

        // 7. Decision based on mode
        if (errors.length === 0 || (config.mode === 'lenient' && errors.every(e => e.code.startsWith('UNSUPPORTED')))) {
            validTransactions.push(enrichedTxn);
        } else {
            invalidTransactions.push(enrichedTxn);
        }

        if (errors.length > 0) {
            allErrors.push({ txn_id: txn.txn_id || 'UNKNOWN', errors });
        }
        if (warnings.length > 0) {
            allWarnings.push({ txn_id: txn.txn_id || 'UNKNOWN', warnings });
        }
    }

    return {
        data: {
            tm: {
                ...context.data.tm,
                validTransactions,
                invalidTransactions,
                validationErrors: allErrors,
                validationWarnings: allWarnings,
                validCount: validTransactions.length,
                invalidCount: invalidTransactions.length,
                schemaValidationComplete: true,
            }
        }
    };
};

// ============================================
// TM_FX_NORMALIZE Handler
// ============================================

export const handleTMFXNormalize: NodeHandler = async (node, context) => {
    const config: TMFXNormalizeConfig = {
        baseCurrency: 'USD',
        fxRates: DEFAULT_FX_RATES,
        roundingDecimals: 2,
        missingRateBehavior: 'warn',
        fallbackRate: 1,
        ...node.config
    };

    const rates = { ...DEFAULT_FX_RATES, ...config.fxRates };
    const transactions: Transaction[] = context.data.tm?.validTransactions ||
        context.data.tm?.uniqueTransactions ||
        context.input.transactions || [];

    const normalizedTransactions: Transaction[] = [];
    const fxIssues: { txn_id: string; issue: string }[] = [];

    for (const txn of transactions) {
        const originalCurrency = txn.currency;
        const originalAmount = txn.amount;

        // Get FX rate
        let fxRate = rates[originalCurrency];
        let fxStatus: 'OK' | 'MISSING' | 'STALE' = 'OK';

        if (!fxRate) {
            fxStatus = 'MISSING';
            fxIssues.push({
                txn_id: txn.txn_id,
                issue: `Missing FX rate for currency: ${originalCurrency}`
            });

            switch (config.missingRateBehavior) {
                case 'block':
                    continue; // Skip this transaction
                case 'fallback':
                    fxRate = config.fallbackRate;
                    break;
                case 'warn':
                default:
                    fxRate = config.fallbackRate;
                    break;
            }
        }

        // Convert to base currency
        const amountBase = Number((originalAmount * fxRate).toFixed(config.roundingDecimals));

        // Preserve original and add normalized values
        const normalizedTxn: Transaction = {
            ...txn,
            amount_base: amountBase,
            currency_original: originalCurrency,
            fx_rate: fxRate,
            fx_status: fxStatus,
        };

        normalizedTransactions.push(normalizedTxn);
    }

    return {
        data: {
            tm: {
                ...context.data.tm,
                normalizedTransactions,
                baseCurrency: config.baseCurrency,
                fxIssues,
                fxNormalizationComplete: true,
            }
        }
    };
};

// ============================================
// TM_DEDUPLICATE Handler
// ============================================

export const handleTMDeduplicate: NodeHandler = async (node, context) => {
    const config: TMDeduplicateConfig = {
        keyStrategy: 'txn_id',
        hashFields: ['customer_id', 'amount', 'timestamp', 'counterparty_id'],
        ttlDays: 30,
        duplicateBehavior: 'drop',
        ...node.config
    };

    const transactions: Transaction[] = context.data.tm?.normalizedTransactions ||
        context.data.tm?.validTransactions ||
        context.input.transactions || [];

    const uniqueTransactions: Transaction[] = [];
    const duplicates: { txn_id: string; dedup_key: string; original_txn_id?: string }[] = [];
    const now = new Date();
    const ttlMs = config.ttlDays * 24 * 60 * 60 * 1000;

    // Clean expired entries from store
    for (const [key, entry] of deduplicationStore.entries()) {
        if (entry.ttl < now) {
            deduplicationStore.delete(key);
        }
    }

    for (const txn of transactions) {
        let dedupKey: string;

        // Generate dedup key based on strategy
        switch (config.keyStrategy) {
            case 'txn_id':
                dedupKey = txn.txn_id;
                break;
            case 'hash':
                const hashInput = config.hashFields
                    .map(field => String(txn[field as keyof Transaction] || ''))
                    .join('|');
                dedupKey = `hash_${hashString(hashInput)}`;
                break;
            case 'both':
                const hashInput2 = config.hashFields
                    .map(field => String(txn[field as keyof Transaction] || ''))
                    .join('|');
                dedupKey = `${txn.txn_id}_${hashString(hashInput2)}`;
                break;
            default:
                dedupKey = txn.txn_id;
        }

        // Check if duplicate
        const existing = deduplicationStore.get(dedupKey);

        if (existing) {
            // Duplicate found
            duplicates.push({
                txn_id: txn.txn_id,
                dedup_key: dedupKey,
                original_txn_id: existing.txn_id
            });

            // Handle based on behavior
            switch (config.duplicateBehavior) {
                case 'drop':
                    // Don't add to unique transactions
                    break;
                case 'log':
                    // Add but mark as duplicate
                    uniqueTransactions.push({
                        ...txn,
                        is_duplicate: true,
                        dedup_key: dedupKey
                    });
                    break;
                case 'alert':
                    // Add but mark for alert
                    uniqueTransactions.push({
                        ...txn,
                        is_duplicate: true,
                        dedup_key: dedupKey
                    });
                    break;
            }
        } else {
            // New transaction - store and pass through
            deduplicationStore.set(dedupKey, {
                txn_id: txn.txn_id,
                timestamp: now,
                ttl: new Date(now.getTime() + ttlMs)
            });

            uniqueTransactions.push({
                ...txn,
                is_duplicate: false,
                dedup_key: dedupKey
            });
        }
    }

    return {
        data: {
            tm: {
                ...context.data.tm,
                uniqueTransactions,
                duplicates,
                duplicateCount: duplicates.length,
                deduplicationComplete: true,
            }
        }
    };
};

// ============================================
// TM_SCENARIO_RULE Handler
// ============================================

export const handleTMScenarioRule: NodeHandler = async (node, context) => {
    const config: TMScenarioRuleConfig = {
        windowMinutes: 60,
        rules: DEFAULT_SCENARIO_RULES,
        minimumTriggers: 1,
        cooldownMinutes: undefined,
        ...node.config
    };

    const rules = config.rules || DEFAULT_SCENARIO_RULES;
    const transactions: Transaction[] = context.data.tm?.uniqueTransactions ||
        context.data.tm?.normalizedTransactions ||
        context.input.transactions || [];

    // Load customer context from input (if provided)
    const customerContext: CustomerContext = context.input.customerContext || {
        customer_id: transactions[0]?.customer_id || 'UNKNOWN',
        risk_rating: 'MEDIUM',
        segment: 'RETAIL',
    };

    const ruleHits: RuleHit[] = [];
    const now = new Date();

    // Group transactions by customer
    const txnsByCustomer = new Map<string, Transaction[]>();
    for (const txn of transactions) {
        const customerId = txn.customer_id;
        if (!txnsByCustomer.has(customerId)) {
            txnsByCustomer.set(customerId, []);
        }
        txnsByCustomer.get(customerId)!.push(txn);
    }

    // Compute aggregated metrics for each customer
    for (const [customerId, customerTxns] of txnsByCustomer) {
        const windowMs = config.windowMinutes * 60 * 1000;
        const windowStart = new Date(now.getTime() - windowMs);

        // Filter transactions within window
        const windowTxns = customerTxns.filter(txn => {
            const txnTime = new Date(txn.timestamp);
            return txnTime >= windowStart && txnTime <= now;
        });

        // Compute metrics
        const metrics: AggregatedMetrics = {
            sum_out_24h: windowTxns.filter(t => t.direction === 'OUT').reduce((s, t) => s + (t.amount_base || t.amount), 0),
            sum_in_24h: windowTxns.filter(t => t.direction === 'IN').reduce((s, t) => s + (t.amount_base || t.amount), 0),
            count_out_1h: windowTxns.filter(t => t.direction === 'OUT').length,
            count_in_1h: windowTxns.filter(t => t.direction === 'IN').length,
            count_out_24h: windowTxns.filter(t => t.direction === 'OUT').length,
            count_in_24h: windowTxns.filter(t => t.direction === 'IN').length,
            unique_counterparties_7d: new Set(windowTxns.map(t => t.counterparty_id).filter(Boolean)).size,
            velocity_10m: windowTxns.reduce((s, t) => s + (t.amount_base || t.amount), 0),
            avg_amount_30d: windowTxns.length > 0
                ? windowTxns.reduce((s, t) => s + (t.amount_base || t.amount), 0) / windowTxns.length
                : 0,
            max_amount_30d: windowTxns.length > 0
                ? Math.max(...windowTxns.map(t => t.amount_base || t.amount))
                : 0,
        };

        // Evaluate each rule
        for (const rule of rules) {
            if (!rule.enabled) continue;

            let triggered = false;
            let explanation = '';
            const contributingTxns: string[] = [];

            switch (rule.type) {
                case 'HIGH_VALUE':
                    for (const txn of windowTxns) {
                        const amount = txn.amount_base || txn.amount;
                        if (rule.amountThreshold && amount >= rule.amountThreshold) {
                            triggered = true;
                            explanation = `Transaction ${txn.txn_id} amount (${amount}) exceeds threshold (${rule.amountThreshold})`;
                            contributingTxns.push(txn.txn_id);
                        }
                    }
                    break;

                case 'HIGH_FREQUENCY':
                    const count = windowTxns.length;
                    if (rule.countThreshold && count >= rule.countThreshold) {
                        triggered = true;
                        explanation = `Customer ${customerId} made ${count} transactions in ${config.windowMinutes} minutes (threshold: ${rule.countThreshold})`;
                        contributingTxns.push(...windowTxns.map(t => t.txn_id));
                    }
                    break;

                case 'VELOCITY':
                    const totalAmount = windowTxns.reduce((s, t) => s + (t.amount_base || t.amount), 0);
                    if (rule.velocityThreshold && totalAmount >= rule.velocityThreshold) {
                        triggered = true;
                        explanation = `Customer ${customerId} moved ${totalAmount} in ${config.windowMinutes} minutes (threshold: ${rule.velocityThreshold})`;
                        contributingTxns.push(...windowTxns.map(t => t.txn_id));
                    }
                    break;

                case 'STRUCTURING':
                    if (rule.amountThreshold && rule.structuringBand) {
                        const lowerBound = rule.amountThreshold - rule.structuringBand;
                        const structuringTxns = windowTxns.filter(t => {
                            const amount = t.amount_base || t.amount;
                            return amount >= lowerBound && amount < rule.amountThreshold!;
                        });
                        if (structuringTxns.length >= 3) { // Need at least 3 for structuring pattern
                            triggered = true;
                            explanation = `${structuringTxns.length} transactions just below threshold ${rule.amountThreshold} (band: ${lowerBound}-${rule.amountThreshold}) detected`;
                            contributingTxns.push(...structuringTxns.map(t => t.txn_id));
                        }
                    }
                    break;

                case 'HIGH_RISK_CORRIDOR':
                    if (rule.riskCountries && rule.riskCountries.length > 0) {
                        for (const txn of windowTxns) {
                            if (txn.counterparty_country && rule.riskCountries.includes(txn.counterparty_country)) {
                                triggered = true;
                                explanation = `Transaction to/from high-risk country: ${txn.counterparty_country}`;
                                contributingTxns.push(txn.txn_id);
                            }
                        }
                    }
                    break;
            }

            if (triggered) {
                ruleHits.push({
                    ruleId: rule.id,
                    ruleName: rule.name,
                    ruleType: rule.type,
                    severity: rule.severity,
                    computedValues: {
                        amount: metrics.max_amount_30d,
                        count: windowTxns.length,
                        velocity: metrics.velocity_10m,
                        uniqueCounterparties: metrics.unique_counterparties_7d,
                        windowStart,
                        windowEnd: now,
                    },
                    thresholds: {
                        amount: rule.amountThreshold,
                        count: rule.countThreshold,
                        velocity: rule.velocityThreshold,
                    },
                    contributingTransactions: contributingTxns,
                    explanation,
                    timestamp: now,
                });
            }
        }
    }

    // Check minimum triggers
    const shouldAlert = ruleHits.length >= config.minimumTriggers;

    return {
        data: {
            tm: {
                ...context.data.tm,
                ruleHits,
                ruleHitCount: ruleHits.length,
                shouldAlert,
                customerContext,
                scenarioEvaluationComplete: true,
            }
        }
    };
};

// ============================================
// TM_CREATE_ALERT Handler
// ============================================

export const handleTMCreateAlert: NodeHandler = async (node, context) => {
    const config: TMCreateAlertConfig = {
        groupingWindowMinutes: 30,
        severityPriorityMap: { CRITICAL: 1, HIGH: 2, MEDIUM: 3, LOW: 4 } as Record<Severity, AlertPriority>,
        slaMinutesByPriority: { 1: 60, 2: 240, 3: 1440, 4: 4320 } as Record<AlertPriority, number>,
        routingRules: undefined,
        webhookUrl: undefined,
        ...node.config
    };

    const ruleHits: RuleHit[] = context.data.tm?.ruleHits || [];
    const transactions: Transaction[] = context.data.tm?.uniqueTransactions ||
        context.data.tm?.normalizedTransactions ||
        context.input.transactions || [];
    const customerContext: CustomerContext = context.data.tm?.customerContext;
    const shouldAlert = context.data.tm?.shouldAlert ?? (ruleHits.length > 0);

    if (!shouldAlert || ruleHits.length === 0) {
        return {
            data: {
                tm: {
                    ...context.data.tm,
                    alerts: [],
                    alertCount: 0,
                    alertCreationComplete: true,
                }
            }
        };
    }

    const now = new Date();
    const alerts: Alert[] = [];
    const groupingWindowMs = config.groupingWindowMinutes * 60 * 1000;

    // Group rule hits by customer + rule type
    const hitsByKey = new Map<string, RuleHit[]>();
    for (const hit of ruleHits) {
        // Get customer_id from contributing transactions
        const customerId = transactions.find(t =>
            hit.contributingTransactions.includes(t.txn_id)
        )?.customer_id || 'UNKNOWN';

        const groupKey = `${customerId}_${hit.ruleType}`;
        if (!hitsByKey.has(groupKey)) {
            hitsByKey.set(groupKey, []);
        }
        hitsByKey.get(groupKey)!.push(hit);
    }

    // Check existing alert groups and decide whether to create new or merge
    for (const [groupKey, hits] of hitsByKey) {
        const alertGroupId = `${groupKey}_${Math.floor(now.getTime() / groupingWindowMs)}`;
        const existingGroup = alertGroupingStore.get(alertGroupId);

        if (existingGroup) {
            // Update existing group count
            existingGroup.count += hits.length;
            continue; // Don't create new alert, just update count
        }

        // Create new alert
        const customerId = groupKey.split('_')[0];
        const primaryRuleType = hits[0].ruleType;

        // Determine highest severity
        const severityOrder: Severity[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];
        let highestSeverity: Severity = 'LOW';
        for (const hit of hits) {
            if (severityOrder.indexOf(hit.severity) < severityOrder.indexOf(highestSeverity)) {
                highestSeverity = hit.severity;
            }
        }

        // Calculate priority
        let priority = config.severityPriorityMap[highestSeverity] || 3;

        // Escalate priority if high-risk customer
        if (customerContext?.risk_rating === 'HIGH') {
            priority = Math.max(1, priority - 1) as AlertPriority;
        }

        // Calculate SLA
        const slaMinutes = config.slaMinutesByPriority[priority] || 1440;
        const slaDue = new Date(now.getTime() + slaMinutes * 60 * 1000);

        // Determine queue based on routing rules
        let queue = 'DEFAULT';
        if (config.routingRules) {
            for (const rule of config.routingRules) {
                // Simple condition evaluation (in production, use proper expression parser)
                if (rule.condition.includes('CRITICAL') && highestSeverity === 'CRITICAL') {
                    queue = rule.queue;
                    break;
                }
                if (rule.condition.includes('HIGH_RISK') && customerContext?.risk_rating === 'HIGH') {
                    queue = rule.queue;
                    break;
                }
            }
        }

        // Get contributing transactions
        const contributingTxnIds = new Set<string>();
        for (const hit of hits) {
            for (const txnId of hit.contributingTransactions) {
                contributingTxnIds.add(txnId);
            }
        }
        const contributingTransactions = transactions.filter(t => contributingTxnIds.has(t.txn_id));

        const alert: Alert = {
            alert_id: `ALT_${generateId()}`,
            customer_id: customerId,
            triggered_rules: hits,
            primary_rule_type: primaryRuleType,
            severity: highestSeverity,
            priority: priority as AlertPriority,
            window_start: hits[0].computedValues.windowStart || now,
            window_end: now,
            contributing_transactions: contributingTransactions,
            computed_metrics: {
                sum_out_24h: contributingTransactions.filter(t => t.direction === 'OUT')
                    .reduce((s, t) => s + (t.amount_base || t.amount), 0),
                count_out_24h: contributingTransactions.filter(t => t.direction === 'OUT').length,
                velocity_10m: contributingTransactions.reduce((s, t) => s + (t.amount_base || t.amount), 0),
            },
            customer_context: customerContext,
            status: 'OPEN',
            assigned_to: undefined,
            queue,
            sla_due: slaDue,
            created_at: now,
            updated_at: now,
            audit_log: [{
                timestamp: now,
                action: 'ALERT_CREATED',
                actor: 'SYSTEM',
                details: `Alert created from ${hits.length} rule hits`
            }],
            tags: [primaryRuleType, highestSeverity],
        };

        alerts.push(alert);

        // Store for grouping
        alertGroupingStore.set(alertGroupId, {
            alert_id: alert.alert_id,
            timestamp: now,
            count: hits.length
        });

        // Send webhook notification if configured
        if (config.webhookUrl) {
            try {
                // Mock webhook - in production, use actual fetch
                console.log(`[TM_CREATE_ALERT] Webhook notification to ${config.webhookUrl}:`, {
                    alert_id: alert.alert_id,
                    customer_id: alert.customer_id,
                    severity: alert.severity,
                    priority: alert.priority,
                    rule_type: alert.primary_rule_type
                });
            } catch (error) {
                console.error('[TM_CREATE_ALERT] Webhook failed:', error);
            }
        }
    }

    return {
        data: {
            tm: {
                ...context.data.tm,
                alerts,
                alertCount: alerts.length,
                alertCreationComplete: true,
            },
            output: alerts // Also set as output for final result
        }
    };
};

// ============================================
// Handler Registration
// ============================================

export const registerTMHandlers = (register: (type: NodeType, handler: NodeHandler) => void) => {
    register(NodeType.TM_SCHEMA_VALIDATE, handleTMSchemaValidate);
    register(NodeType.TM_DEDUPLICATE, handleTMDeduplicate);
    register(NodeType.TM_FX_NORMALIZE, handleTMFXNormalize);
    register(NodeType.TM_SCENARIO_RULE, handleTMScenarioRule);
    register(NodeType.TM_CREATE_ALERT, handleTMCreateAlert);
};
