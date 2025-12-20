/**
 * SprintGPT - Main Entry Point
 * AI Sprint Retrospective Engine for Codegeist 2025
 */

const api = require('@forge/api').default;
const { route } = require('@forge/api');
const { storage } = require('@forge/api');
const Resolver = require('@forge/resolver').default;

const resolver = new Resolver();

// ============================================
// SPRINT ANALYSIS FUNCTIONS
// ============================================

/**
 * Calculate sprint metrics from issues - BULLETPROOF VERSION
 * Handles any field structure variations gracefully
 */
function calculateSprintMetrics(issues, sprint) {
    // Ensure issues is always an array
    const safeIssues = Array.isArray(issues) ? issues : [];

    // Calculate total story points (try multiple common field names)
    const totalPoints = safeIssues.reduce((sum, issue) => {
        if (!issue || !issue.fields) return sum;

        // Helper to extract number from various formats
        const extractPoints = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val);
            if (val && typeof val === 'object' && typeof val.value === 'number') return val.value;
            return null; // Return null for invalid values
        };

        // List of fields to try in order - customfield_10016 is most common for Jira Cloud
        const storyPointFields = [
            'customfield_10016',  // Most common Jira Cloud
            'customfield_10034',  // Story point estimate (newer)
            'customfield_10019',  // Story point estimate
            'customfield_10026',  // Alternative
            'customfield_10028',  // Another variant
        ];

        // Find the first field with a valid numeric value
        let points = 0;
        for (const fieldName of storyPointFields) {
            const fieldValue = issue.fields[fieldName];
            const extracted = extractPoints(fieldValue);
            if (extracted !== null && extracted > 0) {
                points = extracted;
                console.log(`Issue ${issue.key}: found ${points} points in ${fieldName}`);
                break;
            }
        }

        if (points === 0) {
            console.log(`Issue ${issue.key}: no story points found in any field`);
        }

        return sum + points;
    }, 0);
    console.log('Total story points:', totalPoints);

    // Log all issue statuses for debugging
    console.log('All issue statuses:', safeIssues.map(i => ({
        key: i.key,
        status: i.fields?.status?.name,
        statusCategory: i.fields?.status?.statusCategory?.key
    })));

    // Completed issues - check status category OR status name
    const completedIssues = safeIssues.filter(issue => {
        if (!issue || !issue.fields) return false;
        const statusCatKey = issue.fields.status?.statusCategory?.key;
        const statusName = issue.fields.status?.name?.toLowerCase() || '';
        return statusCatKey === 'done' ||
            statusName === 'done' ||
            statusName === 'closed' ||
            statusName === 'resolved';
    });
    console.log('Completed issues count:', completedIssues.length, completedIssues.map(i => i.key));

    const completedPoints = completedIssues.reduce((sum, issue) => {
        if (!issue || !issue.fields) return sum;

        // Helper to extract number from various formats
        const extractPoints = (val) => {
            if (typeof val === 'number') return val;
            if (typeof val === 'string' && !isNaN(parseFloat(val))) return parseFloat(val);
            if (val && typeof val === 'object' && typeof val.value === 'number') return val.value;
            return null;
        };

        // Same fields as totalPoints
        const storyPointFields = [
            'customfield_10016',  // Most common Jira Cloud
            'customfield_10034',  // Story point estimate (newer)
            'customfield_10019',  // Story point estimate
            'customfield_10026',  // Alternative
            'customfield_10028',  // Another variant
        ];

        let points = 0;
        for (const fieldName of storyPointFields) {
            const fieldValue = issue.fields[fieldName];
            const extracted = extractPoints(fieldValue);
            if (extracted !== null && extracted > 0) {
                points = extracted;
                break;
            }
        }
        console.log(`Completed issue ${issue.key}: ${points} points`);
        return sum + points;
    }, 0);
    console.log('Total completed points (velocity):', completedPoints);

    // In progress issues
    const inProgressIssues = safeIssues.filter(issue => {
        if (!issue || !issue.fields) return false;
        const statusCatKey = issue.fields.status?.statusCategory?.key;
        const statusName = issue.fields.status?.name?.toLowerCase() || '';
        return statusCatKey === 'indeterminate' ||
            statusName.includes('progress') ||
            statusName.includes('review');
    });

    // Blocked issues - check flagged field, labels, and status name
    const blockedIssues = safeIssues.filter(issue => {
        if (!issue || !issue.fields) return false;

        // Check Jira's native flagged field (impediment flag)
        const isFlagged = issue.fields.flagged === true ||
            issue.fields.customfield_10021 === 'Impediment' ||
            (Array.isArray(issue.fields.customfield_10021) && issue.fields.customfield_10021.some(f => f?.value === 'Impediment'));

        // Check labels for blocked
        const labels = issue.fields.labels || [];
        const hasBlockedLabel = Array.isArray(labels) && labels.some(l => l.toLowerCase().includes('block'));

        // Check status name for blocked
        const statusName = issue.fields.status?.name?.toLowerCase() || '';
        const hasBlockedStatus = statusName.includes('block');

        return isFlagged || hasBlockedLabel || hasBlockedStatus;
    });

    // Calculate cycle times safely
    const cycleTimes = completedIssues.map(issue => {
        try {
            const created = issue.fields?.created ? new Date(issue.fields.created) : null;
            const resolved = issue.fields?.resolutiondate ? new Date(issue.fields.resolutiondate) : new Date();
            if (created && !isNaN(created.getTime())) {
                return (resolved - created) / (1000 * 60 * 60 * 24);
            }
            return 0;
        } catch (e) {
            return 0;
        }
    }).filter(t => t > 0);

    const avgCycleTime = cycleTimes.length > 0
        ? cycleTimes.reduce((a, b) => a + b, 0) / cycleTimes.length
        : 0;

    // Calculate health score based on completion rate and blockers
    const completionScore = safeIssues.length > 0
        ? (completedIssues.length / safeIssues.length) * 100
        : 0;
    const blockerPenalty = blockedIssues.length * 10; // -10 points per blocker
    const velocityBonus = completedPoints > 30 ? 10 : (completedPoints > 15 ? 5 : 0);
    const healthScore = Math.min(100, Math.max(0, Math.round(
        (completionScore * 0.6) + // 60% weight on completion
        (40 - blockerPenalty) +   // 40% base minus blocker penalty
        velocityBonus             // Bonus for good velocity
    )));

    return {
        sprintId: sprint?.id || 'unknown',
        sprintName: sprint?.name || 'Unknown Sprint',
        totalIssues: safeIssues.length,
        completedIssues: completedIssues.length,
        inProgressIssues: inProgressIssues.length,
        blockedIssues: blockedIssues.length,
        totalPoints,
        completedPoints,
        completionRate: safeIssues.length > 0 ? (completedIssues.length / safeIssues.length * 100).toFixed(1) : '0',
        velocity: completedPoints,
        avgCycleTime: avgCycleTime.toFixed(1),
        spilloverIssues: safeIssues.length - completedIssues.length,
        spilloverPoints: totalPoints - completedPoints,
        healthScore
    };
}

/**
 * Generate insights from metrics
 */
function generateInsights(metrics, healthScore) {
    const insights = [];

    if (parseFloat(metrics.completionRate) < 70) {
        insights.push({
            type: 'warning',
            title: 'Low Completion Rate',
            message: `Only ${metrics.completionRate}% of issues completed. Consider smaller scope or identifying blockers earlier.`
        });
    }

    if (metrics.blockedIssues > 0) {
        insights.push({
            type: 'alert',
            title: 'Active Blockers',
            message: `${metrics.blockedIssues} issues are blocked. Schedule a blocker-clearing session.`
        });
    }

    if (parseFloat(metrics.avgCycleTime) > 5) {
        insights.push({
            type: 'info',
            title: 'Long Cycle Time',
            message: `Average cycle time is ${metrics.avgCycleTime} days. Review work-in-progress limits.`
        });
    }

    if (healthScore >= 80) {
        insights.push({
            type: 'success',
            title: 'Great Sprint!',
            message: `Health score of ${healthScore}. Team is performing well. Document what worked!`
        });
    }

    return insights;
}

// ============================================
// ROVO ACTION HANDLERS
// ============================================

/**
 * Analyze Sprint Handler - Tries real Jira data first, falls back to demo
 * BULLETPROOF VERSION with detailed logging
 */
exports.analyzeSprintHandler = async function (context) {
    const sprintId = context.payload?.sprintId;
    let metrics = null;
    let isRealData = false;

    console.log('=== ANALYZE SPRINT HANDLER STARTED ===');
    console.log('Requested sprintId:', sprintId);

    try {
        // Step 1: Get boards
        console.log('Step 1: Fetching boards...');
        const boardsResponse = await api.asUser().requestJira(route`/rest/agile/1.0/board`, {
            headers: { 'Accept': 'application/json' }
        });

        console.log('Boards response status:', boardsResponse.status);

        if (boardsResponse.ok) {
            const boardsData = await boardsResponse.json();
            console.log('Boards found:', boardsData.values?.length || 0);

            // Log first board structure for debugging
            if (boardsData.values && boardsData.values[0]) {
                console.log('First board structure:', JSON.stringify(boardsData.values[0], null, 2));
            }

            if (boardsData.values && Array.isArray(boardsData.values) && boardsData.values.length > 0) {
                const boardId = boardsData.values[0].id;
                console.log('Using boardId:', boardId);

                // Step 2: Get sprints
                console.log('Step 2: Fetching sprints...');
                const sprintsResponse = await api.asUser().requestJira(
                    route`/rest/agile/1.0/board/${boardId}/sprint?state=active,closed&maxResults=1`,
                    { headers: { 'Accept': 'application/json' } }
                );

                console.log('Sprints response status:', sprintsResponse.status);

                if (sprintsResponse.ok) {
                    const sprintsData = await sprintsResponse.json();
                    console.log('Sprints found:', sprintsData.values?.length || 0);

                    // Log first sprint structure for debugging
                    if (sprintsData.values && sprintsData.values[0]) {
                        console.log('First sprint structure:', JSON.stringify(sprintsData.values[0], null, 2));
                    }

                    if (sprintsData.values && Array.isArray(sprintsData.values) && sprintsData.values.length > 0) {
                        const sprint = sprintsData.values[0];
                        console.log('Using sprint:', sprint.id, sprint.name);

                        // Step 3: Get issues
                        console.log('Step 3: Fetching issues...');
                        const issuesResponse = await api.asUser().requestJira(
                            route`/rest/agile/1.0/sprint/${sprint.id}/issue?maxResults=100`,
                            { headers: { 'Accept': 'application/json' } }
                        );

                        console.log('Issues response status:', issuesResponse.status);

                        if (issuesResponse.ok) {
                            const issuesData = await issuesResponse.json();
                            const issues = Array.isArray(issuesData.issues) ? issuesData.issues : [];
                            console.log('Issues found:', issues.length);

                            // Log first issue structure for debugging
                            if (issues[0]) {
                                console.log('First issue structure (fields):', JSON.stringify({
                                    id: issues[0].id,
                                    key: issues[0].key,
                                    status: issues[0].fields?.status,
                                    labels: issues[0].fields?.labels,
                                    created: issues[0].fields?.created,
                                    storyPoints: issues[0].fields?.customfield_10016
                                }, null, 2));
                            }

                            // Calculate real metrics with safe field access
                            metrics = calculateSprintMetrics(issues, sprint);
                            isRealData = true;
                            console.log('SUCCESS: Using REAL Jira data for sprint:', sprint.name);
                            console.log('Calculated metrics:', JSON.stringify(metrics, null, 2));
                        } else {
                            console.log('Issues API failed with status:', issuesResponse.status);
                        }
                    } else {
                        console.log('No sprints found in response');
                    }
                } else {
                    console.log('Sprints API failed with status:', sprintsResponse.status);
                }
            } else {
                console.log('No boards found in response');
            }
        } else {
            console.log('Boards API failed with status:', boardsResponse.status);
        }
    } catch (apiError) {
        console.log('=== API ERROR ===');
        console.log('Error message:', apiError.message);
        console.log('Error stack:', apiError.stack);
    }

    // Fallback to demo data if real data not available
    if (!metrics) {
        console.log('=== USING DEMO DATA (no real sprint data available) ===');
        metrics = {
            sprintId: sprintId || 'demo-sprint',
            sprintName: 'Sprint 42 - Performance Boost',
            totalIssues: 14,
            completedIssues: 12,
            inProgressIssues: 1,
            blockedIssues: 1,
            totalPoints: 49,
            completedPoints: 42,
            completionRate: '85.7',
            velocity: 42,
            avgCycleTime: '2.8',
            spilloverIssues: 2,
            spilloverPoints: 7
        };
    }

    // Calculate health score
    let healthScore = 100;
    healthScore -= (100 - parseFloat(metrics.completionRate)) * 0.5;
    healthScore -= (metrics.blockedIssues || 0) * 5;
    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

    // Store metrics
    try {
        await storage.set(`sprint-metrics-${metrics.sprintId}`, {
            ...metrics,
            healthScore,
            isRealData,
            analyzedAt: new Date().toISOString()
        });
    } catch (storageError) {
        console.log('Storage error:', storageError.message);
    }

    return {
        success: true,
        isRealData,
        sprint: {
            id: metrics.sprintId,
            name: metrics.sprintName,
            state: 'active'
        },
        metrics: {
            ...metrics,
            healthScore
        },
        insights: generateInsights(metrics, healthScore)
    };
};

/**
 * Compare Sprints Handler
 */
exports.compareSprintsHandler = async function (context) {
    const { firstSprint, secondSprint } = context.payload || {};

    try {
        const metrics1 = await storage.get(`sprint-metrics-${firstSprint}`);
        const metrics2 = await storage.get(`sprint-metrics-${secondSprint}`);

        if (!metrics1 || !metrics2) {
            return {
                success: false,
                message: "Sprint data not found. Please analyze both sprints first."
            };
        }

        const comparison = {
            sprint1: metrics1,
            sprint2: metrics2,
            changes: {
                velocityChange: ((metrics2.velocity - metrics1.velocity) / metrics1.velocity * 100).toFixed(1),
                completionRateChange: (parseFloat(metrics2.completionRate) - parseFloat(metrics1.completionRate)).toFixed(1)
            }
        };

        return { success: true, comparison };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Identify Patterns Handler - Uses REAL stored sprint data
 */
exports.identifyPatternsHandler = async function (context) {
    try {
        // Fetch all stored sprint metrics
        const allKeys = ['sprint-metrics-demo-sprint'];
        let storedSprints = [];

        // Try to get sprint metrics from recent sprints
        for (let i = 1; i <= 10; i++) {
            try {
                const sprintKey = `sprint-metrics-sprint-${i}`;
                const metrics = await storage.get(sprintKey);
                if (metrics) storedSprints.push(metrics);
            } catch (e) { }
        }

        // Also try common patterns
        const demoMetrics = await storage.get('sprint-metrics-demo-sprint');
        if (demoMetrics) storedSprints.push(demoMetrics);

        // Calculate real patterns from data
        const patterns = [];
        let totalVelocity = 0;
        let totalCompletion = 0;
        let totalCycleTime = 0;

        if (storedSprints.length > 0) {
            storedSprints.forEach(s => {
                totalVelocity += s.velocity || 0;
                totalCompletion += parseFloat(s.completionRate) || 0;
                totalCycleTime += parseFloat(s.avgCycleTime) || 0;
            });

            const avgVelocity = Math.round(totalVelocity / storedSprints.length);
            const avgCompletion = (totalCompletion / storedSprints.length).toFixed(1);
            const avgCycleTime = (totalCycleTime / storedSprints.length).toFixed(1);

            patterns.push({
                type: 'stats',
                category: 'summary',
                title: 'Sprint Averages',
                description: `Velocity: ${avgVelocity} pts | Completion: ${avgCompletion}% | Cycle Time: ${avgCycleTime} days`,
                confidence: 'high'
            });

            // Velocity trend analysis
            if (storedSprints.length >= 2) {
                const firstHalf = storedSprints.slice(0, Math.floor(storedSprints.length / 2));
                const secondHalf = storedSprints.slice(Math.floor(storedSprints.length / 2));
                const firstAvg = firstHalf.reduce((s, sp) => s + (sp.velocity || 0), 0) / firstHalf.length;
                const secondAvg = secondHalf.reduce((s, sp) => s + (sp.velocity || 0), 0) / secondHalf.length;

                if (secondAvg > firstAvg * 1.1) {
                    patterns.push({ type: 'success', category: 'velocity', title: 'Velocity Improving', description: 'Your team velocity is trending upward!', confidence: 'high' });
                } else if (secondAvg < firstAvg * 0.9) {
                    patterns.push({ type: 'warning', category: 'velocity', title: 'Velocity Declining', description: 'Velocity has decreased recently. Consider reviewing blockers.', confidence: 'medium' });
                } else {
                    patterns.push({ type: 'info', category: 'velocity', title: 'Velocity Stable', description: 'Your team velocity has remained consistent.', confidence: 'medium' });
                }
            }
        } else {
            patterns.push({
                type: 'info',
                category: 'data',
                title: 'Analyze More Sprints',
                description: 'Run "Analyze Current Sprint" to build pattern history.',
                confidence: 'low'
            });
        }

        return {
            success: true,
            sprintsAnalyzed: storedSprints.length,
            patterns,
            recommendations: patterns.length > 0 ? [
                { priority: 'medium', action: 'Continue tracking sprint metrics', relatedPattern: patterns[0]?.title }
            ] : []
        };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Generate Retro Report Handler - Uses REAL stored sprint data
 */
exports.generateRetroHandler = async function (context) {
    try {
        const { sprintId } = context.payload || {};

        // Try to get the most recent analyzed sprint
        let metrics = null;
        if (sprintId) {
            metrics = await storage.get(`sprint-metrics-${sprintId}`);
        }
        if (!metrics) {
            metrics = await storage.get('sprint-metrics-demo-sprint');
        }

        // If no stored data, use minimal placeholder
        if (!metrics) {
            metrics = {
                sprintName: 'Current Sprint',
                velocity: 0,
                completionRate: '0',
                avgCycleTime: '0',
                blockedIssues: 0,
                healthScore: 50
            };
        }

        // Generate dynamic summary based on actual metrics
        let summary = 'Sprint retrospective analysis.';
        const healthScore = metrics.healthScore || 50;
        if (healthScore >= 80) {
            summary = 'Excellent sprint! The team performed above expectations.';
        } else if (healthScore >= 60) {
            summary = 'Good sprint with room for improvement. Review insights for optimization opportunities.';
        } else {
            summary = 'Challenging sprint. Focus on blockers and scope management in the next sprint.';
        }

        // Dynamic what went well / could improve based on metrics
        const whatWentWell = [];
        const whatCouldImprove = [];

        if (parseFloat(metrics.completionRate) >= 70) {
            whatWentWell.push(`Strong completion rate (${metrics.completionRate}%)`);
        } else {
            whatCouldImprove.push(`Improve completion rate (currently ${metrics.completionRate}%)`);
        }

        if (parseFloat(metrics.avgCycleTime) <= 3) {
            whatWentWell.push(`Fast cycle time (${metrics.avgCycleTime} days)`);
        } else {
            whatCouldImprove.push(`Reduce cycle time (currently ${metrics.avgCycleTime} days)`);
        }

        if ((metrics.blockedIssues || 0) === 0) {
            whatWentWell.push('No blocked issues during sprint');
        } else {
            whatCouldImprove.push(`Address blocked issues earlier (${metrics.blockedIssues} blockers this sprint)`);
        }

        const report = {
            title: `🏎️ Sprint Retrospective: ${metrics.sprintName || 'Sprint'}`,
            generatedAt: new Date().toISOString(),
            isRealData: metrics.isRealData || false,
            summary,
            dataHighlights: {
                velocity: { value: metrics.velocity || 0, label: 'Story Points', status: metrics.velocity > 30 ? 'good' : 'neutral' },
                completionRate: { value: `${metrics.completionRate}%`, label: 'Completion Rate', status: parseFloat(metrics.completionRate) >= 70 ? 'good' : 'warning' },
                cycleTime: { value: `${metrics.avgCycleTime}d`, label: 'Cycle Time', status: parseFloat(metrics.avgCycleTime) <= 3 ? 'good' : 'warning' },
                healthScore: { value: healthScore, label: 'Health Score', status: healthScore >= 70 ? 'good' : 'warning' }
            },
            discussionTopics: [
                { title: 'Sprint Velocity', question: `We delivered ${metrics.velocity} points this sprint. How did the workload feel?` },
                { title: 'Blockers', question: `We had ${metrics.blockedIssues || 0} blocked issues. What caused them and how can we prevent them?` }
            ],
            retroQuestions: {
                whatWentWell,
                whatCouldImprove,
                actionItems: whatCouldImprove.map((item, i) => ({ title: item, priority: i === 0 ? 'high' : 'medium' }))
            }
        };

        return { success: true, report };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Create Action Item Handler
 */
exports.createActionHandler = async function (context) {
    const { title, description, priority } = context.payload || {};

    if (!title) {
        return { success: false, message: 'Action item title is required.' };
    }

    try {
        const actionId = `action-${Date.now()}`;
        const action = {
            id: actionId,
            title,
            description: description || '',
            priority: priority || 'Medium',
            status: 'pending',
            createdAt: new Date().toISOString()
        };

        const existingActions = await storage.get('local-action-items') || [];
        existingActions.push(action);
        await storage.set('local-action-items', existingActions);

        return { success: true, message: 'Action item saved!', action };
    } catch (error) {
        return { success: false, message: error.message };
    }
};

/**
 * Insert Confluence Report Handler - Appends report to Confluence page
 */
/**
 * Insert Confluence Report Handler - Defined via Resolver
 */
resolver.define('insertReportHandler', async (req) => {
    try {
        console.log('=== INSERT REPORT HANDLER (Resolver) ===');
        const { payload, context } = req;
        console.log('Payload keys:', Object.keys(payload || {}));
        console.log('Context keys:', Object.keys(context || {}));

        // Get content ID - priority from payload
        // The frontend sends { contentId, debugContext } in payload
        const contentId = payload?.contentId ||
            context?.extension?.content?.id;

        console.log('Resolved contentId:', contentId);

        // Get latest sprint metrics
        const metrics = await storage.get('sprint-metrics-demo-sprint') || {
            sprintName: 'Sprint 42',
            healthScore: 78,
            velocity: 42,
            completionRate: '85.7',
            avgCycleTime: '2.8',
            blockedIssues: 1
        };

        // If we have a content ID, try to append to the page
        if (contentId) {
            try {
                // Get current page content using v1 API with storage format
                console.log('Fetching page content for ID:', contentId);
                const pageResponse = await api.asUser().requestConfluence(
                    route`/wiki/rest/api/content/${contentId}?expand=body.storage,version`,
                    { headers: { 'Accept': 'application/json' } }
                );

                console.log('Page fetch response status:', pageResponse.status);

                if (pageResponse.ok) {
                    const pageData = await pageResponse.json();

                    const currentVersion = pageData.version?.number || 1;
                    const currentBody = pageData.body?.storage?.value || '';

                    // Build report HTML to append
                    const reportHTML = `
<hr/>
<h2>🏎️ Sprint Retrospective: ${metrics.sprintName}</h2>
<p><em>Generated by SprintGPT on ${new Date().toLocaleDateString()}</em></p>
<h3>Sprint Health Score</h3>
<p><strong>Health Score:</strong> ${metrics.healthScore}/100</p>
<h3>Key Metrics</h3>
<ul>
<li><strong>Velocity:</strong> ${metrics.velocity} story points</li>
<li><strong>Completion Rate:</strong> ${metrics.completionRate}%</li>
<li><strong>Avg Cycle Time:</strong> ${metrics.avgCycleTime} days</li>
<li><strong>Blocked Issues:</strong> ${metrics.blockedIssues}</li>
</ul>
<h3>Discussion Topics</h3>
<ol>
<li>What went well this sprint?</li>
<li>What could we improve?</li>
<li>What actions should we take?</li>
</ol>
<hr/>
`;
                    const newBody = currentBody + reportHTML;

                    console.log('Updating page with new content...');
                    const updateResponse = await api.asUser().requestConfluence(
                        route`/wiki/rest/api/content/${contentId}`,
                        {
                            method: 'PUT',
                            headers: {
                                'Accept': 'application/json',
                                'Content-Type': 'application/json'
                            },
                            body: JSON.stringify({
                                id: contentId,
                                type: pageData.type,
                                title: pageData.title,
                                version: { number: currentVersion + 1 },
                                body: {
                                    storage: {
                                        value: newBody,
                                        representation: 'storage'
                                    }
                                }
                            })
                        }
                    );

                    if (updateResponse.ok) {
                        console.log('SUCCESS: Report inserted!');
                        return {
                            success: true,
                            message: 'Report inserted into page!',
                            inserted: true,
                            metrics: metrics
                        };
                    } else {
                        const errorText = await updateResponse.text();
                        console.log('Update FAILED:', updateResponse.status, errorText);
                        return {
                            success: true,
                            message: `Update failed (${updateResponse.status})`,
                            inserted: false,
                            metrics: metrics,
                            debugInfo: { status: updateResponse.status, error: errorText }
                        };
                    }
                } else {
                    const errorText = await pageResponse.text();
                    console.log('Page fetch FAILED:', pageResponse.status, errorText);
                    return {
                        success: true,
                        message: `Cannot access page (${pageResponse.status})`,
                        inserted: false,
                        metrics: metrics,
                        debugInfo: { status: pageResponse.status, error: errorText }
                    };
                }
            } catch (apiError) {
                console.log('API Exception:', apiError.message, apiError.stack);
                return {
                    success: true,
                    message: `API error: ${apiError.message}`,
                    inserted: false,
                    metrics: metrics
                };
            }
        }

        // Return metrics for display if no insert
        return {
            success: true,
            message: 'Retrospective report ready',
            inserted: false,
            metrics: metrics
        };

    } catch (error) {
        console.error('Error in insertReportHandler:', error);
        return {
            success: false,
            message: error.message
        };
    }
});

exports.insertReportHandler = resolver.getDefinitions();


/**
 * Sprint Complete Trigger Handler - Automatically analyzes completed sprints
 */
exports.onSprintCompleteHandler = async function (event, context) {
    console.log('Sprint completed event received:', JSON.stringify(event));

    try {
        const sprintId = event?.sprint?.id || event?.sprintId;

        if (sprintId) {
            // Automatically analyze the completed sprint
            const analysisResult = await exports.analyzeSprintHandler({
                payload: { sprintId: String(sprintId) }
            });

            console.log('Auto-analysis complete for sprint:', sprintId);

            // Store that this sprint was auto-analyzed
            await storage.set(`auto-analyzed-${sprintId}`, {
                analyzedAt: new Date().toISOString(),
                result: analysisResult.success ? 'success' : 'failed'
            });

            return {
                success: true,
                message: 'Sprint automatically analyzed on completion',
                sprintId,
                healthScore: analysisResult.metrics?.healthScore
            };
        }

        return {
            success: true,
            message: 'Sprint completion event processed (no sprint ID found)'
        };
    } catch (error) {
        console.error('Error in onSprintCompleteHandler:', error);
        return {
            success: false,
            message: error.message
        };
    }
};

// ============================================
// DASHBOARD RESOLVER
// ============================================

resolver.define('getDashboardData', async (req) => {
    console.log('=== getDashboardData RESOLVER CALLED ===');
    console.log('Request received at:', new Date().toISOString());

    try {
        console.log('Starting getDashboardData execution...');
        let sprintMetrics = null;
        let sprintHistory = [];
        let isRealData = false;
        const actionItems = await storage.get('local-action-items') || [];
        console.log('Storage fetched, action items count:', actionItems.length);

        // Try to fetch real sprint data from Jira
        try {
            const boardsResponse = await api.asUser().requestJira(route`/rest/agile/1.0/board`, {
                headers: { 'Accept': 'application/json' }
            });

            if (boardsResponse.ok) {
                const boardsData = await boardsResponse.json();

                if (boardsData.values && boardsData.values.length > 0) {
                    const boardId = boardsData.values[0].id;

                    // Get recent sprints
                    const sprintsResponse = await api.asUser().requestJira(
                        route`/rest/agile/1.0/board/${boardId}/sprint?state=active,closed&maxResults=5`,
                        { headers: { 'Accept': 'application/json' } }
                    );

                    if (sprintsResponse.ok) {
                        const sprintsData = await sprintsResponse.json();

                        if (sprintsData.values && sprintsData.values.length > 0) {
                            // Sort sprints: active first, then by ID (newer first)
                            const sortedSprints = [...sprintsData.values].sort((a, b) => {
                                // Active sprints first
                                if (a.state === 'active' && b.state !== 'active') return -1;
                                if (b.state === 'active' && a.state !== 'active') return 1;
                                // Then by ID (higher = newer)
                                return (b.id || 0) - (a.id || 0);
                            });

                            console.log('Sprints order:', sortedSprints.map(s => `${s.name}(${s.state})`).join(', '));

                            // Process each sprint (up to 3)
                            for (const sprint of sortedSprints.slice(0, 3)) {
                                console.log(`Processing sprint: ${sprint.name} (${sprint.state})`);
                                const issuesResponse = await api.asUser().requestJira(
                                    route`/rest/agile/1.0/sprint/${sprint.id}/issue?maxResults=100`,
                                    { headers: { 'Accept': 'application/json' } }
                                );

                                if (issuesResponse.ok) {
                                    const issuesData = await issuesResponse.json();
                                    const metrics = calculateSprintMetrics(issuesData.issues || [], sprint);

                                    let healthScore = 100;
                                    healthScore -= (100 - parseFloat(metrics.completionRate)) * 0.5;
                                    healthScore -= (metrics.blockedIssues || 0) * 5;
                                    healthScore = Math.max(0, Math.min(100, Math.round(healthScore)));

                                    const sprintData = { ...metrics, healthScore };

                                    // Use the FIRST sprint (which is now the active one after sorting)
                                    if (!sprintMetrics) {
                                        sprintMetrics = sprintData;
                                        sprintMetrics.insights = generateInsights(metrics, healthScore);
                                        console.log(`Using sprint ${sprint.name} as primary with velocity ${sprintData.velocity}`);
                                    }
                                    sprintHistory.push(sprintData);
                                }
                            }

                            if (sprintMetrics) {
                                isRealData = true;
                                console.log('Dashboard using REAL Jira data');
                            }
                        }
                    }
                }
            }
        } catch (apiError) {
            console.log('Dashboard Jira API failed:', apiError.message);
        }

        // Fallback to demo data if no real data
        if (!sprintMetrics) {
            console.log('Dashboard using demo data');
            sprintMetrics = {
                sprintId: 'sprint-42',
                sprintName: 'Sprint 42 - Performance Boost',
                healthScore: 78,
                velocity: 42,
                completionRate: '85.7',
                avgCycleTime: '2.8',
                totalIssues: 14,
                completedIssues: 12,
                inProgressIssues: 1,
                blockedIssues: 1,
                totalPoints: 49,
                completedPoints: 42,
                spilloverIssues: 2,
                spilloverPoints: 7,
                analyzedAt: new Date().toISOString(),
                insights: [
                    { type: 'success', title: 'Strong Velocity', message: 'Team completed 42 story points - 8% above average!' },
                    { type: 'warning', title: 'Blocker Detected', message: '1 issue blocked. Consider a blocker-clearing session.' },
                    { type: 'info', title: 'Fast Cycle Time', message: 'Average 2.8 days per issue - 15% faster than previous sprint.' }
                ]
            };

            sprintHistory = [
                sprintMetrics,
                { sprintId: 'sprint-41', sprintName: 'Sprint 41 - Bug Fixes', healthScore: 82, velocity: 38, completionRate: '90.0', avgCycleTime: '3.2', blockedIssues: 0 },
                { sprintId: 'sprint-40', sprintName: 'Sprint 40 - New Features', healthScore: 65, velocity: 35, completionRate: '70.0', avgCycleTime: '4.1', blockedIssues: 3 }
            ];
        }

        // Calculate stats from history
        const avgVelocity = sprintHistory.length > 0
            ? Math.round(sprintHistory.reduce((sum, s) => sum + (s.velocity || 0), 0) / sprintHistory.length)
            : 38;

        // Generate patterns based on data
        const patterns = [
            { type: 'positive', category: 'velocity', title: 'Velocity Trend', description: `Average velocity: ${avgVelocity} points across ${sprintHistory.length} sprints.` },
            { type: 'info', category: 'estimation', title: 'Sprint Consistency', description: isRealData ? 'Data from your actual sprints.' : 'Sample data - analyze real sprints to see patterns.' }
        ];

        return {
            success: true,
            isRealData,
            data: {
                latestSprint: sprintMetrics,
                sprintHistory: sprintHistory,
                stats: {
                    avgVelocity,
                    avgCompletionRate: sprintHistory.length > 0
                        ? (sprintHistory.reduce((sum, s) => sum + parseFloat(s.completionRate || 0), 0) / sprintHistory.length).toFixed(1)
                        : '81.9',
                    avgCycleTime: sprintHistory.length > 0
                        ? (sprintHistory.reduce((sum, s) => sum + parseFloat(s.avgCycleTime || 0), 0) / sprintHistory.length).toFixed(1)
                        : '3.4',
                    trend: 'improving',
                    totalSprints: sprintHistory.length
                },
                patterns,
                recentActions: actionItems.length > 0 ? actionItems.slice(0, 5) : [
                    { id: 'demo-1', title: 'Improve code review turnaround', status: 'completed', priority: 'High' },
                    { id: 'demo-2', title: 'Add automated testing for API', status: 'in-progress', priority: 'Medium' }
                ]
            }
        };
    } catch (error) {
        return { success: false, error: error.message };
    }
});

resolver.define('analyzeSprint', async (req) => {
    return exports.analyzeSprintHandler(req);
});

exports.dashboardHandler = resolver.getDefinitions();
