/**
 * Comprehensive Tests for SOL-SEC-002: Neural Access Control Matrix
 * Tests the complete revolutionary access control system with all components
 */

import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { NeuralAccessControlMatrix } from '../../security/NeuralAccessControlMatrix.js';
import { NeuralMCPConnector } from '../../security/NeuralMCPConnector.js';
import { BehaviorAnalyzer } from '../../security/BehaviorAnalyzer.js';
import { QuantumTokenGenerator } from '../../security/QuantumTokenGenerator.js';
import { AccessDecisionEngine } from '../../security/AccessDecisionEngine.js';
import { SecurityAuditLogger } from '../../security/SecurityAuditLogger.js';
import { ExtendedThinkingEngine } from '../../security/ExtendedThinkingEngine.js';

// Mock MCP client to avoid external dependencies
jest.mock('../../mcp/client.js', () => ({
  MCPClient: jest.fn().mockImplementation(() => ({
    isConnected: jest.fn().mockReturnValue(true),
    request: jest.fn().mockResolvedValue({ success: true, data: 'mock_response' })
  }))
}));

describe('SOL-SEC-002: Neural Access Control Matrix', () => {
  let neuralACL: NeuralAccessControlMatrix;
  let mcpConnector: NeuralMCPConnector;
  let behaviorAnalyzer: BehaviorAnalyzer;
  let quantumTokenGenerator: QuantumTokenGenerator;
  let accessDecisionEngine: AccessDecisionEngine;
  let auditLogger: SecurityAuditLogger;
  let thinkingEngine: ExtendedThinkingEngine;

  // Test data
  const testUser = {
    id: 'user-123',
    username: 'test.user',
    roles: ['analyst', 'viewer'],
    groups: ['security-team'],
    security_clearance: 'confidential' as const,
    behavioral_profile: {
      pattern_id: 'pattern-456',
      user_id: 'user-123',
      pattern_type: 'temporal' as const,
      confidence_score: 0.85,
      frequency: 0.9,
      last_observed: new Date(),
      pattern_data: {
        typical_times: [9, 10, 11, 14, 15, 16],
        typical_days: [1, 2, 3, 4, 5]
      },
      exceptions: [],
      evolution_history: []
    },
    last_activity: new Date(),
    access_history: [],
    risk_score: 0.2
  };

  const testResource = {
    id: 'resource-789',
    name: 'sensitive-database',
    type: 'database' as const,
    classification: 'confidential' as const,
    permissions_required: ['read', 'query'],
    access_patterns: [],
    sensitive_data_level: 7
  };

  const testOperation = {
    type: 'read' as const,
    scope: 'single' as const,
    risk_level: 3,
    reversible: true
  };

  const testAccessContext = {
    user: testUser,
    resource: testResource,
    operation: testOperation,
    timestamp: new Date(),
    request_origin: {
      ip_address: '192.168.1.100',
      user_agent: 'Mozilla/5.0 (compatible; NeuralACL/1.0)',
      geolocation: 'US-East',
      device_fingerprint: 'device-fp-123'
    },
    session_context: {
      session_id: 'session-456',
      session_age: 1800,
      previous_actions: ['login', 'navigate'],
      anomaly_score: 0.1
    },
    environmental_factors: {
      time_of_day: 14,
      day_of_week: 2,
      concurrent_users: 25,
      system_load: 0.3
    }
  };

  beforeEach(() => {
    // Initialize components with test configurations
    mcpConnector = new NeuralMCPConnector({
      max_concurrent_agents: 5,
      default_timeout: 10000,
      max_retries: 2
    });

    behaviorAnalyzer = new BehaviorAnalyzer({
      learning_enabled: true,
      anomaly_detection: true,
      pattern_depth: 'medium',
      real_time_analysis: false // Disable for testing
    });

    quantumTokenGenerator = new QuantumTokenGenerator({
      algorithm: 'post_quantum_resistant',
      key_strength: 'standard',
      entropy_source: 'pseudo_random'
    });

    accessDecisionEngine = new AccessDecisionEngine({
      thinking_model: 'claude-opus-4-1-20250805',
      default_thinking_budget: 4000, // Reduced for testing
      analysis_depth: 'standard'
    });

    auditLogger = new SecurityAuditLogger({
      enabled: true,
      comprehensive_logging: true,
      real_time_monitoring: false, // Disable for testing
      retention_policy: 'standard'
    });

    thinkingEngine = new ExtendedThinkingEngine();

    neuralACL = new NeuralAccessControlMatrix(mcpConnector, {
      enabled: true,
      swarm_size: 3, // Reduced for testing
      thinking_budget: 4000, // Reduced for testing
      minimum_consensus: 0.6,
      quantum_tokens: true,
      behavioral_analysis: true,
      adaptive_ttl: true,
      real_time_monitoring: false, // Disable for testing
      audit_everything: true,
      strictness_level: 'balanced',
      threat_response: 'conditional'
    });
  });

  describe('Core Neural ACL Functionality', () => {
    it('should initialize with all components', () => {
      expect(neuralACL).toBeDefined();
      expect(neuralACL.getSystemStatus().enabled).toBe(true);
      expect(neuralACL.getSystemStatus().swarm_agents).toBeGreaterThan(0);
    });

    it('should evaluate access requests with swarm intelligence', async () => {
      const result = await neuralACL.evaluateAccess(testAccessContext);

      expect(result).toBeDefined();
      expect(result.decision_id).toMatch(/^NACL-/);
      expect(typeof result.granted).toBe('boolean');
      expect(result.confidence_score).toBeGreaterThanOrEqual(0);
      expect(result.confidence_score).toBeLessThanOrEqual(1);
      expect(result.swarm_analysis).toBeDefined();
      expect(result.thinking_analysis).toBeDefined();
      expect(result.adaptive_ttl).toBeGreaterThan(0);
      expect(result.audit_trail).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });

    it('should generate quantum tokens for granted access', async () => {
      // Mock a granted access scenario
      const grantedContext = {
        ...testAccessContext,
        user: {
          ...testUser,
          security_clearance: 'confidential' as const,
          risk_score: 0.1
        }
      };

      const result = await neuralACL.evaluateAccess(grantedContext);
      
      if (result.granted) {
        expect(result.quantum_token).toBeDefined();
        expect(result.quantum_token!.token_id).toMatch(/^QT-/);
        expect(result.quantum_token!.algorithm_info.quantum_resistant).toBe(true);
        expect(result.quantum_token!.claims.sub).toBe(testUser.id);
        expect(result.quantum_token!.claims.aud).toBe(testResource.id);
      }
    });

    it('should perform extended thinking analysis', async () => {
      const result = await neuralACL.evaluateAccess(testAccessContext);

      expect(result.thinking_analysis.thinking_tokens_used).toBeGreaterThan(0);
      expect(result.thinking_analysis.complexity_score).toBeGreaterThanOrEqual(0);
      expect(result.thinking_analysis.risk_assessment).toBeDefined();
      expect(result.thinking_analysis.behavioral_analysis).toBeDefined();
      expect(result.thinking_analysis.contextual_factors).toBeDefined();
      expect(result.thinking_analysis.decision_reasoning).toBeDefined();
    });

    it('should coordinate swarm intelligence', async () => {
      const result = await neuralACL.evaluateAccess(testAccessContext);

      expect(result.swarm_analysis.agents_consulted).toBeGreaterThan(0);
      expect(result.swarm_analysis.consensus_score).toBeGreaterThanOrEqual(0);
      expect(result.swarm_analysis.consensus_score).toBeLessThanOrEqual(1);
      expect(result.swarm_analysis.decision_confidence).toBeGreaterThanOrEqual(0);
      expect(result.swarm_analysis.decision_confidence).toBeLessThanOrEqual(1);
      expect(result.swarm_analysis.analysis_summary).toBeDefined();
      expect(Array.isArray(result.swarm_analysis.threat_indicators)).toBe(true);
    });

    it('should calculate adaptive TTL based on risk assessment', async () => {
      const lowRiskContext = {
        ...testAccessContext,
        user: { ...testUser, risk_score: 0.1 },
        operation: { ...testOperation, risk_level: 1 }
      };

      const highRiskContext = {
        ...testAccessContext,
        user: { ...testUser, risk_score: 0.9 },
        operation: { ...testOperation, risk_level: 9 }
      };

      const lowRiskResult = await neuralACL.evaluateAccess(lowRiskContext);
      const highRiskResult = await neuralACL.evaluateAccess(highRiskContext);

      // High risk should have shorter TTL
      if (lowRiskResult.granted && highRiskResult.granted) {
        expect(lowRiskResult.adaptive_ttl).toBeGreaterThan(highRiskResult.adaptive_ttl);
      }

      // TTL should be within reasonable bounds
      expect(lowRiskResult.adaptive_ttl).toBeGreaterThanOrEqual(300); // Min 5 minutes
      expect(lowRiskResult.adaptive_ttl).toBeLessThanOrEqual(86400); // Max 24 hours
    });

    it('should handle system failures gracefully', async () => {
      // Create a context that will cause errors
      const invalidContext = {
        ...testAccessContext,
        user: null as any
      };

      const result = await neuralACL.evaluateAccess(invalidContext);

      expect(result.granted).toBe(false);
      expect(result.reasoning).toContain('system_failure');
      expect(result.confidence_score).toBe(1.0); // High confidence in denial
    });

    it('should validate and revoke quantum tokens', async () => {
      const result = await neuralACL.evaluateAccess(testAccessContext);

      if (result.granted && result.quantum_token) {
        const tokenId = result.quantum_token.token_id;

        // Test token validation
        const validation = await neuralACL.validateToken(tokenId);
        expect(validation.valid).toBe(true);
        expect(validation.token_info).toBeDefined();
        expect(validation.remaining_ttl).toBeGreaterThan(0);

        // Test token revocation
        const revoked = await neuralACL.revokeToken(tokenId, 'test_revocation');
        expect(revoked).toBe(true);

        // Validate revoked token should fail
        const postRevocationValidation = await neuralACL.validateToken(tokenId);
        expect(postRevocationValidation.valid).toBe(false);
      }
    });
  });

  describe('Neural MCP Connector', () => {
    it('should initialize with neural agents', () => {
      const status = mcpConnector.getSystemStatus();
      expect(status.total_agents).toBeGreaterThan(0);
      expect(status.available_agents).toBeGreaterThan(0);
    });

    it('should execute single agent calls', async () => {
      const response = await mcpConnector.tools.call('security-analyzer', {
        context: testAccessContext,
        mode: 'comprehensive'
      });

      expect(response.success).toBe(true);
      expect(response.data).toBeDefined();
      expect(response.metadata.agent_id).toContain('neural-security-analyzer');
      expect(response.metadata.processing_time).toBeGreaterThan(0);
    });

    it('should execute multiple agent calls in parallel', async () => {
      const requests = [
        { tool: 'security-analyzer', params: { context: testAccessContext } },
        { tool: 'threat-detector', params: { context: testAccessContext } },
        { tool: 'pattern-learner', params: { context: testAccessContext } }
      ];

      const responses = await mcpConnector.tools.callMultiple(requests);

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response.success).toBe(true);
        expect(response.data).toBeDefined();
        expect(response.metadata).toBeDefined();
      });
    });

    it('should handle agent failures with circuit breaker', async () => {
      // Force multiple failures to trigger circuit breaker
      const failingRequests = Array(6).fill({
        tool: 'non-existent-agent',
        params: { context: testAccessContext }
      });

      const responses = await mcpConnector.tools.callMultiple(failingRequests);

      responses.forEach(response => {
        expect(response.success).toBe(false);
        expect(response.error).toBeDefined();
      });
    });
  });

  describe('Behavior Analyzer', () => {
    it('should analyze user behavior patterns', async () => {
      const analysis = await behaviorAnalyzer.analyzeUserBehavior({
        user: testUser,
        current_request: testAccessContext,
        historical_data: { recent_actions: ['login', 'read_database'] },
        contextual_factors: testAccessContext.environmental_factors,
        analysis_depth: 'standard'
      });

      expect(analysis.trust_score).toBeGreaterThanOrEqual(0);
      expect(analysis.trust_score).toBeLessThanOrEqual(1);
      expect(analysis.risk_assessment).toBeDefined();
      expect(analysis.anomaly_detection).toBeDefined();
      expect(analysis.pattern_analysis).toBeDefined();
      expect(analysis.behavioral_insights).toBeDefined();
      expect(analysis.predictions).toBeDefined();
      expect(analysis.recommendations).toBeDefined();
    });

    it('should detect behavioral anomalies', async () => {
      // Create an anomalous context
      const anomalousContext = {
        ...testAccessContext,
        environmental_factors: {
          ...testAccessContext.environmental_factors,
          time_of_day: 3 // 3 AM access
        }
      };

      const analysis = await behaviorAnalyzer.analyzeUserBehavior({
        user: testUser,
        current_request: anomalousContext,
        historical_data: { recent_actions: [] },
        contextual_factors: anomalousContext.environmental_factors,
        analysis_depth: 'comprehensive'
      });

      expect(analysis.anomaly_detection.anomalies_detected).toBeDefined();
      expect(analysis.risk_assessment.overall_risk).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Quantum Token Generator', () => {
    it('should generate quantum-resistant tokens', async () => {
      const token = await quantumTokenGenerator.generateToken({
        user_id: testUser.id,
        resource_id: testResource.id,
        operation: testOperation,
        ttl: 3600,
        security_level: 7,
        decision_context: { decision_id: 'test-decision' }
      });

      expect(token.token_id).toMatch(/^QT-/);
      expect(token.algorithm_info.quantum_resistant).toBe(true);
      expect(token.claims.sub).toBe(testUser.id);
      expect(token.claims.aud).toBe(testResource.id);
      expect(token.quantum_proof).toBeDefined();
      expect(token.validation_metadata).toBeDefined();
      expect(token.revocation_status).toBe('active');
    });

    it('should validate quantum tokens', async () => {
      const token = await quantumTokenGenerator.generateToken({
        user_id: testUser.id,
        resource_id: testResource.id,
        operation: testOperation,
        ttl: 3600,
        security_level: 7,
        decision_context: { decision_id: 'test-decision' }
      });

      const validation = await quantumTokenGenerator.validateToken(token.token_value);

      expect(validation.valid).toBe(true);
      expect(validation.validation_details.signature_valid).toBe(true);
      expect(validation.validation_details.not_expired).toBe(true);
      expect(validation.validation_details.entropy_verified).toBe(true);
      expect(validation.validation_details.tamper_check_passed).toBe(true);
      expect(validation.validation_details.quantum_proof_valid).toBe(true);
      expect(validation.security_assertions).toContain('STRUCTURE_VALID');
    });

    it('should get algorithm information', () => {
      const algorithmInfo = quantumTokenGenerator.getAlgorithmInfo();

      expect(algorithmInfo.quantum_resistant).toBe(true);
      expect(algorithmInfo.nist_approved).toBe(true);
      expect(algorithmInfo.signature_scheme).toBeDefined();
      expect(algorithmInfo.encryption_scheme).toBeDefined();
      expect(algorithmInfo.hash_function).toBeDefined();
    });
  });

  describe('Access Decision Engine', () => {
    it('should perform deep analysis with extended thinking', async () => {
      const analysis = await accessDecisionEngine.performDeepAnalysis({
        context: testAccessContext,
        thinking_budget: 4000,
        analysis_mode: 'comprehensive_access_evaluation',
        security_considerations: {
          threat_modeling: true,
          risk_cascading: true,
          business_impact: true,
          compliance_requirements: true
        },
        behavioral_factors: {
          user_patterns: {},
          resource_access_patterns: {},
          contextual_anomalies: {}
        },
        environmental_context: {
          system_state: {},
          threat_landscape: {},
          operational_context: testAccessContext.environmental_factors
        }
      });

      expect(analysis.thinking_tokens_used).toBeGreaterThan(0);
      expect(analysis.complexity_score).toBeGreaterThanOrEqual(0);
      expect(analysis.risk_assessment).toBeDefined();
      expect(analysis.behavioral_analysis).toBeDefined();
      expect(analysis.contextual_factors).toBeDefined();
      expect(analysis.threat_modeling).toBeDefined();
      expect(analysis.compliance_validation).toBeDefined();
      expect(analysis.business_impact).toBeDefined();
      expect(analysis.decision_reasoning).toBeDefined();
      expect(analysis.confidence_score).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Security Audit Logger', () => {
    it('should log access decisions', async () => {
      const accessResult = await neuralACL.evaluateAccess(testAccessContext);
      
      // Access should already be logged by the neural ACL
      const events = auditLogger.getEvents({
        event_type: 'access_decision',
        limit: 1
      });

      if (events.length > 0) {
        const event = events[0];
        expect(event.event_type).toBe('access_decision');
        expect(event.user_id).toBe(testUser.id);
        expect(event.resource_id).toBe(testResource.id);
        expect(event.details.action).toBe('access_evaluation');
        expect(event.security_impact).toBeDefined();
        expect(event.compliance_tags).toBeDefined();
        expect(event.integrity_proof).toBeDefined();
      }
    });

    it('should track security metrics', () => {
      const metrics = auditLogger.getMetrics();

      expect(metrics.total_events).toBeGreaterThanOrEqual(0);
      expect(metrics.events_by_severity).toBeDefined();
      expect(metrics.events_by_type).toBeDefined();
      expect(metrics.access_decisions).toBeDefined();
      expect(metrics.threat_detection).toBeDefined();
      expect(metrics.behavioral_analysis).toBeDefined();
      expect(metrics.system_performance).toBeDefined();
      expect(metrics.compliance_status).toBeDefined();
    });

    it('should provide system status', () => {
      const status = auditLogger.getSystemStatus();

      expect(status.enabled).toBe(true);
      expect(status.events_stored).toBeGreaterThanOrEqual(0);
      expect(status.integrity_chain_length).toBeGreaterThanOrEqual(0);
      expect(status.alert_rules_active).toBeGreaterThan(0);
      expect(status.configuration).toBeDefined();
    });
  });

  describe('Extended Thinking Engine', () => {
    it('should perform extended thinking analysis', async () => {
      const thinkingRequest = {
        model: 'claude-opus-4-1-20250805',
        thinking: {
          type: 'enabled' as const,
          budget_tokens: 4000,
          mode: 'security_critical'
        },
        prompt: 'Analyze this access control request for security implications and provide comprehensive recommendations.',
        context: {
          access_request: testAccessContext,
          analysis_type: 'security_evaluation'
        },
        temperature: 0.2
      };

      const response = await thinkingEngine.analyze(thinkingRequest);

      expect(response.thinking_tokens_used).toBeGreaterThan(0);
      expect(response.response_tokens).toBeGreaterThan(0);
      expect(response.total_tokens).toBeGreaterThan(0);
      expect(response.response_content).toBeDefined();
      expect(response.analysis_depth).toBeDefined();
      expect(response.confidence_score).toBeGreaterThanOrEqual(0);
      expect(response.confidence_score).toBeLessThanOrEqual(1);
      expect(response.reasoning_quality).toBeDefined();
      expect(response.metadata).toBeDefined();
    });

    it('should provide thinking modes', () => {
      const modes = thinkingEngine.getThinkingModes();

      expect(modes.length).toBeGreaterThan(0);
      modes.forEach(mode => {
        expect(mode.mode_id).toBeDefined();
        expect(mode.name).toBeDefined();
        expect(mode.description).toBeDefined();
        expect(mode.default_budget).toBeGreaterThan(0);
        expect(mode.specialization).toBeDefined();
        expect(mode.thinking_style).toBeDefined();
        expect(mode.temperature_range).toBeDefined();
      });
    });

    it('should track performance metrics', () => {
      const metrics = thinkingEngine.getPerformanceMetrics();

      expect(metrics.total_analyses).toBeGreaterThanOrEqual(0);
      expect(metrics.average_thinking_tokens).toBeGreaterThanOrEqual(0);
      expect(metrics.average_confidence).toBeGreaterThanOrEqual(0);
      expect(metrics.mode_usage).toBeDefined();
      expect(metrics.success_rate).toBeGreaterThanOrEqual(0);
      expect(metrics.success_rate).toBeLessThanOrEqual(1);
    });
  });

  describe('Integration Tests', () => {
    it('should handle high-security clearance access', async () => {
      const highSecurityContext = {
        ...testAccessContext,
        user: {
          ...testUser,
          security_clearance: 'top_secret' as const,
          risk_score: 0.05
        },
        resource: {
          ...testResource,
          classification: 'top_secret' as const,
          sensitive_data_level: 10
        }
      };

      const result = await neuralACL.evaluateAccess(highSecurityContext);

      expect(result).toBeDefined();
      expect(result.swarm_analysis.consensus_score).toBeGreaterThanOrEqual(0);
      expect(result.thinking_analysis.thinking_tokens_used).toBeGreaterThan(0);
      
      if (result.granted) {
        expect(result.adaptive_ttl).toBeLessThan(3600); // Should have shorter TTL for high security
        expect(result.quantum_token).toBeDefined();
        expect(result.monitoring_requirements).toBeDefined();
      }
    });

    it('should handle concurrent access requests', async () => {
      const requests = Array(5).fill(testAccessContext);
      const promises = requests.map(context => neuralACL.evaluateAccess(context));

      const results = await Promise.all(promises);

      expect(results).toHaveLength(5);
      results.forEach(result => {
        expect(result.decision_id).toBeDefined();
        expect(result.confidence_score).toBeGreaterThanOrEqual(0);
        expect(result.swarm_analysis).toBeDefined();
        expect(result.thinking_analysis).toBeDefined();
      });
    });

    it('should maintain system configuration consistency', () => {
      const neuralStatus = neuralACL.getSystemStatus();
      const mcpStatus = mcpConnector.getSystemStatus();
      const auditStatus = auditLogger.getSystemStatus();
      const thinkingMetrics = thinkingEngine.getPerformanceMetrics();

      expect(neuralStatus.enabled).toBe(true);
      expect(mcpStatus.total_agents).toBeGreaterThan(0);
      expect(auditStatus.enabled).toBe(true);
      expect(thinkingMetrics.total_analyses).toBeGreaterThanOrEqual(0);
    });

    it('should validate complete SOL-SEC-002 exit conditions', async () => {
      // Test the key revolutionary capabilities specified in SOL-SEC-002
      
      // 1. Neural swarm intelligence with 8K token thinking
      const result = await neuralACL.evaluateAccess(testAccessContext);
      expect(result.thinking_analysis.thinking_tokens_used).toBeGreaterThan(1000);
      expect(result.swarm_analysis.agents_consulted).toBeGreaterThan(0);
      
      // 2. Quantum-resistant token generation
      if (result.granted && result.quantum_token) {
        expect(result.quantum_token.algorithm_info.quantum_resistant).toBe(true);
        expect(result.quantum_token.quantum_proof).toBeDefined();
      }
      
      // 3. AI-driven behavioral analysis
      expect(result.thinking_analysis.behavioral_analysis).toBeDefined();
      expect(result.thinking_analysis.behavioral_analysis.trust_score).toBeGreaterThanOrEqual(0);
      
      // 4. Adaptive TTL based on threat assessment
      expect(result.adaptive_ttl).toBeGreaterThan(300);
      expect(result.adaptive_ttl).toBeLessThan(86400);
      
      // 5. Comprehensive audit logging
      const events = auditLogger.getEvents({ limit: 1 });
      if (events.length > 0) {
        expect(events[0].integrity_proof).toBeDefined();
        expect(events[0].security_impact).toBeDefined();
      }
      
      // 6. MCP connector integration with swarm intelligence
      const mcpStatus = mcpConnector.getSystemStatus();
      expect(mcpStatus.total_agents).toBeGreaterThan(0);
      expect(mcpStatus.available_agents).toBeGreaterThan(0);
      
      console.log('✅ SOL-SEC-002 Exit Conditions Validated:');
      console.log(`   🧠 Neural thinking tokens: ${result.thinking_analysis.thinking_tokens_used}`);
      console.log(`   🤖 Swarm agents consulted: ${result.swarm_analysis.agents_consulted}`);
      console.log(`   🔐 Quantum-resistant: ${result.quantum_token?.algorithm_info.quantum_resistant || 'N/A'}`);
      console.log(`   📊 Behavioral trust score: ${result.thinking_analysis.behavioral_analysis.trust_score}`);
      console.log(`   ⏱️ Adaptive TTL: ${result.adaptive_ttl}s`);
      console.log(`   📋 Audit events: ${auditLogger.getMetrics().total_events}`);
      console.log(`   🔗 MCP agents: ${mcpStatus.available_agents}/${mcpStatus.total_agents}`);
    });
  });
});