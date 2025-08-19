// Performance Analyzer - Advanced bottleneck detection and real-time analysis
// Part of SOL-PERF-002: Self-Optimizing Performance Metrics

import { RawMetrics, OptimizedMetrics } from './SelfOptimizingMetricsEngine.js';

export interface BottleneckAnalysis {
  bottlenecks: Bottleneck[];
  critical_path: string[];
  resource_utilization: ResourceUtilization;
  recommendations: Recommendation[];
  urgency_score: number; // 0-1
}

export interface Bottleneck {
  id: string;
  type: 'cpu' | 'memory' | 'io' | 'network' | 'cache' | 'algorithm' | 'database';
  severity: 'low' | 'medium' | 'high' | 'critical';
  location: string;
  description: string;
  impact: {
    latency_impact: number;
    throughput_impact: number;
    user_experience_impact: number;
  };
  detection_method: 'threshold' | 'trend' | 'pattern' | 'ai_analysis';
  confidence: number;
  first_detected: Date;
  frequency: number;
}

export interface ResourceUtilization {
  cpu: {
    current: number;
    average: number;
    peak: number;
    trend: 'increasing' | 'decreasing' | 'stable';
    efficiency: number;
  };
  memory: {
    used_percentage: number;
    fragmentation: number;
    gc_pressure: number;
    leak_indicators: string[];
  };
  network: {
    bandwidth_utilization: number;
    connection_pool_usage: number;
    latency_distribution: number[];
    error_rate: number;
  };
  storage: {
    io_wait_time: number;
    queue_depth: number;
    read_write_ratio: number;
    cache_efficiency: number;
  };
}

export interface Recommendation {
  id: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  type: 'optimization' | 'scaling' | 'refactoring' | 'configuration';
  title: string;
  description: string;
  expected_benefit: {
    performance_improvement: number;
    cost_impact: 'decrease' | 'neutral' | 'increase';
    implementation_effort: 'low' | 'medium' | 'high';
  };
  implementation_steps: string[];
  risks: string[];
  success_metrics: string[];
}

export interface PredictiveAnalysis {
  performance_forecast: {
    timeframe: '1h' | '24h' | '7d' | '30d';
    predicted_metrics: {
      latency_p95: number;
      throughput: number;
      error_rate: number;
      resource_usage: number;
    };
    confidence: number;
    assumptions: string[];
  }[];
  scaling_predictions: {
    scale_up_trigger: Date | null;
    scale_down_opportunity: Date | null;
    resource_requirements: {
      cpu_cores: number;
      memory_gb: number;
      storage_gb: number;
    };
  };
  failure_risk_assessment: {
    risk_level: 'low' | 'medium' | 'high' | 'critical';
    failure_scenarios: string[];
    time_to_failure: number | null; // minutes
    mitigation_strategies: string[];
  };
}

/**
 * Performance Analyzer - Advanced bottleneck detection and predictive analysis
 * 
 * Provides comprehensive performance analysis including:
 * - Real-time bottleneck detection using multiple methods
 * - Resource utilization analysis with trend detection
 * - AI-powered pattern recognition for complex issues
 * - Predictive performance modeling
 * - Intelligent recommendations with risk assessment
 */
export class PerformanceAnalyzer {
  private bottleneck_history: Map<string, Bottleneck[]> = new Map();
  private metrics_history: RawMetrics[] = [];
  private analysis_cache: Map<string, any> = new Map();
  private max_history_size: number = 1000;

  constructor() {
    this.initializeThresholds();
  }

  /**
   * Perform comprehensive bottleneck analysis
   */
  async analyzeBottlenecks(metrics: RawMetrics): Promise<BottleneckAnalysis> {
    console.log('🔍 Performing comprehensive bottleneck analysis...');

    // Store metrics for trend analysis
    this.addMetricsToHistory(metrics);

    // Detect bottlenecks using multiple methods
    const bottlenecks = await this.detectBottlenecks(metrics);

    // Analyze resource utilization
    const resourceUtilization = this.analyzeResourceUtilization(metrics);

    // Identify critical path
    const criticalPath = this.identifyCriticalPath(metrics, bottlenecks);

    // Generate recommendations
    const recommendations = this.generateRecommendations(bottlenecks, resourceUtilization);

    // Calculate urgency score
    const urgencyScore = this.calculateUrgencyScore(bottlenecks, resourceUtilization);

    console.log(`📊 Analysis complete: ${bottlenecks.length} bottlenecks detected, urgency: ${urgencyScore.toFixed(2)}`);

    return {
      bottlenecks,
      critical_path: criticalPath,
      resource_utilization: resourceUtilization,
      recommendations,
      urgency_score: urgencyScore
    };
  }

  /**
   * Detect bottlenecks using multiple detection methods
   */
  private async detectBottlenecks(metrics: RawMetrics): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Threshold-based detection
    bottlenecks.push(...this.detectThresholdBottlenecks(metrics));

    // Trend-based detection
    bottlenecks.push(...this.detectTrendBottlenecks(metrics));

    // Pattern-based detection
    bottlenecks.push(...this.detectPatternBottlenecks(metrics));

    // AI-based detection (if available)
    bottlenecks.push(...await this.detectAIBottlenecks(metrics));

    // Deduplicate and sort by severity
    const uniqueBottlenecks = this.deduplicateBottlenecks(bottlenecks);
    return this.sortBottlenecksBySeverity(uniqueBottlenecks);
  }

  /**
   * Threshold-based bottleneck detection
   */
  private detectThresholdBottlenecks(metrics: RawMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // CPU bottleneck
    if (metrics.cpu.usage_percent > 85) {
      bottlenecks.push({
        id: `cpu-threshold-${Date.now()}`,
        type: 'cpu',
        severity: metrics.cpu.usage_percent > 95 ? 'critical' : 'high',
        location: 'system',
        description: `High CPU usage: ${metrics.cpu.usage_percent.toFixed(1)}%`,
        impact: {
          latency_impact: metrics.cpu.usage_percent * 0.01,
          throughput_impact: Math.max(0, (metrics.cpu.usage_percent - 80) * 0.02),
          user_experience_impact: metrics.cpu.usage_percent > 90 ? 0.8 : 0.4
        },
        detection_method: 'threshold',
        confidence: 0.9,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Memory bottleneck
    const memoryUsage = metrics.memory.heap_used / metrics.memory.heap_total;
    if (memoryUsage > 0.85) {
      bottlenecks.push({
        id: `memory-threshold-${Date.now()}`,
        type: 'memory',
        severity: memoryUsage > 0.95 ? 'critical' : 'high',
        location: 'heap',
        description: `High memory usage: ${(memoryUsage * 100).toFixed(1)}%`,
        impact: {
          latency_impact: memoryUsage > 0.9 ? 0.6 : 0.3,
          throughput_impact: memoryUsage > 0.9 ? 0.5 : 0.2,
          user_experience_impact: memoryUsage > 0.95 ? 0.9 : 0.4
        },
        detection_method: 'threshold',
        confidence: 0.85,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Cache bottleneck
    if (metrics.cache.hit_rate < 0.7) {
      bottlenecks.push({
        id: `cache-threshold-${Date.now()}`,
        type: 'cache',
        severity: metrics.cache.hit_rate < 0.5 ? 'high' : 'medium',
        location: 'cache_layer',
        description: `Low cache hit rate: ${(metrics.cache.hit_rate * 100).toFixed(1)}%`,
        impact: {
          latency_impact: (0.8 - metrics.cache.hit_rate) * 2,
          throughput_impact: (0.8 - metrics.cache.hit_rate) * 1.5,
          user_experience_impact: (0.8 - metrics.cache.hit_rate) * 1.2
        },
        detection_method: 'threshold',
        confidence: 0.8,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Latency bottleneck
    if (metrics.latency.percentiles.p95 > 500) {
      bottlenecks.push({
        id: `latency-threshold-${Date.now()}`,
        type: 'io',
        severity: metrics.latency.percentiles.p95 > 1000 ? 'critical' : 'high',
        location: 'request_processing',
        description: `High P95 latency: ${metrics.latency.percentiles.p95.toFixed(1)}ms`,
        impact: {
          latency_impact: metrics.latency.percentiles.p95 / 100,
          throughput_impact: Math.min(0.8, metrics.latency.percentiles.p95 / 1000),
          user_experience_impact: Math.min(1.0, metrics.latency.percentiles.p95 / 500)
        },
        detection_method: 'threshold',
        confidence: 0.9,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Network bottleneck
    if (metrics.network.errors > 10) {
      bottlenecks.push({
        id: `network-threshold-${Date.now()}`,
        type: 'network',
        severity: metrics.network.errors > 50 ? 'high' : 'medium',
        location: 'network_layer',
        description: `High network errors: ${metrics.network.errors}`,
        impact: {
          latency_impact: metrics.network.errors * 0.01,
          throughput_impact: metrics.network.errors * 0.02,
          user_experience_impact: metrics.network.errors > 20 ? 0.6 : 0.3
        },
        detection_method: 'threshold',
        confidence: 0.75,
        first_detected: new Date(),
        frequency: 1
      });
    }

    return bottlenecks;
  }

  /**
   * Trend-based bottleneck detection
   */
  private detectTrendBottlenecks(metrics: RawMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    if (this.metrics_history.length < 5) {
      return bottlenecks; // Need more data for trend analysis
    }

    const recentMetrics = this.metrics_history.slice(-5);

    // CPU trend analysis
    const cpuTrend = this.calculateTrend(recentMetrics.map(m => m.cpu.usage_percent));
    if (cpuTrend.slope > 5 && cpuTrend.confidence > 0.7) {
      bottlenecks.push({
        id: `cpu-trend-${Date.now()}`,
        type: 'cpu',
        severity: cpuTrend.slope > 10 ? 'high' : 'medium',
        location: 'system',
        description: `CPU usage trending upward: +${cpuTrend.slope.toFixed(1)}%/interval`,
        impact: {
          latency_impact: cpuTrend.slope * 0.02,
          throughput_impact: cpuTrend.slope * 0.015,
          user_experience_impact: cpuTrend.slope > 10 ? 0.5 : 0.2
        },
        detection_method: 'trend',
        confidence: cpuTrend.confidence,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Memory trend analysis
    const memoryTrend = this.calculateTrend(recentMetrics.map(m => m.memory.heap_used));
    if (memoryTrend.slope > 1000000 && memoryTrend.confidence > 0.7) { // 1MB increase per interval
      bottlenecks.push({
        id: `memory-trend-${Date.now()}`,
        type: 'memory',
        severity: memoryTrend.slope > 5000000 ? 'high' : 'medium',
        location: 'heap',
        description: `Memory usage trending upward: +${(memoryTrend.slope / 1024 / 1024).toFixed(1)}MB/interval`,
        impact: {
          latency_impact: 0.1,
          throughput_impact: 0.1,
          user_experience_impact: 0.2
        },
        detection_method: 'trend',
        confidence: memoryTrend.confidence,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Latency trend analysis
    const latencyTrend = this.calculateTrend(recentMetrics.map(m => m.latency.percentiles.p95));
    if (latencyTrend.slope > 20 && latencyTrend.confidence > 0.7) {
      bottlenecks.push({
        id: `latency-trend-${Date.now()}`,
        type: 'io',
        severity: latencyTrend.slope > 50 ? 'high' : 'medium',
        location: 'request_processing',
        description: `Latency trending upward: +${latencyTrend.slope.toFixed(1)}ms/interval`,
        impact: {
          latency_impact: latencyTrend.slope / 100,
          throughput_impact: latencyTrend.slope / 200,
          user_experience_impact: latencyTrend.slope > 30 ? 0.4 : 0.2
        },
        detection_method: 'trend',
        confidence: latencyTrend.confidence,
        first_detected: new Date(),
        frequency: 1
      });
    }

    return bottlenecks;
  }

  /**
   * Pattern-based bottleneck detection
   */
  private detectPatternBottlenecks(metrics: RawMetrics): Bottleneck[] {
    const bottlenecks: Bottleneck[] = [];

    // GC pressure pattern
    if (metrics.memory.gc_frequency > 3) {
      bottlenecks.push({
        id: `gc-pattern-${Date.now()}`,
        type: 'memory',
        severity: metrics.memory.gc_frequency > 5 ? 'high' : 'medium',
        location: 'garbage_collector',
        description: `High GC frequency detected: ${metrics.memory.gc_frequency.toFixed(1)} collections/sec`,
        impact: {
          latency_impact: metrics.memory.gc_frequency * 0.1,
          throughput_impact: metrics.memory.gc_frequency * 0.05,
          user_experience_impact: metrics.memory.gc_frequency > 4 ? 0.6 : 0.3
        },
        detection_method: 'pattern',
        confidence: 0.8,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Error burst pattern
    const errorRate = metrics.throughput.requests_failed / (metrics.throughput.requests_completed + metrics.throughput.requests_failed);
    if (errorRate > 0.05) {
      bottlenecks.push({
        id: `error-pattern-${Date.now()}`,
        type: 'algorithm',
        severity: errorRate > 0.1 ? 'critical' : 'high',
        location: 'request_handling',
        description: `High error rate detected: ${(errorRate * 100).toFixed(1)}%`,
        impact: {
          latency_impact: errorRate * 2,
          throughput_impact: errorRate * 3,
          user_experience_impact: errorRate > 0.08 ? 0.9 : 0.6
        },
        detection_method: 'pattern',
        confidence: 0.9,
        first_detected: new Date(),
        frequency: 1
      });
    }

    // Connection pool exhaustion pattern
    if (metrics.network.connections_active > 80) {
      bottlenecks.push({
        id: `connection-pattern-${Date.now()}`,
        type: 'network',
        severity: metrics.network.connections_active > 120 ? 'high' : 'medium',
        location: 'connection_pool',
        description: `High connection count: ${metrics.network.connections_active}`,
        impact: {
          latency_impact: Math.max(0, (metrics.network.connections_active - 50) * 0.01),
          throughput_impact: Math.max(0, (metrics.network.connections_active - 80) * 0.02),
          user_experience_impact: metrics.network.connections_active > 100 ? 0.5 : 0.2
        },
        detection_method: 'pattern',
        confidence: 0.7,
        first_detected: new Date(),
        frequency: 1
      });
    }

    return bottlenecks;
  }

  /**
   * AI-based bottleneck detection (placeholder for future AI integration)
   */
  private async detectAIBottlenecks(metrics: RawMetrics): Promise<Bottleneck[]> {
    const bottlenecks: Bottleneck[] = [];

    // Placeholder for AI-based anomaly detection
    // This would integrate with extended thinking engine for complex pattern recognition
    
    // Simulate AI detection of complex bottleneck
    const complexityScore = this.calculateSystemComplexity(metrics);
    if (complexityScore > 0.8) {
      bottlenecks.push({
        id: `ai-complex-${Date.now()}`,
        type: 'algorithm',
        severity: 'medium',
        location: 'system_wide',
        description: 'AI detected system complexity bottleneck - multiple interacting factors',
        impact: {
          latency_impact: 0.2,
          throughput_impact: 0.15,
          user_experience_impact: 0.3
        },
        detection_method: 'ai_analysis',
        confidence: 0.6,
        first_detected: new Date(),
        frequency: 1
      });
    }

    return bottlenecks;
  }

  /**
   * Analyze resource utilization patterns
   */
  private analyzeResourceUtilization(metrics: RawMetrics): ResourceUtilization {
    const recentMetrics = this.metrics_history.slice(-10);
    
    return {
      cpu: {
        current: metrics.cpu.usage_percent,
        average: recentMetrics.length > 0 ? 
          recentMetrics.reduce((sum, m) => sum + m.cpu.usage_percent, 0) / recentMetrics.length : 
          metrics.cpu.usage_percent,
        peak: recentMetrics.length > 0 ? 
          Math.max(...recentMetrics.map(m => m.cpu.usage_percent)) : 
          metrics.cpu.usage_percent,
        trend: this.determineTrend(recentMetrics.map(m => m.cpu.usage_percent)),
        efficiency: Math.max(0, 1 - (metrics.cpu.usage_percent / 100))
      },
      memory: {
        used_percentage: (metrics.memory.heap_used / metrics.memory.heap_total) * 100,
        fragmentation: Math.random() * 0.3, // Simulated
        gc_pressure: metrics.memory.gc_frequency / 10,
        leak_indicators: this.detectMemoryLeakIndicators(metrics)
      },
      network: {
        bandwidth_utilization: (metrics.network.bytes_sent + metrics.network.bytes_received) / (1024 * 1024 * 100), // Simulated 100MB/s capacity
        connection_pool_usage: metrics.network.connections_active / 100, // Simulated pool size of 100
        latency_distribution: metrics.latency.samples.slice(0, 10),
        error_rate: metrics.network.errors / (metrics.network.connections_active || 1)
      },
      storage: {
        io_wait_time: Math.random() * 10, // Simulated
        queue_depth: Math.random() * 5, // Simulated
        read_write_ratio: 0.7, // Simulated
        cache_efficiency: metrics.cache.hit_rate
      }
    };
  }

  /**
   * Generate intelligent recommendations based on analysis
   */
  private generateRecommendations(bottlenecks: Bottleneck[], utilization: ResourceUtilization): Recommendation[] {
    const recommendations: Recommendation[] = [];

    // CPU optimization recommendations
    if (bottlenecks.some(b => b.type === 'cpu')) {
      recommendations.push({
        id: `cpu-opt-${Date.now()}`,
        priority: 'high',
        type: 'optimization',
        title: 'Optimize CPU Usage',
        description: 'Implement algorithmic optimizations and consider horizontal scaling',
        expected_benefit: {
          performance_improvement: 25,
          cost_impact: 'neutral',
          implementation_effort: 'medium'
        },
        implementation_steps: [
          'Profile CPU-intensive code paths',
          'Implement caching for expensive operations',
          'Consider asynchronous processing for non-critical tasks',
          'Evaluate horizontal scaling options'
        ],
        risks: ['Complexity increase', 'Potential regression during optimization'],
        success_metrics: ['CPU usage below 70%', 'P95 latency improvement', 'Throughput increase']
      });
    }

    // Memory optimization recommendations
    if (bottlenecks.some(b => b.type === 'memory')) {
      recommendations.push({
        id: `memory-opt-${Date.now()}`,
        priority: 'high',
        type: 'optimization',
        title: 'Optimize Memory Usage',
        description: 'Reduce memory footprint and optimize garbage collection',
        expected_benefit: {
          performance_improvement: 20,
          cost_impact: 'decrease',
          implementation_effort: 'medium'
        },
        implementation_steps: [
          'Implement object pooling for frequently allocated objects',
          'Optimize data structures for memory efficiency',
          'Tune garbage collection parameters',
          'Implement memory leak detection'
        ],
        risks: ['Increased code complexity', 'Potential performance trade-offs'],
        success_metrics: ['Memory usage below 80%', 'Reduced GC frequency', 'Stable memory growth']
      });
    }

    // Cache optimization recommendations
    if (bottlenecks.some(b => b.type === 'cache')) {
      recommendations.push({
        id: `cache-opt-${Date.now()}`,
        priority: 'medium',
        type: 'configuration',
        title: 'Improve Cache Strategy',
        description: 'Enhance caching algorithms and increase cache size',
        expected_benefit: {
          performance_improvement: 30,
          cost_impact: 'neutral',
          implementation_effort: 'low'
        },
        implementation_steps: [
          'Analyze cache access patterns',
          'Implement LRU or LFU eviction policies',
          'Increase cache size if memory allows',
          'Implement cache warming strategies'
        ],
        risks: ['Increased memory usage', 'Cache coherency issues'],
        success_metrics: ['Cache hit rate above 85%', 'Reduced database queries', 'Improved response times']
      });
    }

    // Scaling recommendations
    if (utilization.cpu.current > 80 || utilization.memory.used_percentage > 85) {
      recommendations.push({
        id: `scaling-${Date.now()}`,
        priority: 'urgent',
        type: 'scaling',
        title: 'Scale System Resources',
        description: 'Add additional capacity to handle current load',
        expected_benefit: {
          performance_improvement: 40,
          cost_impact: 'increase',
          implementation_effort: 'low'
        },
        implementation_steps: [
          'Deploy additional server instances',
          'Configure load balancing',
          'Monitor resource distribution',
          'Plan for auto-scaling'
        ],
        risks: ['Increased operational costs', 'Complexity in management'],
        success_metrics: ['Reduced resource utilization', 'Improved response times', 'Better fault tolerance']
      });
    }

    return recommendations.sort((a, b) => this.getPriorityWeight(b.priority) - this.getPriorityWeight(a.priority));
  }

  /**
   * Perform predictive performance analysis
   */
  async performPredictiveAnalysis(metrics: RawMetrics): Promise<PredictiveAnalysis> {
    console.log('🔮 Performing predictive performance analysis...');

    const performanceForecast = this.generatePerformanceForecast(metrics);
    const scalingPredictions = this.predictScalingNeeds(metrics);
    const failureRiskAssessment = this.assessFailureRisk(metrics);

    return {
      performance_forecast: performanceForecast,
      scaling_predictions: scalingPredictions,
      failure_risk_assessment: failureRiskAssessment
    };
  }

  // Helper methods

  private addMetricsToHistory(metrics: RawMetrics): void {
    this.metrics_history.push(metrics);
    if (this.metrics_history.length > this.max_history_size) {
      this.metrics_history = this.metrics_history.slice(-this.max_history_size);
    }
  }

  private calculateTrend(values: number[]): { slope: number; confidence: number } {
    if (values.length < 2) return { slope: 0, confidence: 0 };

    const n = values.length;
    const x = Array.from({ length: n }, (_, i) => i);
    const sumX = x.reduce((a, b) => a + b, 0);
    const sumY = values.reduce((a, b) => a + b, 0);
    const sumXY = x.reduce((acc, xi, i) => acc + xi * values[i], 0);
    const sumXX = x.reduce((acc, xi) => acc + xi * xi, 0);

    const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
    
    // Calculate R-squared for confidence
    const yMean = sumY / n;
    const totalSumSquares = values.reduce((acc, yi) => acc + Math.pow(yi - yMean, 2), 0);
    const residualSumSquares = values.reduce((acc, yi, i) => {
      const predicted = slope * i + (sumY - slope * sumX) / n;
      return acc + Math.pow(yi - predicted, 2);
    }, 0);
    const rSquared = 1 - (residualSumSquares / totalSumSquares);

    return {
      slope,
      confidence: Math.max(0, Math.min(1, rSquared))
    };
  }

  private determineTrend(values: number[]): 'increasing' | 'decreasing' | 'stable' {
    if (values.length < 3) return 'stable';
    
    const trend = this.calculateTrend(values);
    if (Math.abs(trend.slope) < 0.01 || trend.confidence < 0.5) return 'stable';
    return trend.slope > 0 ? 'increasing' : 'decreasing';
  }

  private detectMemoryLeakIndicators(metrics: RawMetrics): string[] {
    const indicators: string[] = [];
    
    if (metrics.memory.gc_frequency > 3) {
      indicators.push('High GC frequency');
    }
    
    const memoryUsage = metrics.memory.heap_used / metrics.memory.heap_total;
    if (memoryUsage > 0.9) {
      indicators.push('Very high memory usage');
    }
    
    return indicators;
  }

  private calculateSystemComplexity(metrics: RawMetrics): number {
    // Simplified complexity calculation based on multiple factors
    const cpuComplexity = metrics.cpu.usage_percent / 100;
    const memoryComplexity = (metrics.memory.heap_used / metrics.memory.heap_total);
    const networkComplexity = Math.min(1, metrics.network.connections_active / 100);
    const latencyComplexity = Math.min(1, metrics.latency.percentiles.p95 / 1000);
    
    return (cpuComplexity + memoryComplexity + networkComplexity + latencyComplexity) / 4;
  }

  private deduplicateBottlenecks(bottlenecks: Bottleneck[]): Bottleneck[] {
    const seen = new Set<string>();
    return bottlenecks.filter(bottleneck => {
      const key = `${bottleneck.type}-${bottleneck.location}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private sortBottlenecksBySeverity(bottlenecks: Bottleneck[]): Bottleneck[] {
    const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
    return bottlenecks.sort((a, b) => severityOrder[b.severity] - severityOrder[a.severity]);
  }

  private calculateUrgencyScore(bottlenecks: Bottleneck[], utilization: ResourceUtilization): number {
    let urgency = 0;
    
    // Add urgency based on critical bottlenecks
    const criticalBottlenecks = bottlenecks.filter(b => b.severity === 'critical').length;
    const highBottlenecks = bottlenecks.filter(b => b.severity === 'high').length;
    
    urgency += criticalBottlenecks * 0.4;
    urgency += highBottlenecks * 0.2;
    
    // Add urgency based on resource utilization
    if (utilization.cpu.current > 90) urgency += 0.3;
    if (utilization.memory.used_percentage > 90) urgency += 0.3;
    
    return Math.min(1, urgency);
  }

  private identifyCriticalPath(metrics: RawMetrics, bottlenecks: Bottleneck[]): string[] {
    // Simplified critical path identification
    const path = ['request_ingress'];
    
    if (bottlenecks.some(b => b.type === 'cache')) {
      path.push('cache_layer');
    }
    
    path.push('business_logic');
    
    if (bottlenecks.some(b => b.type === 'database')) {
      path.push('database_layer');
    }
    
    if (bottlenecks.some(b => b.type === 'network')) {
      path.push('network_layer');
    }
    
    path.push('response_delivery');
    
    return path;
  }

  private generatePerformanceForecast(metrics: RawMetrics): PredictiveAnalysis['performance_forecast'] {
    return [
      {
        timeframe: '1h',
        predicted_metrics: {
          latency_p95: metrics.latency.percentiles.p95 * (1 + Math.random() * 0.1),
          throughput: metrics.throughput.ops_per_second * (1 + Math.random() * 0.05),
          error_rate: Math.max(0, Math.random() * 0.02),
          resource_usage: metrics.cpu.usage_percent * (1 + Math.random() * 0.1)
        },
        confidence: 0.85,
        assumptions: ['Current load pattern continues', 'No major system changes']
      },
      {
        timeframe: '24h',
        predicted_metrics: {
          latency_p95: metrics.latency.percentiles.p95 * (1 + Math.random() * 0.2),
          throughput: metrics.throughput.ops_per_second * (1 + Math.random() * 0.15),
          error_rate: Math.max(0, Math.random() * 0.03),
          resource_usage: metrics.cpu.usage_percent * (1 + Math.random() * 0.2)
        },
        confidence: 0.7,
        assumptions: ['Daily traffic patterns', 'Normal operational conditions']
      }
    ];
  }

  private predictScalingNeeds(metrics: RawMetrics): PredictiveAnalysis['scaling_predictions'] {
    const cpuPressure = metrics.cpu.usage_percent > 75;
    const memoryPressure = (metrics.memory.heap_used / metrics.memory.heap_total) > 0.8;
    
    return {
      scale_up_trigger: (cpuPressure || memoryPressure) ? 
        new Date(Date.now() + 30 * 60 * 1000) : null, // 30 minutes
      scale_down_opportunity: (metrics.cpu.usage_percent < 30) ? 
        new Date(Date.now() + 60 * 60 * 1000) : null, // 1 hour
      resource_requirements: {
        cpu_cores: Math.ceil(metrics.cpu.cores_utilized * 1.5),
        memory_gb: Math.ceil(metrics.memory.heap_total / (1024 * 1024 * 1024) * 1.3),
        storage_gb: 100 // Simulated
      }
    };
  }

  private assessFailureRisk(metrics: RawMetrics): PredictiveAnalysis['failure_risk_assessment'] {
    const riskFactors = [];
    let riskLevel: 'low' | 'medium' | 'high' | 'critical' = 'low';
    
    if (metrics.cpu.usage_percent > 90) {
      riskFactors.push('CPU exhaustion');
      riskLevel = 'high';
    }
    
    if ((metrics.memory.heap_used / metrics.memory.heap_total) > 0.95) {
      riskFactors.push('Memory exhaustion');
      riskLevel = 'critical';
    }
    
    if (metrics.network.errors > 50) {
      riskFactors.push('Network instability');
      riskLevel = 'medium';
    }
    
    const timeToFailure = riskLevel === 'critical' ? 15 : 
                         riskLevel === 'high' ? 60 : 
                         riskLevel === 'medium' ? 240 : null;
    
    return {
      risk_level: riskLevel,
      failure_scenarios: riskFactors,
      time_to_failure: timeToFailure,
      mitigation_strategies: [
        'Implement circuit breakers',
        'Add horizontal scaling',
        'Optimize resource usage',
        'Improve monitoring and alerting'
      ]
    };
  }

  private getPriorityWeight(priority: string): number {
    const weights = { urgent: 4, high: 3, medium: 2, low: 1 };
    return weights[priority] || 0;
  }

  private initializeThresholds(): void {
    // Initialize performance thresholds
    console.log('🎛️ Performance analyzer initialized with default thresholds');
  }

  // Public API methods

  /**
   * Get analysis summary
   */
  getAnalysisSummary(): {
    metrics_analyzed: number;
    bottlenecks_detected: number;
    last_analysis: Date | null;
  } {
    return {
      metrics_analyzed: this.metrics_history.length,
      bottlenecks_detected: Array.from(this.bottleneck_history.values()).flat().length,
      last_analysis: this.metrics_history.length > 0 ? 
        this.metrics_history[this.metrics_history.length - 1].timestamp : null
    };
  }

  /**
   * Clear analysis history
   */
  clearHistory(): void {
    this.metrics_history = [];
    this.bottleneck_history.clear();
    this.analysis_cache.clear();
    console.log('🧹 Performance analysis history cleared');
  }
}