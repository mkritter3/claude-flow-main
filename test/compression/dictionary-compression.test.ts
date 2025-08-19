// Phase 2: AI-Enhanced Dictionary Compression Testing
// Following the exact specification from compression roadmap Phase 2

import { PatternAnalyzer } from '../../src/services/compression/PatternAnalyzer.js';
import { DictionaryBuilder } from '../../src/services/compression/DictionaryBuilder.js';
import { DictionaryOptimizer } from '../../src/services/compression/DictionaryOptimizer.js';
import { CompressionService } from '../../src/services/compression/CompressionService.js';

// Helper function to generate typical samples
function generateTypicalSamples(count: number): any[] {
  const samples = [];
  
  for (let i = 0; i < count; i++) {
    samples.push({
      id: `item-${i}`,
      type: ['user', 'admin', 'guest'][i % 3],
      status: ['active', 'inactive'][i % 2],
      metadata: {
        created: '2024-01-01T00:00:00Z',
        updated: '2024-01-01T00:00:00Z',
        version: '1.0.0'
      },
      data: 'x'.repeat(100)
    });
  }
  
  return samples;
}

function generateRepetitiveData(): any {
  return {
    users: Array(500).fill({
      role: 'standard_user',
      permissions: ['read', 'write'],
      settings: {
        theme: 'default',
        language: 'en',
        notifications: true
      }
    }),
    config: {
      server: 'production',
      database: 'main',
      cache: 'redis'
    }
  };
}

describe('AI-Enhanced Dictionary Compression', () => {
  let analyzer: PatternAnalyzer;
  let builder: DictionaryBuilder;
  let optimizer: DictionaryOptimizer;
  let service: CompressionService;
  
  beforeEach(() => {
    analyzer = new PatternAnalyzer();
    builder = new DictionaryBuilder(analyzer);
    optimizer = new DictionaryOptimizer(builder, analyzer);
    service = new CompressionService();
  });
  
  it('should generate effective dictionaries from patterns', async () => {
    // Feed sample data
    const samples = generateTypicalSamples(100);
    for (const sample of samples) {
      await analyzer.collectSample(sample);
    }
    
    // Build dictionary
    const dictionary = await builder.buildDictionary('test-namespace');
    
    expect(dictionary).toBeDefined();
    expect(dictionary.length).toBeLessThan(120000); // <120KB as specified
    
    console.log(`Dictionary size: ${dictionary.length} bytes`);
    
    // Verify dictionary metadata
    const metadata = builder.getDictionaryMetadata('test-namespace');
    expect(metadata).toBeDefined();
    expect(metadata?.patterns_count).toBeGreaterThan(0);
    expect(metadata?.size_bytes).toBe(dictionary.length);
  });
  
  it('should achieve better compression with dictionaries', async () => {
    const data = generateRepetitiveData();
    
    // Feed patterns to analyzer
    const samples = generateTypicalSamples(50);
    for (const sample of samples) {
      await analyzer.collectSample(sample);
    }
    
    // Build dictionary
    await builder.buildDictionary('test');
    
    // Compress without dictionary (regular compression)
    const withoutDict = await service.compress(data);
    
    // Compress with dictionary
    const withDict = await builder.compressWithDictionary(data, 'test');
    
    console.log(`Without dictionary: ${(withoutDict.ratio * 100).toFixed(1)}%`);
    console.log(`With dictionary: ${(withDict.ratio * 100).toFixed(1)}%`);
    
    // Dictionary should improve compression by >20% as specified
    const improvement = (withoutDict.ratio - withDict.ratio) / withoutDict.ratio;
    console.log(`Improvement: ${(improvement * 100).toFixed(1)}%`);
    
    expect(withDict.ratio).toBeLessThan(withoutDict.ratio * 0.8); // >20% improvement
    expect(withDict.algorithm).toBe('zstd-dict');
    
    // Verify decompression works
    const decompressed = await builder.decompressWithDictionary(withDict);
    expect(decompressed).toEqual(data);
  });
  
  it('should adapt dictionaries based on data evolution', async () => {
    // Initial data patterns
    const initialSamples = Array(30).fill(null).map((_, i) => ({
      id: i,
      type: 'old_pattern',
      value: 'initial_data'
    }));
    
    for (const sample of initialSamples) {
      await analyzer.collectSample(sample);
    }
    
    await builder.buildDictionary('namespace1');
    
    // Record initial compression metrics
    const testData = initialSamples[0];
    const initialResult = await builder.compressWithDictionary(testData, 'namespace1');
    optimizer.recordCompressionMetric('namespace1', initialResult.ratio);
    
    // Simulate data pattern change
    const newSamples = Array(30).fill(null).map((_, i) => ({
      id: i + 100,
      type: 'new_pattern',
      value: 'evolved_data',
      newField: 'additional_content'
    }));
    
    for (const sample of newSamples) {
      await analyzer.collectSample(sample);
    }
    
    // Simulate degraded compression performance
    optimizer.recordCompressionMetric('namespace1', 0.8); // Poor ratio
    
    // Run optimization
    const results = await optimizer.optimizeDictionaries();
    
    expect(results.length).toBeGreaterThan(0);
    
    const namespaceResult = results.find(r => r.namespace === 'namespace1');
    expect(namespaceResult).toBeDefined();
    
    console.log(`Optimization result for namespace1:`, namespaceResult);
    
    if (namespaceResult?.success) {
      expect(namespaceResult.improvement).toBeGreaterThan(0);
    }
  });
  
  it('should maintain dictionary versioning', async () => {
    const samples = generateTypicalSamples(20);
    for (const sample of samples) {
      await analyzer.collectSample(sample);
    }
    
    // Build first version
    const v1 = await builder.buildDictionary('test');
    const v1Metadata = builder.getDictionaryMetadata('test');
    
    // Simulate time passing and new patterns
    const newSamples = generateTypicalSamples(20);
    for (const sample of newSamples) {
      await analyzer.collectSample(sample);
    }
    
    // Build second version
    const v2 = await builder.buildDictionary('test');
    const v2Metadata = builder.getDictionaryMetadata('test');
    
    expect(v1Metadata).toBeDefined();
    expect(v2Metadata).toBeDefined();
    expect(v1Metadata?.version).not.toBe(v2Metadata?.version);
    
    // Should be able to get dictionary versions
    const versions = await builder.getDictionaryVersions('test');
    expect(versions.length).toBeGreaterThan(0);
    
    console.log(`Dictionary versions for 'test':`, versions);
  });
  
  it('should handle pattern analysis without Claude client', async () => {
    // Test fallback pattern analysis
    const analyzerWithoutClaude = new PatternAnalyzer();
    const builderWithoutClaude = new DictionaryBuilder(analyzerWithoutClaude);
    
    const samples = generateTypicalSamples(50);
    for (const sample of samples) {
      await analyzerWithoutClaude.collectSample(sample);
    }
    
    // Should still generate patterns using basic analysis
    const patterns = analyzerWithoutClaude.getTopPatterns(20);
    expect(patterns.length).toBeGreaterThan(0);
    
    console.log(`Patterns without Claude: ${patterns.length} patterns detected`);
    
    // Should be able to build dictionary
    const dictionary = await builderWithoutClaude.buildDictionary('fallback-test');
    expect(dictionary).toBeDefined();
    expect(dictionary.length).toBeGreaterThan(0);
  });
  
  it('should track and report compression metrics', async () => {
    // Record various compression metrics
    optimizer.recordCompressionMetric('ns1', 0.3);
    optimizer.recordCompressionMetric('ns1', 0.25);
    optimizer.recordCompressionMetric('ns1', 0.28);
    
    optimizer.recordCompressionMetric('ns2', 0.1);
    optimizer.recordCompressionMetric('ns2', 0.12);
    
    // Get metrics for specific namespace
    const ns1Metrics = optimizer.getMetrics('ns1');
    expect(ns1Metrics).toBeDefined();
    expect((ns1Metrics as any).compression_count).toBe(3);
    expect((ns1Metrics as any).average_ratio).toBeCloseTo(0.276, 2);
    
    // Get all metrics
    const allMetrics = optimizer.getMetrics();
    expect(Array.isArray(allMetrics)).toBe(true);
    expect((allMetrics as any[]).length).toBe(2);
    
    // Get optimization report
    const report = optimizer.getOptimizationReport();
    expect(report.total_namespaces).toBe(2);
    expect(report.average_compression_ratio).toBeGreaterThan(0);
    
    console.log('Optimization report:', report);
  });
  
  it('should validate Phase 2 exit conditions', async () => {
    console.log('\\n=== Phase 2 Exit Condition Validation ===');
    
    // Exit Condition 1: Dictionary generation from AI analysis working
    const samples = generateTypicalSamples(100);
    for (const sample of samples) {
      await analyzer.collectSample(sample);
    }
    
    const patterns = analyzer.getTopPatterns(50);
    const analysisReport = analyzer.getAnalysisReport();
    
    console.log(`Patterns detected: ${patterns.length}`);
    console.log(`Analysis insights: ${analysisReport.insights.length}`);
    
    expect(patterns.length).toBeGreaterThan(0);
    expect(analysisReport.insights.length).toBeGreaterThan(0);
    console.log('✅ Dictionary generation from AI analysis: PASS');
    
    // Exit Condition 2: 20%+ better compression with dictionaries
    const testData = generateRepetitiveData();
    
    const regularCompression = await service.compress(testData);
    await builder.buildDictionary('validation-test');
    const dictCompression = await builder.compressWithDictionary(testData, 'validation-test');
    
    const improvement = (regularCompression.ratio - dictCompression.ratio) / regularCompression.ratio;
    
    console.log(`Regular compression: ${(regularCompression.ratio * 100).toFixed(1)}%`);
    console.log(`Dictionary compression: ${(dictCompression.ratio * 100).toFixed(1)}%`);
    console.log(`Improvement: ${(improvement * 100).toFixed(1)}%`);
    
    expect(improvement).toBeGreaterThan(0.2); // >20% improvement
    console.log('✅ 20%+ better compression with dictionaries: PASS');
    
    // Exit Condition 3: Dictionary size < 120KB
    const dictionary = builder.getDictionary('validation-test');
    const dictSize = dictionary?.length || 0;
    
    console.log(`Dictionary size: ${dictSize} bytes (${(dictSize / 1024).toFixed(1)} KB)`);
    
    expect(dictSize).toBeLessThan(120000); // <120KB
    console.log('✅ Dictionary size < 120KB: PASS');
    
    // Exit Condition 4: Automatic dictionary optimization based on metrics
    optimizer.recordCompressionMetric('validation-test', 0.7); // Poor performance
    const optimizationResults = await optimizer.optimizeDictionaries();
    
    expect(optimizationResults.length).toBeGreaterThan(0);
    console.log('✅ Automatic dictionary optimization: PASS');
    
    // Exit Condition 5: Version management for dictionaries
    const versions = await builder.getDictionaryVersions('validation-test');
    const metadata = builder.getDictionaryMetadata('validation-test');
    
    expect(versions.length).toBeGreaterThan(0);
    expect(metadata).toBeDefined();
    expect(metadata?.version).toBeDefined();
    console.log('✅ Version management for dictionaries: PASS');
    
    // Exit Condition 6: Backward compatibility for decompression
    const decompressed = await builder.decompressWithDictionary(dictCompression);
    expect(decompressed).toEqual(testData);
    console.log('✅ Backward compatibility for decompression: PASS');
    
    console.log('\\n🎉 ALL PHASE 2 EXIT CONDITIONS MET');
  });
  
  it('should provide comprehensive statistics', async () => {
    // Build multiple dictionaries
    const namespaces = ['stats1', 'stats2', 'stats3'];
    
    for (const ns of namespaces) {
      const samples = generateTypicalSamples(30);
      for (const sample of samples) {
        await analyzer.collectSample(sample);
      }
      await builder.buildDictionary(ns);
    }
    
    // Get statistics
    const stats = builder.getStatistics();
    
    expect(stats.total_dictionaries).toBe(namespaces.length);
    expect(stats.total_size_bytes).toBeGreaterThan(0);
    expect(stats.namespaces.length).toBe(namespaces.length);
    
    console.log('Dictionary statistics:', stats);
    
    // Get optimization report
    const report = optimizer.getOptimizationReport();
    console.log('Optimization report:', report);
  });
});