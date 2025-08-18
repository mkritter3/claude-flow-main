/**
 * Query Anomaly Detector - AI-Powered SQL Security Analysis
 * 
 * Detects suspicious query patterns and anomalies in real-time
 * using pattern analysis and statistical methods.
 */

import { QueryLogger, QueryPattern, QueryContext } from './QueryLogger.js';

export interface AnomalyScore {
  score: number;
  isNew?: boolean;
  suspicious?: boolean;
  safe?: boolean;
  factors: AnomalyFactor[];
  recommendation?: string;
}

export interface AnomalyFactor {
  type: 'structure' | 'parameters' | 'frequency' | 'timing' | 'context';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  score: number;
}

export interface DetectionThresholds {
  suspicious: number;        // Score above which to flag as suspicious
  critical: number;          // Score above which to immediately alert
  newQueryPenalty: number;   // Additional score for new query patterns
  paramAnomalyWeight: number; // Weight for parameter-based anomalies
  structureWeight: number;   // Weight for structural anomalies
  contextWeight: number;     // Weight for context-based anomalies
}

export class QueryAnomalyDetector {
  private logger: QueryLogger;
  private baselinePatterns: Map<string, QueryPattern> = new Map();
  private thresholds: DetectionThresholds;
  private learningMode = true;
  private minSamplesForBaseline = 50;

  constructor(logger: QueryLogger, thresholds?: Partial<DetectionThresholds>) {
    this.logger = logger;
    this.thresholds = {
      suspicious: 30,
      critical: 70,
      newQueryPenalty: 20,
      paramAnomalyWeight: 2.0,
      structureWeight: 1.5,
      contextWeight: 1.2,
      ...thresholds
    };
  }

  /**
   * Analyzes a query for anomalies before execution
   */
  async analyzeQuery(
    query: string,
    params: any[],
    context: QueryContext
  ): Promise<AnomalyScore> {
    const normalized = this.normalizeQuery(query);
    const hash = this.generateQueryHash(normalized);
    
    // Get or create baseline pattern
    const baseline = this.baselinePatterns.get(hash);
    
    if (!baseline) {
      // New query pattern
      return this.handleNewQuery(normalized, params, context);
    }

    // Analyze against baseline
    return this.analyzeAgainstBaseline(normalized, params, context, baseline);
  }

  /**
   * Handles analysis of new query patterns
   */
  private handleNewQuery(
    normalized: string,
    params: any[],
    context: QueryContext
  ): AnomalyScore {
    const factors: AnomalyFactor[] = [];
    let score = this.thresholds.newQueryPenalty;

    // Analyze structure for immediate red flags
    const structureFactors = this.analyzeQueryStructure(normalized);
    factors.push(...structureFactors);
    score += structureFactors.reduce((sum, f) => sum + f.score, 0);

    // Analyze parameters for suspicious content
    const paramFactors = this.analyzeParameters(params);
    factors.push(...paramFactors);
    score += paramFactors.reduce((sum, f) => sum + f.score, 0) * this.thresholds.paramAnomalyWeight;

    // Context analysis
    const contextFactors = this.analyzeContext(context);
    factors.push(...contextFactors);
    score += contextFactors.reduce((sum, f) => sum + f.score, 0) * this.thresholds.contextWeight;

    return {
      score,
      isNew: true,
      suspicious: score >= this.thresholds.suspicious,
      factors,
      recommendation: this.generateRecommendation(score, factors)
    };
  }

  /**
   * Analyzes query against established baseline pattern
   */
  private analyzeAgainstBaseline(
    normalized: string,
    params: any[],
    context: QueryContext,
    baseline: QueryPattern
  ): AnomalyScore {
    const factors: AnomalyFactor[] = [];
    let score = 0;

    // Structure deviation analysis
    const structureScore = this.calculateStructureDeviation(normalized, baseline.template);
    if (structureScore > 0) {
      factors.push({
        type: 'structure',
        severity: structureScore > 50 ? 'high' : 'medium',
        description: `Query structure deviates from baseline by ${structureScore.toFixed(1)}%`,
        score: structureScore
      });
      score += structureScore * this.thresholds.structureWeight;
    }

    // Parameter anomaly analysis
    const paramScore = this.analyzeParameterAnomalies(params, baseline.paramPatterns);
    if (paramScore > 0) {
      factors.push({
        type: 'parameters',
        severity: paramScore > 30 ? 'high' : 'medium',
        description: `Parameter patterns deviate from baseline`,
        score: paramScore
      });
      score += paramScore * this.thresholds.paramAnomalyWeight;
    }

    // Frequency anomaly analysis
    const frequencyScore = this.analyzeFrequencyAnomaly(baseline);
    if (frequencyScore > 0) {
      factors.push({
        type: 'frequency',
        severity: 'low',
        description: `Query frequency pattern is unusual`,
        score: frequencyScore
      });
      score += frequencyScore;
    }

    // Context analysis
    const contextFactors = this.analyzeContext(context);
    factors.push(...contextFactors);
    score += contextFactors.reduce((sum, f) => sum + f.score, 0) * this.thresholds.contextWeight;

    return {
      score,
      suspicious: score >= this.thresholds.suspicious,
      safe: score < this.thresholds.suspicious / 2,
      factors,
      recommendation: this.generateRecommendation(score, factors)
    };
  }

  /**
   * Analyzes query structure for suspicious patterns
   */
  private analyzeQueryStructure(query: string): AnomalyFactor[] {
    const factors: AnomalyFactor[] = [];
    const suspiciousPatterns = [
      {
        pattern: /union\s+select/i,
        severity: 'critical' as const,
        description: 'UNION SELECT injection pattern detected',
        score: 80
      },
      {
        pattern: /;\s*(drop|delete|insert|update)/i,
        severity: 'critical' as const,
        description: 'Multiple statement injection pattern detected',
        score: 90
      },
      {
        pattern: /--\s*$/m,
        severity: 'high' as const,
        description: 'SQL comment injection pattern detected',
        score: 50
      },
      {
        pattern: /'.*'.*or.*'.*'.*=/i,
        severity: 'high' as const,
        description: 'Boolean injection pattern detected',
        score: 70
      },
      {
        pattern: /sleep\s*\(|waitfor\s+delay/i,
        severity: 'high' as const,
        description: 'Time-based injection pattern detected',
        score: 75
      },
      {
        pattern: /information_schema|sys\.|master\./i,
        severity: 'medium' as const,
        description: 'System schema access pattern detected',
        score: 40
      },
      {
        pattern: /\bexec\s*\(|\beval\s*\(/i,
        severity: 'high' as const,
        description: 'Dynamic execution pattern detected',
        score: 85
      }
    ];

    for (const { pattern, severity, description, score } of suspiciousPatterns) {
      if (pattern.test(query)) {
        factors.push({
          type: 'structure',
          severity,
          description,
          score
        });
      }
    }

    // Check for unusual complexity
    const complexity = this.calculateQueryComplexity(query);
    if (complexity > 100) {
      factors.push({
        type: 'structure',
        severity: complexity > 200 ? 'high' : 'medium',
        description: `Query complexity score: ${complexity}`,
        score: Math.min(complexity / 10, 30)
      });
    }

    return factors;
  }

  /**
   * Calculates query complexity score
   */
  private calculateQueryComplexity(query: string): number {
    let score = 0;
    
    // Count different types of SQL constructs
    const constructs = [
      { pattern: /\bjoin\b/gi, weight: 5 },
      { pattern: /\bwhere\b/gi, weight: 3 },
      { pattern: /\bgroup\s+by\b/gi, weight: 4 },
      { pattern: /\bhaving\b/gi, weight: 4 },
      { pattern: /\border\s+by\b/gi, weight: 3 },
      { pattern: /\bunion\b/gi, weight: 8 },
      { pattern: /\bsubquery\b|\(\s*select/gi, weight: 10 },
      { pattern: /\bwith\b.*\bas\b/gi, weight: 6 },
      { pattern: /\bcase\s+when\b/gi, weight: 4 }
    ];

    for (const { pattern, weight } of constructs) {
      const matches = query.match(pattern);
      if (matches) {
        score += matches.length * weight;
      }
    }

    return score;
  }

  /**
   * Analyzes parameters for suspicious content
   */
  private analyzeParameters(params: any[]): AnomalyFactor[] {
    const factors: AnomalyFactor[] = [];
    
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (typeof param !== 'string') continue;

      const suspiciousScore = this.calculateParameterSuspicion(param);
      if (suspiciousScore > 20) {
        factors.push({
          type: 'parameters',
          severity: suspiciousScore > 60 ? 'critical' : 'medium',
          description: `Suspicious parameter ${i}: contains potential injection patterns`,
          score: suspiciousScore
        });
      }

      // Check parameter length
      if (param.length > 1000) {
        factors.push({
          type: 'parameters',
          severity: 'medium',
          description: `Parameter ${i} is unusually long (${param.length} chars)`,
          score: Math.min(param.length / 100, 25)
        });
      }
    }

    return factors;
  }

  /**
   * Calculates suspicion score for a parameter value
   */
  private calculateParameterSuspicion(value: string): number {
    let score = 0;
    
    const suspiciousPatterns = [
      { pattern: /['";]/g, weight: 10 },
      { pattern: /union\s+select/gi, weight: 50 },
      { pattern: /drop\s+table/gi, weight: 50 },
      { pattern: /delete\s+from/gi, weight: 40 },
      { pattern: /insert\s+into/gi, weight: 40 },
      { pattern: /update\s+.*set/gi, weight: 40 },
      { pattern: /exec\s*\(/gi, weight: 45 },
      { pattern: /script\s*>/gi, weight: 30 },
      { pattern: /javascript:/gi, weight: 35 },
      { pattern: /\$\{.*\}/g, weight: 25 },
      { pattern: /<.*>/g, weight: 15 },
      { pattern: /or\s+1\s*=\s*1/gi, weight: 40 },
      { pattern: /and\s+1\s*=\s*1/gi, weight: 40 }
    ];

    for (const { pattern, weight } of suspiciousPatterns) {
      const matches = value.match(pattern);
      if (matches) {
        score += matches.length * weight;
      }
    }

    return Math.min(score, 100);
  }

  /**
   * Analyzes context for suspicious patterns
   */
  private analyzeContext(context: QueryContext): AnomalyFactor[] {
    const factors: AnomalyFactor[] = [];

    // Check for rapid-fire queries from same IP
    if (context.ipAddress) {
      const recentFromSameIP = this.countRecentQueriesFromIP(context.ipAddress);
      if (recentFromSameIP > 100) {
        factors.push({
          type: 'context',
          severity: recentFromSameIP > 1000 ? 'critical' : 'high',
          description: `High query volume from IP: ${recentFromSameIP} queries/min`,
          score: Math.min(recentFromSameIP / 10, 50)
        });
      }
    }

    // Check for suspicious user agents
    if (context.userAgent) {
      const suspiciousUA = this.isSuspiciousUserAgent(context.userAgent);
      if (suspiciousUA) {
        factors.push({
          type: 'context',
          severity: 'medium',
          description: 'Suspicious user agent detected',
          score: 25
        });
      }
    }

    // Check for unusual operation patterns
    if (context.operation === 'delete' && !context.userId) {
      factors.push({
        type: 'context',
        severity: 'high',
        description: 'DELETE operation without authenticated user',
        score: 40
      });
    }

    return factors;
  }

  /**
   * Counts recent queries from a specific IP address
   */
  private countRecentQueriesFromIP(ipAddress: string): number {
    const oneMinuteAgo = Date.now() - 60000;
    const recentQueries = this.logger.getStatistics();
    
    // In a real implementation, this would filter by IP
    // For now, return a simulated count
    return Math.floor(Math.random() * 50);
  }

  /**
   * Checks if a user agent string is suspicious
   */
  private isSuspiciousUserAgent(userAgent: string): boolean {
    const suspiciousPatterns = [
      /sqlmap/i,
      /havij/i,
      /nmap/i,
      /nikto/i,
      /burp/i,
      /python/i,
      /curl/i,
      /wget/i
    ];

    return suspiciousPatterns.some(pattern => pattern.test(userAgent));
  }

  /**
   * Calculates structure deviation from baseline
   */
  private calculateStructureDeviation(query: string, baseline: string): number {
    if (query === baseline) return 0;

    // Simple string similarity (Levenshtein-based)
    const distance = this.calculateLevenshteinDistance(query, baseline);
    const maxLength = Math.max(query.length, baseline.length);
    
    return (distance / maxLength) * 100;
  }

  /**
   * Calculates Levenshtein distance between two strings
   */
  private calculateLevenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix = Array(b.length + 1).fill(null).map(() => Array(a.length + 1).fill(null));

    for (let i = 0; i <= a.length; i++) matrix[0][i] = i;
    for (let j = 0; j <= b.length; j++) matrix[j][0] = j;

    for (let j = 1; j <= b.length; j++) {
      for (let i = 1; i <= a.length; i++) {
        const indicator = a[i - 1] === b[j - 1] ? 0 : 1;
        matrix[j][i] = Math.min(
          matrix[j][i - 1] + 1,     // deletion
          matrix[j - 1][i] + 1,     // insertion
          matrix[j - 1][i - 1] + indicator // substitution
        );
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Analyzes parameter anomalies against baseline patterns
   */
  private analyzeParameterAnomalies(params: any[], baselinePatterns: any[]): number {
    if (params.length !== baselinePatterns.length) {
      return 30; // Parameter count mismatch
    }

    let totalScore = 0;
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      const pattern = baselinePatterns[i];
      
      if (!pattern) continue;

      // Type mismatch
      if (typeof param !== pattern.type) {
        totalScore += 20;
      }

      // Length anomaly for strings
      if (typeof param === 'string' && pattern.minLength && pattern.maxLength) {
        if (param.length < pattern.minLength * 0.5 || param.length > pattern.maxLength * 2) {
          totalScore += 15;
        }
      }

      // Suspicious content
      if (typeof param === 'string') {
        totalScore += this.calculateParameterSuspicion(param) * 0.5;
      }
    }

    return Math.min(totalScore, 100);
  }

  /**
   * Analyzes frequency anomalies
   */
  private analyzeFrequencyAnomaly(baseline: QueryPattern): number {
    const now = Date.now();
    const timeSinceLastSeen = now - baseline.lastSeen;
    
    // If query hasn't been seen in a long time but was previously frequent
    if (baseline.frequency > 100 && timeSinceLastSeen > 86400000) { // 24 hours
      return 15; // Slightly suspicious
    }

    return 0;
  }

  /**
   * Generates recommendation based on anomaly analysis
   */
  private generateRecommendation(score: number, factors: AnomalyFactor[]): string {
    if (score >= this.thresholds.critical) {
      return 'CRITICAL: Block query and trigger immediate security alert';
    } else if (score >= this.thresholds.suspicious) {
      const criticalFactors = factors.filter(f => f.severity === 'critical');
      if (criticalFactors.length > 0) {
        return `HIGH RISK: Consider blocking. Critical factors: ${criticalFactors.map(f => f.type).join(', ')}`;
      }
      return 'SUSPICIOUS: Log and monitor. Consider additional authentication.';
    } else {
      return 'NORMAL: Query appears safe for execution.';
    }
  }

  /**
   * Learns from query execution to update baselines
   */
  async learn(
    query: string,
    params: any[],
    executionTime: number,
    context: QueryContext
  ): Promise<void> {
    if (!this.learningMode) return;

    const normalized = this.normalizeQuery(query);
    const hash = this.generateQueryHash(normalized);
    
    // Update baseline patterns
    const existingPattern = this.baselinePatterns.get(hash);
    if (existingPattern) {
      existingPattern.frequency++;
      existingPattern.lastSeen = Date.now();
      existingPattern.avgExecutionTime = 
        (existingPattern.avgExecutionTime + executionTime) / 2;
    } else {
      // Create new baseline pattern
      this.baselinePatterns.set(hash, {
        hash,
        template: normalized,
        frequency: 1,
        lastSeen: Date.now(),
        avgExecutionTime: executionTime,
        paramPatterns: [],
        riskScore: 0
      });
    }
  }

  /**
   * Utility methods
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')
      .replace(/\?/g, '?')
      .trim()
      .toLowerCase();
  }

  private generateQueryHash(normalizedQuery: string): string {
    let hash = 0;
    for (let i = 0; i < normalizedQuery.length; i++) {
      const char = normalizedQuery.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Gets detection statistics
   */
  getDetectionStatistics(): {
    totalPatterns: number;
    suspiciousDetections: number;
    criticalDetections: number;
    falsePositiveRate: number;
    learningMode: boolean;
  } {
    const suspicious = Array.from(this.baselinePatterns.values())
      .filter(p => p.riskScore >= this.thresholds.suspicious).length;
    
    const critical = Array.from(this.baselinePatterns.values())
      .filter(p => p.riskScore >= this.thresholds.critical).length;

    return {
      totalPatterns: this.baselinePatterns.size,
      suspiciousDetections: suspicious,
      criticalDetections: critical,
      falsePositiveRate: 0, // Would be calculated from feedback in production
      learningMode: this.learningMode
    };
  }

  /**
   * Disables learning mode (for production use)
   */
  setLearningMode(enabled: boolean): void {
    this.learningMode = enabled;
  }
}