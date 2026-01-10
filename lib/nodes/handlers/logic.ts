
import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';

export const handleRiskCalculator: NodeHandler = async (node, context) => {
    const config = node.config || {};

    // Default weights for different risk factors
    const defaultWeights = {
        // AML factors
        sanctions: 0.35,
        pep: 0.20,
        watchlist: 0.15,
        adverseMedia: 0.10,
        // KYC factors
        fraudCheck: 0.25,
        livenessCheck: 0.10,
        faceMatch: 0.10,
        // TM factors
        tmAlerts: 0.20,
        tmRuleHits: 0.15,
        highRiskCorridor: 0.25,
    };

    const weights = { ...defaultWeights, ...config.weights };

    // Thresholds for risk level classification (configurable)
    const thresholds = {
        high: config.thresholds?.high ?? 0.7,
        medium: config.thresholds?.medium ?? 0.3,
    };

    let totalScore = 0;
    let totalWeight = 0;
    const riskFactors: { factor: string; hit: boolean; weight: number; contribution: number }[] = [];

    // ============================================
    // AML Screening Factors
    // ============================================

    // Sanctions screening
    const sanctionsHit = context.data.aml?.SANCTIONS?.hit ||
        context.data.aml?.sanctions?.hit ||
        context.input?.sanctionsHit === true;
    if (weights.sanctions > 0) {
        const contribution = sanctionsHit ? weights.sanctions : 0;
        totalScore += contribution;
        totalWeight += weights.sanctions;
        riskFactors.push({ factor: 'sanctions', hit: sanctionsHit, weight: weights.sanctions, contribution });
    }

    // PEP screening
    const pepHit = context.data.aml?.PEP?.hit ||
        context.data.aml?.pep?.hit ||
        context.input?.pepHit === true;
    if (weights.pep > 0) {
        const contribution = pepHit ? weights.pep : 0;
        totalScore += contribution;
        totalWeight += weights.pep;
        riskFactors.push({ factor: 'pep', hit: pepHit, weight: weights.pep, contribution });
    }

    // Watchlist screening
    const watchlistHit = context.data.aml?.WATCHLIST?.hit ||
        context.data.aml?.watchlist?.hit ||
        context.input?.watchlistHit === true;
    if (weights.watchlist > 0) {
        const contribution = watchlistHit ? weights.watchlist : 0;
        totalScore += contribution;
        totalWeight += weights.watchlist;
        riskFactors.push({ factor: 'watchlist', hit: watchlistHit, weight: weights.watchlist, contribution });
    }

    // Adverse media screening
    const adverseMediaHit = context.data.aml?.ADVERSE_MEDIA?.hit ||
        context.data.aml?.adverseMedia?.hit ||
        context.input?.adverseMediaHit === true;
    if (weights.adverseMedia > 0) {
        const contribution = adverseMediaHit ? weights.adverseMedia : 0;
        totalScore += contribution;
        totalWeight += weights.adverseMedia;
        riskFactors.push({ factor: 'adverseMedia', hit: adverseMediaHit, weight: weights.adverseMedia, contribution });
    }

    // ============================================
    // KYC Verification Factors
    // ============================================

    // Fraud check (failed = risk)
    const fraudCheckFailed = context.data.fraudCheck?.passed === false ||
        context.data.kyc?.fraudCheck?.passed === false ||
        context.input?.fraudCheckFailed === true;
    if (weights.fraudCheck > 0) {
        const contribution = fraudCheckFailed ? weights.fraudCheck : 0;
        totalScore += contribution;
        totalWeight += weights.fraudCheck;
        riskFactors.push({ factor: 'fraudCheck', hit: fraudCheckFailed, weight: weights.fraudCheck, contribution });
    }

    // Liveness check (failed = risk)
    const livenessCheckFailed = context.data.liveness?.passed === false ||
        context.data.kyc?.liveness?.passed === false ||
        context.input?.livenessCheckFailed === true;
    if (weights.livenessCheck > 0) {
        const contribution = livenessCheckFailed ? weights.livenessCheck : 0;
        totalScore += contribution;
        totalWeight += weights.livenessCheck;
        riskFactors.push({ factor: 'livenessCheck', hit: livenessCheckFailed, weight: weights.livenessCheck, contribution });
    }

    // Face match (failed = risk)
    const faceMatchFailed = context.data.faceMatch?.matched === false ||
        context.data.kyc?.faceMatch?.matched === false ||
        context.input?.faceMatchFailed === true;
    if (weights.faceMatch > 0) {
        const contribution = faceMatchFailed ? weights.faceMatch : 0;
        totalScore += contribution;
        totalWeight += weights.faceMatch;
        riskFactors.push({ factor: 'faceMatch', hit: faceMatchFailed, weight: weights.faceMatch, contribution });
    }

    // ============================================
    // Transaction Monitoring Factors
    // ============================================

    // TM Alerts generated
    const tmAlertCount = context.data.tm?.alertCount || context.data.tm?.alerts?.length || 0;
    const tmAlertsTriggered = tmAlertCount > 0;
    if (weights.tmAlerts > 0) {
        // Scale contribution based on number of alerts (max at 3+)
        const alertScale = Math.min(tmAlertCount / 3, 1);
        const contribution = tmAlertsTriggered ? weights.tmAlerts * alertScale : 0;
        totalScore += contribution;
        totalWeight += weights.tmAlerts;
        riskFactors.push({ factor: 'tmAlerts', hit: tmAlertsTriggered, weight: weights.tmAlerts, contribution });
    }

    // TM Rule hits
    const tmRuleHitCount = context.data.tm?.ruleHitCount || context.data.tm?.ruleHits?.length || 0;
    const tmRuleHitsTriggered = tmRuleHitCount > 0;
    if (weights.tmRuleHits > 0) {
        // Scale contribution based on severity
        const criticalHits = (context.data.tm?.ruleHits || []).filter((h: any) => h.severity === 'CRITICAL').length;
        const highHits = (context.data.tm?.ruleHits || []).filter((h: any) => h.severity === 'HIGH').length;
        const severityScale = criticalHits > 0 ? 1 : (highHits > 0 ? 0.8 : 0.5);
        const contribution = tmRuleHitsTriggered ? weights.tmRuleHits * severityScale : 0;
        totalScore += contribution;
        totalWeight += weights.tmRuleHits;
        riskFactors.push({ factor: 'tmRuleHits', hit: tmRuleHitsTriggered, weight: weights.tmRuleHits, contribution });
    }

    // High risk corridor detection
    const highRiskCorridorHit = (context.data.tm?.ruleHits || []).some((h: any) => h.ruleType === 'HIGH_RISK_CORRIDOR') ||
        context.input?.highRiskCorridor === true;
    if (weights.highRiskCorridor > 0) {
        const contribution = highRiskCorridorHit ? weights.highRiskCorridor : 0;
        totalScore += contribution;
        totalWeight += weights.highRiskCorridor;
        riskFactors.push({ factor: 'highRiskCorridor', hit: highRiskCorridorHit, weight: weights.highRiskCorridor, contribution });
    }

    // ============================================
    // Calculate Final Risk Score
    // ============================================

    // Normalize score to 0-1 range
    const normalizedScore = totalWeight > 0 ? Math.min(totalScore / totalWeight, 1) : 0;

    // Apply any score adjustments from config
    let finalScore = normalizedScore;
    if (config.scoreMultiplier) {
        finalScore = Math.min(finalScore * config.scoreMultiplier, 1);
    }
    if (config.scoreFloor && finalScore < config.scoreFloor) {
        finalScore = config.scoreFloor;
    }

    // Determine risk level
    let level: 'HIGH' | 'MEDIUM' | 'LOW';
    if (finalScore >= thresholds.high) {
        level = 'HIGH';
    } else if (finalScore >= thresholds.medium) {
        level = 'MEDIUM';
    } else {
        level = 'LOW';
    }

    // Build detailed breakdown for audit
    const riskBreakdown = {
        rawScore: totalScore,
        totalWeight,
        normalizedScore,
        finalScore,
        level,
        thresholds,
        factors: riskFactors,
        hitCount: riskFactors.filter(f => f.hit).length,
        totalFactors: riskFactors.length,
        timestamp: new Date().toISOString(),
    };

    console.log(`[RiskCalculator] Score: ${finalScore.toFixed(3)}, Level: ${level}, Hits: ${riskBreakdown.hitCount}/${riskBreakdown.totalFactors}`);

    return {
        riskScore: finalScore,
        riskLevel: level,
        data: {
            risk: {
                score: finalScore,
                level,
                breakdown: riskBreakdown,
            }
        }
    };
};

export const handleRiskGate: NodeHandler = async (node, context) => {
    /**
     * Risk Gate - Decision-based routing node
     * 
     * Routes workflow execution based on the calculated risk level.
     * The actual routing is handled by the compiler/runner, but this handler
     * provides the routing decision data and prepares the routes configuration.
     * 
     * Configuration format:
     * {
     *   "routes": [
     *     { "id": "1", "condition": "riskLevel == 'HIGH'", "targetNodeId": "<node-id>" },
     *     { "id": "2", "condition": "riskLevel == 'MEDIUM'", "targetNodeId": "<node-id>" },
     *     { "id": "3", "condition": "riskLevel == 'LOW'", "targetNodeId": "<node-id>" }
     *   ],
     *   "defaultRoute": "<node-id>"  // Optional fallback
     * }
     */

    const config = node.config || {};
    const routes = config.routes || [];

    // Get current risk level from context
    const riskLevel = context.riskLevel || context.data?.risk?.level || 'LOW';
    const riskScore = context.riskScore || context.data?.risk?.score || 0;

    // Determine which route was matched
    let matchedRoute: { id: string; condition: string; targetNodeId: string } | null = null;
    let routeReason = '';

    for (const route of routes) {
        const condition = route.condition || route.if || '';

        // Parse condition to check if it matches current risk level
        if (condition.includes('HIGH') && riskLevel === 'HIGH') {
            matchedRoute = route;
            routeReason = `Risk level is HIGH (score: ${riskScore.toFixed(3)})`;
            break;
        } else if (condition.includes('MEDIUM') && riskLevel === 'MEDIUM') {
            matchedRoute = route;
            routeReason = `Risk level is MEDIUM (score: ${riskScore.toFixed(3)})`;
            break;
        } else if (condition.includes('LOW') && riskLevel === 'LOW') {
            matchedRoute = route;
            routeReason = `Risk level is LOW (score: ${riskScore.toFixed(3)})`;
            break;
        }

        // Also support score-based conditions like "riskScore > 0.7"
        if (condition.includes('riskScore')) {
            const scoreMatch = condition.match(/riskScore\s*([><=]+)\s*([\d.]+)/);
            if (scoreMatch) {
                const operator = scoreMatch[1];
                const threshold = parseFloat(scoreMatch[2]);
                let matches = false;

                switch (operator) {
                    case '>':
                        matches = riskScore > threshold;
                        break;
                    case '>=':
                        matches = riskScore >= threshold;
                        break;
                    case '<':
                        matches = riskScore < threshold;
                        break;
                    case '<=':
                        matches = riskScore <= threshold;
                        break;
                    case '==':
                        matches = Math.abs(riskScore - threshold) < 0.001;
                        break;
                }

                if (matches) {
                    matchedRoute = route;
                    routeReason = `Risk score ${riskScore.toFixed(3)} ${operator} ${threshold}`;
                    break;
                }
            }
        }
    }

    // If no route matched, use default route if configured
    if (!matchedRoute && config.defaultRoute) {
        matchedRoute = {
            id: 'default',
            condition: 'true',
            targetNodeId: config.defaultRoute
        };
        routeReason = `Default route (no specific condition matched)`;
    }

    // Determine recommended action based on risk level
    let recommendedAction: 'APPROVE' | 'REJECT' | 'MANUAL_REVIEW';
    if (riskLevel === 'HIGH') {
        recommendedAction = 'REJECT';
    } else if (riskLevel === 'MEDIUM') {
        recommendedAction = 'MANUAL_REVIEW';
    } else {
        recommendedAction = 'APPROVE';
    }

    console.log(`[RiskGate] Level: ${riskLevel}, Score: ${riskScore.toFixed(3)}, Route: ${matchedRoute?.targetNodeId || 'none'}, Reason: ${routeReason}`);

    return {
        data: {
            riskGate: {
                evaluated: true,
                riskLevel,
                riskScore,
                matchedRoute: matchedRoute ? {
                    id: matchedRoute.id,
                    condition: matchedRoute.condition,
                    targetNodeId: matchedRoute.targetNodeId,
                } : null,
                routeReason,
                recommendedAction,
                configuredRoutes: routes.length,
                timestamp: new Date().toISOString(),
            }
        }
    };
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
