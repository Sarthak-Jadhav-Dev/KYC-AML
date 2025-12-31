
import {
    handleTMSchemaValidate,
    handleTMFXNormalize,
    handleTMDeduplicate,
    handleTMScenarioRule,
    handleTMCreateAlert
} from '../lib/nodes/handlers/tm';
import { ExecutionContext } from '../lib/workflow/runner';
import { NodeType } from '../lib/workflow/schema';

// Mock Node helpers
const createNode = (type: NodeType, config: any = {}) => ({
    id: 'test-node',
    type,
    config,
    next: [],
    data: { config }
});

async function runTest() {
    console.log("🚀 Starting Transaction Monitoring Node Tests...\n");

    // 1. Initial Context with Raw Transactions
    const initialContext: ExecutionContext = {
        executionId: 'test-exec-1',
        tenantId: 'tenant-1',
        input: {
            transactions: [
                {
                    txn_id: 'txn_001',
                    customer_id: 'cust_A',
                    timestamp: new Date().toISOString(),
                    amount: 15000, // High value
                    currency: 'EUR',
                    direction: 'OUT',
                    channel: 'WIRE',
                    counterparty_country: 'FR' // Valid
                },
                {
                    txn_id: 'txn_002',
                    customer_id: 'cust_A',
                    timestamp: new Date().toISOString(),
                    amount: 50,
                    currency: 'USD',
                    direction: 'OUT',
                    channel: 'CARD',
                    counterparty_country: 'US'
                },
                {
                    txn_id: 'txn_003', // Duplicate of 002 later? No, distinct ID
                    customer_id: 'cust_B',
                    timestamp: new Date(Date.now() + 86400000).toISOString(), // Future (invalid?)
                    amount: -100, // Invalid amount
                    currency: 'XYZ', // Invalid currency
                    direction: 'IN',
                    channel: 'UNKNOWN'
                },
                {
                    txn_id: 'txn_001', // Duplicate ID
                    customer_id: 'cust_A',
                    timestamp: new Date().toISOString(),
                    amount: 15000,
                    currency: 'EUR',
                    direction: 'OUT',
                    channel: 'WIRE'
                }
            ]
        },
        data: { tm: {} },
        riskScore: 0,
        riskLevel: 'LOW',
        decision: null
    };

    console.log("📊 Input Transactions:", initialContext.input.transactions.length);

    // ==========================================
    // STEP 1: Schema Validation
    // ==========================================
    console.log("\n--- Step 1: Schema Validation ---");
    const node1 = createNode(NodeType.TM_SCHEMA_VALIDATE, {
        mode: 'strict',
        allowedCurrencies: ['USD', 'EUR', 'GBP']
    });

    // @ts-ignore
    const result1 = await handleTMSchemaValidate(node1, initialContext);
    mergeContext(initialContext, result1);

    console.log("✅ Valid Transactions:", initialContext.data.tm.validTransactions.length);
    console.log("❌ Invalid Transactions:", initialContext.data.tm.invalidTransactions.length);
    if (initialContext.data.tm.invalidTransactions.length > 0) {
        console.log("   Errors:", JSON.stringify(initialContext.data.tm.validationErrors[0], null, 2));
    }

    // ==========================================
    // STEP 2: FX Normalization
    // ==========================================
    console.log("\n--- Step 2: FX Normalization (Base: USD) ---");
    const node2 = createNode(NodeType.TM_FX_NORMALIZE, {
        baseCurrency: 'USD',
        fxRates: { EUR: 1.1, USD: 1.0 }
    });

    // @ts-ignore
    const result2 = await handleTMFXNormalize(node2, initialContext);
    mergeContext(initialContext, result2);

    const sampleNorm = initialContext.data.tm.normalizedTransactions[0];
    console.log(`💱 Converted ${sampleNorm.amount} ${sampleNorm.currency} -> ${sampleNorm.amount_base} USD`);

    // ==========================================
    // STEP 3: Deduplication
    // ==========================================
    console.log("\n--- Step 3: Deduplication ---");
    const node3 = createNode(NodeType.TM_DEDUPLICATE, {
        keyStrategy: 'txn_id',
        duplicateBehavior: 'flag'
    });

    // @ts-ignore
    const result3 = await handleTMDeduplicate(node3, initialContext);
    mergeContext(initialContext, result3);

    console.log("✨ Unique Transactions:", initialContext.data.tm.uniqueTransactions.length);
    console.log("👯 Duplicates Found:", initialContext.data.tm.duplicates.length);

    // ==========================================
    // STEP 4: Scenario Rules
    // ==========================================
    console.log("\n--- Step 4: Scenario Rules ---");
    const node4 = createNode(NodeType.TM_SCENARIO_RULE, {
        rules: [
            {
                id: 'rule_1',
                name: 'High Value > 10k',
                type: 'HIGH_VALUE',
                enabled: true,
                amountThreshold: 10000,
                severity: 'HIGH'
            }
        ]
    });

    // @ts-ignore
    const result4 = await handleTMScenarioRule(node4, initialContext);
    mergeContext(initialContext, result4);

    console.log("🎯 Rule Hits:", initialContext.data.tm.ruleHits.length);
    if (initialContext.data.tm.ruleHits.length > 0) {
        console.log("   Hit Details:", initialContext.data.tm.ruleHits[0].explanation);
    }

    // ==========================================
    // STEP 5: Create Alert
    // ==========================================
    console.log("\n--- Step 5: Create Alert ---");
    const node5 = createNode(NodeType.TM_CREATE_ALERT, {
        severityPriorityMap: { HIGH: 1, MEDIUM: 2, LOW: 3 }
    });

    // @ts-ignore
    const result5 = await handleTMCreateAlert(node5, initialContext);
    mergeContext(initialContext, result5);

    console.log("🚨 Alerts Created:", initialContext.data.tm.alerts.length);
    if (initialContext.data.tm.alerts.length > 0) {
        const alert = initialContext.data.tm.alerts[0];
        console.log(`   Alert ID: ${alert.alert_id}`);
        console.log(`   Priority: P${alert.priority}`);
        console.log(`   Status: ${alert.status}`);
    }
}

function mergeContext(target: any, update: any) {
    if (update.data) {
        target.data = { ...target.data, ...update.data };
    }
    Object.assign(target, { ...update, data: target.data });
}

runTest().catch(console.error);
