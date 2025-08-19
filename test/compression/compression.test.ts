// Compression Service Testing - Following roadmap specifications exactly
// Phase 1 Exit Conditions:
// - Real compression working (not JSON.stringify)
// - 90%+ compression for repetitive data  
// - < 50ms compression time for 100KB
// - 100% data integrity (compress/decompress cycle)
// - Graceful fallback on compression failure
// - Memory usage < 100MB for large files

import { CompressionService } from '../../src/services/compression/CompressionService.js';

describe('Compression Service', () => {
  let service: CompressionService;
  
  beforeEach(() => {
    service = new CompressionService();
  });
  
  it('should achieve significant compression for repetitive data', async () => {
    const data = {
      items: Array(1000).fill({ 
        id: 'test-id',
        value: 'repetitive-value',
        timestamp: 1234567890
      })
    };
    
    const result = await service.compress(data);
    
    expect(result.ratio).toBeLessThan(0.1); // >90% compression
    expect(result.compressed).toBe(true);
    expect(result.algorithm).toBe('zstd');
    
    console.log(`Repetitive data compression ratio: ${(result.ratio * 100).toFixed(2)}%`);
  });
  
  it('should correctly decompress data', async () => {
    const original = { 
      complex: 'data',
      nested: { values: [1, 2, 3] }
    };
    
    const compressed = await service.compress(original);
    const decompressed = await service.decompress(compressed);
    
    expect(decompressed).toEqual(original);
  });
  
  it('should handle various data types', async () => {
    const testCases = [
      { name: 'JSON', data: { key: 'value' } },
      { name: 'Array', data: [1, 2, 3, 4, 5] },
      { name: 'String', data: 'a'.repeat(10000) },
      { name: 'Mixed', data: { str: 'test', num: 123, bool: true } }
    ];
    
    for (const testCase of testCases) {
      const compressed = await service.compress(testCase.data);
      const decompressed = await service.decompress(compressed);
      
      expect(decompressed).toEqual(testCase.data);
      console.log(`${testCase.name}: ${(compressed.ratio * 100).toFixed(1)}% compression ratio`);
    }
  });
  
  it('should meet performance requirements', async () => {
    const data = { payload: 'x'.repeat(100000) }; // 100KB
    
    const start = Date.now();
    const compressed = await service.compress(data);
    const compressionTime = Date.now() - start;
    
    expect(compressionTime).toBeLessThan(50); // <50ms for 100KB
    
    const decompressStart = Date.now();
    await service.decompress(compressed);
    const decompressionTime = Date.now() - decompressStart;
    
    expect(decompressionTime).toBeLessThan(20); // <20ms
    
    console.log(`Performance: Compression ${compressionTime}ms, Decompression ${decompressionTime}ms`);
  });
  
  it('should verify data integrity through multiple cycles', async () => {
    const complexData = {
      users: Array(100).fill(null).map((_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        preferences: {
          theme: 'dark',
          notifications: true,
          language: 'en'
        },
        history: Array(10).fill('action').map((action, j) => `${action}-${j}`)
      }))
    };
    
    // Multiple compression/decompression cycles
    let currentData = complexData;
    for (let cycle = 0; cycle < 5; cycle++) {
      const compressed = await service.compress(currentData);
      currentData = await service.decompress(compressed);
      
      expect(currentData).toEqual(complexData);
    }
  });
  
  it('should include proper metadata and checksums', async () => {
    const data = { test: 'metadata verification' };
    const compressed = await service.compress(data);
    
    expect(compressed.metadata).toBeDefined();
    expect(compressed.metadata.timestamp).toBeGreaterThan(0);
    expect(compressed.metadata.checksum).toMatch(/^[a-f0-9]{64}$/); // SHA-256 hex
    expect(compressed.originalSize).toBeGreaterThan(0);
    expect(compressed.compressedSize).toBeGreaterThan(0);
    expect(compressed.compressionTime).toBeGreaterThanOrEqual(0);
  });
  
  it('should achieve target compression ratios for different data patterns', async () => {
    // Test different compression scenarios
    const scenarios = [
      {
        name: 'Highly repetitive',
        data: { items: Array(1000).fill({ same: 'data' }) },
        expectedRatio: 0.05 // >95% compression
      },
      {
        name: 'JSON with patterns',
        data: {
          records: Array(500).fill(null).map((_, i) => ({
            id: `record-${i}`,
            type: 'standard',
            status: 'active',
            metadata: { version: '1.0.0', created: '2024-01-01' }
          }))
        },
        expectedRatio: 0.15 // >85% compression
      },
      {
        name: 'Mixed content',
        data: {
          config: { server: 'localhost', port: 3000, ssl: true },
          logs: Array(200).fill('INFO: Process completed successfully'),
          cache: { key1: 'value1', key2: 'value2', key3: 'value3' }
        },
        expectedRatio: 0.2 // >80% compression
      }
    ];
    
    for (const scenario of scenarios) {
      const compressed = await service.compress(scenario.data);
      const decompressed = await service.decompress(compressed);
      
      console.log(`${scenario.name}: ${(compressed.ratio * 100).toFixed(1)}% compression`);
      
      expect(compressed.ratio).toBeLessThan(scenario.expectedRatio);
      expect(decompressed).toEqual(scenario.data);
    }
  });
  
  it('should handle edge cases gracefully', async () => {
    const edgeCases = [
      { name: 'Empty object', data: {} },
      { name: 'Null values', data: { a: null, b: undefined, c: '' } },
      { name: 'Special characters', data: { text: '💻🚀🔥 Special chars 中文 العربية' } },
      { name: 'Deep nesting', data: { a: { b: { c: { d: { e: 'deep' } } } } } },
      { name: 'Large numbers', data: { nums: Array(1000).fill(0).map((_, i) => Math.random() * 1000000) } }
    ];
    
    for (const testCase of edgeCases) {
      const compressed = await service.compress(testCase.data);
      const decompressed = await service.decompress(testCase.data);
      
      expect(decompressed).toEqual(testCase.data);
      console.log(`${testCase.name}: handled successfully`);
    }
  });
});