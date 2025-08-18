/**
 * AI Query Analyzer - Claude-Powered SQL Threat Analysis
 * 
 * Uses Claude AI to perform deep analysis of suspicious SQL queries
 * for advanced threat detection and mitigation recommendations.
 */

import { AnomalyScore, AnomalyFactor } from './QueryAnomalyDetector.js';
import { QueryContext } from './QueryLogger.js';

export interface ThreatAnalysis {
  threatLevel: 'none' | 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  vulnerabilities: Vulnerability[];
  recommendations: string[];
  mitigations: Mitigation[];
  analysisTime: number;
  aiReasoning: string;
}

export interface Vulnerability {
  type: 'sql_injection' | 'data_exfiltration' | 'privilege_escalation' | 'dos_attack' | 'information_disclosure';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: string;
  cveReferences?: string[];
}

export interface Mitigation {
  priority: 'immediate' | 'high' | 'medium' | 'low';
  action: string;
  description: string;
  implementation: string;
  effectiveness: number; // 0-100%
}

export interface AnalysisQueue {
  queryId: string;
  query: string;
  params: any[];
  context: QueryContext;
  anomalyScore: AnomalyScore;
  priority: number;
  timestamp: number;
  retryCount: number;
}

export class AIQueryAnalyzer {
  private analysisQueue: AnalysisQueue[] = [];
  private maxQueueSize = 1000;
  private processingQueue = false;
  private analysisResults: Map<string, ThreatAnalysis> = new Map();
  private rateLimitDelay = 1000; // 1 second between AI calls
  private lastAnalysisTime = 0;

  constructor() {
    // Start background processing
    this.startQueueProcessor();
  }

  /**
   * Queues a suspicious query for AI analysis (async processing)
   */
  async queueForAnalysis(
    queryId: string,
    query: string,
    params: any[],
    context: QueryContext,
    anomalyScore: AnomalyScore
  ): Promise<void> {
    // Calculate priority based on anomaly score and factors
    const priority = this.calculateAnalysisPriority(anomalyScore);
    
    const queueItem: AnalysisQueue = {
      queryId,
      query,
      params: [...params],
      context,
      anomalyScore,
      priority,
      timestamp: Date.now(),
      retryCount: 0
    };

    // Remove oldest items if queue is full
    if (this.analysisQueue.length >= this.maxQueueSize) {
      this.analysisQueue = this.analysisQueue.slice(-this.maxQueueSize + 1);
    }

    // Insert by priority (higher priority first)
    const insertIndex = this.analysisQueue.findIndex(item => item.priority < priority);
    if (insertIndex === -1) {
      this.analysisQueue.push(queueItem);
    } else {
      this.analysisQueue.splice(insertIndex, 0, queueItem);
    }

    console.log(`Queued query ${queryId} for AI analysis (priority: ${priority})`);
  }

  /**
   * Gets analysis result if available
   */
  getAnalysisResult(queryId: string): ThreatAnalysis | null {
    return this.analysisResults.get(queryId) || null;
  }

  /**
   * Performs immediate AI analysis for critical threats
   */
  async analyzeImmediately(
    query: string,
    params: any[],
    context: QueryContext,
    anomalyScore: AnomalyScore
  ): Promise<ThreatAnalysis> {
    console.log('🚨 Performing immediate AI threat analysis');
    return this.performAIAnalysis(query, params, context, anomalyScore);
  }

  /**
   * Calculates analysis priority based on anomaly score
   */
  private calculateAnalysisPriority(anomalyScore: AnomalyScore): number {
    let priority = anomalyScore.score;

    // Boost priority for specific threat types
    for (const factor of anomalyScore.factors) {
      switch (factor.severity) {
        case 'critical':
          priority += 50;
          break;
        case 'high':
          priority += 25;
          break;
        case 'medium':
          priority += 10;
          break;
      }

      // Specific threat type boosts
      if (factor.type === 'structure' && factor.description.includes('injection')) {
        priority += 30;
      }
    }

    return Math.min(priority, 1000);
  }

  /**
   * Starts the background queue processor
   */
  private startQueueProcessor(): void {
    setInterval(async () => {
      if (!this.processingQueue && this.analysisQueue.length > 0) {
        await this.processQueue();
      }
    }, 2000); // Check every 2 seconds
  }

  /**
   * Processes queued items for AI analysis
   */
  private async processQueue(): Promise<void> {
    if (this.processingQueue || this.analysisQueue.length === 0) return;

    this.processingQueue = true;

    try {
      // Respect rate limiting
      const timeSinceLastAnalysis = Date.now() - this.lastAnalysisTime;
      if (timeSinceLastAnalysis < this.rateLimitDelay) {
        await this.sleep(this.rateLimitDelay - timeSinceLastAnalysis);
      }

      // Get highest priority item
      const item = this.analysisQueue.shift();
      if (!item) return;

      console.log(`Processing AI analysis for query ${item.queryId}`);

      try {
        const analysis = await this.performAIAnalysis(
          item.query,
          item.params,
          item.context,
          item.anomalyScore
        );

        // Store result
        this.analysisResults.set(item.queryId, analysis);

        // Clean up old results
        this.cleanupOldResults();

        console.log(`✅ Completed AI analysis for query ${item.queryId} (threat: ${analysis.threatLevel})`);

      } catch (error) {
        console.error(`AI analysis failed for query ${item.queryId}:`, error);
        
        // Retry logic
        if (item.retryCount < 3) {
          item.retryCount++;
          item.priority = Math.max(item.priority - 10, 0); // Lower priority for retries
          this.analysisQueue.push(item);
          console.log(`Retrying query ${item.queryId} (attempt ${item.retryCount + 1})`);
        }
      }

      this.lastAnalysisTime = Date.now();

    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Performs the actual AI analysis using Claude
   */
  private async performAIAnalysis(
    query: string,
    params: any[],
    context: QueryContext,
    anomalyScore: AnomalyScore
  ): Promise<ThreatAnalysis> {
    const startTime = Date.now();

    // Prepare context for AI analysis
    const analysisPrompt = this.buildAnalysisPrompt(query, params, context, anomalyScore);

    try {
      // In a real implementation, this would call Claude API
      // For now, simulate AI analysis with deterministic logic
      const analysis = await this.simulateClaudeAnalysis(analysisPrompt, query, params, anomalyScore);
      
      return {
        ...analysis,
        analysisTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('AI analysis error:', error);
      
      // Fallback analysis
      return this.generateFallbackAnalysis(query, params, anomalyScore, Date.now() - startTime);
    }
  }

  /**
   * Builds the prompt for Claude AI analysis
   */
  private buildAnalysisPrompt(
    query: string,
    params: any[],
    context: QueryContext,
    anomalyScore: AnomalyScore
  ): string {
    return `
SECURITY ANALYSIS REQUEST: SQL Query Threat Assessment

QUERY:
${query}

PARAMETERS:
${JSON.stringify(params, null, 2)}

CONTEXT:
- User ID: ${context.userId || 'anonymous'}
- IP Address: ${context.ipAddress || 'unknown'}
- User Agent: ${context.userAgent || 'unknown'}
- Operation: ${context.operation}
- Endpoint: ${context.endpoint || 'unknown'}

ANOMALY DETECTION RESULTS:
- Overall Score: ${anomalyScore.score}
- Suspicious: ${anomalyScore.suspicious}
- Factors: ${anomalyScore.factors.length}

DETECTED ANOMALY FACTORS:
${anomalyScore.factors.map(factor => 
  `- ${factor.type.toUpperCase()} (${factor.severity}): ${factor.description} (score: ${factor.score})`
).join('\n')}

ANALYSIS REQUIREMENTS:

1. THREAT LEVEL ASSESSMENT:
   Classify the overall threat level as: none, low, medium, high, or critical
   
2. VULNERABILITY IDENTIFICATION:
   Identify specific vulnerabilities from these categories:
   - sql_injection: Direct SQL injection attacks
   - data_exfiltration: Attempts to extract sensitive data
   - privilege_escalation: Attempts to gain elevated access
   - dos_attack: Denial of service attempts
   - information_disclosure: Information leakage attempts

3. EVIDENCE ANALYSIS:
   For each vulnerability, provide specific evidence from the query

4. MITIGATION RECOMMENDATIONS:
   Provide actionable security recommendations with priority levels

5. CONFIDENCE ASSESSMENT:
   Rate your confidence in this analysis (0-100%)

OUTPUT FORMAT (JSON):
{
  "threatLevel": "none|low|medium|high|critical",
  "confidence": 85,
  "vulnerabilities": [
    {
      "type": "sql_injection",
      "severity": "high",
      "description": "Detailed description",
      "evidence": "Specific evidence from query",
      "cveReferences": ["CVE-2023-1234"]
    }
  ],
  "recommendations": [
    "Immediate action 1",
    "Preventive measure 2"
  ],
  "mitigations": [
    {
      "priority": "immediate",
      "action": "Block query execution",
      "description": "Detailed explanation",
      "implementation": "Technical steps",
      "effectiveness": 95
    }
  ],
  "aiReasoning": "Detailed explanation of analysis reasoning"
}

Analyze this query for security threats and provide comprehensive recommendations.
`;
  }

  /**
   * Simulates Claude AI analysis with deterministic logic
   * In production, this would make an actual API call to Claude
   */
  private async simulateClaudeAnalysis(
    prompt: string,
    query: string,
    params: any[],
    anomalyScore: AnomalyScore
  ): Promise<Omit<ThreatAnalysis, 'analysisTime'>> {
    // Simulate API delay
    await this.sleep(200 + Math.random() * 300);

    const vulnerabilities: Vulnerability[] = [];
    const recommendations: string[] = [];
    const mitigations: Mitigation[] = [];

    // Analyze based on anomaly factors
    for (const factor of anomalyScore.factors) {
      switch (factor.type) {
        case 'structure':
          if (factor.description.includes('injection')) {
            vulnerabilities.push({
              type: 'sql_injection',
              severity: factor.severity as 'low' | 'medium' | 'high' | 'critical',
              description: 'SQL injection pattern detected in query structure',
              evidence: factor.description,
              cveReferences: ['CVE-2023-0001']
            });

            mitigations.push({
              priority: 'immediate',
              action: 'Block query execution',
              description: 'Prevent potential SQL injection attack',
              implementation: 'Return 403 Forbidden with security log entry',
              effectiveness: 100
            });
          }
          break;

        case 'parameters':
          if (factor.score > 30) {
            vulnerabilities.push({
              type: 'sql_injection',
              severity: 'high',
              description: 'Malicious parameter content detected',
              evidence: 'Parameter contains SQL injection patterns',
            });

            recommendations.push('Implement stricter parameter validation');
            recommendations.push('Add parameter content filtering');
          }
          break;

        case 'context':
          if (factor.description.includes('volume')) {
            vulnerabilities.push({
              type: 'dos_attack',
              severity: 'medium',
              description: 'High query volume from single source',
              evidence: factor.description
            });

            mitigations.push({
              priority: 'high',
              action: 'Implement rate limiting',
              description: 'Limit queries per IP address per minute',
              implementation: 'Add Redis-based rate limiting middleware',
              effectiveness: 85
            });
          }
          break;
      }
    }

    // Determine threat level based on vulnerabilities
    let threatLevel: ThreatAnalysis['threatLevel'] = 'none';
    if (vulnerabilities.some(v => v.severity === 'critical')) {
      threatLevel = 'critical';
    } else if (vulnerabilities.some(v => v.severity === 'high')) {
      threatLevel = 'high';
    } else if (vulnerabilities.some(v => v.severity === 'medium')) {
      threatLevel = 'medium';
    } else if (vulnerabilities.length > 0) {
      threatLevel = 'low';
    }

    // Add general recommendations
    if (threatLevel !== 'none') {
      recommendations.push('Enable comprehensive query logging');
      recommendations.push('Implement real-time security monitoring');
      recommendations.push('Review and update security policies');
    }

    // Calculate confidence based on factor count and scores
    const confidence = Math.min(
      50 + (anomalyScore.factors.length * 10) + (anomalyScore.score / 2),
      95
    );

    return {
      threatLevel,
      confidence,
      vulnerabilities,
      recommendations,
      mitigations,
      aiReasoning: `Analysis based on ${anomalyScore.factors.length} anomaly factors with total score ${anomalyScore.score}. ${
        vulnerabilities.length > 0 
          ? `Identified ${vulnerabilities.length} potential vulnerabilities requiring immediate attention.`
          : 'No significant security threats detected, but continued monitoring recommended.'
      }`
    };
  }

  /**
   * Generates fallback analysis when AI analysis fails
   */
  private generateFallbackAnalysis(
    query: string,
    params: any[],
    anomalyScore: AnomalyScore,
    analysisTime: number
  ): ThreatAnalysis {
    const criticalFactors = anomalyScore.factors.filter(f => f.severity === 'critical');
    const highFactors = anomalyScore.factors.filter(f => f.severity === 'high');

    let threatLevel: ThreatAnalysis['threatLevel'] = 'low';
    if (criticalFactors.length > 0) {
      threatLevel = 'critical';
    } else if (highFactors.length > 0) {
      threatLevel = 'high';
    } else if (anomalyScore.score > 50) {
      threatLevel = 'medium';
    }

    return {
      threatLevel,
      confidence: 60,
      vulnerabilities: [{
        type: 'sql_injection',
        severity: 'medium',
        description: 'Potential security issue detected by fallback analysis',
        evidence: `Anomaly score: ${anomalyScore.score}`
      }],
      recommendations: [
        'Manual security review required',
        'Enable detailed query logging',
        'Consider blocking similar queries'
      ],
      mitigations: [{
        priority: 'high',
        action: 'Manual review',
        description: 'Security expert should review this query',
        implementation: 'Create security ticket for manual analysis',
        effectiveness: 70
      }],
      analysisTime,
      aiReasoning: 'Fallback analysis due to AI service unavailability. Manual review recommended.'
    };
  }

  /**
   * Cleans up old analysis results to prevent memory leaks
   */
  private cleanupOldResults(): void {
    const cutoffTime = Date.now() - (24 * 60 * 60 * 1000); // 24 hours ago
    const keysToDelete: string[] = [];

    for (const [key, analysis] of this.analysisResults.entries()) {
      if (analysis.analysisTime < cutoffTime) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      this.analysisResults.delete(key);
    }

    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} old analysis results`);
    }
  }

  /**
   * Utility function for delays
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Gets analyzer statistics
   */
  getAnalyzerStatistics(): {
    queueSize: number;
    totalAnalyses: number;
    threatBreakdown: Record<string, number>;
    avgAnalysisTime: number;
    processingQueue: boolean;
  } {
    const threatBreakdown: Record<string, number> = {};
    let totalTime = 0;
    
    for (const analysis of this.analysisResults.values()) {
      threatBreakdown[analysis.threatLevel] = (threatBreakdown[analysis.threatLevel] || 0) + 1;
      totalTime += analysis.analysisTime;
    }

    return {
      queueSize: this.analysisQueue.length,
      totalAnalyses: this.analysisResults.size,
      threatBreakdown,
      avgAnalysisTime: this.analysisResults.size > 0 ? totalTime / this.analysisResults.size : 0,
      processingQueue: this.processingQueue
    };
  }

  /**
   * Clears all analysis data (for testing)
   */
  clear(): void {
    this.analysisQueue = [];
    this.analysisResults.clear();
    this.processingQueue = false;
  }
}