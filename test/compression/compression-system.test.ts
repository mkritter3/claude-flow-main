/**
 * Compression System Test Suite
 * 
 * Comprehensive tests for CompressionManager and CompressionMiddleware
 * including performance benchmarks and integration scenarios.
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { CompressionManager } from '../../src/compression/CompressionManager';
import { CompressionMiddleware } from '../../src/compression/CompressionMiddleware';

describe('Compression System', () => {
  let compressionManager: CompressionManager;
  let middleware: CompressionMiddleware;

  const sampleData = {
    small: 'Hello, World!',
    medium: 'A'.repeat(5000),
    large: JSON.stringify({ data: 'X'.repeat(50000), metadata: { type: 'test' } }),
    json: { users: Array.from({ length: 1000 }, (_, i) => ({ id: i, name: `User${i}` })) },
    repetitive: 'TEST'.repeat(10000),
    random: Buffer.from(Array.from({ length: 10000 }, () => Math.floor(Math.random() * 256)))
  };

  beforeEach(() => {
    compressionManager = new CompressionManager({
      algorithm: 'auto',
      level: 6,
      threshold: 100,
      enableStats: true,
      adaptiveSelection: true
    });

    middleware = new CompressionMiddleware(compressionManager, {
      enableCompression: true,
      compressionThreshold: 100,
      fallbackToUncompressed: true,
      logPerformance: false
    });
  });

  afterEach(() => {
    compressionManager.resetStats();
  });

  describe('CompressionManager', () => {
    it('should compress and decompress data correctly', async () => {
      const original = Buffer.from(sampleData.medium);
      
      const compressed = await compressionManager.compress(original);
      expect(compressed.compressedSize).toBeLessThan(compressed.originalSize);
      expect(compressed.algorithm).toBeOneOf(['gzip', 'deflate', 'brotli']);
      
      const decompressed = await compressionManager.decompress(compressed.compressed);
      expect(decompressed.decompressed).toEqual(original);
    });

    it('should handle small data below threshold', async () => {
      const small = Buffer.from(sampleData.small);
      
      const result = await compressionManager.compress(small, { threshold: 100 });
      expect(result.algorithm).toBe('none');
      expect(result.ratio).toBe(1.0);
      expect(result.compressed).toEqual(small);
    });

    it('should select optimal algorithm automatically', async () => {
      const repetitive = Buffer.from(sampleData.repetitive);
      const random = sampleData.random;
      
      const repetitiveResult = await compressionManager.compress(repetitive);
      const randomResult = await compressionManager.compress(random);
      
      expect(repetitiveResult.ratio).toBeLessThan(0.1); // Should compress very well
      expect(randomResult.ratio).toBeGreaterThan(0.9); // Should barely compress
    });

    it('should benchmark algorithms correctly', async () => {
      const testData = Buffer.from(sampleData.large);
      
      const benchmarkResults = await compressionManager.benchmarkAlgorithms(testData);
      
      expect(benchmarkResults.size).toBeGreaterThan(0);
      for (const [algorithm, performance] of benchmarkResults) {
        expect(['gzip', 'deflate', 'brotli']).toContain(algorithm);
        expect(performance.averageRatio).toBeGreaterThan(0);
        expect(performance.averageSpeed).toBeGreaterThan(0);
        expect(performance.reliability).toBeGreaterThanOrEqual(0);
        expect(performance.reliability).toBeLessThanOrEqual(100);
      }
    });

    it('should maintain compression statistics', async () => {
      const data1 = Buffer.from(sampleData.medium);
      const data2 = Buffer.from(sampleData.large);
      
      await compressionManager.compress(data1);
      await compressionManager.compress(data2);
      
      const stats = compressionManager.getStatistics();
      expect(stats.totalOperations).toBe(2);
      expect(stats.totalOriginalBytes).toBeGreaterThan(0);
      expect(stats.totalCompressedBytes).toBeGreaterThan(0);
      expect(stats.averageRatio).toBeGreaterThan(0);
      expect(stats.averageCompressionTime).toBeGreaterThan(0);
    });

    it('should handle batch compression efficiently', async () => {
      const batchData = [
        { id: 'item1', data: sampleData.medium },
        { id: 'item2', data: sampleData.json },
        { id: 'item3', data: sampleData.repetitive }
      ];
      
      const startTime = Date.now();
      const results = await compressionManager.batchCompress(batchData);
      const totalTime = Date.now() - startTime;
      
      expect(results).toHaveLength(3);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      for (const result of results) {
        expect(result.result.compressedSize).toBeLessThanOrEqual(result.result.originalSize);
      }
    });

    it('should handle different compression levels', async () => {
      const data = Buffer.from(sampleData.large);
      
      const fastCompression = await compressionManager.compress(data, { level: 1 });
      const bestCompression = await compressionManager.compress(data, { level: 9 });
      
      expect(fastCompression.compressionTime).toBeLessThan(bestCompression.compressionTime);
      expect(bestCompression.ratio).toBeLessThanOrEqual(fastCompression.ratio);
    });

    it('should handle compression errors gracefully', async () => {
      // Test with corrupted data for decompression
      const corruptedData = Buffer.from('invalid compressed data');
      
      await expect(compressionManager.decompress(corruptedData))
        .rejects
        .toThrow('Decompression failed');
    });
  });

  describe('CompressionMiddleware', () => {
    it('should compress data before storage', async () => {
      const testData = { message: sampleData.medium, timestamp: Date.now() };
      
      const result = await middleware.beforeStore(testData);
      
      expect(result.metadata.isCompressed).toBe(true);
      expect(result.metadata.compressedSize).toBeLessThan(result.metadata.originalSize);
      expect(result.data).toBeInstanceOf(Buffer);
    });

    it('should decompress data after retrieval', async () => {
      const testData = { users: sampleData.json.users.slice(0, 100) };
      
      const stored = await middleware.beforeStore(testData);
      const retrieved = await middleware.afterRetrieve(stored.data, stored.metadata);
      
      expect(retrieved).toEqual(testData);
    });

    it('should handle memory entry compression', async () => {
      const memoryEntry = {
        id: 'test-memory',
        content: sampleData.large,
        metadata: { type: 'important', created: Date.now() }
      };
      
      const compressed = await middleware.compressMemoryEntry(memoryEntry);
      expect(compressed.metadata.isCompressed).toBe(true);
      expect(compressed.entry.compression_metadata).toBeDefined();
      
      const decompressed = await middleware.decompressMemoryEntry(compressed.entry);
      expect(decompressed.content).toBe(sampleData.large);
      expect(decompressed.compression_metadata).toBeUndefined();
    });

    it('should handle batch operations', async () => {
      const batchData = [
        { id: '1', data: sampleData.medium },
        { id: '2', data: sampleData.json },
        { id: '3', data: sampleData.repetitive }
      ];
      
      const compressed = await middleware.batchCompress(batchData);
      expect(compressed).toHaveLength(3);
      
      const decompressed = await middleware.batchDecompress(compressed);
      expect(decompressed).toHaveLength(3);
      
      for (let i = 0; i < batchData.length; i++) {
        expect(decompressed[i].data).toEqual(batchData[i].data);
      }
    });

    it('should compress query results', async () => {
      const queryResults = Array.from({ length: 500 }, (_, i) => ({
        id: i,
        name: `Item ${i}`,
        data: `Data for item ${i}`.repeat(10)
      }));
      
      const compressed = await middleware.compressQueryResult(queryResults);
      expect(compressed.resultCount).toBe(500);
      expect(compressed.metadata.isCompressed).toBe(true);
      
      const decompressed = await middleware.decompressQueryResult(
        compressed.data,
        compressed.metadata,
        compressed.resultCount
      );
      expect(decompressed).toEqual(queryResults);
    });

    it('should fallback to uncompressed on errors', async () => {
      // Mock compression manager to throw errors
      const errorManager = new CompressionManager();
      jest.spyOn(errorManager, 'compress').mockRejectedValue(new Error('Compression failed'));
      
      const errorMiddleware = new CompressionMiddleware(errorManager, {
        fallbackToUncompressed: true
      });
      
      const result = await errorMiddleware.beforeStore(sampleData.medium);
      expect(result.metadata.isCompressed).toBe(false);
      expect(result.metadata.algorithm).toBe('none');
    });

    it('should handle different data types correctly', async () => {
      const testCases = [
        { name: 'string', data: 'Hello World' },
        { name: 'buffer', data: Buffer.from('Hello Buffer') },
        { name: 'object', data: { key: 'value', number: 42 } },
        { name: 'array', data: [1, 2, 3, 'four', { five: 5 }] },
        { name: 'null', data: null },
        { name: 'boolean', data: true }
      ];
      
      for (const testCase of testCases) {
        const stored = await middleware.beforeStore(testCase.data);
        const retrieved = await middleware.afterRetrieve(stored.data, stored.metadata);
        
        expect(retrieved).toEqual(testCase.data);
      }
    });

    it('should respect compression threshold settings', async () => {
      const smallData = 'small';
      const largeData = 'X'.repeat(2000);
      
      middleware.updateOptions({ compressionThreshold: 1000 });
      
      const smallResult = await middleware.beforeStore(smallData);
      const largeResult = await middleware.beforeStore(largeData);
      
      expect(smallResult.metadata.isCompressed).toBe(false);
      expect(largeResult.metadata.isCompressed).toBe(true);
    });
  });

  describe('Performance Requirements', () => {
    it('should meet compression speed requirements', async () => {
      const testData = Buffer.from(sampleData.large);
      const iterations = 10;
      
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await compressionManager.compress(testData);
      }
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(1000); // Should compress within 1 second on average
      console.log(`Average compression time: ${avgTime.toFixed(2)}ms`);
    });

    it('should meet decompression speed requirements', async () => {
      const testData = Buffer.from(sampleData.large);
      const compressed = await compressionManager.compress(testData);
      const iterations = 20;
      
      const startTime = Date.now();
      for (let i = 0; i < iterations; i++) {
        await compressionManager.decompress(compressed.compressed);
      }
      const totalTime = Date.now() - startTime;
      const avgTime = totalTime / iterations;
      
      expect(avgTime).toBeLessThan(200); // Decompression should be faster
      console.log(`Average decompression time: ${avgTime.toFixed(2)}ms`);
    });

    it('should achieve reasonable compression ratios', async () => {
      const testCases = [
        { name: 'JSON data', data: Buffer.from(JSON.stringify(sampleData.json)) },
        { name: 'Repetitive text', data: Buffer.from(sampleData.repetitive) },
        { name: 'Large text', data: Buffer.from(sampleData.large) }
      ];
      
      for (const testCase of testCases) {
        const result = await compressionManager.compress(testCase.data);
        console.log(`${testCase.name}: ${(result.ratio * 100).toFixed(1)}% of original size`);
        
        if (testCase.name === 'Repetitive text') {
          expect(result.ratio).toBeLessThan(0.1); // Should compress to <10%
        } else {
          expect(result.ratio).toBeLessThan(0.8); // Should compress to <80%
        }
      }
    });

    it('should handle high concurrency', async () => {
      const testData = Buffer.from(sampleData.medium);
      const concurrentOperations = 50;
      
      const promises = Array.from({ length: concurrentOperations }, async (_, i) => {
        const compressed = await compressionManager.compress(testData);
        const decompressed = await compressionManager.decompress(compressed.compressed);
        return { i, success: decompressed.decompressed.equals(testData) };
      });
      
      const startTime = Date.now();
      const results = await Promise.all(promises);
      const totalTime = Date.now() - startTime;
      
      expect(results.every(r => r.success)).toBe(true);
      expect(totalTime).toBeLessThan(10000); // Should complete within 10 seconds
      
      console.log(`${concurrentOperations} concurrent operations completed in ${totalTime}ms`);
    });
  });

  describe('Integration Scenarios', () => {
    it('should integrate with database storage simulation', async () => {
      // Simulate database records
      const records = Array.from({ length: 100 }, (_, i) => ({
        id: i,
        content: `Record ${i}: ${sampleData.medium}`,
        metadata: { created: Date.now() - i * 1000 }
      }));
      
      // Compress records for storage
      const compressedRecords = [];
      for (const record of records) {
        const result = await middleware.beforeStore(record);
        compressedRecords.push({
          id: record.id,
          data: result.data,
          metadata: result.metadata
        });
      }
      
      // Simulate storage savings
      const originalSize = records.reduce((sum, r) => sum + JSON.stringify(r).length, 0);
      const compressedSize = compressedRecords.reduce((sum, r) => sum + r.data.length, 0);
      const savings = ((originalSize - compressedSize) / originalSize) * 100;
      
      console.log(`Storage savings: ${savings.toFixed(1)}%`);
      expect(savings).toBeGreaterThan(0);
      
      // Verify retrieval works correctly
      const retrievedRecords = [];
      for (const compressed of compressedRecords) {
        const decompressed = await middleware.afterRetrieve(compressed.data, compressed.metadata);
        retrievedRecords.push(decompressed);
      }
      
      expect(retrievedRecords).toEqual(records);
    });

    it('should integrate with memory management simulation', async () => {
      // Simulate memory entries with different sizes
      const memoryEntries = [
        { id: 'small', content: sampleData.small, priority: 'low' },
        { id: 'medium', content: sampleData.medium, priority: 'medium' },
        { id: 'large', content: sampleData.large, priority: 'high' },
        { id: 'json', content: JSON.stringify(sampleData.json), priority: 'medium' }
      ];
      
      // Process through compression middleware
      const processedEntries = [];
      for (const entry of memoryEntries) {
        const result = await middleware.compressMemoryEntry(entry);
        processedEntries.push(result.entry);
      }
      
      // Verify compression was applied appropriately
      for (let i = 0; i < memoryEntries.length; i++) {
        const original = memoryEntries[i];
        const processed = processedEntries[i];
        
        if (original.content.length >= middleware.getOptions().compressionThreshold) {
          expect(processed.compression_metadata?.isCompressed).toBe(true);
        }
      }
      
      // Verify decompression works
      const decompressedEntries = [];
      for (const entry of processedEntries) {
        const decompressed = await middleware.decompressMemoryEntry(entry);
        decompressedEntries.push(decompressed);
      }
      
      // Remove compression metadata for comparison
      const cleanedDecompressed = decompressedEntries.map(e => ({
        id: e.id,
        content: e.content,
        priority: e.priority
      }));
      
      expect(cleanedDecompressed).toEqual(memoryEntries);
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