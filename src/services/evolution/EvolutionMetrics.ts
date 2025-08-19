// Evolution Metrics - Comprehensive tracking and analysis of evolution performance
// Tracks performance improvements, mutation success rates, and system health

import { EvolutionCycle, EvolutionResult } from './EvolutionEngine.js';
import { Mutation } from './SelfEvolvingArchitecture.js';

export interface MetricSnapshot {
  timestamp: Date;
  performance: PerformanceSnapshot;
  quality: QualitySnapshot;
  stability: StabilitySnapshot;
  evolution: EvolutionSnapshot;
}

export interface PerformanceSnapshot {
  latency_p50: number;
  latency_p95: number;
  latency_p99: number;
  throughput_ops_sec: number;
  memory_usage_mb: number;
  cpu_usage_percent: number;
  error_rate: number;
  cache_hit_rate: number;
}

export interface QualitySnapshot {
  code_coverage: number;
  cyclomatic_complexity: number;
  maintainability_index: number;
  technical_debt_ratio: number;
  security_score: number;
  documentation_coverage: number;
}

export interface StabilitySnapshot {
  uptime_hours: number;
  crash_count: number;
  recovery_time_seconds: number;
  dependency_health: number;
  backup_success_rate: number;
  rollback_frequency: number;
}

export interface EvolutionSnapshot {
  mutations_applied: number;
  mutations_successful: number;
  mutations_failed: number;
  average_improvement: number;
  thinking_tokens_used: number;
  safety_score: number;
  cycles_completed: number;
  cycles_failed: number;
}

export interface TrendAnalysis {
  metric_name: string;
  trend_direction: 'improving' | 'degrading' | 'stable';
  trend_strength: number; // 0-1
  confidence: number; // 0-1
  projected_value: number;
  recommendation: string;
}

export interface PerformanceGoal {
  id: string;
  name: string;
  metric: string;
  target_value: number;
  current_value: number;
  progress: number; // 0-1
  deadline?: Date;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'not_started' | 'in_progress' | 'achieved' | 'overdue';
}

export interface EvolutionInsight {
  type: 'optimization' | 'warning' | 'achievement' | 'recommendation';
  title: string;
  description: string;
  confidence: number;
  suggested_actions: string[];
  priority: number;
  data_points: any[];
}

/**
 * Evolution Metrics - Comprehensive performance tracking for self-evolving architecture
 * 
 * Tracks all aspects of system evolution including:
 * - Performance improvements over time
 * - Mutation success rates and patterns
 * - System stability and health
 * - Code quality evolution
 * - Predictive analytics and recommendations
 */
export class EvolutionMetrics {
  private snapshots: MetricSnapshot[] = [];
  private goals: Map<string, PerformanceGoal> = new Map();
  private insights: EvolutionInsight[] = [];
  private baseline: MetricSnapshot | null = null;
  private maxSnapshots: number = 1000;

  constructor() {
    this.initializeDefaultGoals();
  }

  /**
   * Record a complete evolution cycle with all metrics
   */
  async recordEvolutionCycle(cycle: EvolutionCycle, result: EvolutionResult): Promise<void> {
    console.log(`📊 Recording evolution cycle metrics: ${cycle.id}`);

    try {
      // Capture current system state
      const snapshot = await this.captureSnapshot();
      
      // Enhance snapshot with evolution data
      snapshot.evolution = {
        mutations_applied: cycle.mutations_applied,
        mutations_successful: cycle.mutations_applied,
        mutations_failed: cycle.mutations_attempted - cycle.mutations_applied,
        average_improvement: cycle.performance_improvement,
        thinking_tokens_used: cycle.thinking_tokens_used,
        safety_score: cycle.safety_score,
        cycles_completed: cycle.status === 'completed' ? 1 : 0,
        cycles_failed: cycle.status === 'failed' ? 1 : 0
      };

      this.snapshots.push(snapshot);

      // Set baseline if this is the first snapshot
      if (!this.baseline) {
        this.baseline = snapshot;
        console.log('📍 Performance baseline established');
      }

      // Update performance goals
      await this.updateGoalsProgress(snapshot);

      // Generate insights
      await this.generateInsights(snapshot, cycle, result);

      // Cleanup old snapshots
      if (this.snapshots.length > this.maxSnapshots) {
        this.snapshots = this.snapshots.slice(-this.maxSnapshots);
      }

      console.log(`✅ Evolution cycle metrics recorded`);

    } catch (error) {
      console.error('❌ Failed to record evolution cycle metrics:', error);
    }
  }

  /**
   * Capture current system performance snapshot
   */
  async captureSnapshot(): Promise<MetricSnapshot> {
    const performance = await this.capturePerformanceMetrics();
    const quality = await this.captureQualityMetrics();
    const stability = await this.captureStabilityMetrics();
    
    return {
      timestamp: new Date(),
      performance,
      quality,
      stability,
      evolution: {
        mutations_applied: 0,
        mutations_successful: 0,
        mutations_failed: 0,
        average_improvement: 0,
        thinking_tokens_used: 0,
        safety_score: 1.0,
        cycles_completed: 0,
        cycles_failed: 0
      }
    };
  }

  /**
   * Get comprehensive metrics summary
   */
  getSummary(): {
    current: MetricSnapshot;
    baseline: MetricSnapshot | null;
    trends: TrendAnalysis[];
    goals: PerformanceGoal[];
    insights: EvolutionInsight[];
    evolution_stats: EvolutionStats;
  } {
    const current = this.snapshots[this.snapshots.length - 1] || this.createEmptySnapshot();
    const trends = this.analyzeTrends();
    const goals = Array.from(this.goals.values());
    const evolutionStats = this.calculateEvolutionStats();

    return {
      current,
      baseline: this.baseline,
      trends,
      goals,
      insights: this.insights,
      evolution_stats: evolutionStats
    };
  }

  /**
   * Analyze performance trends over time
   */
  analyzeTrends(): TrendAnalysis[] {
    if (this.snapshots.length < 3) {
      return [];
    }

    const trends: TrendAnalysis[] = [];
    const recentSnapshots = this.snapshots.slice(-10); // Last 10 snapshots

    // Analyze key metrics
    const metrics = [
      { name: 'latency_p95', getValue: (s: MetricSnapshot) => s.performance.latency_p95, target: 'lower' },
      { name: 'throughput', getValue: (s: MetricSnapshot) => s.performance.throughput_ops_sec, target: 'higher' },
      { name: 'memory_usage', getValue: (s: MetricSnapshot) => s.performance.memory_usage_mb, target: 'lower' },
      { name: 'error_rate', getValue: (s: MetricSnapshot) => s.performance.error_rate, target: 'lower' },
      { name: 'code_coverage', getValue: (s: MetricSnapshot) => s.quality.code_coverage, target: 'higher' },
      { name: 'maintainability', getValue: (s: MetricSnapshot) => s.quality.maintainability_index, target: 'higher' },
      { name: 'safety_score', getValue: (s: MetricSnapshot) => s.evolution.safety_score, target: 'higher' }
    ];

    for (const metric of metrics) {
      const values = recentSnapshots.map(metric.getValue);
      const trend = this.calculateTrend(values, metric.target);
      
      trends.push({
        metric_name: metric.name,
        trend_direction: trend.direction,
        trend_strength: trend.strength,
        confidence: trend.confidence,
        projected_value: trend.projected,
        recommendation: this.generateTrendRecommendation(metric.name, trend)
      });
    }

    return trends;
  }

  /**
   * Add or update performance goal
   */
  setPerformanceGoal(goal: PerformanceGoal): void {
    this.goals.set(goal.id, goal);
    console.log(`🎯 Performance goal set: ${goal.name}`);
  }

  /**
   * Get evolution performance over time
   */
  getEvolutionPerformance(): {
    cycles_over_time: Array<{ date: Date; cycles: number; success_rate: number }>;
    improvement_over_time: Array<{ date: Date; improvement: number }>;
    thinking_tokens_over_time: Array<{ date: Date; tokens: number }>;
    mutation_success_rate: number;
    average_improvement: number;
    total_cycles: number;
  } {
    const cyclesOverTime = this.groupSnapshotsByDay().map(group => ({
      date: group.date,
      cycles: group.snapshots.reduce((sum, s) => sum + s.evolution.cycles_completed + s.evolution.cycles_failed, 0),
      success_rate: this.calculateSuccessRate(group.snapshots)
    }));

    const improvementOverTime = this.snapshots.map(s => ({
      date: s.timestamp,
      improvement: s.evolution.average_improvement
    }));

    const thinkingTokensOverTime = this.snapshots.map(s => ({
      date: s.timestamp,
      tokens: s.evolution.thinking_tokens_used
    }));

    const totalMutations = this.snapshots.reduce((sum, s) => sum + s.evolution.mutations_applied + s.evolution.mutations_failed, 0);
    const successfulMutations = this.snapshots.reduce((sum, s) => sum + s.evolution.mutations_successful, 0);
    
    return {
      cycles_over_time: cyclesOverTime,
      improvement_over_time: improvementOverTime,
      thinking_tokens_over_time: thinkingTokensOverTime,
      mutation_success_rate: totalMutations > 0 ? successfulMutations / totalMutations : 0,
      average_improvement: this.snapshots.length > 0 ? 
        this.snapshots.reduce((sum, s) => sum + s.evolution.average_improvement, 0) / this.snapshots.length : 0,
      total_cycles: this.snapshots.reduce((sum, s) => sum + s.evolution.cycles_completed + s.evolution.cycles_failed, 0)
    };
  }

  /**
   * Generate predictive analytics
   */
  generatePredictions(): {
    performance_forecast: Array<{ metric: string; predicted_value: number; confidence: number; timeframe: string }>;
    optimization_opportunities: Array<{ area: string; potential_improvement: number; effort_required: string }>;
    risk_assessment: { overall_risk: number; risk_factors: string[]; mitigation_strategies: string[] };
  } {
    const performanceForecast = this.forecastPerformance();
    const optimizationOpportunities = this.identifyOptimizationOpportunities();
    const riskAssessment = this.assessRisks();

    return {
      performance_forecast: performanceForecast,
      optimization_opportunities: optimizationOpportunities,
      risk_assessment: riskAssessment
    };
  }

  // Private helper methods

  private async capturePerformanceMetrics(): Promise<PerformanceSnapshot> {
    // Simulate real performance metrics capture
    // In production, this would integrate with monitoring systems
    
    const baseLatency = 50 + Math.random() * 20;
    return {
      latency_p50: baseLatency,
      latency_p95: baseLatency * 2.5,
      latency_p99: baseLatency * 5,
      throughput_ops_sec: 1000 + Math.random() * 500,
      memory_usage_mb: 512 + Math.random() * 256,
      cpu_usage_percent: 45 + Math.random() * 20,
      error_rate: Math.random() * 0.02,
      cache_hit_rate: 0.8 + Math.random() * 0.15
    };
  }

  private async captureQualityMetrics(): Promise<QualitySnapshot> {
    // Simulate quality metrics capture
    return {
      code_coverage: 0.75 + Math.random() * 0.2,
      cyclomatic_complexity: 15 + Math.random() * 10,
      maintainability_index: 70 + Math.random() * 20,
      technical_debt_ratio: 0.1 + Math.random() * 0.1,
      security_score: 0.85 + Math.random() * 0.1,
      documentation_coverage: 0.6 + Math.random() * 0.3
    };
  }

  private async captureStabilityMetrics(): Promise<StabilitySnapshot> {
    // Simulate stability metrics capture
    return {
      uptime_hours: 24 + Math.random() * 48,
      crash_count: Math.floor(Math.random() * 3),
      recovery_time_seconds: 30 + Math.random() * 60,
      dependency_health: 0.9 + Math.random() * 0.05,
      backup_success_rate: 0.95 + Math.random() * 0.04,
      rollback_frequency: Math.random() * 0.1
    };
  }

  private initializeDefaultGoals(): void {
    this.setPerformanceGoal({
      id: 'latency_improvement',
      name: 'Reduce P95 Latency',
      metric: 'latency_p95',
      target_value: 100,
      current_value: 150,
      progress: 0,
      priority: 'high',
      status: 'in_progress'
    });

    this.setPerformanceGoal({
      id: 'throughput_improvement',
      name: 'Increase Throughput',
      metric: 'throughput_ops_sec',
      target_value: 2000,
      current_value: 1000,
      progress: 0,
      priority: 'medium',
      status: 'in_progress'
    });

    this.setPerformanceGoal({
      id: 'error_rate_reduction',
      name: 'Reduce Error Rate',
      metric: 'error_rate',
      target_value: 0.001,
      current_value: 0.01,
      progress: 0,
      priority: 'critical',
      status: 'in_progress'
    });

    this.setPerformanceGoal({
      id: 'code_coverage_improvement',
      name: 'Improve Code Coverage',
      metric: 'code_coverage',
      target_value: 0.9,
      current_value: 0.75,
      progress: 0,
      priority: 'medium',
      status: 'in_progress'
    });
  }

  private async updateGoalsProgress(snapshot: MetricSnapshot): Promise<void> {
    for (const goal of this.goals.values()) {
      let currentValue: number;
      
      // Extract current value based on metric
      switch (goal.metric) {
        case 'latency_p95':
          currentValue = snapshot.performance.latency_p95;
          break;
        case 'throughput_ops_sec':
          currentValue = snapshot.performance.throughput_ops_sec;
          break;
        case 'error_rate':
          currentValue = snapshot.performance.error_rate;
          break;
        case 'code_coverage':
          currentValue = snapshot.quality.code_coverage;
          break;
        default:
          continue;
      }

      goal.current_value = currentValue;

      // Calculate progress
      if (goal.metric === 'latency_p95' || goal.metric === 'error_rate') {
        // For metrics where lower is better
        const improvement = Math.max(0, goal.current_value - goal.target_value);
        const totalImprovement = goal.current_value - goal.target_value;
        goal.progress = totalImprovement > 0 ? Math.min(1, improvement / totalImprovement) : 1;
      } else {
        // For metrics where higher is better
        const improvement = Math.max(0, goal.current_value - goal.target_value);
        const totalImprovement = goal.target_value - goal.current_value;
        goal.progress = totalImprovement > 0 ? Math.min(1, improvement / totalImprovement) : 1;
      }

      // Update status
      if (goal.progress >= 1) {
        goal.status = 'achieved';
      } else if (goal.deadline && new Date() > goal.deadline) {
        goal.status = 'overdue';
      } else if (goal.progress > 0) {
        goal.status = 'in_progress';
      } else {
        goal.status = 'not_started';
      }
    }
  }

  private async generateInsights(snapshot: MetricSnapshot, cycle: EvolutionCycle, result: EvolutionResult): Promise<void> {
    const newInsights: EvolutionInsight[] = [];

    // Performance insights
    if (cycle.performance_improvement > 10) {
      newInsights.push({
        type: 'achievement',
        title: 'Significant Performance Improvement',
        description: `Evolution cycle achieved ${cycle.performance_improvement.toFixed(1)}% performance improvement`,
        confidence: 0.9,
        suggested_actions: ['Continue similar optimization patterns', 'Monitor for regressions'],
        priority: 1,
        data_points: [{ improvement: cycle.performance_improvement, cycle_id: cycle.id }]
      });
    }

    // Safety insights
    if (cycle.safety_score < 0.8) {
      newInsights.push({
        type: 'warning',
        title: 'Low Safety Score',
        description: `Evolution cycle had safety score of ${cycle.safety_score.toFixed(2)}`,
        confidence: 0.95,
        suggested_actions: ['Review safety protocols', 'Increase safety thresholds', 'Audit mutation generation'],
        priority: 2,
        data_points: [{ safety_score: cycle.safety_score, cycle_id: cycle.id }]
      });
    }

    // Efficiency insights
    if (cycle.thinking_tokens_used > 20000) {
      newInsights.push({
        type: 'optimization',
        title: 'High Thinking Token Usage',
        description: `Evolution cycle used ${cycle.thinking_tokens_used} thinking tokens`,
        confidence: 0.8,
        suggested_actions: ['Optimize prompts', 'Consider reducing thinking budget', 'Improve heuristics'],
        priority: 3,
        data_points: [{ tokens_used: cycle.thinking_tokens_used, cycle_id: cycle.id }]
      });
    }

    // Success rate insights
    const successRate = cycle.mutations_attempted > 0 ? cycle.mutations_applied / cycle.mutations_attempted : 0;
    if (successRate < 0.5) {
      newInsights.push({
        type: 'warning',
        title: 'Low Mutation Success Rate',
        description: `Only ${(successRate * 100).toFixed(1)}% of mutations were successfully applied`,
        confidence: 0.85,
        suggested_actions: ['Improve mutation quality', 'Enhance testing', 'Review selection criteria'],
        priority: 4,
        data_points: [{ success_rate: successRate, cycle_id: cycle.id }]
      });
    }

    // Add new insights
    this.insights.push(...newInsights);

    // Keep only recent insights (last 50)
    if (this.insights.length > 50) {
      this.insights = this.insights.slice(-50);
    }
  }

  private calculateTrend(values: number[], target: 'higher' | 'lower'): {
    direction: 'improving' | 'degrading' | 'stable';
    strength: number;
    confidence: number;
    projected: number;
  } {
    if (values.length < 2) {
      return { direction: 'stable', strength: 0, confidence: 0, projected: values[0] || 0 };
    }

    // Simple linear regression
    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;

    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const totalSumSquares = values.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = values.reduce((acc, yi, i) => {
      const predicted = slope * i + intercept;
      return acc + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - (residualSumSquares / totalSumSquares);

    // Determine direction
    let direction: 'improving' | 'degrading' | 'stable';
    if (Math.abs(slope) < 0.01) {
      direction = 'stable';
    } else if ((slope > 0 && target === 'higher') || (slope < 0 && target === 'lower')) {
      direction = 'improving';
    } else {
      direction = 'degrading';
    }

    // Project next value
    const projected = slope * n + intercept;

    return {
      direction,
      strength: Math.abs(slope),
      confidence: Math.max(0, Math.min(1, rSquared)),
      projected
    };
  }

  private generateTrendRecommendation(metricName: string, trend: any): string {
    if (trend.direction === 'improving') {
      return `Continue current optimization strategies for ${metricName}`;
    } else if (trend.direction === 'degrading') {
      return `Address degradation in ${metricName} immediately`;
    } else {
      return `Monitor ${metricName} for potential optimization opportunities`;
    }
  }

  private createEmptySnapshot(): MetricSnapshot {
    return {
      timestamp: new Date(),
      performance: {
        latency_p50: 0,
        latency_p95: 0,
        latency_p99: 0,
        throughput_ops_sec: 0,
        memory_usage_mb: 0,
        cpu_usage_percent: 0,
        error_rate: 0,
        cache_hit_rate: 0
      },
      quality: {
        code_coverage: 0,
        cyclomatic_complexity: 0,
        maintainability_index: 0,
        technical_debt_ratio: 0,
        security_score: 0,
        documentation_coverage: 0
      },
      stability: {
        uptime_hours: 0,
        crash_count: 0,
        recovery_time_seconds: 0,
        dependency_health: 0,
        backup_success_rate: 0,
        rollback_frequency: 0
      },
      evolution: {
        mutations_applied: 0,
        mutations_successful: 0,
        mutations_failed: 0,
        average_improvement: 0,
        thinking_tokens_used: 0,
        safety_score: 0,
        cycles_completed: 0,
        cycles_failed: 0
      }
    };
  }

  private calculateEvolutionStats(): EvolutionStats {
    const totalCycles = this.snapshots.reduce((sum, s) => sum + s.evolution.cycles_completed + s.evolution.cycles_failed, 0);
    const successfulCycles = this.snapshots.reduce((sum, s) => sum + s.evolution.cycles_completed, 0);
    const totalMutations = this.snapshots.reduce((sum, s) => sum + s.evolution.mutations_applied + s.evolution.mutations_failed, 0);
    const successfulMutations = this.snapshots.reduce((sum, s) => sum + s.evolution.mutations_successful, 0);
    const totalTokens = this.snapshots.reduce((sum, s) => sum + s.evolution.thinking_tokens_used, 0);
    const totalImprovement = this.snapshots.reduce((sum, s) => sum + s.evolution.average_improvement, 0);

    return {
      total_cycles: totalCycles,
      successful_cycles: successfulCycles,
      cycle_success_rate: totalCycles > 0 ? successfulCycles / totalCycles : 0,
      total_mutations: totalMutations,
      successful_mutations: successfulMutations,
      mutation_success_rate: totalMutations > 0 ? successfulMutations / totalMutations : 0,
      total_thinking_tokens: totalTokens,
      average_tokens_per_cycle: totalCycles > 0 ? totalTokens / totalCycles : 0,
      cumulative_improvement: totalImprovement,
      average_improvement_per_cycle: totalCycles > 0 ? totalImprovement / totalCycles : 0
    };
  }

  private groupSnapshotsByDay(): Array<{ date: Date; snapshots: MetricSnapshot[] }> {
    const groups = new Map<string, MetricSnapshot[]>();
    
    for (const snapshot of this.snapshots) {
      const dateKey = snapshot.timestamp.toISOString().split('T')[0];
      if (!groups.has(dateKey)) {
        groups.set(dateKey, []);
      }
      groups.get(dateKey)!.push(snapshot);
    }

    return Array.from(groups.entries()).map(([dateStr, snapshots]) => ({
      date: new Date(dateStr),
      snapshots
    }));
  }

  private calculateSuccessRate(snapshots: MetricSnapshot[]): number {
    const totalCycles = snapshots.reduce((sum, s) => sum + s.evolution.cycles_completed + s.evolution.cycles_failed, 0);
    const successfulCycles = snapshots.reduce((sum, s) => sum + s.evolution.cycles_completed, 0);
    return totalCycles > 0 ? successfulCycles / totalCycles : 0;
  }

  private forecastPerformance(): Array<{ metric: string; predicted_value: number; confidence: number; timeframe: string }> {
    const trends = this.analyzeTrends();
    return trends.map(trend => ({
      metric: trend.metric_name,
      predicted_value: trend.projected_value,
      confidence: trend.confidence,
      timeframe: '7 days'
    }));
  }

  private identifyOptimizationOpportunities(): Array<{ area: string; potential_improvement: number; effort_required: string }> {
    return [
      {
        area: 'Latency Optimization',
        potential_improvement: 25,
        effort_required: 'Medium'
      },
      {
        area: 'Memory Usage',
        potential_improvement: 15,
        effort_required: 'Low'
      },
      {
        area: 'Cache Efficiency',
        potential_improvement: 20,
        effort_required: 'High'
      }
    ];
  }

  private assessRisks(): { overall_risk: number; risk_factors: string[]; mitigation_strategies: string[] } {
    const riskFactors: string[] = [];
    const mitigationStrategies: string[] = [];
    let overallRisk = 0.1;

    // Analyze recent safety scores
    const recentSnapshots = this.snapshots.slice(-5);
    const avgSafetyScore = recentSnapshots.reduce((sum, s) => sum + s.evolution.safety_score, 0) / recentSnapshots.length;
    
    if (avgSafetyScore < 0.8) {
      riskFactors.push('Low safety scores in recent cycles');
      mitigationStrategies.push('Increase safety thresholds and review procedures');
      overallRisk += 0.2;
    }

    // Analyze mutation success rates
    const totalMutations = recentSnapshots.reduce((sum, s) => sum + s.evolution.mutations_applied + s.evolution.mutations_failed, 0);
    const successfulMutations = recentSnapshots.reduce((sum, s) => sum + s.evolution.mutations_successful, 0);
    const successRate = totalMutations > 0 ? successfulMutations / totalMutations : 1;

    if (successRate < 0.7) {
      riskFactors.push('Low mutation success rate');
      mitigationStrategies.push('Improve mutation quality and testing');
      overallRisk += 0.15;
    }

    return {
      overall_risk: Math.min(1, overallRisk),
      risk_factors: riskFactors,
      mitigation_strategies: mitigationStrategies
    };
  }
}

interface EvolutionStats {
  total_cycles: number;
  successful_cycles: number;
  cycle_success_rate: number;
  total_mutations: number;
  successful_mutations: number;
  mutation_success_rate: number;
  total_thinking_tokens: number;
  average_tokens_per_cycle: number;
  cumulative_improvement: number;
  average_improvement_per_cycle: number;
}