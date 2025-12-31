/**
 * Transaction Monitoring Types
 * Comprehensive TypeScript interfaces for TM node logic
 */

// ============================================
// Transaction Types
// ============================================

export interface Transaction {
    // Required fields
    txn_id: string;
    customer_id: string;
    timestamp: string | Date;
    amount: number;
    currency: string;
    direction: 'IN' | 'OUT';
    channel: 'UPI' | 'CARD' | 'WIRE' | 'WALLET' | 'ACH' | string;

    // Counterparty information
    counterparty_id?: string;
    counterparty_name?: string;
    counterparty_country?: string;
    counterparty_account?: string;

    // Optional enrichment fields
    merchant_category?: string;
    purpose_code?: string;
    reference?: string;
    metadata?: Record<string, any>;

    // Processing fields (added during pipeline)
    amount_base?: number;
    currency_original?: string;
    fx_rate?: number;
    fx_status?: 'OK' | 'MISSING' | 'STALE';
    validation_status?: 'VALID' | 'INVALID' | 'WARNING';
    validation_errors?: string[];
    validation_warnings?: string[];
    is_duplicate?: boolean;
    dedup_key?: string;
}

// ============================================
// Validation Types
// ============================================

export interface ValidationResult {
    valid: boolean;
    errors: ValidationError[];
    warnings: ValidationWarning[];
    enrichedTransaction: Transaction;
}

export interface ValidationError {
    field: string;
    code: string;
    message: string;
}

export interface ValidationWarning {
    field: string;
    code: string;
    message: string;
}

// ============================================
// FX Normalization Types
// ============================================

export interface FXRates {
    [currency: string]: number; // Rate to base currency
}

export interface FXNormalizationResult {
    transaction: Transaction;
    fx_rate_used: number;
    fx_status: 'OK' | 'MISSING' | 'STALE';
    base_currency: string;
}

// ============================================
// Deduplication Types
// ============================================

export interface DeduplicationResult {
    is_duplicate: boolean;
    dedup_key: string;
    original_txn_id?: string;
    ttl_expiry?: Date;
}

// In-memory dedup store (simulated - would be Redis/DB in production)
export interface DeduplicationEntry {
    key: string;
    txn_id: string;
    timestamp: Date;
    ttl: Date;
    fingerprint?: string;
}

// ============================================
// Scenario Rule Types
// ============================================

export type RuleType =
    | 'HIGH_VALUE'
    | 'HIGH_FREQUENCY'
    | 'VELOCITY'
    | 'STRUCTURING'
    | 'HIGH_RISK_CORRIDOR'
    | 'UNUSUAL_PATTERN';

export type Severity = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ScenarioRule {
    id: string;
    name: string;
    type: RuleType;
    enabled: boolean;

    // Thresholds
    amountThreshold?: number;
    countThreshold?: number;
    velocityThreshold?: number;
    structuringBand?: number; // epsilon - how close to threshold counts as "just below"

    // Risk lists
    riskCountries?: string[];
    riskMerchantCategories?: string[];

    // Rule parameters
    windowMinutes: number;
    severity: Severity;

    // Combination logic
    requireAllConditions?: boolean; // AND vs OR
}

export interface RuleHit {
    ruleId: string;
    ruleName: string;
    ruleType: RuleType;
    severity: Severity;

    // Computed values that triggered the rule
    computedValues: {
        amount?: number;
        count?: number;
        velocity?: number;
        uniqueCounterparties?: number;
        windowStart?: Date;
        windowEnd?: Date;
    };

    // Threshold that was exceeded
    thresholds: {
        amount?: number;
        count?: number;
        velocity?: number;
    };

    // Contributing transactions
    contributingTransactions: string[]; // txn_ids

    // Explainability
    explanation: string;
    timestamp: Date;
}

export interface CustomerContext {
    customer_id: string;
    risk_rating: 'LOW' | 'MEDIUM' | 'HIGH';
    segment: 'RETAIL' | 'SME' | 'CORPORATE' | 'VIP';
    onboarding_date?: Date;
    expected_monthly_volume?: number;
    expected_transaction_count?: number;
    country?: string;
    pep_status?: boolean;
    sanctions_status?: boolean;
}

export interface AggregatedMetrics {
    sum_out_24h: number;
    sum_in_24h: number;
    count_out_1h: number;
    count_in_1h: number;
    count_out_24h: number;
    count_in_24h: number;
    unique_counterparties_7d: number;
    velocity_10m: number;
    avg_amount_30d: number;
    max_amount_30d: number;
}

// ============================================
// Alert Types
// ============================================

export type AlertStatus = 'OPEN' | 'IN_REVIEW' | 'ESCALATED' | 'CLOSED' | 'FALSE_POSITIVE';
export type AlertPriority = 1 | 2 | 3 | 4; // 1 = highest

export interface Alert {
    alert_id: string;
    customer_id: string;

    // Rule information
    triggered_rules: RuleHit[];
    primary_rule_type: RuleType;

    // Severity & Priority
    severity: Severity;
    priority: AlertPriority;

    // Time window
    window_start: Date;
    window_end: Date;

    // Contributing data
    contributing_transactions: Transaction[];
    computed_metrics: Partial<AggregatedMetrics>;

    // Customer context
    customer_context?: CustomerContext;

    // Case management
    status: AlertStatus;
    assigned_to?: string;
    queue?: string;

    // SLA
    sla_due: Date;

    // Audit
    created_at: Date;
    updated_at: Date;
    audit_log: AuditEntry[];

    // Tags and notes
    tags: string[];
    notes?: string;
}

export interface AuditEntry {
    timestamp: Date;
    action: string;
    actor: string;
    details?: string;
}

// ============================================
// Configuration Types
// ============================================

export interface TMSchemaValidateConfig {
    requiredFields: string[];
    allowedCurrencies: string[];
    allowedChannels: string[];
    allowedDirections: string[];
    maxFutureTimestampDriftMs: number;
    mode: 'strict' | 'lenient';
    enrichDefaults: boolean;
}

export interface TMFXNormalizeConfig {
    baseCurrency: string;
    fxRates?: FXRates;
    roundingDecimals: number;
    missingRateBehavior: 'block' | 'warn' | 'fallback';
    fallbackRate: number;
}

export interface TMDeduplicateConfig {
    keyStrategy: 'txn_id' | 'hash' | 'both';
    hashFields: string[];
    ttlDays: number;
    duplicateBehavior: 'drop' | 'log' | 'alert';
}

export interface TMScenarioRuleConfig {
    windowMinutes: number;
    rules: ScenarioRule[];
    minimumTriggers: number;
    cooldownMinutes?: number;
}

export interface TMCreateAlertConfig {
    groupingWindowMinutes: number;
    severityPriorityMap: Record<Severity, AlertPriority>;
    routingRules?: { condition: string; queue: string }[];
    slaMinutesByPriority: Record<AlertPriority, number>;
    webhookUrl?: string;
}
