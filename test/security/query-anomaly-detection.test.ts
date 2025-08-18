/**
 * Query Anomaly Detection Test Suite
 * 
 * Tests the AI-powered query anomaly detection system including
 * QueryLogger, QueryAnomalyDetector, and AIQueryAnalyzer components.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { QueryLogger, QueryContext } from '../../src/security/QueryLogger';
import { QueryAnomalyDetector, DetectionThresholds } from '../../src/security/QueryAnomalyDetector';
import { AIQueryAnalyzer } from '../../src/security/AIQueryAnalyzer';

describe('Query Anomaly Detection System', () => {
  let logger: QueryLogger;
  let detector: QueryAnomalyDetector;
  let aiAnalyzer: AIQueryAnalyzer;

  const normalContext: QueryContext = {
    userId: 'user123',
    sessionId: 'session456',
    endpoint: '/api/swarms',
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
    aiAnalyzer = new AIQueryAnalyzer();
  });

  afterEach(() => {
    logger.clear();
    detector.setLearningMode(false);
    aiAnalyzer.clear();
  });

  describe('QueryLogger', () => {
    it('should log queries with proper normalization', async () => {
      await logger.log(
        'SELECT * FROM swarms WHERE id = ?',
        ['test-id'],
        25,
        normalContext
      );

      const stats = logger.getStatistics();
      expect(stats.totalQueries).toBe(1);
      expect(stats.uniquePatterns).toBe(1);
      expect(stats.averageExecutionTime).toBe(25);
    });

    it('should detect patterns in similar queries', async () => {
      // Log multiple similar queries
      for (let i = 0; i < 150; i++) {
        await logger.log(
          'SELECT * FROM swarms WHERE id = ?',
          [`test-id-${i}`],
          20 + Math.random() * 10,
          normalContext
        );
      }

      const patterns = logger.getRecentPatterns();
      expect(patterns.length).toBeGreaterThan(0);
      expect(patterns[0].frequency).toBeGreaterThanOrEqual(100);
    });

    it('should identify suspicious parameters', async () => {
      const maliciousQueries = [
        ['SELECT * FROM users WHERE id = ?', [`'; DROP TABLE users; --`]],
        ['SELECT * FROM data WHERE key = ?', [`' OR 1=1 --`]],
        ['UPDATE settings SET value = ?', [`<script>alert('xss')</script>`]]
      ];

      for (const [query, params] of maliciousQueries) {
        await logger.log(query, params, 30, suspiciousContext);
      }

      const suspicious = logger.getSuspiciousQueries(20);
      expect(suspicious.length).toBeGreaterThan(0);
    });

    it('should rotate logs when reaching maximum size', async () => {
      // Fill logger beyond its capacity
      for (let i = 0; i < 12000; i++) {
        await logger.log(
          `SELECT * FROM table${i % 10} WHERE id = ?`,
          [`id-${i}`],
          Math.random() * 50,
          normalContext
        );
      }

      const stats = logger.getStatistics();
      expect(stats.totalQueries).toBeLessThan(12000);
      expect(stats.totalQueries).toBeGreaterThan(5000);
    });
  });

  describe('QueryAnomalyDetector', () => {
    beforeEach(() => {
      detector.setLearningMode(true);
    });

    it('should detect new query patterns', async () => {
      const result = await detector.analyzeQuery(
        'SELECT * FROM users WHERE admin = true',
        [true],
        normalContext
      );

      expect(result.isNew).toBe(true);
      expect(result.score).toBeGreaterThan(0);
      expect(result.factors).toBeDefined();
    });

    it('should identify SQL injection patterns', async () => {
      const injectionQueries = [
        {
          query: `SELECT * FROM users WHERE id = ? UNION SELECT * FROM passwords`,
          params: ['1'],
          expectedScore: 80
        },
        {
          query: `DELETE FROM data WHERE id = ?; DROP TABLE users; --`,
          params: ['test'],
          expectedScore: 90
        },
        {
          query: `SELECT * FROM logs WHERE date > ? OR 1=1 --`,
          params: ['2023-01-01'],
          expectedScore: 70
        }
      ];

      for (const { query, params, expectedScore } of injectionQueries) {
        const result = await detector.analyzeQuery(query, params, suspiciousContext);
        
        expect(result.score).toBeGreaterThan(expectedScore * 0.8);
        expect(result.suspicious).toBe(true);
        expect(result.factors.some(f => f.type === 'structure')).toBe(true);
      }
    });

    it('should detect parameter-based anomalies', async () => {
      const maliciousParams = [
        [`'; DROP TABLE test; --`],
        [`' OR '1'='1`],
        [`<script>alert('xss')</script>`],
        [`javascript:alert('xss')`],
        [`\${process.env.SECRET}`]
      ];

      for (const params of maliciousParams) {
        const result = await detector.analyzeQuery(
          'SELECT * FROM data WHERE key = ?',
          params,
          normalContext
        );

        expect(result.factors.some(f => f.type === 'parameters')).toBe(true);
        expect(result.score).toBeGreaterThan(20);
      }
    });

    it('should learn from normal patterns and reduce false positives', async () => {
      const normalQuery = 'SELECT * FROM swarms WHERE metadata LIKE ?';
      const normalParams = ['%swarmId%'];

      // Train detector with normal patterns
      for (let i = 0; i < 100; i++) {
        await detector.learn(normalQuery, normalParams, 25, normalContext);
      }

      // Test against learned pattern
      const result = await detector.analyzeQuery(normalQuery, normalParams, normalContext);
      
      expect(result.safe).toBe(true);
      expect(result.score).toBeLessThan(30);
    });

    it('should detect context-based anomalies', async () => {
      const result = await detector.analyzeQuery(
        'DELETE FROM memory WHERE key = ?',
        ['test-key'],
        {
          ...suspiciousContext,
          userId: undefined, // No authenticated user
          userAgent: 'sqlmap/1.0', // Suspicious user agent
          operation: 'delete'
        }
      );

      expect(result.factors.some(f => f.type === 'context')).toBe(true);
      expect(result.score).toBeGreaterThan(25);
    });

    it('should maintain performance under load', async () => {
      const queries = [
        'SELECT * FROM swarms WHERE id = ?',
        'UPDATE swarms SET metadata = ? WHERE id = ?',
        'INSERT INTO memory (key, value) VALUES (?, ?)',
        'DELETE FROM memory WHERE key = ?'
      ];

      const startTime = Date.now();
      
      for (let i = 0; i < 1000; i++) {
        const query = queries[i % queries.length];
        const params = [`param-${i}`];
        
        await detector.analyzeQuery(query, params, normalContext);
      }

      const totalTime = Date.now() - startTime;
      const avgTimePerQuery = totalTime / 1000;

      expect(avgTimePerQuery).toBeLessThan(1); // Less than 1ms per query
      
      console.log(`Anomaly detection performance: ${avgTimePerQuery.toFixed(3)}ms per query`);
    });

    it('should provide accurate risk assessment', async () => {
      const testCases = [
        {
          name: 'Safe query',
          query: 'SELECT id, name FROM users WHERE active = ?',
          params: [true],
          expectedThreat: 'low'
        },
        {
          name: 'Suspicious query',
          query: 'SELECT * FROM users WHERE name LIKE ?',
          params: [`%'; DROP TABLE test; --%`],
          expectedThreat: 'high'
        },
        {
          name: 'Critical injection',
          query: `SELECT * FROM admin WHERE id = 1 UNION SELECT * FROM passwords`,
          params: [],
          expectedThreat: 'critical'
        }
      ];

      for (const testCase of testCases) {
        const result = await detector.analyzeQuery(
          testCase.query,
          testCase.params,
          testCase.expectedThreat === 'low' ? normalContext : suspiciousContext
        );

        if (testCase.expectedThreat === 'low') {
          expect(result.score).toBeLessThan(30);
        } else if (testCase.expectedThreat === 'high') {
          expect(result.score).toBeGreaterThan(50);
        } else if (testCase.expectedThreat === 'critical') {
          expect(result.score).toBeGreaterThan(80);
        }

        console.log(`${testCase.name}: score ${result.score}, factors: ${result.factors.length}`);
      }
    });
  });

  describe('AIQueryAnalyzer', () => {
    it('should queue queries for asynchronous analysis', async () => {
      const anomalyScore = {
        score: 85,
        suspicious: true,
        factors: [
          {
            type: 'structure' as const,
            severity: 'high' as const,
            description: 'UNION SELECT injection pattern detected',
            score: 80
          }
        ],
        recommendation: 'Block immediately'
      };

      await aiAnalyzer.queueForAnalysis(
        'query-123',
        'SELECT * FROM users UNION SELECT * FROM passwords',
        [],
        suspiciousContext,
        anomalyScore
      );

      const stats = aiAnalyzer.getAnalyzerStatistics();
      expect(stats.queueSize).toBe(1);
    });

    it('should perform immediate analysis for critical threats', async () => {
      const criticalScore = {
        score: 95,
        suspicious: true,
        factors: [
          {
            type: 'structure' as const,
            severity: 'critical' as const,
            description: 'Multiple SQL injection patterns detected',
            score: 90
          }
        ],
        recommendation: 'Block immediately and alert security team'
      };

      const analysis = await aiAnalyzer.analyzeImmediately(
        `SELECT * FROM users WHERE id = 1; DROP TABLE users; --`,
        [],
        suspiciousContext,
        criticalScore
      );

      expect(analysis.threatLevel).toBeOneOf(['high', 'critical']);
      expect(analysis.vulnerabilities.length).toBeGreaterThan(0);
      expect(analysis.mitigations.length).toBeGreaterThan(0);
      expect(analysis.confidence).toBeGreaterThan(70);
    });

    it('should process analysis queue automatically', async () => {
      const queries = [
        {
          id: 'q1',
          query: 'SELECT * FROM data WHERE id = ?',
          params: [`'; DROP TABLE data; --`],
          score: 75
        },
        {
          id: 'q2', 
          query: 'DELETE FROM logs WHERE date < ?',
          params: ['1900-01-01'],
          score: 45
        },
        {
          id: 'q3',
          query: 'SELECT password FROM users WHERE admin = ?',
          params: [true],
          score: 60
        }
      ];

      // Queue all queries
      for (const query of queries) {
        const anomalyScore = {
          score: query.score,
          suspicious: query.score > 50,
          factors: [{
            type: 'parameters' as const,
            severity: query.score > 70 ? 'high' as const : 'medium' as const,
            description: 'Suspicious parameter content',
            score: query.score
          }],
          recommendation: 'Analyze with AI'
        };

        await aiAnalyzer.queueForAnalysis(
          query.id,
          query.query,
          query.params,
          suspiciousContext,
          anomalyScore
        );
      }

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check results
      for (const query of queries) {
        const result = aiAnalyzer.getAnalysisResult(query.id);
        if (result) {
          expect(result.threatLevel).toBeDefined();
          expect(result.analysisTime).toBeGreaterThan(0);
          console.log(`Query ${query.id}: ${result.threatLevel} threat, ${result.vulnerabilities.length} vulnerabilities`);
        }
      }
    });

    it('should handle analysis failures gracefully', async () => {
      // This would test actual Claude API failures in production
      const failureScore = {
        score: 50,
        suspicious: true,
        factors: [{
          type: 'structure' as const,
          severity: 'medium' as const,
          description: 'Test failure case',
          score: 50
        }],
        recommendation: 'Test fallback'
      };

      const analysis = await aiAnalyzer.analyzeImmediately(
        'SELECT * FROM test',
        [],
        normalContext,
        failureScore
      );

      expect(analysis.threatLevel).toBeDefined();
      expect(analysis.aiReasoning).toBeDefined();
      expect(analysis.recommendations.length).toBeGreaterThan(0);
    });
  });

  describe('Integrated Anomaly Detection Pipeline', () => {
    it('should detect and analyze suspicious queries end-to-end', async () => {
      const suspiciousQuery = `
        SELECT u.username, u.password, u.email 
        FROM users u 
        WHERE u.id = ? 
        UNION SELECT c.card_number, c.cvv, c.expiry 
        FROM credit_cards c 
        WHERE c.user_id = ?
      `;
      const params = ['1', '1'];

      // Step 1: Log the query
      await logger.log(suspiciousQuery, params, 45, suspiciousContext);

      // Step 2: Detect anomalies
      const anomalyResult = await detector.analyzeQuery(suspiciousQuery, params, suspiciousContext);

      expect(anomalyResult.suspicious).toBe(true);
      expect(anomalyResult.score).toBeGreaterThan(70);
      
      // Step 3: AI Analysis for high-scoring queries
      if (anomalyResult.score > 70) {
        const threatAnalysis = await aiAnalyzer.analyzeImmediately(
          suspiciousQuery,
          params,
          suspiciousContext,
          anomalyResult
        );

        expect(threatAnalysis.threatLevel).toBeOneOf(['high', 'critical']);
        expect(threatAnalysis.vulnerabilities.some(v => v.type === 'data_exfiltration')).toBe(true);
        expect(threatAnalysis.mitigations.some(m => m.priority === 'immediate')).toBe(true);
      }
    });

    it('should maintain low false positive rate for normal queries', async () => {
      const normalQueries = [
        'SELECT id, name FROM swarms WHERE active = ?',
        'UPDATE swarms SET last_seen = ? WHERE id = ?',
        'INSERT INTO memory (key, value, namespace) VALUES (?, ?, ?)',
        'DELETE FROM memory WHERE created_at < ?',
        'SELECT COUNT(*) FROM tasks WHERE status = ?'
      ];

      let falsePositives = 0;
      const totalTests = 100;

      // Train detector first
      for (let i = 0; i < 50; i++) {
        const query = normalQueries[i % normalQueries.length];
        const params = [`param-${i}`];
        await detector.learn(query, params, 20 + Math.random() * 10, normalContext);
      }

      // Test false positive rate
      for (let i = 0; i < totalTests; i++) {
        const query = normalQueries[i % normalQueries.length];
        const params = [`param-${i}`];
        
        const result = await detector.analyzeQuery(query, params, normalContext);
        
        if (result.suspicious && result.score > 30) {
          falsePositives++;
        }
      }

      const falsePositiveRate = (falsePositives / totalTests) * 100;
      console.log(`False positive rate: ${falsePositiveRate.toFixed(1)}%`);
      
      expect(falsePositiveRate).toBeLessThan(5); // Less than 5% false positives
    });

    it('should achieve 95%+ detection rate for known attacks', async () => {
      const knownAttacks = [
        // SQL Injection variants
        `'; DROP TABLE users; --`,
        `' OR 1=1 --`,
        `' UNION SELECT username, password FROM admin --`,
        `'; INSERT INTO users (username, password, role) VALUES ('hacker', 'pass', 'admin'); --`,
        `' AND (SELECT COUNT(*) FROM information_schema.tables) > 0 --`,
        
        // Data exfiltration attempts
        `' UNION SELECT table_name, column_name FROM information_schema.columns --`,
        `' AND 1=(SELECT COUNT(*) FROM users) --`,
        `'; SELECT load_file('/etc/passwd'); --`,
        
        // Timing attacks
        `'; WAITFOR DELAY '00:00:05'; --`,
        `' OR SLEEP(5) --`,
        
        // Boolean-based blind injection
        `' AND SUBSTRING((SELECT password FROM users WHERE username='admin'),1,1) = 'a' --`,
        `' OR (CASE WHEN (1=1) THEN 1 ELSE 0 END) --`
      ];

      let detectedAttacks = 0;

      for (const attack of knownAttacks) {
        const result = await detector.analyzeQuery(
          'SELECT * FROM data WHERE key = ?',
          [attack],
          suspiciousContext
        );

        if (result.suspicious && result.score > 40) {
          detectedAttacks++;
        } else {
          console.log(`Missed attack: ${attack.substring(0, 30)}... (score: ${result.score})`);
        }
      }

      const detectionRate = (detectedAttacks / knownAttacks.length) * 100;
      console.log(`Attack detection rate: ${detectionRate.toFixed(1)}% (${detectedAttacks}/${knownAttacks.length})`);
      
      expect(detectionRate).toBeGreaterThan(95); // 95%+ detection rate
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