import React, { useState, useEffect, useCallback } from 'react';
import { invoke } from '@forge/bridge';

/**
 * SprintGPT Dashboard - Sprint Intelligence Dashboard
 * Displays sprint metrics, health scores, insights, and patterns
 */
function App() {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [analyzing, setAnalyzing] = useState(false);
    const [comparing, setComparing] = useState(false);
    const [generatingReport, setGeneratingReport] = useState(false);
    const [comparisonResult, setComparisonResult] = useState(null);
    const [retroReport, setRetroReport] = useState(null);
    const [creatingPage, setCreatingPage] = useState(false);
    const [confluenceResult, setConfluenceResult] = useState(null);

    // Fetch dashboard data
    const fetchData = useCallback(async () => {
        try {
            setLoading(true);
            const result = await invoke('getDashboardData');

            if (result.success) {
                setData(result.data);
                setError(null);
            } else {
                setError(result.error || 'Failed to load dashboard data');
            }
        } catch (err) {
            setError(err.message || 'An error occurred');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Trigger sprint analysis
    const handleAnalyzeSprint = async () => {
        try {
            setAnalyzing(true);
            await invoke('analyzeSprint', {});
            await fetchData();
        } catch (err) {
            setError(err.message);
        } finally {
            setAnalyzing(false);
        }
    };

    // Compare sprints handler - uses local sprint history data
    const handleCompareSprints = async () => {
        try {
            setComparing(true);
            const sprintHistory = data?.sprintHistory || [];
            if (sprintHistory.length >= 2) {
                // Compare the two most recent sprints using local data
                const sprint1 = sprintHistory[1]; // Older sprint
                const sprint2 = sprintHistory[0]; // Newer sprint

                const velocityChange = sprint1.velocity > 0
                    ? (((sprint2.velocity - sprint1.velocity) / sprint1.velocity) * 100).toFixed(1)
                    : 'N/A';
                const completionChange = (parseFloat(sprint2.completionRate) - parseFloat(sprint1.completionRate)).toFixed(1);

                const comparisonData = {
                    sprint1: sprint1,
                    sprint2: sprint2,
                    changes: {
                        velocityChange,
                        completionRateChange: completionChange
                    }
                };

                setComparisonResult(comparisonData);
                alert(`📊 Sprint Comparison\n\n` +
                    `${sprint1.sprintName} → ${sprint2.sprintName}\n\n` +
                    `Velocity: ${sprint1.velocity} → ${sprint2.velocity} pts (${velocityChange}%)\n` +
                    `Completion Rate: ${sprint1.completionRate}% → ${sprint2.completionRate}% (${completionChange > 0 ? '+' : ''}${completionChange}%)\n` +
                    `Cycle Time: ${sprint1.avgCycleTime}d → ${sprint2.avgCycleTime}d`);
            } else {
                alert('Analyze at least 2 sprints to enable comparison. Click "Analyze Current Sprint" multiple times or "Load Demo Data" first.');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setComparing(false);
        }
    };

    // Generate Confluence report handler - uses actual sprint data from dashboard
    const handleGenerateReport = () => {
        const sprint = data?.latestSprint;
        if (!sprint) {
            // Set error message that will be shown in UI
            setError('No sprint data available. Click "Analyze Current Sprint" first.');
            return;
        }

        // Generate report using actual dashboard data
        const healthScore = sprint.healthScore || 0;
        let summary = 'Sprint retrospective analysis.';
        if (healthScore >= 80) {
            summary = 'Excellent sprint! The team performed above expectations.';
        } else if (healthScore >= 60) {
            summary = 'Good sprint with room for improvement.';
        } else {
            summary = 'Challenging sprint. Focus on blockers and scope management.';
        }

        const report = {
            title: `Sprint Retrospective: ${sprint.sprintName}`,
            healthScore: healthScore,
            summary: summary,
            velocity: sprint.velocity,
            completionRate: sprint.completionRate,
            avgCycleTime: sprint.avgCycleTime
        };

        // Set the report - this will trigger the modal to display
        setRetroReport(report);
    };

    // Create a Confluence page with the sprint report
    const handleCreateConfluencePage = async () => {
        if (!retroReport) return;

        try {
            setCreatingPage(true);
            setConfluenceResult(null);

            const result = await invoke('createConfluencePage', {
                sprintName: retroReport.title.replace('Sprint Retrospective: ', ''),
                healthScore: retroReport.healthScore,
                velocity: retroReport.velocity,
                completionRate: retroReport.completionRate,
                avgCycleTime: retroReport.avgCycleTime,
                summary: retroReport.summary
            });

            setConfluenceResult(result);
        } catch (err) {
            setConfluenceResult({ success: false, message: err.message });
        } finally {
            setCreatingPage(false);
        }
    };

    // Load demo data for judges to see full UI
    const loadDemoData = () => {
        setData({
            latestSprint: {
                sprintId: 'demo-sprint-42',
                sprintName: 'Sprint 42 - Performance Boost',
                totalIssues: 14,
                completedIssues: 12,
                inProgressIssues: 1,
                blockedIssues: 1,
                totalPoints: 55,
                completedPoints: 47,
                completionRate: '85.7',
                velocity: 47,
                avgCycleTime: '2.8',
                spilloverIssues: 2,
                spilloverPoints: 8,
                healthScore: 85
            },
            sprintHistory: [
                { sprintName: 'Sprint 41', velocity: 42, completionRate: '82.1', avgCycleTime: '3.1' },
                { sprintName: 'Sprint 40', velocity: 38, completionRate: '79.5', avgCycleTime: '3.4' },
                { sprintName: 'Sprint 39', velocity: 45, completionRate: '88.0', avgCycleTime: '2.5' }
            ],
            stats: {
                avgVelocity: 43,
                avgCompletionRate: '83.8',
                avgCycleTime: '2.9',
                trend: 'improving',
                totalSprints: 4
            },
            patterns: [
                { type: 'velocity', title: 'Velocity Trend', description: 'Velocity increased by 12% over the last 3 sprints' },
                { type: 'consistency', title: 'Sprint Consistency', description: 'Team consistently delivers 40+ story points per sprint' }
            ],
            recentActions: [
                { id: 'demo-1', title: 'Improve code review turnaround', status: 'completed', priority: 'High' },
                { id: 'demo-2', title: 'Add automated testing for API', status: 'in-progress', priority: 'Medium' }
            ]
        });
        setError(null);
    };

    if (loading) {
        return (
            <div className="loading">
                <div className="spinner"></div>
                <p>Loading Sprint Intelligence...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="sprint-dashboard">
                <div className="error-message">
                    <h3>Error loading dashboard</h3>
                    <p>{error}</p>
                    <button onClick={fetchData} className="action-button">Try Again</button>
                </div>
            </div>
        );
    }

    const { latestSprint, sprintHistory, stats, patterns, recentActions } = data || {};

    return (
        <div className="sprint-dashboard">
            {/* Header */}
            <div className="dashboard-header">
                <h1>🏎️ Sprint Intelligence</h1>
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
                    <button
                        className="action-button"
                        onClick={handleAnalyzeSprint}
                        disabled={analyzing}
                    >
                        {analyzing ? '⏳ Analyzing...' : '📊 Analyze Current Sprint'}
                    </button>
                    <button
                        className="action-button"
                        onClick={handleGenerateReport}
                        style={{ background: 'linear-gradient(135deg, #00875A 0%, #006644 100%)' }}
                    >
                        📝 Generate Confluence Report
                    </button>
                    <button
                        className="action-button"
                        onClick={loadDemoData}
                        style={{ background: 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)' }}
                    >
                        🎮 Load Demo Data
                    </button>
                </div>
            </div>

            {/* No data state */}
            {!latestSprint ? (
                <div className="section">
                    <div className="empty-state">
                        <h3>No Sprint Data Yet</h3>
                        <p>Analyze your first sprint to see intelligence and insights here.</p>
                        <button className="action-button" onClick={handleAnalyzeSprint}>
                            📊 Analyze Sprint
                        </button>
                    </div>
                </div>
            ) : (
                <>
                    {/* Health Score */}
                    <div className="section">
                        <div className="health-score">
                            <div className={`health-score-circle ${getHealthClass(latestSprint.healthScore)}`}>
                                {latestSprint.healthScore || 0}
                            </div>
                            <div className="health-description">
                                <h3>Sprint Health Score</h3>
                                <p>{getHealthDescription(latestSprint.healthScore)}</p>
                            </div>
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="metrics-grid">
                        <MetricCard
                            value={latestSprint.velocity || 0}
                            label="Velocity (Points)"
                            status={getStatus(latestSprint.velocity, 40, 25)}
                            trend={stats?.trend}
                        />
                        <MetricCard
                            value={`${latestSprint.completionRate || 0}%`}
                            label="Completion Rate"
                            status={getStatus(parseFloat(latestSprint.completionRate), 80, 60)}
                        />
                        <MetricCard
                            value={`${latestSprint.avgCycleTime || 0}d`}
                            label="Avg Cycle Time"
                            status={getStatusReverse(parseFloat(latestSprint.avgCycleTime), 3, 5)}
                        />
                        <MetricCard
                            value={latestSprint.blockedIssues || 0}
                            label="Blocked Issues"
                            status={latestSprint.blockedIssues > 0 ? 'needs-attention' : 'good'}
                        />
                    </div>

                    {/* Insights Section */}
                    {latestSprint.insights && latestSprint.insights.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h2 className="section-title">💡 Sprint Insights</h2>
                            </div>
                            <ul className="insights-list">
                                {latestSprint.insights.map((insight, index) => (
                                    <InsightItem key={index} insight={insight} />
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Patterns Section */}
                    {patterns && patterns.length > 0 && (
                        <div className="section">
                            <div className="section-header">
                                <h2 className="section-title">🔍 Detected Patterns</h2>
                            </div>
                            <ul className="insights-list">
                                {patterns.slice(0, 4).map((pattern, index) => (
                                    <InsightItem
                                        key={index}
                                        insight={{
                                            type: pattern.type,
                                            title: pattern.title,
                                            message: pattern.description
                                        }}
                                    />
                                ))}
                            </ul>
                        </div>
                    )}

                    {/* Sprint History */}
                    {sprintHistory && sprintHistory.length > 1 && (
                        <div className="section">
                            <div className="section-header">
                                <h2 className="section-title">📈 Recent Sprints</h2>
                            </div>
                            <div className="sprint-history">
                                {sprintHistory.map((sprint, index) => (
                                    <div key={index} className="history-item">
                                        <span className="history-name">{sprint.sprintName}</span>
                                        <div className="history-stats">
                                            <span className="history-stat">⚡ {sprint.velocity} pts</span>
                                            <span className="history-stat">✅ {sprint.completionRate}%</span>
                                            <span className="history-stat">⏱️ {sprint.avgCycleTime}d</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </>
            )}

            {/* Footer */}
            <div style={{ textAlign: 'center', marginTop: '24px', color: '#6B778C', fontSize: '12px' }}>
                SprintGPT - AI Sprint Retrospective Engine 🏎️ | Codegeist 2025
            </div>

            {/* Report Modal - shown when retroReport is set */}
            {retroReport && (
                <div style={{
                    position: 'fixed',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    backgroundColor: 'rgba(0,0,0,0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000
                }}>
                    <div style={{
                        background: 'linear-gradient(145deg, #1a1a2e 0%, #16213e 100%)',
                        borderRadius: '16px',
                        padding: '32px',
                        maxWidth: '500px',
                        width: '90%',
                        boxShadow: '0 20px 60px rgba(0,0,0,0.5)',
                        border: '1px solid rgba(255,255,255,0.1)'
                    }}>
                        <h2 style={{ color: '#00C853', marginTop: 0, fontSize: '24px' }}>
                            📝 Retrospective Report Generated!
                        </h2>
                        <div style={{ color: '#fff', marginBottom: '16px' }}>
                            <h3 style={{ color: '#FFD700', marginBottom: '8px' }}>🏎️ {retroReport.title}</h3>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '16px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ color: '#6B778C', fontSize: '12px' }}>Health Score</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold', color: retroReport.healthScore >= 70 ? '#00C853' : '#FF6B6B' }}>
                                        {retroReport.healthScore}
                                    </div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ color: '#6B778C', fontSize: '12px' }}>Velocity</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{retroReport.velocity} pts</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ color: '#6B778C', fontSize: '12px' }}>Completion Rate</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{retroReport.completionRate}%</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.1)', padding: '12px', borderRadius: '8px' }}>
                                    <div style={{ color: '#6B778C', fontSize: '12px' }}>Avg Cycle Time</div>
                                    <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{retroReport.avgCycleTime}d</div>
                                </div>
                            </div>

                            <p style={{ color: '#B8C4CE', fontStyle: 'italic', marginBottom: '16px' }}>
                                {retroReport.summary}
                            </p>

                            <p style={{ color: '#6B778C', fontSize: '12px', marginBottom: '20px' }}>
                                💡 Click below to create a Confluence page with this report!
                            </p>

                            {/* Confluence Result Message */}
                            {confluenceResult && (
                                <div style={{
                                    padding: '12px',
                                    borderRadius: '8px',
                                    marginBottom: '16px',
                                    background: confluenceResult.success ? 'rgba(0,200,83,0.2)' : 'rgba(255,107,107,0.2)',
                                    border: `1px solid ${confluenceResult.success ? '#00C853' : '#FF6B6B'}`
                                }}>
                                    <p style={{ margin: 0, color: confluenceResult.success ? '#00C853' : '#FF6B6B', fontWeight: 'bold' }}>
                                        {confluenceResult.success ? '✅ ' : '❌ '}{confluenceResult.message}
                                    </p>
                                    {confluenceResult.success && confluenceResult.pageTitle && (
                                        <p style={{ margin: '8px 0 0 0', color: '#B8C4CE', fontSize: '12px' }}>
                                            📄 Page: {confluenceResult.pageTitle}
                                        </p>
                                    )}
                                    {confluenceResult.success && confluenceResult.spaceKey && (
                                        <div style={{ marginTop: '12px' }}>
                                            <p style={{ margin: '0 0 8px 0', color: '#B8C4CE', fontSize: '12px' }}>
                                                🔗 Copy this link to view your page:
                                            </p>
                                            <input
                                                type="text"
                                                readOnly
                                                value={confluenceResult.pageUrl || `/wiki/spaces/${confluenceResult.spaceKey}/pages/${confluenceResult.pageId}`}
                                                onClick={(e) => {
                                                    e.target.select();
                                                    navigator.clipboard.writeText(e.target.value);
                                                }}
                                                style={{
                                                    width: '100%',
                                                    padding: '10px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    border: '1px solid #0052CC',
                                                    borderRadius: '6px',
                                                    color: '#fff',
                                                    fontSize: '11px',
                                                    cursor: 'pointer'
                                                }}
                                                title="Click to copy"
                                            />
                                            <p style={{ margin: '4px 0 0 0', color: '#6B778C', fontSize: '10px' }}>
                                                📋 Click to copy, then paste in browser
                                            </p>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Buttons */}
                        <div style={{ display: 'flex', gap: '12px', flexDirection: 'column' }}>
                            <button
                                onClick={handleCreateConfluencePage}
                                disabled={creatingPage}
                                style={{
                                    background: creatingPage
                                        ? 'rgba(255,255,255,0.1)'
                                        : 'linear-gradient(135deg, #0052CC 0%, #0747A6 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '14px 24px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: creatingPage ? 'wait' : 'pointer',
                                    width: '100%'
                                }}
                            >
                                {creatingPage ? '⏳ Creating Page...' : '📝 Create Confluence Page'}
                            </button>
                            <button
                                onClick={() => {
                                    setRetroReport(null);
                                    setConfluenceResult(null);
                                }}
                                style={{
                                    background: 'linear-gradient(135deg, #DE350B 0%, #BF2600 100%)',
                                    color: '#fff',
                                    border: 'none',
                                    padding: '12px 24px',
                                    borderRadius: '8px',
                                    fontSize: '14px',
                                    fontWeight: 'bold',
                                    cursor: 'pointer',
                                    width: '100%'
                                }}
                            >
                                ✕ Close
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

/**
 * Metric Card Component
 */
function MetricCard({ value, label, status, trend }) {
    return (
        <div className={`metric-card ${status}`}>
            <div className="metric-value">{value}</div>
            <div className="metric-label">{label}</div>
            {trend && trend !== 'no-data' && (
                <div className={`metric-trend ${trend}`}>
                    {trend === 'improving' && '📈 Improving'}
                    {trend === 'declining' && '📉 Declining'}
                    {trend === 'stable' && '➡️ Stable'}
                </div>
            )}
        </div>
    );
}

/**
 * Insight Item Component
 */
function InsightItem({ insight }) {
    const iconMap = {
        warning: '⚠️',
        alert: '🔴',
        success: '✅',
        info: '💡',
        positive: '✅',
        stats: '📊'
    };

    return (
        <li className="insight-item">
            <div className={`insight-icon ${insight.type}`}>
                {iconMap[insight.type] || '💡'}
            </div>
            <div className="insight-content">
                <h4>{insight.title}</h4>
                <p>{insight.message}</p>
            </div>
        </li>
    );
}

/**
 * Helper functions
 */
function getStatus(value, goodThreshold, okThreshold) {
    if (value >= goodThreshold) return 'good';
    if (value >= okThreshold) return 'ok';
    return 'needs-attention';
}

function getStatusReverse(value, goodThreshold, okThreshold) {
    if (value <= goodThreshold) return 'good';
    if (value <= okThreshold) return 'ok';
    return 'needs-attention';
}

function getHealthClass(score) {
    if (score >= 80) return 'good';
    if (score >= 60) return 'ok';
    return 'needs-attention';
}

function getHealthDescription(score) {
    if (score >= 80) {
        return 'Excellent sprint health! Team is performing at optimal levels. 🏆';
    }
    if (score >= 60) {
        return 'Good sprint with room for improvement. Review insights for optimization opportunities.';
    }
    return 'Sprint needs attention. Check blockers and discuss in your next retro.';
}

export default App;
