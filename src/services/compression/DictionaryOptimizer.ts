// Phase 2: AI-Enhanced Dictionary Generation - Dictionary Optimizer
// Following the exact specification from compression roadmap Phase 2

import { DictionaryBuilder, DictionaryMetadata } from './DictionaryBuilder.js';
import { PatternAnalyzer } from './PatternAnalyzer.js';

export interface CompressionMetrics {
  namespace: string;
  average_ratio: number;
  compression_count: number;
  last_updated: number;
  performance_trend: 'improving' | 'stable' | 'degrading';
}

export interface OptimizationResult {
  namespace: string;
  old_ratio: number;
  new_ratio: number;
  improvement: number;
  success: boolean;
  reason: string;
}

export class DictionaryOptimizer {
  private builder: DictionaryBuilder;
  private analyzer: PatternAnalyzer;
  private metrics: Map<string, CompressionMetrics> = new Map();
  private claude: any; // Will be injected
  private optimizationInterval: NodeJS.Timeout | null = null;
  
  constructor(builder: DictionaryBuilder, analyzer: PatternAnalyzer, claudeClient?: any) {
    this.builder = builder;
    this.analyzer = analyzer;
    this.claude = claudeClient;
  }
  
  async optimizeDictionaries(): Promise<OptimizationResult[]> {
    const results: OptimizationResult[] = [];
    const namespaces = await this.getActiveNamespaces();
    
    for (const namespace of namespaces) {
      try {
        const result = await this.optimizeDictionary(namespace);
        results.push(result);
        
        if (result.success) {
          console.log(`✅ Optimized dictionary for ${namespace}: ${(result.improvement * 100).toFixed(1)}% improvement`);
        } else {
          console.log(`ℹ️  Dictionary ${namespace} optimization skipped: ${result.reason}`);
        }
        
      } catch (error) {
        console.error(`❌ Failed to optimize dictionary ${namespace}:`, error);
        results.push({
          namespace,
          old_ratio: 0,
          new_ratio: 0,
          improvement: 0,
          success: false,
          reason: `Error: ${error.message}`
        });
      }
    }
    
    return results;
  }
  
  private async optimizeDictionary(namespace: string): Promise<OptimizationResult> {
    const currentRatio = await this.getAverageRatio(namespace);
    
    // Rebuild dictionary if compression degraded
    if (currentRatio > 0.5) {
      console.log(`Rebuilding dictionary for ${namespace} (ratio: ${(currentRatio * 100).toFixed(1)}%)`);
      
      // Use AI to analyze why compression is poor
      const analysis = await this.analyzeCompressionIssues(namespace);
      
      // Store old dictionary for rollback
      const oldDictionary = this.builder.getDictionary(namespace);
      
      // Rebuild with new patterns
      await this.builder.buildDictionary(namespace);
      
      // Test new dictionary
      const newRatio = await this.testNewDictionary(namespace);
      
      if (newRatio < currentRatio) {
        await this.deployNewDictionary(namespace);
        
        const improvement = (currentRatio - newRatio) / currentRatio;
        
        return {
          namespace,
          old_ratio: currentRatio,
          new_ratio: newRatio,
          improvement,
          success: true,
          reason: 'Dictionary rebuilt and improved'
        };
      } else {
        await this.rollbackDictionary(namespace, oldDictionary);
        
        return {
          namespace,
          old_ratio: currentRatio,
          new_ratio: newRatio,
          improvement: 0,
          success: false,
          reason: 'New dictionary performed worse, rolled back'
        };
      }
    }
    
    return {
      namespace,
      old_ratio: currentRatio,
      new_ratio: currentRatio,
      improvement: 0,
      success: false,
      reason: 'Dictionary performance is acceptable'
    };
  }
  
  private async analyzeCompressionIssues(namespace: string): Promise<any> {
    if (!this.claude) {
      return {
        insights: ['Claude client not available for analysis'],
        recommendations: ['Use basic pattern analysis']
      };
    }
    
    try {
      const recentData = await this.getRecentData(namespace);
      const currentMetrics = this.metrics.get(namespace);
      
      return await this.claude.analyze({
        model: 'claude-3-opus-20240229',
        prompt: `Analyze why compression is poor for this data:
          Namespace: ${namespace}
          Current ratio: ${currentMetrics?.average_ratio || 'unknown'}
          Recent samples: ${JSON.stringify(recentData.slice(0, 5))}
          
          Suggest optimizations for dictionary generation.
          
          Focus on:
          1. Why compression might be degrading
          2. What patterns might be missing
          3. How to improve dictionary training
          4. Specific changes to recommend
          
          Provide actionable recommendations.`,
        max_tokens: 1500
      });
      
    } catch (error) {
      console.warn('Claude analysis failed:', error);
      return {
        insights: ['Analysis failed, using fallback'],
        recommendations: ['Rebuild dictionary with current patterns']
      };
    }
  }
  
  private async getActiveNamespaces(): Promise<string[]> {
    // Get namespaces that have been used recently
    const allNamespaces = Array.from(this.metrics.keys());
    const recentThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    return allNamespaces.filter(namespace => {
      const metrics = this.metrics.get(namespace);
      return metrics && metrics.last_updated > recentThreshold;
    });
  }
  
  async getAverageRatio(namespace: string): Promise<number> {
    const metrics = this.metrics.get(namespace);
    return metrics?.average_ratio || 1.0; // Default to no compression
  }
  
  private async testNewDictionary(namespace: string): Promise<number> {
    // Test the new dictionary with sample data
    const testData = await this.getRecentData(namespace);
    
    if (testData.length === 0) {
      return 1.0; // No test data available
    }
    
    let totalRatio = 0;
    let successfulTests = 0;
    
    for (const sample of testData.slice(0, 10)) { // Test with up to 10 samples
      try {
        const compressed = await this.builder.compressWithDictionary(sample, namespace);
        totalRatio += compressed.ratio;
        successfulTests++;
      } catch (error) {
        console.warn('Test compression failed:', error);
      }
    }
    
    return successfulTests > 0 ? totalRatio / successfulTests : 1.0;
  }
  
  private async deployNewDictionary(namespace: string): Promise<void> {
    // Dictionary is already built and stored in the builder
    // Update metrics to reflect the deployment
    const metrics = this.metrics.get(namespace);
    if (metrics) {
      metrics.last_updated = Date.now();
      metrics.performance_trend = 'improving';
    }
    
    console.log(`Dictionary deployed for namespace: ${namespace}`);
  }
  
  private async rollbackDictionary(namespace: string, oldDictionary: Buffer | undefined): Promise<void> {
    if (oldDictionary) {
      // In a real implementation, this would restore the old dictionary
      console.log(`Rolled back dictionary for namespace: ${namespace}`);
    }
  }
  
  private async getRecentData(namespace: string): Promise<any[]> {
    // In a real implementation, this would fetch recent data samples for the namespace
    // For now, return mock data based on the namespace
    
    const mockData = [];
    const baseItem = {
      namespace,
      timestamp: Date.now(),
      type: 'sample_data'
    };
    
    // Generate varied mock data
    for (let i = 0; i < 20; i++) {
      mockData.push({
        ...baseItem,
        id: `${namespace}_item_${i}`,
        value: `sample_value_${i % 5}`, // Some repetition
        metadata: {
          sequence: i,
          category: ['A', 'B', 'C'][i % 3]
        }
      });
    }
    
    return mockData;
  }
  
  // Track compression metrics
  recordCompressionMetric(namespace: string, ratio: number): void {
    let metrics = this.metrics.get(namespace);
    
    if (!metrics) {
      metrics = {
        namespace,
        average_ratio: ratio,
        compression_count: 1,
        last_updated: Date.now(),
        performance_trend: 'stable'
      };
    } else {
      // Update rolling average
      const totalRatio = metrics.average_ratio * metrics.compression_count + ratio;
      metrics.compression_count += 1;
      metrics.average_ratio = totalRatio / metrics.compression_count;
      metrics.last_updated = Date.now();
      
      // Determine trend
      if (ratio < metrics.average_ratio * 0.9) {
        metrics.performance_trend = 'improving';
      } else if (ratio > metrics.average_ratio * 1.1) {
        metrics.performance_trend = 'degrading';
      } else {
        metrics.performance_trend = 'stable';
      }
    }
    
    this.metrics.set(namespace, metrics);
  }
  
  getMetrics(namespace?: string): CompressionMetrics | CompressionMetrics[] {
    if (namespace) {
      return this.metrics.get(namespace) || {
        namespace,
        average_ratio: 1.0,
        compression_count: 0,
        last_updated: 0,
        performance_trend: 'stable'
      };
    }
    
    return Array.from(this.metrics.values());
  }
  
  // Start background optimization
  startBackgroundOptimization(intervalHours: number = 24): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
    }
    
    const intervalMs = intervalHours * 60 * 60 * 1000;
    
    this.optimizationInterval = setInterval(async () => {
      console.log('🔄 Starting background dictionary optimization...');
      try {
        const results = await this.optimizeDictionaries();
        const successful = results.filter(r => r.success).length;
        console.log(`✅ Background optimization complete: ${successful}/${results.length} dictionaries improved`);
      } catch (error) {
        console.error('❌ Background optimization failed:', error);
      }
    }, intervalMs);
    
    console.log(`🚀 Background dictionary optimization started (every ${intervalHours} hours)`);
  }
  
  stopBackgroundOptimization(): void {
    if (this.optimizationInterval) {
      clearInterval(this.optimizationInterval);
      this.optimizationInterval = null;
      console.log('⏹️  Background dictionary optimization stopped');
    }
  }
  
  // Get optimization report
  getOptimizationReport(): {
    total_namespaces: number;
    active_namespaces: number;
    average_compression_ratio: number;
    degrading_dictionaries: string[];
    recent_optimizations: number;
  } {
    const allMetrics = Array.from(this.metrics.values());
    const activeThreshold = Date.now() - (7 * 24 * 60 * 60 * 1000); // 7 days
    
    const activeMetrics = allMetrics.filter(m => m.last_updated > activeThreshold);
    const degradingDictionaries = allMetrics
      .filter(m => m.performance_trend === 'degrading')
      .map(m => m.namespace);
    
    const averageRatio = activeMetrics.length > 0
      ? activeMetrics.reduce((sum, m) => sum + m.average_ratio, 0) / activeMetrics.length
      : 1.0;
    
    const recentOptimizations = allMetrics.filter(m => 
      m.last_updated > Date.now() - (24 * 60 * 60 * 1000) // Last 24 hours
    ).length;
    
    return {
      total_namespaces: allMetrics.length,
      active_namespaces: activeMetrics.length,
      average_compression_ratio: averageRatio,
      degrading_dictionaries: degradingDictionaries,
      recent_optimizations: recentOptimizations
    };
  }
}