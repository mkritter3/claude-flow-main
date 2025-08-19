// DatabaseSecurity Middleware - Integration layer for Quantum SQL Defense
// Enhances DatabaseManager with quantum-level SQL injection protection

import { QuantumSQLDefense, SafeQuery, DatabaseSchema, ExtendedThinkingEngine } from './QuantumSQLDefense.js';

export interface SecurityConfig {
  enabled: boolean;
  quantum_defense: boolean;
  real_time_monitoring: boolean;
  audit_logging: boolean;
  threat_response: 'block' | 'sanitize' | 'alert';
  strictness_level: 'permissive' | 'balanced' | 'strict' | 'quantum_paranoid';
}

export interface SecurityMetrics {
  total_queries: number;
  threats_detected: number;
  threats_blocked: number;
  queries_sanitized: number;
  false_positives: number;
  average_analysis_time_ms: number;
  threat_detection_rate: number;
}

export interface SecurityEvent {
  timestamp: Date;
  type: 'threat_detected' | 'query_blocked' | 'query_sanitized' | 'false_positive';
  severity: 'low' | 'medium' | 'high' | 'critical';
  query: string;
  threat_score: number;
  action_taken: string;
  source_info?: any;
}

/**
 * DatabaseSecurity Middleware
 * 
 * Provides comprehensive database security by integrating:
 * - Quantum SQL Defense for injection prevention
 * - Real-time threat monitoring and response
 * - Security audit logging and metrics
 * - Adaptive threat response based on severity
 * 
 * This middleware transparently enhances DatabaseManager operations
 * with quantum-level security without breaking existing functionality.
 */
export class DatabaseSecurity {
  private quantumDefense: QuantumSQLDefense;
  private config: SecurityConfig;
  private metrics: SecurityMetrics;
  private security_events: SecurityEvent[] = [];
  private threat_response_handlers: Map<string, Function> = new Map();

  constructor(
    schema: DatabaseSchema,
    thinking?: ExtendedThinkingEngine,
    config?: Partial<SecurityConfig>
  ) {
    this.config = {
      enabled: true,
      quantum_defense: true,
      real_time_monitoring: true,
      audit_logging: true,
      threat_response: 'sanitize',
      strictness_level: 'strict',
      ...config
    };

    this.metrics = {
      total_queries: 0,
      threats_detected: 0,
      threats_blocked: 0,
      queries_sanitized: 0,
      false_positives: 0,
      average_analysis_time_ms: 0,
      threat_detection_rate: 0
    };

    this.quantumDefense = new QuantumSQLDefense(schema, thinking, {
      thinking_budget: 15000,
      strictness_level: this.config.strictness_level,
      auto_rewrite: this.config.threat_response === 'sanitize',
      formal_verification: true,
      cryptographic_signing: true,
      real_time_monitoring: this.config.real_time_monitoring
    });

    this.initializeThreatResponseHandlers();
    console.log('🛡️ DatabaseSecurity middleware initialized with quantum defense');
  }

  /**
   * Secure query execution - main middleware method
   */
  async secureQuery(
    query: string, 
    params: any[] = [], 
    context: any = {}
  ): Promise<{
    safeQuery: SafeQuery;
    securityEvent?: SecurityEvent;
    executeQuery: boolean;
  }> {
    if (!this.config.enabled) {
      return {
        safeQuery: { query, params, safe: true },
        executeQuery: true
      };
    }

    const startTime = Date.now();
    this.metrics.total_queries++;

    try {
      console.log('🔒 Securing database query...');

      // Step 1: Apply quantum SQL defense
      const safeQuery = await this.quantumDefense.validateQuery(query, params, context);

      // Step 2: Determine threat level and response
      const threatLevel = this.classifyThreatLevel(safeQuery.threat_score || 0);
      const response = await this.determineThreatResponse(safeQuery, threatLevel, context);

      // Step 3: Log security event
      const securityEvent = this.createSecurityEvent(query, safeQuery, response);
      if (this.config.audit_logging) {
        this.logSecurityEvent(securityEvent);
      }

      // Step 4: Update metrics
      this.updateSecurityMetrics(safeQuery, response, startTime);

      // Step 5: Execute threat response handlers
      await this.executeThreatResponseHandlers(response, securityEvent);

      console.log('✅ Query secured:', {
        safe: safeQuery.safe,
        threat_score: safeQuery.threat_score,
        action: response.action,
        execute: response.executeQuery
      });

      return {
        safeQuery,
        securityEvent,
        executeQuery: response.executeQuery
      };

    } catch (error) {
      console.error('❌ Database security error:', error);
      
      // Fail secure - block execution on security system failure
      const failureEvent: SecurityEvent = {
        timestamp: new Date(),
        type: 'threat_detected',
        severity: 'critical',
        query: query.substring(0, 100),
        threat_score: 1.0,
        action_taken: 'blocked_due_to_security_system_failure'
      };

      this.logSecurityEvent(failureEvent);
      this.metrics.threats_blocked++;

      return {
        safeQuery: { query: '', params: [], safe: false },
        securityEvent: failureEvent,
        executeQuery: false
      };
    }
  }

  /**
   * Classify threat level based on threat score
   */
  private classifyThreatLevel(threatScore: number): 'low' | 'medium' | 'high' | 'critical' {
    if (threatScore >= 0.8) return 'critical';
    if (threatScore >= 0.6) return 'high';
    if (threatScore >= 0.3) return 'medium';
    return 'low';
  }

  /**
   * Determine appropriate threat response
   */
  private async determineThreatResponse(
    safeQuery: SafeQuery, 
    threatLevel: string, 
    context: any
  ): Promise<{
    action: 'allow' | 'sanitize' | 'block' | 'alert';
    executeQuery: boolean;
    reason: string;
  }> {
    // If query is already safe, allow execution
    if (safeQuery.safe && (safeQuery.threat_score || 0) < 0.1) {
      return {
        action: 'allow',
        executeQuery: true,
        reason: 'query_validated_as_safe'
      };
    }

    // Apply configuration-based response
    switch (this.config.threat_response) {
      case 'block':
        if (threatLevel === 'high' || threatLevel === 'critical') {
          return {
            action: 'block',
            executeQuery: false,
            reason: `threat_level_${threatLevel}_blocked`
          };
        }
        break;

      case 'sanitize':
        if (safeQuery.sanitization_applied && safeQuery.sanitization_applied.length > 0) {
          return {
            action: 'sanitize',
            executeQuery: true,
            reason: 'query_sanitized_successfully'
          };
        }
        break;

      case 'alert':
        if (threatLevel !== 'low') {
          // Log alert but allow execution for monitoring purposes
          return {
            action: 'alert',
            executeQuery: true,
            reason: `threat_level_${threatLevel}_alerted`
          };
        }
        break;
    }

    // Default response based on threat level
    if (threatLevel === 'critical') {
      return {
        action: 'block',
        executeQuery: false,
        reason: 'critical_threat_auto_blocked'
      };
    }

    return {
      action: 'allow',
      executeQuery: true,
      reason: 'default_allow'
    };
  }

  /**
   * Create security event for logging
   */
  private createSecurityEvent(
    originalQuery: string, 
    safeQuery: SafeQuery, 
    response: any
  ): SecurityEvent {
    let eventType: SecurityEvent['type'] = 'threat_detected';
    
    if (response.action === 'block') {
      eventType = 'query_blocked';
    } else if (response.action === 'sanitize') {
      eventType = 'query_sanitized';
    }

    return {
      timestamp: new Date(),
      type: eventType,
      severity: this.classifyThreatLevel(safeQuery.threat_score || 0),
      query: originalQuery.substring(0, 200), // Truncate for logging
      threat_score: safeQuery.threat_score || 0,
      action_taken: response.action
    };
  }

  /**
   * Log security event
   */
  private logSecurityEvent(event: SecurityEvent): void {
    this.security_events.push(event);
    
    // Keep only last 1000 events
    if (this.security_events.length > 1000) {
      this.security_events = this.security_events.slice(-1000);
    }

    // Log to console based on severity
    const logLevel = event.severity === 'critical' || event.severity === 'high' ? 'error' : 
                     event.severity === 'medium' ? 'warn' : 'info';
    
    console[logLevel](`🚨 Security Event [${event.severity.toUpperCase()}]:`, {
      type: event.type,
      threat_score: event.threat_score,
      action: event.action_taken,
      query_snippet: event.query.substring(0, 50) + '...'
    });
  }

  /**
   * Update security metrics
   */
  private updateSecurityMetrics(safeQuery: SafeQuery, response: any, startTime: number): void {
    const analysisTime = Date.now() - startTime;
    
    // Update average analysis time
    const totalTime = this.metrics.average_analysis_time_ms * (this.metrics.total_queries - 1) + analysisTime;
    this.metrics.average_analysis_time_ms = totalTime / this.metrics.total_queries;

    // Update threat counters
    if (!safeQuery.safe || (safeQuery.threat_score || 0) > 0.3) {
      this.metrics.threats_detected++;
    }

    if (response.action === 'block') {
      this.metrics.threats_blocked++;
    }

    if (response.action === 'sanitize') {
      this.metrics.queries_sanitized++;
    }

    // Calculate threat detection rate
    this.metrics.threat_detection_rate = this.metrics.threats_detected / this.metrics.total_queries;
  }

  /**
   * Initialize threat response handlers
   */
  private initializeThreatResponseHandlers(): void {
    // Critical threat handler
    this.threat_response_handlers.set('critical', async (event: SecurityEvent) => {
      console.error('🚨 CRITICAL THREAT DETECTED:', event);
      // In production, this might trigger alerts, notifications, etc.
    });

    // High threat handler
    this.threat_response_handlers.set('high', async (event: SecurityEvent) => {
      console.warn('⚠️ HIGH THREAT DETECTED:', event);
      // In production, this might log to security monitoring systems
    });

    // Query block handler
    this.threat_response_handlers.set('block', async (event: SecurityEvent) => {
      console.log('🛑 Query blocked by security system:', event.query.substring(0, 50));
    });

    // Query sanitization handler
    this.threat_response_handlers.set('sanitize', async (event: SecurityEvent) => {
      console.log('🧹 Query sanitized by security system');
    });
  }

  /**
   * Execute threat response handlers
   */
  private async executeThreatResponseHandlers(response: any, event: SecurityEvent): Promise<void> {
    try {
      // Execute severity-based handlers
      const severityHandler = this.threat_response_handlers.get(event.severity);
      if (severityHandler) {
        await severityHandler(event);
      }

      // Execute action-based handlers
      const actionHandler = this.threat_response_handlers.get(response.action);
      if (actionHandler) {
        await actionHandler(event);
      }

    } catch (error) {
      console.error('Error executing threat response handlers:', error);
    }
  }

  // Public API Methods

  /**
   * Get comprehensive security metrics
   */
  getSecurityMetrics(): SecurityMetrics & {
    events_logged: number;
    quantum_defense_stats: any;
  } {
    return {
      ...this.metrics,
      events_logged: this.security_events.length,
      quantum_defense_stats: this.quantumDefense.getDefenseStatistics()
    };
  }

  /**
   * Get recent security events
   */
  getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.security_events.slice(-limit);
  }

  /**
   * Get security events by severity
   */
  getSecurityEventsBySeverity(severity: SecurityEvent['severity']): SecurityEvent[] {
    return this.security_events.filter(event => event.severity === severity);
  }

  /**
   * Test query security without executing
   */
  async testQuerySecurity(query: string, params: any[] = []): Promise<{
    threat_analysis: any;
    recommended_action: string;
    safe_to_execute: boolean;
  }> {
    const analysis = await this.quantumDefense.testQuerySafety(query, params);
    const threatLevel = this.classifyThreatLevel(analysis.threat_score);
    
    return {
      threat_analysis: analysis,
      recommended_action: threatLevel === 'critical' ? 'block' : 
                         threatLevel === 'high' ? 'sanitize' : 'allow',
      safe_to_execute: threatLevel === 'low' || threatLevel === 'medium'
    };
  }

  /**
   * Add custom threat response handler
   */
  addThreatResponseHandler(trigger: string, handler: Function): void {
    this.threat_response_handlers.set(trigger, handler);
    console.log(`🔧 Added custom threat response handler for: ${trigger}`);
  }

  /**
   * Update security configuration
   */
  configure(newConfig: Partial<SecurityConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    // Update quantum defense configuration
    this.quantumDefense.configure({
      strictness_level: this.config.strictness_level,
      auto_rewrite: this.config.threat_response === 'sanitize',
      real_time_monitoring: this.config.real_time_monitoring
    });

    console.log('⚙️ DatabaseSecurity reconfigured:', newConfig);
  }

  /**
   * Generate security report
   */
  generateSecurityReport(): {
    summary: any;
    threat_trends: any;
    recommendations: string[];
  } {
    const recentEvents = this.security_events.slice(-100);
    const threatsByType = recentEvents.reduce((acc, event) => {
      acc[event.type] = (acc[event.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const recommendations = [];
    
    if (this.metrics.threat_detection_rate > 0.1) {
      recommendations.push('High threat detection rate - consider increasing strictness level');
    }
    
    if (this.metrics.false_positives > this.metrics.threats_detected * 0.2) {
      recommendations.push('High false positive rate - consider tuning detection algorithms');
    }
    
    if (this.metrics.average_analysis_time_ms > 100) {
      recommendations.push('High analysis time - consider optimizing threat detection');
    }

    return {
      summary: {
        ...this.metrics,
        events_in_last_100: recentEvents.length,
        threats_by_type: threatsByType
      },
      threat_trends: this.analyzeThreatTrends(recentEvents),
      recommendations
    };
  }

  /**
   * Analyze threat trends from recent events
   */
  private analyzeThreatTrends(events: SecurityEvent[]): any {
    const hourlyBreakdown = events.reduce((acc, event) => {
      const hour = event.timestamp.getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {} as Record<number, number>);

    const severityBreakdown = events.reduce((acc, event) => {
      acc[event.severity] = (acc[event.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return {
      hourly_distribution: hourlyBreakdown,
      severity_distribution: severityBreakdown,
      total_events: events.length,
      trend_direction: this.calculateTrendDirection(events)
    };
  }

  /**
   * Calculate trend direction
   */
  private calculateTrendDirection(events: SecurityEvent[]): 'increasing' | 'decreasing' | 'stable' {
    if (events.length < 10) return 'stable';
    
    const firstHalf = events.slice(0, Math.floor(events.length / 2));
    const secondHalf = events.slice(Math.floor(events.length / 2));
    
    const firstHalfAvgThreat = firstHalf.reduce((sum, e) => sum + e.threat_score, 0) / firstHalf.length;
    const secondHalfAvgThreat = secondHalf.reduce((sum, e) => sum + e.threat_score, 0) / secondHalf.length;
    
    const difference = secondHalfAvgThreat - firstHalfAvgThreat;
    
    if (difference > 0.1) return 'increasing';
    if (difference < -0.1) return 'decreasing';
    return 'stable';
  }

  /**
   * Clear security history (for maintenance)
   */
  clearSecurityHistory(): void {
    this.security_events = [];
    this.metrics = {
      total_queries: 0,
      threats_detected: 0,
      threats_blocked: 0,
      queries_sanitized: 0,
      false_positives: 0,
      average_analysis_time_ms: 0,
      threat_detection_rate: 0
    };
    console.log('🧹 Security history cleared');
  }
}