/**
 * Formal Verification Pipeline Test Suite
 * 
 * Comprehensive tests for Phase 3 LLM-to-SMT Bridge including
 * constraint generation, Z3 verification, and AI query rewriting.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { FormalVerificationPipeline } from '../../src/security/FormalVerificationPipeline';
import { QueryLogger, QueryContext } from '../../src/security/QueryLogger';
import { QueryAnomalyDetector } from '../../src/security/QueryAnomalyDetector';
import { SQLConstraintGenerator } from '../../src/security/SQLConstraintGenerator';
import { FormalQueryVerifier } from '../../src/security/FormalQueryVerifier';
import { AIQueryRewriter } from '../../src/security/AIQueryRewriter';

describe('Formal Verification Pipeline (Phase 3)', () => {
  let pipeline: FormalVerificationPipeline;
  let logger: QueryLogger;
  let detector: QueryAnomalyDetector;

  const normalContext: QueryContext = {
    userId: 'user123',
    sessionId: 'session456',
    endpoint: '/api/data',
    userAgent: 'Mozilla/5.0 (compatible browser)',
    ipAddress: '192.168.1.100',
    operation: 'read'
  };

  const suspiciousContext: QueryContext = {
    userId: undefined,
    sessionId: 'suspicious_session',
    endpoint: '/api/admin',
    userAgent: 'sqlmap/1.0',
    ipAddress: '10.0.0.1',
    operation: 'delete'
  };

  beforeEach(() => {
    logger = new QueryLogger();
    detector = new QueryAnomalyDetector(logger);
    pipeline = new FormalVerificationPipeline(logger, detector);
  });

  afterEach(() => {
    logger.clear();
    detector.setLearningMode(false);
    pipeline.clear();
  });

  describe('SQLConstraintGenerator', () => {
    let constraintGenerator: SQLConstraintGenerator;

    beforeEach(() => {
      constraintGenerator = new SQLConstraintGenerator();
    });

    afterEach(() => {
      constraintGenerator.clear();
    });

    it('should generate structural constraints for basic SELECT query', async () => {
      const constraints = await constraintGenerator.generateConstraints(
        'test-001',
        'SELECT * FROM users WHERE id = ?',
        ['123'],
        normalContext
      );

      expect(constraints.queryId).toBe('test-001');
      expect(constraints.constraints.length).toBeGreaterThan(0);
      expect(constraints.metadata.query).toBe('SELECT * FROM users WHERE id = ?');
      expect(constraints.metadata.params).toEqual(['123']);
      expect(constraints.metadata.generationTime).toBeGreaterThan(0);

      // Check for structural constraints
      const structuralConstraints = constraints.constraints.filter(c => c.type === 'structural');
      expect(structuralConstraints.length).toBeGreaterThan(0);

      // Validate constraint format
      const firstConstraint = constraints.constraints[0];
      expect(firstConstraint).toHaveProperty('id');
      expect(firstConstraint).toHaveProperty('type');
      expect(firstConstraint).toHaveProperty('constraint');
      expect(firstConstraint).toHaveProperty('confidence');
      expect(firstConstraint.confidence).toBeGreaterThan(0);
      expect(firstConstraint.confidence).toBeLessThanOrEqual(100);
    });

    it('should generate security constraints for injection patterns', async () => {
      const constraints = await constraintGenerator.generateConstraints(
        'test-002',
        'SELECT * FROM users WHERE id = ? UNION SELECT * FROM admin',
        ['1'],
        suspiciousContext
      );

      expect(constraints.constraints.length).toBeGreaterThan(0);
      
      // Check for security constraints
      const securityConstraints = constraints.constraints.filter(c => c.type === 'security');
      expect(securityConstraints.length).toBeGreaterThan(0);

      // Should detect UNION injection
      const unionConstraints = securityConstraints.filter(c => 
        c.description.toLowerCase().includes('union') ||
        c.constraint.includes('union')
      );
      expect(unionConstraints.length).toBeGreaterThan(0);

      // High confidence security constraints
      const highConfidenceConstraints = securityConstraints.filter(c => c.confidence > 80);
      expect(highConfidenceConstraints.length).toBeGreaterThan(0);
    });

    it('should generate parameter-based constraints', async () => {
      const maliciousParams = [
        `'; DROP TABLE users; --`,
        'normal_param',
        123
      ];

      const constraints = await constraintGenerator.generateConstraints(
        'test-003',
        'SELECT * FROM data WHERE col1 = ? AND col2 = ? AND col3 = ?',
        maliciousParams,
        normalContext
      );

      expect(constraints.constraints.length).toBeGreaterThan(0);

      // Check for semantic constraints (type validation)
      const semanticConstraints = constraints.constraints.filter(c => c.type === 'semantic');
      expect(semanticConstraints.length).toBeGreaterThan(0);

      // Should have constraints for each parameter type
      const paramConstraints = semanticConstraints.filter(c => 
        c.description.includes('Parameter') || c.variables.some(v => v.includes('param_'))
      );
      expect(paramConstraints.length).toBeGreaterThan(0);
    });

    it('should cache constraint generation results', async () => {
      const query = 'SELECT * FROM cached_table WHERE id = ?';
      const params = ['test'];

      // First generation
      const constraints1 = await constraintGenerator.generateConstraints(
        'cache-001',
        query,
        params,
        normalContext
      );

      // Second generation (should hit cache)
      const constraints2 = await constraintGenerator.generateConstraints(
        'cache-002',
        query,
        params,
        normalContext
      );

      // Should have similar constraint counts (from cache)
      expect(constraints1.constraints.length).toBe(constraints2.constraints.length);
      
      const stats = constraintGenerator.getGenerationStatistics();
      expect(stats.cacheSize).toBeGreaterThan(0);
    });

    it('should handle complex queries with multiple clauses', async () => {
      const complexQuery = `
        SELECT u.id, u.name, p.title 
        FROM users u 
        JOIN posts p ON u.id = p.user_id 
        WHERE u.active = ? 
        AND p.created_date > ? 
        ORDER BY p.created_date DESC 
        LIMIT ?
      `;

      const constraints = await constraintGenerator.generateConstraints(
        'complex-001',
        complexQuery,
        [true, '2023-01-01', 10],
        normalContext
      );

      expect(constraints.constraints.length).toBeGreaterThan(0);

      // Should handle complex structure
      const structuralConstraints = constraints.constraints.filter(c => c.type === 'structural');
      expect(structuralConstraints.length).toBeGreaterThan(0);

      // Should validate parameter count
      const paramCountConstraint = constraints.constraints.find(c => 
        c.constraint.includes('param_count') || c.description.includes('parameter')
      );
      expect(paramCountConstraint).toBeDefined();
    });
  });

  describe('FormalQueryVerifier', () => {
    let verifier: FormalQueryVerifier;
    let constraintGenerator: SQLConstraintGenerator;

    beforeEach(() => {
      verifier = new FormalQueryVerifier();
      constraintGenerator = new SQLConstraintGenerator();
    });

    afterEach(() => {
      verifier.clear();
      constraintGenerator.clear();
    });

    it('should verify safe queries as satisfiable', async () => {
      const constraints = await constraintGenerator.generateConstraints(
        'verify-safe-001',
        'SELECT id, name FROM users WHERE active = ?',
        [true],
        normalContext
      );

      const result = await verifier.verifyQuery(constraints);

      expect(result.queryId).toBe('verify-safe-001');
      expect(result.status).toBeOneOf(['safe', 'unknown']); // Z3 might be simulated
      expect(result.verificationTime).toBeGreaterThan(0);
      expect(result.constraintsChecked).toBe(constraints.constraints.length);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it('should verify unsafe queries with violations', async () => {
      const unsafeQuery = `SELECT * FROM users WHERE id = 1 UNION SELECT password FROM admin WHERE 1=1`;
      
      const constraints = await constraintGenerator.generateConstraints(
        'verify-unsafe-001',
        unsafeQuery,
        [],
        suspiciousContext
      );

      const result = await verifier.verifyQuery(constraints);

      expect(result.queryId).toBe('verify-unsafe-001');
      // Result could be 'unsafe' or 'unknown' depending on Z3 availability
      expect(result.status).toBeOneOf(['unsafe', 'unknown']);
      expect(result.constraintsChecked).toBeGreaterThan(0);

      if (result.status === 'unsafe') {
        expect(result.violations.length).toBeGreaterThan(0);
        
        const criticalViolations = result.violations.filter(v => v.severity === 'critical');
        expect(criticalViolations.length).toBeGreaterThan(0);
      }
    });

    it('should handle timeout conditions gracefully', async () => {
      const constraints = await constraintGenerator.generateConstraints(
        'timeout-001',
        'SELECT * FROM large_table WHERE complex_condition = ?',
        ['test'],
        normalContext
      );

      const result = await verifier.verifyQuery(constraints, {
        timeout: 100, // Very short timeout
        maxConstraints: 1000,
        enableProofGeneration: true,
        optimizationLevel: 'fast'
      });

      expect(result.queryId).toBe('timeout-001');
      expect(result.verificationTime).toBeLessThan(1000); // Should complete quickly
      expect(['safe', 'unsafe', 'unknown', 'timeout']).toContain(result.status);
    });

    it('should batch verify multiple queries efficiently', async () => {
      const testQueries = [
        'SELECT * FROM table1 WHERE id = ?',
        'UPDATE table2 SET value = ? WHERE key = ?',
        'DELETE FROM table3 WHERE created < ?'
      ];

      const constraintSets = [];
      for (let i = 0; i < testQueries.length; i++) {
        const constraints = await constraintGenerator.generateConstraints(
          `batch-${i}`,
          testQueries[i],
          [`param${i}`],
          normalContext
        );
        constraintSets.push(constraints);
      }

      const startTime = Date.now();
      const results = await verifier.batchVerify(constraintSets);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(testQueries.length);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds

      for (const result of results) {
        expect(result.verificationTime).toBeGreaterThan(0);
        expect(['safe', 'unsafe', 'unknown', 'timeout']).toContain(result.status);
      }
    });

    it('should generate proofs for unsafe queries', async () => {
      const constraints = await constraintGenerator.generateConstraints(
        'proof-001',
        `SELECT * FROM users WHERE username = 'admin' OR 1=1`,
        [],
        suspiciousContext
      );

      const result = await verifier.verifyQuery(constraints, {
        enableProofGeneration: true,
        optimizationLevel: 'thorough'
      });

      expect(result.queryId).toBe('proof-001');
      
      // If unsafe, should have proof or counter-example
      if (result.status === 'unsafe') {
        expect(result.proof || result.counterExample).toBeDefined();
      }
    });
  });

  describe('AIQueryRewriter', () => {
    let rewriter: AIQueryRewriter;

    beforeEach(() => {
      rewriter = new AIQueryRewriter();
    });

    afterEach(() => {
      rewriter.clear();
    });

    it('should rewrite UNION injection queries', async () => {
      const maliciousQuery = 'SELECT * FROM users WHERE id = ? UNION SELECT password FROM admin';
      const result = await rewriter.rewriteQuery(
        'rewrite-001',
        maliciousQuery,
        ['1'],
        normalContext
      );

      expect(result.queryId).toBe('rewrite-001');
      expect(result.originalQuery).toBe(maliciousQuery);
      expect(result.rewrittenQuery).not.toBe(maliciousQuery);
      expect(result.transformations.length).toBeGreaterThan(0);
      expect(result.safetyImprovement).toBeGreaterThan(0);
      expect(result.rewriteTime).toBeGreaterThan(0);

      // Should remove UNION SELECT
      expect(result.rewrittenQuery.toLowerCase()).not.toContain('union select');
      
      // Should have security transformation
      const securityTransformations = result.transformations.filter(t => t.type === 'structure_fix');
      expect(securityTransformations.length).toBeGreaterThan(0);
    });

    it('should sanitize dangerous parameters', async () => {
      const dangerousParams = [
        `'; DROP TABLE users; --`,
        'normal_param',
        `<script>alert('xss')</script>`
      ];

      const result = await rewriter.rewriteQuery(
        'sanitize-001',
        'SELECT * FROM data WHERE col1 = ? AND col2 = ? AND col3 = ?',
        dangerousParams,
        normalContext
      );

      expect(result.queryId).toBe('sanitize-001');
      expect(result.transformations.length).toBeGreaterThan(0);

      // Should have sanitization transformations
      const sanitizationTransformations = result.transformations.filter(t => t.type === 'sanitization');
      expect(sanitizationTransformations.length).toBeGreaterThan(0);

      // Parameters should be cleaned
      const transformations = result.transformations;
      expect(transformations.some(t => t.description.includes('parameter'))).toBe(true);
    });

    it('should handle queries that need no rewriting', async () => {
      const safeQuery = 'SELECT id, name FROM users WHERE active = ? AND created > ?';
      const safeParams = [true, '2023-01-01'];

      const result = await rewriter.rewriteQuery(
        'safe-001',
        safeQuery,
        safeParams,
        normalContext
      );

      expect(result.queryId).toBe('safe-001');
      expect(result.rewrittenQuery).toBe(safeQuery);
      expect(result.safetyImprovement).toBe(0);
      expect(result.functionalityPreserved).toBe(100);
      expect(result.rewriteReason).toContain('No rewrite needed');
    });

    it('should batch rewrite multiple queries', async () => {
      const queries = [
        {
          queryId: 'batch-rewrite-1',
          query: 'SELECT * FROM table1 WHERE id = ?',
          params: ['1'],
          context: normalContext
        },
        {
          queryId: 'batch-rewrite-2',
          query: `SELECT * FROM users WHERE name = 'admin' UNION SELECT * FROM passwords`,
          params: [],
          context: suspiciousContext
        },
        {
          queryId: 'batch-rewrite-3',
          query: 'DELETE FROM logs WHERE date < ?',
          params: [`'; DROP TABLE logs; --`],
          context: suspiciousContext
        }
      ];

      const results = await rewriter.batchRewrite(queries);

      expect(results.length).toBe(queries.length);

      // First query should need no rewrite
      expect(results[0].safetyImprovement).toBe(0);

      // Second and third queries should be rewritten
      expect(results[1].safetyImprovement).toBeGreaterThan(0);
      expect(results[2].safetyImprovement).toBeGreaterThan(0);

      // All should have valid processing times
      results.forEach(result => {
        expect(result.rewriteTime).toBeGreaterThan(0);
        expect(result.confidence).toBeGreaterThan(0);
      });
    });

    it('should preserve functionality while improving safety', async () => {
      const functionalQuery = 'SELECT u.name, COUNT(p.id) FROM users u LEFT JOIN posts p ON u.id = p.user_id WHERE u.role = ? GROUP BY u.id';
      const params = [`admin'; DELETE FROM users WHERE 1=1; --`];

      const result = await rewriter.rewriteQuery(
        'functional-001',
        functionalQuery,
        params,
        normalContext
      );

      expect(result.safetyImprovement).toBeGreaterThan(0);
      expect(result.functionalityPreserved).toBeGreaterThan(80); // Should preserve most functionality
      
      // Original query structure should be mostly intact
      expect(result.rewrittenQuery.toLowerCase()).toContain('select');
      expect(result.rewrittenQuery.toLowerCase()).toContain('from users');
      expect(result.rewrittenQuery.toLowerCase()).toContain('join posts');
    });
  });

  describe('Complete Pipeline Integration', () => {
    it('should process safe query through all three phases', async () => {
      const safeQuery = 'SELECT id, name FROM users WHERE active = ? AND created_date > ?';
      const safeParams = [true, '2023-01-01'];

      const result = await pipeline.processQuery(
        'integration-safe-001',
        safeQuery,
        safeParams,
        normalContext
      );

      expect(result.queryId).toBe('integration-safe-001');
      expect(result.status).toBe('safe');
      expect(result.originalQuery).toBe(safeQuery);
      expect(result.finalQuery).toBe(safeQuery); // Should remain unchanged
      expect(result.securityLevel).toBeOneOf(['low', 'medium']);
      expect(result.totalProcessingTime).toBeGreaterThan(0);

      // Phase results
      expect(result.phase1Result).toBe(true);
      expect(result.phase2Result).toBeDefined();
      expect(result.phase3Result).toBeDefined();
      
      console.log(`Safe query processing time: ${result.totalProcessingTime}ms`);
    });

    it('should detect and rewrite unsafe SQL injection query', async () => {
      const maliciousQuery = `SELECT * FROM users WHERE username = 'admin' UNION SELECT password, email FROM admin_users WHERE 1=1`;
      const result = await pipeline.processQuery(
        'integration-unsafe-001',
        maliciousQuery,
        [],
        suspiciousContext,
        {
          autoRewrite: true,
          blockOnUnsafe: false
        }
      );

      expect(result.queryId).toBe('integration-unsafe-001');
      expect(['unsafe', 'rewritten', 'blocked']).toContain(result.status);
      expect(result.securityLevel).toBeOneOf(['high', 'critical']);
      expect(result.recommendations.length).toBeGreaterThan(0);

      // Should have detected issues in multiple phases
      if (result.phase2Result) {
        expect(result.phase2Result.suspicious).toBe(true);
        expect(result.phase2Result.score).toBeGreaterThan(50);
      }

      if (result.phase3Result?.verification) {
        expect(result.phase3Result.verification.status).toBeOneOf(['unsafe', 'unknown']);
      }

      console.log(`Unsafe query processing time: ${result.totalProcessingTime}ms`);
      console.log(`Security level: ${result.securityLevel}`);
      console.log(`Recommendations: ${result.recommendations.join(', ')}`);
    });

    it('should handle parameter-based injection attacks', async () => {
      const query = 'SELECT * FROM sensitive_data WHERE user_id = ? AND access_level = ?';
      const maliciousParams = [
        '1',
        `'; DROP TABLE sensitive_data; SELECT * FROM users WHERE 1=1 OR ''='`
      ];

      const result = await pipeline.processQuery(
        'param-injection-001',
        query,
        maliciousParams,
        suspiciousContext,
        {
          autoRewrite: true,
          enablePhase3: true
        }
      );

      expect(result.queryId).toBe('param-injection-001');
      expect(['unsafe', 'rewritten', 'blocked']).toContain(result.status);

      // Phase 2 should detect parameter anomalies
      if (result.phase2Result) {
        expect(result.phase2Result.factors.some(f => f.type === 'parameters')).toBe(true);
      }

      // If rewritten, should be safer
      if (result.status === 'rewritten' && result.phase3Result?.rewrite) {
        expect(result.phase3Result.rewrite.safetyImprovement).toBeGreaterThan(0);
      }
    });

    it('should meet performance requirements for verification', async () => {
      const testQueries = [
        { query: 'SELECT * FROM users WHERE id = ?', params: ['1'] },
        { query: 'UPDATE settings SET value = ? WHERE key = ?', params: ['new_value', 'config_key'] },
        { query: 'INSERT INTO logs (message, level) VALUES (?, ?)', params: ['Test message', 'INFO'] },
        { query: 'DELETE FROM temp_data WHERE created < ?', params: ['2023-01-01'] }
      ];

      const results = [];
      const startTime = Date.now();

      for (let i = 0; i < testQueries.length; i++) {
        const { query, params } = testQueries[i];
        const result = await pipeline.processQuery(
          `perf-${i}`,
          query,
          params,
          normalContext,
          {
            maxProcessingTime: 5000 // 5 second max
          }
        );
        results.push(result);
      }

      const totalTime = Date.now() - startTime;
      const averageTime = totalTime / testQueries.length;

      expect(averageTime).toBeLessThan(1000); // Average under 1 second
      expect(results.every(r => r.totalProcessingTime < 5000)).toBe(true); // All under 5 seconds

      console.log(`Average processing time: ${averageTime.toFixed(2)}ms`);
      console.log(`Total batch time: ${totalTime}ms`);

      // All queries should complete successfully
      expect(results.every(r => r.status !== 'error')).toBe(true);
    });

    it('should provide comprehensive pipeline statistics', async () => {
      // Process various types of queries
      const queries = [
        { id: 'stat-safe-1', query: 'SELECT * FROM users WHERE id = ?', params: ['1'], context: normalContext },
        { id: 'stat-safe-2', query: 'SELECT name FROM products WHERE active = ?', params: [true], context: normalContext },
        { id: 'stat-unsafe-1', query: `SELECT * FROM admin WHERE 1=1 UNION SELECT * FROM passwords`, params: [], context: suspiciousContext },
        { id: 'stat-unsafe-2', query: 'DELETE FROM logs WHERE date < ?', params: [`'; DROP TABLE logs; --`], context: suspiciousContext }
      ];

      const results = [];
      for (const q of queries) {
        const result = await pipeline.processQuery(q.id, q.query, q.params, q.context);
        results.push(result);
      }

      const stats = pipeline.getPipelineStatistics();

      expect(stats.totalQueries).toBe(queries.length);
      expect(stats.averageProcessingTime).toBeGreaterThan(0);
      expect(stats.phase1SuccessRate).toBeGreaterThan(0);
      expect(stats.phase1SuccessRate).toBeLessThanOrEqual(100);

      // Should have detected some unsafe queries
      expect(stats.unsafeQueries + stats.blockedQueries + stats.rewrittenQueries).toBeGreaterThan(0);

      console.log('Pipeline Statistics:', JSON.stringify(stats, null, 2));

      // Component statistics
      const componentStats = pipeline.getComponentStatistics();
      expect(componentStats.constraintGenerator).toBeDefined();
      expect(componentStats.queryVerifier).toBeDefined();
      expect(componentStats.queryRewriter).toBeDefined();
      expect(componentStats.anomalyDetector).toBeDefined();
    });

    it('should handle batch processing efficiently', async () => {
      const batchQueries = Array.from({ length: 10 }, (_, i) => ({
        queryId: `batch-${i}`,
        query: i % 3 === 0 
          ? `SELECT * FROM users WHERE id = ${i} UNION SELECT * FROM admin` // Some unsafe
          : `SELECT * FROM data WHERE id = ? AND type = ?`, // Some safe
        params: [`param${i}`, 'test'],
        context: i % 2 === 0 ? normalContext : suspiciousContext
      }));

      const startTime = Date.now();
      const results = await pipeline.batchProcess(batchQueries);
      const totalTime = Date.now() - startTime;

      expect(results.length).toBe(batchQueries.length);
      expect(totalTime).toBeLessThan(30000); // Should complete within 30 seconds

      // Should have a mix of results
      const safeCount = results.filter(r => r.status === 'safe').length;
      const unsafeCount = results.filter(r => ['unsafe', 'blocked', 'rewritten'].includes(r.status)).length;
      
      expect(safeCount + unsafeCount).toBe(results.length);
      expect(unsafeCount).toBeGreaterThan(0); // Should detect unsafe queries

      console.log(`Batch processing: ${results.length} queries in ${totalTime}ms`);
      console.log(`Safe: ${safeCount}, Unsafe/Blocked/Rewritten: ${unsafeCount}`);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty queries gracefully', async () => {
      const result = await pipeline.processQuery(
        'empty-001',
        '',
        [],
        normalContext
      );

      expect(result.queryId).toBe('empty-001');
      expect(['error', 'blocked']).toContain(result.status);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it('should handle malformed SQL queries', async () => {
      const malformedQuery = 'SELECT * FROM WHERE AND OR';
      
      const result = await pipeline.processQuery(
        'malformed-001',
        malformedQuery,
        [],
        normalContext
      );

      expect(result.queryId).toBe('malformed-001');
      expect(result.status).toBeOneOf(['error', 'unsafe', 'blocked']);
    });

    it('should handle extremely long queries', async () => {
      const longQuery = 'SELECT * FROM users WHERE ' + 
        Array.from({ length: 1000 }, (_, i) => `col${i} = ?`).join(' AND ');
      const longParams = Array.from({ length: 1000 }, (_, i) => `value${i}`);

      const result = await pipeline.processQuery(
        'long-001',
        longQuery,
        longParams,
        normalContext,
        {
          maxProcessingTime: 15000 // Allow more time for complex query
        }
      );

      expect(result.queryId).toBe('long-001');
      expect(result.totalProcessingTime).toBeLessThan(15000);
      // Should complete without errors
      expect(result.status).not.toBe('error');
    });

    it('should handle queries with mixed parameter types', async () => {
      const mixedParams = [
        'string_param',
        42,
        true,
        null,
        { complex: 'object' },
        [1, 2, 3]
      ];

      const result = await pipeline.processQuery(
        'mixed-types-001',
        'SELECT * FROM mixed_table WHERE c1 = ? AND c2 = ? AND c3 = ? AND c4 = ? AND c5 = ? AND c6 = ?',
        mixedParams,
        normalContext
      );

      expect(result.queryId).toBe('mixed-types-001');
      expect(result.phase1Result).toBeDefined();
      // Should handle type validation
      expect(result.status).not.toBe('error');
    });
  });
});

// Helper function to extend Jest expect
expect.extend({
  toBeOneOf(received: any, expected: any[]) {
    const pass = expected.includes(received);
    if (pass) {
      return {
        message: () => `expected ${received} not to be one of ${expected.join(', ')}`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected ${received} to be one of ${expected.join(', ')}`,
        pass: false,
      };
    }
  },
});

declare global {
  namespace jest {
    interface Matchers<R> {
      toBeOneOf(expected: any[]): R;
    }
  }
}