/**
 * AML Screening Node Handlers
 * Comprehensive implementation for Anti-Money Laundering compliance checks
 * 
 * Nodes:
 * - Sanctions Screening (OFAC, UN, EU lists)
 * - PEP & RCA Screening (Politically Exposed Persons)
 * - Watchlist/Criminal Screening (Interpol, FBI)
 * - Adverse Media Screening (Negative news, enforcement)
 */

import { NodeHandler } from '../../workflow/runner';
import { NodeType } from '../../workflow/schema';

// =============================================
// CONFIGURATION & TYPES
// =============================================

interface AMLMatch {
    caption: string;
    score: number;
    datasets: string[];
    properties?: Record<string, any>;
    topics?: string[];
}

interface AMLScreenResult {
    hit: boolean;
    matches: AMLMatch[];
    fuzzyScore: number;
    source: string;
    checkedAt: string;
    screeningType: string;
}

// Demo fallback lists for when API is unavailable
const DEMO_LISTS = {
    SANCTIONS: ['putin', 'bout', 'bin laden', 'kim jong', 'khamenei', 'gaddafi'],
    PEP: ['biden', 'modi', 'scholz', 'macron', 'trudeau', 'xi jinping', 'sunak'],
    WATCHLIST: ['el chapo', 'mansoor', 'ruja ignatova', 'dawood', 'chapman', 'snowden'],
    MEDIA: ['sam bankman', 'sbf', 'elizabeth holmes', 'madoff', 'theranos', 'ftx']
};

// Default datasets for each screening type
const DATASET_MAP: Record<string, string> = {
    SANCTIONS: 'default',
    PEP: 'peps',
    WATCHLIST: 'crime',
    MEDIA: 'enforcement'
};

// =============================================
// FUZZY MATCHING ENGINE (Levenshtein Distance)
// =============================================

/**
 * Calculate fuzzy match score between two strings
 * @returns Similarity percentage (0-100)
 */
function getFuzzyScore(s1: string, s2: string): number {
    if (!s1 || !s2) return 0;

    s1 = s1.toLowerCase().trim();
    s2 = s2.toLowerCase().trim();

    const len1 = s1.length;
    const len2 = s2.length;

    // Create matrix for dynamic programming
    const matrix: number[][] = Array.from({ length: len1 + 1 }, () =>
        Array(len2 + 1).fill(0)
    );

    // Initialize base cases
    for (let i = 0; i <= len1; i++) matrix[i][0] = i;
    for (let j = 0; j <= len2; j++) matrix[0][j] = j;

    // Fill the matrix
    for (let i = 1; i <= len1; i++) {
        for (let j = 1; j <= len2; j++) {
            const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(
                matrix[i - 1][j] + 1,      // Deletion
                matrix[i][j - 1] + 1,      // Insertion
                matrix[i - 1][j - 1] + cost // Substitution
            );
        }
    }

    const distance = matrix[len1][len2];
    const longest = Math.max(len1, len2);

    // Convert distance to similarity percentage
    return ((longest - distance) / longest) * 100;
}

// =============================================
// API INTEGRATION
// =============================================

/**
 * Call OpenSanctions API for screening
 * Falls back to demo data if API fails
 */
async function callOpenSanctionsAPI(
    name: string,
    dob: string | undefined,
    screeningType: string,
    config: any
): Promise<{ results: AMLMatch[]; source: string }> {
    const apiKey = config?.apiKey || process.env.OPENSANCTIONS_API_KEY || '7e39984d0bcfe9718e05777db2f8cfda';
    const dataset = DATASET_MAP[screeningType] || 'default';

    try {
        const targetUrl = `https://api.opensanctions.org/match/${dataset}?api_key=${apiKey}`;

        const queryPayload = {
            queries: {
                q1: {
                    schema: 'Person',
                    properties: {
                        name: [name],
                        ...(dob ? { birthDate: [dob] } : {})
                    }
                }
            }
        };

        const response = await fetch(targetUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(queryPayload)
        });

        if (!response.ok) {
            throw new Error(`API returned ${response.status}`);
        }

        const data = await response.json();
        let results = data.responses?.q1?.results || [];

        // Filter by screening type for PEP-specific results
        if (screeningType === 'PEP') {
            results = results.filter((r: any) =>
                r.topics?.includes('role.pep') ||
                r.properties?.position ||
                r.datasets?.some((d: string) => d.toLowerCase().includes('pep'))
            );
        }

        return {
            results: results.map((r: any) => ({
                caption: r.caption || r.name || 'Unknown',
                score: r.score || 0,
                datasets: r.datasets || [],
                properties: r.properties || {},
                topics: r.topics || []
            })),
            source: 'OpenSanctions API'
        };

    } catch (error) {
        console.warn(`[AML] API call failed for ${screeningType}, using demo fallback:`, error);

        // Demo fallback
        if (config?.enableDemoFallback !== false) {
            return generateDemoResult(name, screeningType);
        }

        return { results: [], source: 'API Failed - No Fallback' };
    }
}

/**
 * Generate demo results based on name matching
 */
function generateDemoResult(name: string, screeningType: string): { results: AMLMatch[]; source: string } {
    const nameLower = name.toLowerCase();
    const demoList = DEMO_LISTS[screeningType as keyof typeof DEMO_LISTS] || [];

    const matchedDemo = demoList.find(demo => nameLower.includes(demo));

    if (matchedDemo) {
        const datasetNames: Record<string, string> = {
            SANCTIONS: 'OFAC/UN Global Sanctions',
            PEP: 'World Leaders Registry',
            WATCHLIST: 'Interpol Red Notice',
            MEDIA: 'Regulatory Press Archives'
        };

        const positionInfo: Record<string, string> = {
            PEP: 'High Profile Official / Head of State'
        };

        return {
            results: [{
                caption: name.toUpperCase(),
                score: 0.95 + Math.random() * 0.04, // 95-99%
                datasets: [datasetNames[screeningType] || 'Demo Database'],
                properties: screeningType === 'PEP' ? { position: [positionInfo.PEP] } : {},
                topics: screeningType === 'PEP' ? ['role.pep'] : []
            }],
            source: 'Demo Fallback'
        };
    }

    return { results: [], source: 'Demo Fallback' };
}

// =============================================
// SCREENING HANDLERS
// =============================================

/**
 * Main screening handler factory
 */
export const createAMLScreenHandler = (screeningType: string): NodeHandler => async (node, context) => {
    const config = node.config || {};
    const threshold = config.matchThreshold ?? 80;
    const useFuzzy = config.useFuzzyMatching !== false;

    // Extract name from various context sources
    const name = context.data.ocr?.extracted?.name ||
        context.data.client?.givenName ||
        context.data.client?.name ||
        context.input?.name ||
        'Unknown';

    const dob = context.data.ocr?.extracted?.dob ||
        context.data.client?.dateOfBirth ||
        context.input?.dateOfBirth;

    console.log(`[AML ${screeningType}] Screening: "${name}"`);

    // Call API (with fallback)
    const { results, source } = await callOpenSanctionsAPI(name, dob, screeningType, config);

    // Apply fuzzy filtering
    const filteredResults = useFuzzy
        ? results.filter(match => getFuzzyScore(name, match.caption) >= threshold)
        : results;

    const hasHit = filteredResults.length > 0;
    const topMatch = filteredResults[0];

    // Build result
    const screenResult: AMLScreenResult = {
        hit: hasHit,
        matches: filteredResults,
        fuzzyScore: topMatch ? getFuzzyScore(name, topMatch.caption) : 0,
        source,
        checkedAt: new Date().toISOString(),
        screeningType
    };

    console.log(`[AML ${screeningType}] Result: ${hasHit ? 'HIT' : 'CLEAN'} (${filteredResults.length} matches)`);

    // Return accumulated data
    return {
        data: {
            aml: {
                ...context.data.aml,
                [screeningType]: screenResult,
                // Also include legacy flat structure for backward compatibility
                [`${screeningType}_hit`]: hasHit,
                [`${screeningType}_confidence`]: topMatch?.score || 0
            }
        }
    };
};

// =============================================
// HANDLER REGISTRATION
// =============================================

export const registerAMLHandlers = (register: (type: NodeType, handler: NodeHandler) => void) => {
    register(NodeType.AML_SANCTIONS_SCREEN, createAMLScreenHandler('SANCTIONS'));
    register(NodeType.AML_PEP_SCREEN, createAMLScreenHandler('PEP'));
    register(NodeType.AML_WATCHLIST_SCREEN, createAMLScreenHandler('WATCHLIST'));
    register(NodeType.AML_ADVERSE_MEDIA_SCREEN, createAMLScreenHandler('MEDIA'));
};

// Legacy export for backward compatibility
export const handleAMLScreen = createAMLScreenHandler;
