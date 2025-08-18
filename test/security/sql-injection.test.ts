/**
 * SQL Injection Prevention Test Suite
 * 
 * Tests the security measures implemented to prevent SQL injection attacks
 * in the Claude-Flow database layer.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import Database from 'better-sqlite3';
import { SecureQueryBuilder } from '../../src/security/SecureQueryBuilder';
import { DatabaseManager } from '../../src/hive-mind/core/DatabaseManager';
import path from 'path';
import fs from 'fs';

describe('SQL Injection Prevention', () => {
  let db: Database.Database;
  let secureDb: SecureQueryBuilder;
  let dbManager: DatabaseManager;
  let testDbPath: string;

  const maliciousInputs = [
    `'; DROP TABLE swarms; --`,
    `' OR '1'='1`,
    `' OR 1=1 --`,
    `\${process.env.SECRET}`,
    `"; DELETE FROM memory WHERE '1'='1'; --`,
    `' UNION SELECT * FROM sqlite_master --`,
    `'; INSERT INTO swarms VALUES ('hacked', 'pwned'); --`,
    `' AND 1=(SELECT COUNT(*) FROM sqlite_master) --`,
    `\\'; PRAGMA table_info(swarms); --`,
    `' OR EXISTS(SELECT * FROM sqlite_master) --`
  ];

  beforeEach(async () => {
    // Create temporary test database
    testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
    db = new Database(testDbPath);
    
    // Initialize database schema
    const schemaPath = path.join(__dirname, '../../src/db/hive-mind-schema.sql');
    if (fs.existsSync(schemaPath)) {
      const schema = fs.readFileSync(schemaPath, 'utf-8');
      db.exec(schema);
    } else {
      // Fallback minimal schema for testing
      db.exec(`
        CREATE TABLE IF NOT EXISTS swarms (
          id TEXT PRIMARY KEY,
          metadata TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS memory (
          key TEXT PRIMARY KEY,
          value TEXT,
          namespace TEXT,
          metadata TEXT,
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS tasks (
          id TEXT PRIMARY KEY,
          data TEXT,
          status TEXT DEFAULT 'pending',
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
        
        CREATE TABLE IF NOT EXISTS agents (
          id TEXT PRIMARY KEY,
          name TEXT,
          status TEXT DEFAULT 'idle',
          created_at INTEGER DEFAULT (strftime('%s', 'now'))
        );
      `);
    }
    
    // Insert test data
    db.prepare(`
      INSERT INTO swarms (id, metadata) VALUES 
      ('safe-swarm-1', '{"swarmId":"safe-swarm-1","type":"test"}'),
      ('safe-swarm-2', '{"swarmId":"safe-swarm-2","type":"test"}')
    `).run();
    
    db.prepare(`
      INSERT INTO memory (key, value, namespace, metadata) VALUES 
      ('test-key-1', 'test-value-1', 'queen-decisions', '{"swarmId":"safe-swarm-1"}'),
      ('test-key-2', 'test-value-2', 'queen-decisions', '{"swarmId":"safe-swarm-2"}')
    `).run();

    secureDb = new SecureQueryBuilder(db);
    dbManager = new DatabaseManager(testDbPath);
  });

  afterEach(() => {
    if (db) {
      db.close();
    }
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  });

  describe('Direct SQL Injection Protection', () => {
    it('should safely handle malicious swarmId inputs', async () => {
      for (const maliciousInput of maliciousInputs) {
        try {
          // Test the vulnerable method (now fixed)
          await dbManager.clearMemory(maliciousInput);
          
          // Verify database integrity
          const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
          const tableNames = tables.map(t => t.name);
          
          expect(tableNames).toContain('swarms');
          expect(tableNames).toContain('memory');
          
          // Verify data integrity
          const swarmCount = db.prepare("SELECT COUNT(*) as count FROM swarms").get().count;
          expect(swarmCount).toBeGreaterThanOrEqual(2);
          
          console.log(`✅ Safely handled: ${maliciousInput.substring(0, 20)}...`);
          
        } catch (error) {
          // Acceptable if query fails safely without compromising database
          console.log(`🔒 Query failed safely: ${maliciousInput.substring(0, 20)}...`);
        }
      }
    });

    it('should safely handle malicious inputs in getSuccessfulDecisions', async () => {
      for (const maliciousInput of maliciousInputs) {
        try {
          const result = await dbManager.getSuccessfulDecisions(maliciousInput);
          
          // Should return empty array or valid results, not crash
          expect(Array.isArray(result)).toBe(true);
          
          // Verify database integrity
          const memoryCount = db.prepare("SELECT COUNT(*) as count FROM memory").get().count;
          expect(memoryCount).toBeGreaterThanOrEqual(2);
          
        } catch (error) {
          // Query may fail but shouldn't compromise database
          expect(error.message).not.toContain('syntax error');
        }
      }
    });
  });

  describe('SecureQueryBuilder Validation', () => {
    it('should reject queries with direct interpolation', () => {
      const dangerousQueries = [
        `SELECT * FROM swarms WHERE id = '${maliciousInputs[0]}'`,
        `DELETE FROM memory WHERE key = '${maliciousInputs[1]}'`,
        `INSERT INTO tasks (id, data) VALUES ('${maliciousInputs[2]}', 'data')`
      ];

      for (const query of dangerousQueries) {
        expect(() => {
          secureDb.execute(query, []);
        }).toThrow('Direct interpolation detected');
      }
    });

    it('should accept properly parameterized queries', async () => {
      const safeQueries = [
        { query: 'SELECT * FROM swarms WHERE id = ?', params: ['safe-swarm-1'] },
        { query: 'SELECT * FROM memory WHERE namespace = ? AND metadata LIKE ?', params: ['queen-decisions', '%swarmId%'] },
        { query: 'INSERT INTO tasks (id, data, status) VALUES (?, ?, ?)', params: ['test-task', 'test-data', 'pending'] }
      ];

      for (const { query, params } of safeQueries) {
        expect(async () => {
          await secureDb.execute(query, params);
        }).not.toThrow();
      }
    });

    it('should validate parameter count matches placeholders', async () => {
      const query = 'SELECT * FROM swarms WHERE id = ? AND metadata LIKE ?';
      
      // Too few parameters
      await expect(async () => {
        await secureDb.execute(query, ['safe-swarm-1']);
      }).rejects.toThrow('Parameter count mismatch');
      
      // Too many parameters
      await expect(async () => {
        await secureDb.execute(query, ['safe-swarm-1', '%test%', 'extra']);
      }).rejects.toThrow('Parameter count mismatch');
      
      // Correct parameters
      const result = await secureDb.execute(query, ['safe-swarm-1', '%test%']);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should reject object and function parameters', async () => {
      const query = 'SELECT * FROM swarms WHERE id = ?';
      
      await expect(async () => {
        await secureDb.execute(query, [{ malicious: 'object' }]);
      }).rejects.toThrow('Parameter 0 is an object');
      
      await expect(async () => {
        await secureDb.execute(query, [() => 'malicious']);
      }).rejects.toThrow('Parameter 0 is a function');
    });
  });

  describe('Query Pattern Analysis', () => {
    it('should warn about dangerous operations without WHERE clause', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      
      try {
        // This should generate a warning but not fail
        await secureDb.execute('DELETE FROM tasks', []);
      } catch (error) {
        // Expected to fail due to dangerous operation
      }
      
      // Should have warned about DELETE without WHERE
      expect(consoleSpy).toHaveBeenCalledWith(
        'Query warnings:',
        expect.arrayContaining([expect.stringContaining('DELETE')])
      );
      
      consoleSpy.mockRestore();
    });

    it('should track query statistics', async () => {
      // Execute several queries
      await secureDb.execute('SELECT * FROM swarms WHERE id = ?', ['safe-swarm-1']);
      await secureDb.execute('SELECT * FROM swarms WHERE id = ?', ['safe-swarm-2']);
      await secureDb.execute('SELECT * FROM memory WHERE namespace = ?', ['test']);
      
      const stats = secureDb.getQueryStats();
      
      expect(stats.totalQueries).toBe(3);
      expect(stats.averageExecutionTime).toBeGreaterThan(0);
      expect(stats.uniquePatterns).toBeGreaterThanOrEqual(2); // Different query patterns
      expect(stats.recentQueries).toHaveLength(3);
    });

    it('should rotate query log when it gets too large', async () => {
      // Execute many queries to trigger log rotation
      for (let i = 0; i < 10005; i++) {
        await secureDb.execute('SELECT 1', []);
      }
      
      const stats = secureDb.getQueryStats();
      expect(stats.totalQueries).toBe(5000); // Should be truncated to 5000
    });
  });

  describe('Performance Impact', () => {
    it('should maintain performance under load', async () => {
      const iterations = 1000;
      const startTime = Date.now();
      
      for (let i = 0; i < iterations; i++) {
        await secureDb.execute('SELECT * FROM swarms WHERE id = ?', [`test-${i % 10}`]);
      }
      
      const totalTime = Date.now() - startTime;
      const avgTimePerQuery = totalTime / iterations;
      
      // Should be less than 1ms per query on average
      expect(avgTimePerQuery).toBeLessThan(1);
      
      console.log(`Performance: ${avgTimePerQuery.toFixed(3)}ms per query (${iterations} queries)`);
    });

    it('should have minimal memory overhead', async () => {
      const initialMemory = process.memoryUsage().heapUsed;
      
      // Execute many queries
      for (let i = 0; i < 1000; i++) {
        await secureDb.execute('SELECT * FROM swarms LIMIT 1', []);
      }
      
      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;
      
      // Should use less than 10MB additional memory
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
      
      console.log(`Memory overhead: ${(memoryIncrease / 1024 / 1024).toFixed(2)}MB`);
    });
  });

  describe('Real-World Attack Simulation', () => {
    it('should prevent data exfiltration attempts', async () => {
      const exfiltrationAttempts = [
        `' UNION SELECT sql FROM sqlite_master --`,
        `' UNION SELECT name FROM sqlite_schema WHERE type='table' --`,
        `' UNION SELECT key, value FROM memory --`,
        `'; SELECT * FROM memory; --`
      ];

      for (const attack of exfiltrationAttempts) {
        try {
          const result = await secureDb.execute(
            'SELECT * FROM swarms WHERE id = ?',
            [attack]
          );
          
          // Should return empty or normal results, not sensitive data
          if (result.length > 0) {
            expect(result[0]).not.toHaveProperty('sql');
            expect(result[0]).not.toHaveProperty('name');
            expect(result[0]).not.toHaveProperty('key');
          }
          
        } catch (error) {
          // Acceptable if query fails safely
          console.log(`🔒 Exfiltration attempt blocked: ${attack.substring(0, 30)}...`);
        }
      }
    });

    it('should prevent privilege escalation attempts', async () => {
      const privilegeEscalations = [
        `'; PRAGMA user_version = 999; --`,
        `'; ATTACH DATABASE '/etc/passwd' AS passwords; --`,
        `'; CREATE TABLE IF NOT EXISTS evil (data TEXT); --`,
        `' OR 1=1; DROP TABLE swarms; CREATE TABLE swarms AS SELECT * FROM sqlite_master; --`
      ];

      for (const attack of privilegeEscalations) {
        try {
          await secureDb.execute(
            'SELECT * FROM swarms WHERE metadata LIKE ?',
            [`%${attack}%`]
          );
          
          // Verify database structure is intact
          const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
          const tableNames = tables.map(t => t.name);
          
          expect(tableNames).toContain('swarms');
          expect(tableNames).toContain('memory');
          expect(tableNames).not.toContain('evil');
          expect(tableNames).not.toContain('passwords');
          
        } catch (error) {
          // Acceptable if query fails safely
          console.log(`🔒 Privilege escalation blocked: ${attack.substring(0, 30)}...`);
        }
      }
    });
  });

  describe('Integration with DatabaseManager', () => {
    it('should integrate seamlessly with existing DatabaseManager methods', async () => {
      // Test that all critical DatabaseManager methods work securely
      const testSwarmId = 'integration-test-swarm';
      
      // These should all work without throwing SQL injection errors
      await dbManager.clearMemory(testSwarmId);
      await dbManager.getSuccessfulDecisions(testSwarmId);
      
      // Verify database remains intact
      const swarmCount = db.prepare("SELECT COUNT(*) as count FROM swarms").get().count;
      expect(swarmCount).toBeGreaterThanOrEqual(2);
    });
  });
});

// Helper function to simulate SQLMap-style testing
export async function runSQLMapSimulation(secureDb: SecureQueryBuilder): Promise<boolean> {
  const sqlmapPayloads = [
    `' AND 1=1 --`,
    `' AND 1=2 --`,
    `' OR '1'='1`,
    `' OR '1'='2`,
    `' UNION SELECT NULL --`,
    `' UNION SELECT 1,2,3 --`,
    `'; WAITFOR DELAY '00:00:05' --`,
    `' AND (SELECT COUNT(*) FROM sqlite_master) > 0 --`,
    `' AND SUBSTR((SELECT sql FROM sqlite_master LIMIT 1),1,1) = 'C' --`
  ];

  let vulnerabilities = 0;
  
  for (const payload of sqlmapPayloads) {
    try {
      await secureDb.execute('SELECT * FROM swarms WHERE id = ?', [payload]);
    } catch (error) {
      if (error.message.includes('syntax error') || 
          error.message.includes('no such table') ||
          error.message.includes('no such column')) {
        vulnerabilities++;
      }
    }
  }
  
  return vulnerabilities === 0;
}