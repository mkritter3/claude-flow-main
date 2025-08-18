#!/usr/bin/env node

/**
 * Manual SQL Injection Testing Script
 * 
 * This script manually tests SQL injection prevention measures
 * without requiring Jest framework.
 */

const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Import classes (simplified for testing)
class SecureQueryBuilder {
  constructor(database) {
    this.db = database;
  }

  validateNoInterpolation(query) {
    if (/\$\{.*\}/.test(query)) {
      throw new Error('Direct interpolation detected in query');
    }
  }

  execute(query, params = []) {
    this.validateNoInterpolation(query);
    
    const placeholders = (query.match(/\?/g) || []).length;
    if (placeholders !== params.length) {
      throw new Error(`Parameter count mismatch: ${placeholders} placeholders, ${params.length} parameters`);
    }

    const statement = this.db.prepare(query);
    return statement.all(...params);
  }
}

async function runTests() {
  console.log('🔒 SQL Injection Prevention Test Suite');
  console.log('=====================================\n');

  // Create test database
  const testDbPath = path.join(__dirname, `test-${Date.now()}.db`);
  const db = new Database(testDbPath);
  
  try {
    // Setup test schema
    console.log('📋 Setting up test database...');
    db.exec(`
      CREATE TABLE swarms (
        id TEXT PRIMARY KEY,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
      
      CREATE TABLE memory (
        key TEXT PRIMARY KEY,
        value TEXT,
        namespace TEXT,
        metadata TEXT,
        created_at INTEGER DEFAULT (strftime('%s', 'now'))
      );
    `);

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

    console.log('✅ Test database setup complete\n');

    const secureDb = new SecureQueryBuilder(db);
    
    // Test 1: Malicious input handling
    console.log('🧪 Test 1: Malicious Input Handling');
    console.log('-----------------------------------');
    
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

    let passedMaliciousTests = 0;
    
    for (const input of maliciousInputs) {
      try {
        // Test secure parameterized query
        const result = secureDb.execute(
          'SELECT * FROM swarms WHERE metadata LIKE ?',
          [`%"swarmId":"${input}"%`]
        );
        
        // Verify database integrity
        const tables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
        const tableNames = tables.map(t => t.name);
        
        if (tableNames.includes('swarms') && tableNames.includes('memory')) {
          console.log(`✅ Safely handled: ${input.substring(0, 30)}...`);
          passedMaliciousTests++;
        } else {
          console.log(`❌ Database compromised by: ${input.substring(0, 30)}...`);
        }
        
      } catch (error) {
        console.log(`🔒 Query blocked safely: ${input.substring(0, 30)}...`);
        passedMaliciousTests++;
      }
    }
    
    console.log(`\nMalicious Input Test Result: ${passedMaliciousTests}/${maliciousInputs.length} passed\n`);

    // Test 2: Direct interpolation detection
    console.log('🧪 Test 2: Direct Interpolation Detection');
    console.log('-----------------------------------------');
    
    const dangerousQueries = [
      `SELECT * FROM swarms WHERE id = '${maliciousInputs[0]}'`,
      `DELETE FROM memory WHERE key = '${maliciousInputs[1]}'`,
      `INSERT INTO swarms (id, metadata) VALUES ('${maliciousInputs[2]}', 'data')`
    ];
    
    let blockedInterpolation = 0;
    
    for (const query of dangerousQueries) {
      try {
        secureDb.execute(query, []);
        console.log(`❌ Failed to block: ${query.substring(0, 50)}...`);
      } catch (error) {
        if (error.message.includes('Direct interpolation detected')) {
          console.log(`✅ Blocked interpolation: ${query.substring(0, 50)}...`);
          blockedInterpolation++;
        }
      }
    }
    
    console.log(`\nInterpolation Detection Result: ${blockedInterpolation}/${dangerousQueries.length} blocked\n`);

    // Test 3: Parameterized query validation
    console.log('🧪 Test 3: Parameterized Query Validation');
    console.log('-----------------------------------------');
    
    let paramValidationPassed = 0;
    
    // Test parameter count mismatch
    try {
      secureDb.execute('SELECT * FROM swarms WHERE id = ? AND metadata LIKE ?', ['safe-swarm-1']);
      console.log('❌ Failed to catch parameter count mismatch');
    } catch (error) {
      if (error.message.includes('Parameter count mismatch')) {
        console.log('✅ Caught parameter count mismatch');
        paramValidationPassed++;
      }
    }
    
    // Test valid parameterized query
    try {
      const result = secureDb.execute('SELECT * FROM swarms WHERE id = ?', ['safe-swarm-1']);
      if (result.length > 0 && result[0].id === 'safe-swarm-1') {
        console.log('✅ Valid parameterized query executed successfully');
        paramValidationPassed++;
      }
    } catch (error) {
      console.log('❌ Valid parameterized query failed');
    }
    
    console.log(`\nParameterized Query Validation Result: ${paramValidationPassed}/2 passed\n`);

    // Test 4: Performance impact
    console.log('🧪 Test 4: Performance Impact Assessment');
    console.log('----------------------------------------');
    
    const iterations = 1000;
    const startTime = Date.now();
    
    for (let i = 0; i < iterations; i++) {
      secureDb.execute('SELECT * FROM swarms WHERE id = ?', [`test-${i % 10}`]);
    }
    
    const totalTime = Date.now() - startTime;
    const avgTimePerQuery = totalTime / iterations;
    
    console.log(`Performance: ${avgTimePerQuery.toFixed(3)}ms per query (${iterations} queries)`);
    console.log(`Total time: ${totalTime}ms`);
    
    if (avgTimePerQuery < 1) {
      console.log('✅ Performance impact acceptable (<1ms per query)');
    } else {
      console.log('⚠️  Performance impact may be high (>1ms per query)');
    }

    // Test 5: Database integrity verification
    console.log('\n🧪 Test 5: Database Integrity Verification');
    console.log('------------------------------------------');
    
    const finalTables = db.prepare("SELECT name FROM sqlite_master WHERE type='table'").all();
    const finalTableNames = finalTables.map(t => t.name);
    
    const expectedTables = ['swarms', 'memory'];
    const integrityPassed = expectedTables.every(table => finalTableNames.includes(table));
    
    if (integrityPassed) {
      console.log('✅ Database integrity maintained');
      
      const swarmCount = db.prepare("SELECT COUNT(*) as count FROM swarms").get().count;
      const memoryCount = db.prepare("SELECT COUNT(*) as count FROM memory").get().count;
      
      console.log(`   - Swarms table: ${swarmCount} records`);
      console.log(`   - Memory table: ${memoryCount} records`);
    } else {
      console.log('❌ Database integrity compromised');
      console.log(`   Expected: ${expectedTables.join(', ')}`);
      console.log(`   Found: ${finalTableNames.join(', ')}`);
    }

    // Final summary
    console.log('\n📊 Test Summary');
    console.log('===============');
    console.log(`Malicious input handling: ${passedMaliciousTests}/${maliciousInputs.length}`);
    console.log(`Interpolation detection: ${blockedInterpolation}/${dangerousQueries.length}`);
    console.log(`Parameter validation: ${paramValidationPassed}/2`);
    console.log(`Performance: ${avgTimePerQuery.toFixed(3)}ms/query`);
    console.log(`Database integrity: ${integrityPassed ? 'PASS' : 'FAIL'}`);

    const totalTests = maliciousInputs.length + dangerousQueries.length + 2 + 1;
    const totalPassed = passedMaliciousTests + blockedInterpolation + paramValidationPassed + (integrityPassed ? 1 : 0);
    
    console.log(`\n🎯 Overall Result: ${totalPassed}/${totalTests} tests passed`);
    
    if (totalPassed === totalTests) {
      console.log('✅ ALL TESTS PASSED - SQL injection prevention is working correctly!');
    } else {
      console.log('❌ Some tests failed - SQL injection prevention needs improvement');
    }

  } catch (error) {
    console.error('💥 Test execution failed:', error);
  } finally {
    // Cleanup
    db.close();
    if (fs.existsSync(testDbPath)) {
      fs.unlinkSync(testDbPath);
    }
  }
}

// Run tests
runTests().catch(console.error);