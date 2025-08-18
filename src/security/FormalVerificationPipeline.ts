/**
 * Formal Verification Pipeline - Complete Phase 3 Integration
 * 
 * Orchestrates the complete formal verification workflow combining
 * constraint generation, Z3 verification, and AI query rewriting.
 */

import { SQLConstraintGenerator, ConstraintSet } from './SQLConstraintGenerator.js';
import { FormalQueryVerifier, VerificationResult } from './FormalQueryVerifier.js';
import { AIQueryRewriter, RewriteResult } from './AIQueryRewriter.js';
import { QueryAnomalyDetector, AnomalyScore } from './QueryAnomalyDetector.js';
import { QueryLogger, QueryContext } from './QueryLogger.js';

export interface PipelineResult {
  queryId: string;
  originalQuery: string;
  finalQuery: string;
  status: 'safe' | 'unsafe' | 'rewritten' | 'blocked' | 'error';
  phase1Result?: boolean; // Parameterized query validation
  phase2Result?: AnomalyScore; // AI anomaly detection
  phase3Result?: {
    constraints?: ConstraintSet;
    verification?: VerificationResult;
    rewrite?: RewriteResult;
  };
  totalProcessingTime: number;
  securityLevel: 'low' | 'medium' | 'high' | 'critical';
  recommendations: string[];
  proofGenerated: boolean;
}

export interface PipelineOptions {
  enablePhase1: boolean;
  enablePhase2: boolean;
  enablePhase3: boolean;
  maxProcessingTime: number;
  requireFormalProof: boolean;
  autoRewrite: boolean;
  blockOnUnsafe: boolean;
}

export interface PipelineStatistics {
  totalQueries: number;
  safeQueries: number;
  unsafeQueries: number;
  rewrittenQueries: number;
  blockedQueries: number;
  averageProcessingTime: number;
  phase1SuccessRate: number;
  phase2DetectionRate: number;
  phase3VerificationRate: number;
  formalProofsGenerated: number;
}

export class FormalVerificationPipeline {
  private constraintGenerator: SQLConstraintGenerator;
  private queryVerifier: FormalQueryVerifier;
  private queryRewriter: AIQueryRewriter;
  private anomalyDetector: QueryAnomalyDetector;
  private queryLogger: QueryLogger;
  
  private pipelineResults: Map<string, PipelineResult> = new Map();
  private maxResultsCache = 1000;
  
  private defaultOptions: PipelineOptions = {
    enablePhase1: true,
    enablePhase2: true,
    enablePhase3: true,
    maxProcessingTime: 10000, // 10 seconds
    requireFormalProof: false,
    autoRewrite: true,
    blockOnUnsafe: true
  };

  constructor(queryLogger: QueryLogger, anomalyDetector: QueryAnomalyDetector) {
    this.queryLogger = queryLogger;
    this.anomalyDetector = anomalyDetector;
    this.constraintGenerator = new SQLConstraintGenerator();
    this.queryVerifier = new FormalQueryVerifier();
    this.queryRewriter = new AIQueryRewriter();
  }

  /**
   * Processes a query through the complete formal verification pipeline
   */
  async processQuery(
    queryId: string,
    query: string,
    params: any[],
    context: QueryContext,
    options?: Partial<PipelineOptions>
  ): Promise<PipelineResult> {
    const opts = { ...this.defaultOptions, ...options };
    const startTime = Date.now();

    console.log(`🔒 Starting formal verification pipeline for query: ${queryId}`);

    const result: PipelineResult = {
      queryId,
      originalQuery: query,
      finalQuery: query,
      status: 'safe',
      totalProcessingTime: 0,
      securityLevel: 'low',
      recommendations: [],
      proofGenerated: false,
      phase3Result: {}
    };

    try {
      // Phase 1: Parameterized Query Validation
      if (opts.enablePhase1) {
        console.log(`📋 Phase 1: Parameterized query validation`);
        result.phase1Result = await this.executePhase1(query, params);
        
        if (!result.phase1Result && opts.blockOnUnsafe) {
          result.status = 'blocked';
          result.securityLevel = 'critical';
          result.recommendations.push('Query blocked: Failed parameterized query validation');
          return this.finalizeResult(result, startTime);
        }
      }

      // Phase 2: AI-Powered Anomaly Detection
      if (opts.enablePhase2) {
        console.log(`🤖 Phase 2: AI-powered anomaly detection`);
        result.phase2Result = await this.executePhase2(query, params, context);
        
        if (result.phase2Result.suspicious && result.phase2Result.score > 70) {
          result.securityLevel = result.phase2Result.score > 90 ? 'critical' : 'high';
          
          if (opts.blockOnUnsafe && result.phase2Result.score > 90) {
            result.status = 'blocked';
            result.recommendations.push('Query blocked: Critical anomaly detected');
            return this.finalizeResult(result, startTime);
          }
        }
      }

      // Phase 3: Formal Verification with Z3
      if (opts.enablePhase3) {
        console.log(`🧠 Phase 3: Formal verification with Z3 SMT solver`);
        const phase3Result = await this.executePhase3(
          queryId, 
          query, 
          params, 
          context, 
          result.phase2Result, 
          opts
        );
        
        result.phase3Result = phase3Result;
        result.proofGenerated = !!phase3Result.verification?.proof;

        // Handle verification results
        if (phase3Result.verification?.status === 'unsafe') {
          if (opts.autoRewrite && phase3Result.rewrite) {
            result.status = 'rewritten';
            result.finalQuery = phase3Result.rewrite.rewrittenQuery;
            result.securityLevel = 'medium';
            result.recommendations.push('Query automatically rewritten for safety');
          } else if (opts.blockOnUnsafe) {
            result.status = 'blocked';
            result.securityLevel = 'critical';
            result.recommendations.push('Query blocked: Failed formal verification');
          } else {
            result.status = 'unsafe';
            result.securityLevel = 'high';
            result.recommendations.push('Query flagged as unsafe but allowed to proceed');
          }
        }
      }

      // Final security level assessment
      result.securityLevel = this.assessOverallSecurityLevel(result);

      // Generate additional recommendations
      result.recommendations.push(...this.generateRecommendations(result));

      console.log(`✅ Pipeline completed: ${result.status} (${result.securityLevel} security level)`);

    } catch (error) {
      console.error('Pipeline execution failed:', error);
      result.status = 'error';
      result.securityLevel = 'critical';
      result.recommendations.push(`Pipeline error: ${error.message}`);
    }

    return this.finalizeResult(result, startTime);
  }

  /**
   * Batch processes multiple queries through the pipeline
   */
  async batchProcess(
    queries: Array<{
      queryId: string;
      query: string;
      params: any[];
      context: QueryContext;
    }>,
    options?: Partial<PipelineOptions>
  ): Promise<PipelineResult[]> {
    console.log(`🔒 Batch processing ${queries.length} queries through verification pipeline`);
    
    const results: PipelineResult[] = [];
    const batchSize = 3; // Limit concurrency to prevent resource exhaustion
    
    for (let i = 0; i < queries.length; i += batchSize) {
      const batch = queries.slice(i, i + batchSize);
      const batchPromises = batch.map(q => 
        this.processQuery(q.queryId, q.query, q.params, q.context, options)
      );
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch processing failed:', result.reason);
        }
      }
    }
    
    return results;
  }

  /**
   * Executes Phase 1: Parameterized Query Validation
   */
  private async executePhase1(query: string, params: any[]): Promise<boolean> {
    try {
      // Check for direct interpolation patterns
      const interpolationPattern = /\$\{.*\}/;
      if (interpolationPattern.test(query)) {
        console.log('❌ Phase 1: Direct interpolation detected');
        return false;
      }

      // Check parameter count matches
      const placeholderCount = (query.match(/\?/g) || []).length;
      if (placeholderCount !== params.length) {
        console.log('❌ Phase 1: Parameter count mismatch');
        return false;
      }

      // Validate parameter types
      for (const param of params) {
        if (typeof param === 'string' && param.length > 10000) {
          console.log('❌ Phase 1: Parameter too long');
          return false;
        }
      }

      console.log('✅ Phase 1: Parameterized query validation passed');
      return true;

    } catch (error) {
      console.error('Phase 1 execution error:', error);
      return false;
    }
  }

  /**
   * Executes Phase 2: AI-Powered Anomaly Detection
   */
  private async executePhase2(
    query: string,
    params: any[],
    context: QueryContext
  ): Promise<AnomalyScore> {
    try {
      const anomalyScore = await this.anomalyDetector.analyzeQuery(query, params, context);
      
      console.log(`✅ Phase 2: Anomaly detection completed (score: ${anomalyScore.score})`);
      return anomalyScore;

    } catch (error) {
      console.error('Phase 2 execution error:', error);
      return {
        score: 100,
        suspicious: true,
        factors: [{
          type: 'context',
          severity: 'critical',
          description: 'Phase 2 analysis failed',
          score: 100
        }],
        recommendation: 'Manual review required due to analysis failure'
      };
    }
  }

  /**
   * Executes Phase 3: Formal Verification and Rewriting
   */
  private async executePhase3(
    queryId: string,
    query: string,
    params: any[],
    context: QueryContext,
    anomalyScore?: AnomalyScore,
    options?: PipelineOptions
  ): Promise<{
    constraints?: ConstraintSet;
    verification?: VerificationResult;
    rewrite?: RewriteResult;
  }> {
    const phase3Result: any = {};

    try {
      // Step 1: Generate formal constraints
      console.log('🧠 Generating Z3 SMT constraints...');
      const constraints = await this.constraintGenerator.generateConstraints(
        queryId,
        query,
        params,
        context,
        anomalyScore
      );
      phase3Result.constraints = constraints;

      // Step 2: Formal verification with Z3
      console.log('🔍 Running Z3 formal verification...');
      const verification = await this.queryVerifier.verifyQuery(constraints, {
        timeout: 5000,
        enableProofGeneration: options?.requireFormalProof || false
      });
      phase3Result.verification = verification;

      // Step 3: Auto-rewrite if unsafe and enabled
      if (verification.status === 'unsafe' && options?.autoRewrite) {
        console.log('🔧 Attempting query rewrite...');
        const rewrite = await this.queryRewriter.rewriteQuery(
          queryId,
          query,
          params,
          context,
          verification,
          anomalyScore
        );
        phase3Result.rewrite = rewrite;

        // Verify the rewritten query if it was successfully rewritten
        if (rewrite.rewrittenQuery !== query && rewrite.confidence > 70) {
          console.log('🔍 Verifying rewritten query...');
          const rewriteConstraints = await this.constraintGenerator.generateConstraints(
            `${queryId}_rewrite`,
            rewrite.rewrittenQuery,
            rewrite.transformations.length > 0 ? 
              rewrite.transformations[0].afterPattern.split(',') : params,
            context
          );
          
          const rewriteVerification = await this.queryVerifier.verifyQuery(rewriteConstraints);
          
          if (rewriteVerification.status === 'safe') {
            console.log('✅ Rewritten query verified as safe');
          } else {
            console.log('⚠️  Rewritten query still unsafe');
          }
        }
      }

      console.log('✅ Phase 3: Formal verification completed');
      return phase3Result;

    } catch (error) {
      console.error('Phase 3 execution error:', error);
      return {
        verification: {
          queryId,
          status: 'error',
          satisfiability: 'unknown',
          verificationTime: 0,
          constraintsChecked: 0,
          violations: [{
            constraintId: 'error',
            type: 'safety',
            severity: 'critical',
            description: 'Phase 3 verification failed',
            evidence: error.message
          }],
          confidence: 0
        }
      };
    }
  }

  /**
   * Assesses overall security level based on all phases
   */
  private assessOverallSecurityLevel(result: PipelineResult): 'low' | 'medium' | 'high' | 'critical' {
    // Critical: Any phase failure or high-confidence threats
    if (result.status === 'blocked' || result.status === 'error') {
      return 'critical';
    }

    if (result.phase3Result?.verification?.status === 'unsafe' && 
        result.phase3Result.verification.confidence > 90) {
      return 'critical';
    }

    // High: Significant anomalies or verification concerns
    if (result.phase2Result?.score && result.phase2Result.score > 70) {
      return 'high';
    }

    if (result.phase3Result?.verification?.violations && 
        result.phase3Result.verification.violations.length > 0) {
      return 'high';
    }

    // Medium: Minor concerns or successful rewrites
    if (result.status === 'rewritten') {
      return 'medium';
    }

    if (result.phase2Result?.score && result.phase2Result.score > 30) {
      return 'medium';
    }

    // Low: All checks passed
    return 'low';
  }

  /**
   * Generates security recommendations based on pipeline results
   */
  private generateRecommendations(result: PipelineResult): string[] {
    const recommendations: string[] = [];

    // Phase 1 recommendations
    if (!result.phase1Result) {
      recommendations.push('Implement proper parameterized queries');
      recommendations.push('Review query construction for interpolation patterns');
    }

    // Phase 2 recommendations
    if (result.phase2Result?.suspicious) {
      recommendations.push('Monitor query patterns for anomalies');
      if (result.phase2Result.score > 50) {
        recommendations.push('Consider additional authentication for this query pattern');
      }
    }

    // Phase 3 recommendations
    if (result.phase3Result?.verification?.violations) {
      for (const violation of result.phase3Result.verification.violations) {
        if (violation.mitigation) {
          recommendations.push(violation.mitigation);
        }
      }
    }

    // General recommendations based on security level
    switch (result.securityLevel) {
      case 'critical':
        recommendations.push('Implement immediate security review process');
        recommendations.push('Consider blocking similar query patterns');
        break;
      case 'high':
        recommendations.push('Enable enhanced logging for this query type');
        recommendations.push('Implement additional validation steps');
        break;
      case 'medium':
        recommendations.push('Regular security audits recommended');
        break;
    }

    return recommendations;
  }

  /**
   * Finalizes pipeline result with timing and caching
   */
  private finalizeResult(result: PipelineResult, startTime: number): PipelineResult {
    result.totalProcessingTime = Date.now() - startTime;
    
    // Cache result
    this.cacheResult(result);
    
    // Log query for analysis
    this.queryLogger.log(
      result.finalQuery,
      [], // Parameters handled separately in context
      result.totalProcessingTime,
      {
        operation: 'read', // Default, should be provided by caller
        userId: 'pipeline_system',
        sessionId: result.queryId
      }
    );

    return result;
  }

  /**
   * Caches pipeline result with LRU eviction
   */
  private cacheResult(result: PipelineResult): void {
    if (this.pipelineResults.size >= this.maxResultsCache) {
      const firstKey = this.pipelineResults.keys().next().value;
      this.pipelineResults.delete(firstKey);
    }
    
    this.pipelineResults.set(result.queryId, result);
  }

  /**
   * Gets comprehensive pipeline statistics
   */
  getPipelineStatistics(): PipelineStatistics {
    const results = Array.from(this.pipelineResults.values());
    const totalQueries = results.length;
    
    if (totalQueries === 0) {
      return {
        totalQueries: 0,
        safeQueries: 0,
        unsafeQueries: 0,
        rewrittenQueries: 0,
        blockedQueries: 0,
        averageProcessingTime: 0,
        phase1SuccessRate: 0,
        phase2DetectionRate: 0,
        phase3VerificationRate: 0,
        formalProofsGenerated: 0
      };
    }

    const safeQueries = results.filter(r => r.status === 'safe').length;
    const unsafeQueries = results.filter(r => r.status === 'unsafe').length;
    const rewrittenQueries = results.filter(r => r.status === 'rewritten').length;
    const blockedQueries = results.filter(r => r.status === 'blocked').length;
    const totalTime = results.reduce((sum, r) => sum + r.totalProcessingTime, 0);
    
    const phase1Success = results.filter(r => r.phase1Result === true).length;
    const phase2Detected = results.filter(r => r.phase2Result?.suspicious).length;
    const phase3Verified = results.filter(r => 
      r.phase3Result?.verification?.status === 'safe' || 
      r.phase3Result?.verification?.status === 'unsafe'
    ).length;
    const proofsGenerated = results.filter(r => r.proofGenerated).length;

    return {
      totalQueries,
      safeQueries,
      unsafeQueries,
      rewrittenQueries,
      blockedQueries,
      averageProcessingTime: totalTime / totalQueries,
      phase1SuccessRate: (phase1Success / totalQueries) * 100,
      phase2DetectionRate: (phase2Detected / totalQueries) * 100,
      phase3VerificationRate: (phase3Verified / totalQueries) * 100,
      formalProofsGenerated: proofsGenerated
    };
  }

  /**
   * Gets result for a specific query
   */
  getResult(queryId: string): PipelineResult | null {
    return this.pipelineResults.get(queryId) || null;
  }

  /**
   * Gets component statistics
   */
  getComponentStatistics(): {
    constraintGenerator: any;
    queryVerifier: any;
    queryRewriter: any;
    anomalyDetector: any;
  } {
    return {
      constraintGenerator: this.constraintGenerator.getGenerationStatistics(),
      queryVerifier: this.queryVerifier.getVerificationStatistics(),
      queryRewriter: this.queryRewriter.getRewriterStatistics(),
      anomalyDetector: this.anomalyDetector.getDetectionStatistics()
    };
  }

  /**
   * Clears all pipeline caches (for testing)
   */
  clear(): void {
    this.pipelineResults.clear();
    this.constraintGenerator.clear();
    this.queryVerifier.clear();
    this.queryRewriter.clear();
  }
}