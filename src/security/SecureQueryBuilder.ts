/**
 * Secure Query Builder - SQL Injection Prevention
 * 
 * This class provides a secure wrapper around database operations
 * to prevent SQL injection attacks through parameterized queries.
 */

import { Database } from 'better-sqlite3';

export interface QueryValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
}

export class SecureQueryBuilder {
  private db: Database;
  private queryLog: QueryLog[] = [];
  
  constructor(database: Database) {
    this.db = database;
  }

  /**
   * Validates that query contains no direct string interpolation
   */
  private validateNoInterpolation(query: string): void {
    // Check for ${...} template literals
    if (/\$\{.*\}/.test(query)) {
      throw new Error('Direct interpolation detected in query - use parameterized queries instead');
    }
    
    // Check for common injection patterns
    const suspiciousPatterns = [
      /['"][^'"]*['"].*[+].*['"][^'"]*['"]/,  // String concatenation
      /exec\s*\(/i,                           // Dynamic execution
      /eval\s*\(/i,                           // Dynamic evaluation
    ];
    
    for (const pattern of suspiciousPatterns) {
      if (pattern.test(query)) {
        throw new Error(`Suspicious pattern detected in query: ${pattern.toString()}`);
      }
    }
  }

  /**
   * Validates query structure and parameters
   */
  private validateQuery(query: string, params: any[]): QueryValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];

    // Count parameter placeholders
    const placeholders = (query.match(/\?/g) || []).length;
    if (placeholders !== params.length) {
      errors.push(`Parameter count mismatch: ${placeholders} placeholders, ${params.length} parameters`);
    }

    // Check for potentially dangerous operations without WHERE clause
    const dangerousOps = ['DELETE', 'UPDATE', 'DROP'];
    for (const op of dangerousOps) {
      if (query.toUpperCase().includes(op) && !query.toUpperCase().includes('WHERE')) {
        warnings.push(`${op} operation without WHERE clause detected`);
      }
    }

    // Validate parameter types
    for (let i = 0; i < params.length; i++) {
      const param = params[i];
      if (typeof param === 'object' && param !== null) {
        errors.push(`Parameter ${i} is an object - only primitive types allowed`);
      }
      if (typeof param === 'function') {
        errors.push(`Parameter ${i} is a function - not allowed`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * Logs query execution for monitoring and analysis
   */
  private logQuery(query: string, params: any[], executionTime: number): void {
    this.queryLog.push({
      timestamp: Date.now(),
      query: this.normalizeQuery(query),
      paramCount: params.length,
      executionTime,
      hash: this.generateQueryHash(query)
    });

    // Rotate log when it gets too large
    if (this.queryLog.length > 10000) {
      this.queryLog = this.queryLog.slice(-5000); // Keep last 5000 entries
    }
  }

  /**
   * Normalizes query for pattern analysis
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\?/g, '?')            // Normalize parameter placeholders
      .trim()
      .toLowerCase();
  }

  /**
   * Generates hash for query pattern matching
   */
  private generateQueryHash(query: string): string {
    const normalized = this.normalizeQuery(query);
    // Simple hash function for pattern matching
    let hash = 0;
    for (let i = 0; i < normalized.length; i++) {
      const char = normalized.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return hash.toString(16);
  }

  /**
   * Executes a parameterized query safely
   */
  async execute(query: string, params: any[] = []): Promise<any> {
    const startTime = Date.now();

    try {
      // Validate query structure
      this.validateNoInterpolation(query);
      
      const validation = this.validateQuery(query, params);
      if (!validation.isValid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }

      // Log warnings
      if (validation.warnings.length > 0) {
        console.warn('Query warnings:', validation.warnings);
      }

      // Execute the query
      const statement = this.db.prepare(query);
      const result = statement.all(...params);

      // Log successful execution
      const executionTime = Date.now() - startTime;
      this.logQuery(query, params, executionTime);

      return result;
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logQuery(query, params, executionTime);
      
      console.error('Secure query execution failed:', {
        query: this.normalizeQuery(query),
        paramCount: params.length,
        error: error.message,
        executionTime
      });
      
      throw error;
    }
  }

  /**
   * Executes a query that returns a single row
   */
  async get(query: string, params: any[] = []): Promise<any> {
    const results = await this.execute(query, params);
    return results.length > 0 ? results[0] : null;
  }

  /**
   * Executes a query that modifies data (INSERT, UPDATE, DELETE)
   */
  async run(query: string, params: any[] = []): Promise<RunResult> {
    const startTime = Date.now();

    try {
      this.validateNoInterpolation(query);
      
      const validation = this.validateQuery(query, params);
      if (!validation.isValid) {
        throw new Error(`Query validation failed: ${validation.errors.join(', ')}`);
      }

      const statement = this.db.prepare(query);
      const info = statement.run(...params);

      const executionTime = Date.now() - startTime;
      this.logQuery(query, params, executionTime);

      return {
        changes: info.changes,
        lastInsertRowid: info.lastInsertRowid
      };
    } catch (error) {
      const executionTime = Date.now() - startTime;
      this.logQuery(query, params, executionTime);
      
      console.error('Secure query run failed:', {
        query: this.normalizeQuery(query),
        paramCount: params.length,
        error: error.message,
        executionTime
      });
      
      throw error;
    }
  }

  /**
   * Gets query execution statistics
   */
  getQueryStats(): QueryStats {
    if (this.queryLog.length === 0) {
      return {
        totalQueries: 0,
        averageExecutionTime: 0,
        uniquePatterns: 0,
        recentQueries: []
      };
    }

    const totalTime = this.queryLog.reduce((sum, log) => sum + log.executionTime, 0);
    const uniqueHashes = new Set(this.queryLog.map(log => log.hash));

    return {
      totalQueries: this.queryLog.length,
      averageExecutionTime: totalTime / this.queryLog.length,
      uniquePatterns: uniqueHashes.size,
      recentQueries: this.queryLog.slice(-10).map(log => ({
        query: log.query,
        executionTime: log.executionTime,
        timestamp: log.timestamp
      }))
    };
  }

  /**
   * Clears query log
   */
  clearLog(): void {
    this.queryLog = [];
  }
}

// Type definitions
interface QueryLog {
  timestamp: number;
  query: string;
  paramCount: number;
  executionTime: number;
  hash: string;
}

interface RunResult {
  changes: number;
  lastInsertRowid: number | bigint;
}

interface QueryStats {
  totalQueries: number;
  averageExecutionTime: number;
  uniquePatterns: number;
  recentQueries: Array<{
    query: string;
    executionTime: number;
    timestamp: number;
  }>;
}