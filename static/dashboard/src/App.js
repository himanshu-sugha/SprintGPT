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
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        className="action-button"
                        onClick={handleAnalyzeSprint}
                        disabled={analyzing}
                    >
                        {analyzing ? '⏳ Analyzing...' : '📊 Analyze Current Sprint'}
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
