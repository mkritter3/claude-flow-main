/**
 * Query Logger - Advanced SQL Query Monitoring
 * 
 * Logs and analyzes database query patterns for anomaly detection
 * and security monitoring in the Claude-Flow system.
 */

export interface QueryLog {
  timestamp: number;
  query: string;
  params: any[];
  executionTime: number;
  hash: string;
  context: QueryContext;
  normalized: string;
}

export interface QueryContext {
  userId?: string;
  sessionId?: string;
  endpoint?: string;
  userAgent?: string;
  ipAddress?: string;
  swarmId?: string;
  operation: 'read' | 'write' | 'delete' | 'update';
}

export interface QueryPattern {
  hash: string;
  template: string;
  frequency: number;
  lastSeen: number;
  avgExecutionTime: number;
  paramPatterns: ParameterPattern[];
  riskScore: number;
}

export interface ParameterPattern {
  position: number;
  type: 'string' | 'number' | 'boolean' | 'null';
  minLength?: number;
  maxLength?: number;
  commonValues: string[];
  suspiciousCount: number;
}

export class QueryLogger {
  private history: QueryLog[] = [];
  private patterns: Map<string, QueryPattern> = new Map();
  private maxHistorySize = 10000;
  private patternUpdateThreshold = 100; // Update patterns every N queries
  private queryCount = 0;

  /**
   * Logs a database query with context and performance metrics
   */
  async log(
    query: string, 
    params: any[], 
    executionTime: number,
    context: QueryContext
  ): Promise<void> {
    const normalized = this.normalizeQuery(query);
    const hash = this.generateQueryHash(normalized);
    
    const logEntry: QueryLog = {
      timestamp: Date.now(),
      query,
      params: [...params], // Clone to avoid reference issues
      executionTime,
      hash,
      context,
      normalized
    };

    this.history.push(logEntry);
    this.queryCount++;

    // Update patterns periodically
    if (this.queryCount % this.patternUpdateThreshold === 0) {
      await this.updatePatterns();
    }

    // Rotate history if it gets too large
    if (this.history.length > this.maxHistorySize) {
      this.rotateLog();
    }
  }

  /**
   * Normalizes query for pattern analysis
   */
  private normalizeQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ')           // Normalize whitespace
      .replace(/\?/g, '?')            // Normalize parameter placeholders
      .replace(/\d+/g, 'N')           // Replace numbers with placeholder
      .replace(/'[^']*'/g, "'S'")     // Replace string literals
      .trim()
      .toLowerCase();
  }

  /**
   * Generates hash for query pattern matching
   */
  private generateQueryHash(normalizedQuery: string): string {
    let hash = 0;
    for (let i = 0; i < normalizedQuery.length; i++) {
      const char = normalizedQuery.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash).toString(16);
  }

  /**
   * Updates query patterns based on recent history
   */
  private async updatePatterns(): Promise<void> {
    const recentQueries = this.history.slice(-this.patternUpdateThreshold);
    const patternMap = new Map<string, QueryLog[]>();

    // Group queries by hash
    for (const query of recentQueries) {
      if (!patternMap.has(query.hash)) {
        patternMap.set(query.hash, []);
      }
      patternMap.get(query.hash)!.push(query);
    }

    // Update or create patterns
    for (const [hash, queries] of patternMap.entries()) {
      const pattern = this.analyzeQueryPattern(hash, queries);
      this.patterns.set(hash, pattern);
    }
  }

  /**
   * Analyzes queries to extract pattern information
   */
  private analyzeQueryPattern(hash: string, queries: QueryLog[]): QueryPattern {
    const existingPattern = this.patterns.get(hash);
    const frequency = (existingPattern?.frequency || 0) + queries.length;
    
    const totalExecutionTime = queries.reduce((sum, q) => sum + q.executionTime, 0);
    const avgExecutionTime = totalExecutionTime / queries.length;
    
    // Analyze parameter patterns
    const paramPatterns = this.analyzeParameterPatterns(queries);
    
    // Calculate risk score based on various factors
    const riskScore = this.calculateRiskScore(queries, paramPatterns);

    return {
      hash,
      template: queries[0].normalized,
      frequency,
      lastSeen: Math.max(...queries.map(q => q.timestamp)),
      avgExecutionTime,
      paramPatterns,
      riskScore
    };
  }

  /**
   * Analyzes parameter patterns across similar queries
   */
  private analyzeParameterPatterns(queries: QueryLog[]): ParameterPattern[] {
    if (queries.length === 0) return [];
    
    const maxParams = Math.max(...queries.map(q => q.params.length));
    const patterns: ParameterPattern[] = [];

    for (let i = 0; i < maxParams; i++) {
      const values = queries
        .filter(q => q.params[i] !== undefined)
        .map(q => q.params[i]);

      if (values.length === 0) continue;

      const pattern: ParameterPattern = {
        position: i,
        type: this.inferParameterType(values),
        commonValues: this.getCommonValues(values, 10),
        suspiciousCount: this.countSuspiciousValues(values)
      };

      // Add length statistics for strings
      const stringValues = values.filter(v => typeof v === 'string');
      if (stringValues.length > 0) {
        const lengths = stringValues.map(v => v.length);
        pattern.minLength = Math.min(...lengths);
        pattern.maxLength = Math.max(...lengths);
      }

      patterns.push(pattern);
    }

    return patterns;
  }

  /**
   * Infers the most common type for a parameter
   */
  private inferParameterType(values: any[]): 'string' | 'number' | 'boolean' | 'null' {
    const types = values.map(v => {
      if (v === null) return 'null';
      return typeof v as 'string' | 'number' | 'boolean';
    });

    const typeCounts = types.reduce((acc, type) => {
      acc[type] = (acc[type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(typeCounts)
      .sort((a, b) => b[1] - a[1])[0][0] as 'string' | 'number' | 'boolean' | 'null';
  }

  /**
   * Gets the most common values for a parameter
   */
  private getCommonValues(values: any[], limit: number): string[] {
    const valueCounts = values.reduce((acc, value) => {
      const key = String(value);
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return Object.entries(valueCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, limit)
      .map(([value]) => value);
  }

  /**
   * Counts suspicious parameter values
   */
  private countSuspiciousValues(values: any[]): number {
    const suspiciousPatterns = [
      /['";]/,                           // SQL injection characters
      /union\s+select/i,                 // UNION SELECT
      /drop\s+table/i,                   // DROP TABLE
      /delete\s+from/i,                  // DELETE FROM
      /insert\s+into/i,                  // INSERT INTO
      /exec\s*\(/i,                      // EXEC()
      /script\s*>/i,                     // Script tags
      /javascript:/i,                    // JavaScript protocol
      /data:/i,                          // Data protocol
      /\$\{.*\}/,                        // Template literals
      /<.*>/,                            // HTML/XML tags
    ];

    return values.filter(value => {
      if (typeof value !== 'string') return false;
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }).length;
  }

  /**
   * Calculates risk score for a query pattern
   */
  private calculateRiskScore(queries: QueryLog[], paramPatterns: ParameterPattern[]): number {
    let score = 0;

    // Base score from suspicious parameters
    const totalSuspicious = paramPatterns.reduce((sum, p) => sum + p.suspiciousCount, 0);
    const totalParams = queries.reduce((sum, q) => sum + q.params.length, 0);
    
    if (totalParams > 0) {
      score += (totalSuspicious / totalParams) * 50; // Up to 50 points
    }

    // Unusual execution time patterns
    const execTimes = queries.map(q => q.executionTime);
    const avgTime = execTimes.reduce((sum, t) => sum + t, 0) / execTimes.length;
    const variance = execTimes.reduce((sum, t) => sum + Math.pow(t - avgTime, 2), 0) / execTimes.length;
    
    if (variance > 1000) { // High variance in execution times
      score += 20;
    }

    // Unusual query frequency
    if (queries.length === 1) {
      score += 10; // New/rare queries are slightly more suspicious
    }

    // Context-based scoring
    const contexts = queries.map(q => q.context);
    const uniqueIPs = new Set(contexts.map(c => c.ipAddress)).size;
    const uniqueUsers = new Set(contexts.map(c => c.userId)).size;
    
    if (uniqueIPs > queries.length * 0.8) {
      score += 15; // Many different IPs for same query pattern
    }

    if (uniqueUsers > queries.length * 0.8) {
      score += 15; // Many different users for same query pattern
    }

    return Math.min(score, 100); // Cap at 100
  }

  /**
   * Rotates the query log to prevent memory issues
   */
  private rotateLog(): void {
    const keepSize = Math.floor(this.maxHistorySize * 0.7);
    this.history = this.history.slice(-keepSize);
    
    // Archive old data if needed
    this.archiveOldPatterns();
  }

  /**
   * Archives old patterns for long-term analysis
   */
  private archiveOldPatterns(): void {
    const cutoffTime = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days ago
    
    for (const [hash, pattern] of this.patterns.entries()) {
      if (pattern.lastSeen < cutoffTime) {
        // In production, this would save to persistent storage
        console.log(`Archiving old pattern: ${hash}`);
        this.patterns.delete(hash);
      }
    }
  }

  /**
   * Gets recent query patterns for analysis
   */
  getRecentPatterns(timeWindowMs: number = 3600000): QueryPattern[] {
    const cutoffTime = Date.now() - timeWindowMs;
    
    return Array.from(this.patterns.values())
      .filter(pattern => pattern.lastSeen >= cutoffTime)
      .sort((a, b) => b.frequency - a.frequency);
  }

  /**
   * Gets queries matching a specific pattern
   */
  getQueriesByPattern(hash: string, limit: number = 100): QueryLog[] {
    return this.history
      .filter(query => query.hash === hash)
      .slice(-limit);
  }

  /**
   * Gets suspicious queries based on risk scores
   */
  getSuspiciousQueries(minRiskScore: number = 30): QueryLog[] {
    const suspiciousHashes = Array.from(this.patterns.entries())
      .filter(([_, pattern]) => pattern.riskScore >= minRiskScore)
      .map(([hash, _]) => hash);

    return this.history.filter(query => suspiciousHashes.includes(query.hash));
  }

  /**
   * Gets query statistics
   */
  getStatistics(): {
    totalQueries: number;
    uniquePatterns: number;
    averageExecutionTime: number;
    suspiciousPatterns: number;
    recentActivity: number;
  } {
    const now = Date.now();
    const lastHour = now - 3600000;
    
    const recentQueries = this.history.filter(q => q.timestamp >= lastHour);
    const totalTime = this.history.reduce((sum, q) => sum + q.executionTime, 0);
    const suspiciousPatterns = Array.from(this.patterns.values())
      .filter(p => p.riskScore >= 30).length;

    return {
      totalQueries: this.history.length,
      uniquePatterns: this.patterns.size,
      averageExecutionTime: this.history.length > 0 ? totalTime / this.history.length : 0,
      suspiciousPatterns,
      recentActivity: recentQueries.length
    };
  }

  /**
   * Clears all query history (for testing/reset)
   */
  clear(): void {
    this.history = [];
    this.patterns.clear();
    this.queryCount = 0;
  }
}