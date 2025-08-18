/**
 * CompressionManager - Advanced Data Compression System
 * 
 * Provides configurable compression algorithms for data storage,
 * message transmission, and memory optimization with real-time
 * performance monitoring and adaptive algorithm selection.
 */

import { EventEmitter } from 'events';
import * as zlib from 'zlib';
import { promisify } from 'util';

// Promisify compression methods
const gzip = promisify(zlib.gzip);
const gunzip = promisify(zlib.gunzip);
const deflate = promisify(zlib.deflate);
const inflate = promisify(zlib.inflate);
const brotliCompress = promisify(zlib.brotliCompress);
const brotliDecompress = promisify(zlib.brotliDecompress);

export interface CompressionOptions {
  algorithm: 'gzip' | 'deflate' | 'brotli' | 'auto';
  level: number; // 1-9 for gzip/deflate, 0-11 for brotli
  threshold: number; // Minimum size in bytes before compression
  enableStats: boolean;
  adaptiveSelection: boolean;
}

export interface CompressionResult {
  compressed: Buffer;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  algorithm: string;
  compressionTime: number;
}

export interface DecompressionResult {
  decompressed: Buffer;
  algorithm: string;
  decompressionTime: number;
}

export interface CompressionStats {
  totalOperations: number;
  totalOriginalBytes: number;
  totalCompressedBytes: number;
  averageRatio: number;
  averageCompressionTime: number;
  averageDecompressionTime: number;
  algorithmUsage: Map<string, number>;
  performanceHistory: Array<{
    timestamp: number;
    algorithm: string;
    ratio: number;
    compressionTime: number;
  }>;
}

export interface AlgorithmPerformance {
  algorithm: string;
  averageRatio: number;
  averageSpeed: number;
  reliability: number;
  suitabilityScore: number;
}

export class CompressionManager extends EventEmitter {
  private stats: CompressionStats;
  private defaultOptions: CompressionOptions = {
    algorithm: 'auto',
    level: 6,
    threshold: 1024, // 1KB minimum
    enableStats: true,
    adaptiveSelection: true
  };

  private performanceWindow = 100; // Keep last 100 operations for analysis
  private algorithmPreferences: Map<string, AlgorithmPerformance> = new Map();

  constructor(options?: Partial<CompressionOptions>) {
    super();
    this.resetStats();
    this.defaultOptions = { ...this.defaultOptions, ...options };
    this.initializeAlgorithmPreferences();
  }

  /**
   * Compresses data with optimal algorithm selection
   */
  async compress(
    data: Buffer | string,
    options?: Partial<CompressionOptions>
  ): Promise<CompressionResult> {
    const opts = { ...this.defaultOptions, ...options };
    const inputBuffer = Buffer.isBuffer(data) ? data : Buffer.from(data, 'utf-8');
    const startTime = process.hrtime.bigint();

    // Skip compression if below threshold
    if (inputBuffer.length < opts.threshold) {
      return {
        compressed: inputBuffer,
        originalSize: inputBuffer.length,
        compressedSize: inputBuffer.length,
        ratio: 1.0,
        algorithm: 'none',
        compressionTime: Number(process.hrtime.bigint() - startTime) / 1000000 // Convert to ms
      };
    }

    // Select optimal algorithm
    const algorithm = opts.algorithm === 'auto' 
      ? this.selectOptimalAlgorithm(inputBuffer, opts)
      : opts.algorithm;

    let compressed: Buffer;
    let actualAlgorithm = algorithm;

    try {
      switch (algorithm) {
        case 'gzip':
          compressed = await gzip(inputBuffer, { level: opts.level });
          break;
        case 'deflate':
          compressed = await deflate(inputBuffer, { level: opts.level });
          break;
        case 'brotli':
          compressed = await brotliCompress(inputBuffer, {
            params: {
              [zlib.constants.BROTLI_PARAM_QUALITY]: Math.min(opts.level, 11)
            }
          });
          break;
        default:
          throw new Error(`Unsupported compression algorithm: ${algorithm}`);
      }

      const compressionTime = Number(process.hrtime.bigint() - startTime) / 1000000;
      const ratio = compressed.length / inputBuffer.length;

      const result: CompressionResult = {
        compressed: this.addHeader(compressed, actualAlgorithm),
        originalSize: inputBuffer.length,
        compressedSize: compressed.length,
        ratio,
        algorithm: actualAlgorithm,
        compressionTime
      };

      // Update statistics
      if (opts.enableStats) {
        this.updateCompressionStats(result);
      }

      // Update algorithm performance for adaptive selection
      if (opts.adaptiveSelection) {
        this.updateAlgorithmPerformance(actualAlgorithm, ratio, compressionTime);
      }

      this.emit('compressed', result);
      return result;

    } catch (error) {
      this.emit('compression-error', error);
      throw new Error(`Compression failed with ${algorithm}: ${error.message}`);
    }
  }

  /**
   * Decompresses data with automatic algorithm detection
   */
  async decompress(data: Buffer): Promise<DecompressionResult> {
    const startTime = process.hrtime.bigint();

    try {
      // Extract algorithm from header
      const { algorithm, payload } = this.extractHeader(data);
      
      if (algorithm === 'none') {
        return {
          decompressed: payload,
          algorithm: 'none',
          decompressionTime: Number(process.hrtime.bigint() - startTime) / 1000000
        };
      }

      let decompressed: Buffer;

      switch (algorithm) {
        case 'gzip':
          decompressed = await gunzip(payload);
          break;
        case 'deflate':
          decompressed = await inflate(payload);
          break;
        case 'brotli':
          decompressed = await brotliDecompress(payload);
          break;
        default:
          throw new Error(`Unsupported decompression algorithm: ${algorithm}`);
      }

      const decompressionTime = Number(process.hrtime.bigint() - startTime) / 1000000;

      const result: DecompressionResult = {
        decompressed,
        algorithm,
        decompressionTime
      };

      // Update stats
      if (this.defaultOptions.enableStats) {
        this.updateDecompressionStats(result);
      }

      this.emit('decompressed', result);
      return result;

    } catch (error) {
      this.emit('decompression-error', error);
      throw new Error(`Decompression failed: ${error.message}`);
    }
  }

  /**
   * Batch compression for multiple data items
   */
  async batchCompress(
    items: Array<{ id: string; data: Buffer | string }>,
    options?: Partial<CompressionOptions>
  ): Promise<Array<{ id: string; result: CompressionResult }>> {
    const results: Array<{ id: string; result: CompressionResult }> = [];
    
    // Process in parallel with limited concurrency
    const batchSize = 5;
    for (let i = 0; i < items.length; i += batchSize) {
      const batch = items.slice(i, i + batchSize);
      const batchPromises = batch.map(async item => ({
        id: item.id,
        result: await this.compress(item.data, options)
      }));
      
      const batchResults = await Promise.allSettled(batchPromises);
      
      for (const result of batchResults) {
        if (result.status === 'fulfilled') {
          results.push(result.value);
        } else {
          console.error('Batch compression failed:', result.reason);
        }
      }
    }
    
    return results;
  }

  /**
   * Selects optimal algorithm based on data characteristics and performance history
   */
  private selectOptimalAlgorithm(
    data: Buffer,
    options: CompressionOptions
  ): 'gzip' | 'deflate' | 'brotli' {
    // Data size heuristics
    if (data.length < 10 * 1024) { // < 10KB
      return 'gzip'; // Fast for small data
    }
    
    if (data.length > 1024 * 1024) { // > 1MB
      return 'brotli'; // Best compression for large data
    }

    // Content type analysis
    const sample = data.subarray(0, Math.min(1024, data.length));
    const entropy = this.calculateEntropy(sample);
    
    if (entropy < 0.5) {
      return 'brotli'; // Low entropy data compresses well with brotli
    }
    
    if (entropy > 0.9) {
      return 'gzip'; // High entropy data, prioritize speed
    }

    // Performance-based selection
    if (this.algorithmPreferences.size > 0) {
      const sortedAlgorithms = Array.from(this.algorithmPreferences.entries())
        .sort((a, b) => b[1].suitabilityScore - a[1].suitabilityScore);
      
      return sortedAlgorithms[0][0] as 'gzip' | 'deflate' | 'brotli';
    }

    // Default fallback
    return 'gzip';
  }

  /**
   * Calculates Shannon entropy for data analysis
   */
  private calculateEntropy(data: Buffer): number {
    const frequencies = new Map<number, number>();
    
    for (const byte of data) {
      frequencies.set(byte, (frequencies.get(byte) || 0) + 1);
    }
    
    let entropy = 0;
    const length = data.length;
    
    for (const freq of frequencies.values()) {
      const probability = freq / length;
      entropy -= probability * Math.log2(probability);
    }
    
    return entropy / 8; // Normalize to 0-1 range
  }

  /**
   * Adds compression algorithm header to data
   */
  private addHeader(data: Buffer, algorithm: string): Buffer {
    const header = Buffer.from(`CF-COMP:${algorithm}:`, 'utf-8');
    return Buffer.concat([header, data]);
  }

  /**
   * Extracts algorithm information from header
   */
  private extractHeader(data: Buffer): { algorithm: string; payload: Buffer } {
    const headerPrefix = Buffer.from('CF-COMP:', 'utf-8');
    
    if (!data.subarray(0, headerPrefix.length).equals(headerPrefix)) {
      // No header, assume uncompressed
      return { algorithm: 'none', payload: data };
    }
    
    const headerEnd = data.indexOf(Buffer.from(':', 'utf-8'), headerPrefix.length);
    if (headerEnd === -1) {
      throw new Error('Invalid compression header format');
    }
    
    const algorithm = data.subarray(headerPrefix.length, headerEnd).toString('utf-8');
    const payload = data.subarray(headerEnd + 1);
    
    return { algorithm, payload };
  }

  /**
   * Updates compression statistics
   */
  private updateCompressionStats(result: CompressionResult): void {
    this.stats.totalOperations++;
    this.stats.totalOriginalBytes += result.originalSize;
    this.stats.totalCompressedBytes += result.compressedSize;
    
    // Update algorithm usage
    const current = this.stats.algorithmUsage.get(result.algorithm) || 0;
    this.stats.algorithmUsage.set(result.algorithm, current + 1);
    
    // Add to performance history
    this.stats.performanceHistory.push({
      timestamp: Date.now(),
      algorithm: result.algorithm,
      ratio: result.ratio,
      compressionTime: result.compressionTime
    });
    
    // Maintain window size
    if (this.stats.performanceHistory.length > this.performanceWindow) {
      this.stats.performanceHistory.shift();
    }
    
    // Recalculate averages
    this.recalculateAverages();
  }

  /**
   * Updates decompression statistics
   */
  private updateDecompressionStats(result: DecompressionResult): void {
    // Track decompression time in moving average
    const history = this.stats.performanceHistory;
    if (history.length > 0) {
      const totalDecompTime = history.reduce((sum, h) => sum + (h.compressionTime || 0), 0) + result.decompressionTime;
      this.stats.averageDecompressionTime = totalDecompTime / (history.length + 1);
    }
  }

  /**
   * Updates algorithm performance metrics for adaptive selection
   */
  private updateAlgorithmPerformance(
    algorithm: string,
    ratio: number,
    compressionTime: number
  ): void {
    const existing = this.algorithmPreferences.get(algorithm) || {
      algorithm,
      averageRatio: 0,
      averageSpeed: 0,
      reliability: 100,
      suitabilityScore: 0
    };

    // Update running averages
    const operations = this.stats.algorithmUsage.get(algorithm) || 1;
    existing.averageRatio = ((existing.averageRatio * (operations - 1)) + ratio) / operations;
    existing.averageSpeed = ((existing.averageSpeed * (operations - 1)) + (1000 / compressionTime)) / operations;
    
    // Calculate suitability score (lower ratio + higher speed = better)
    existing.suitabilityScore = (1 - existing.averageRatio) * 0.6 + (existing.averageSpeed / 1000) * 0.4;
    
    this.algorithmPreferences.set(algorithm, existing);
  }

  /**
   * Recalculates statistical averages
   */
  private recalculateAverages(): void {
    if (this.stats.totalOperations === 0) return;
    
    this.stats.averageRatio = this.stats.totalCompressedBytes / this.stats.totalOriginalBytes;
    
    const history = this.stats.performanceHistory;
    if (history.length > 0) {
      this.stats.averageCompressionTime = history.reduce((sum, h) => sum + h.compressionTime, 0) / history.length;
    }
  }

  /**
   * Initializes algorithm performance tracking
   */
  private initializeAlgorithmPreferences(): void {
    const algorithms = ['gzip', 'deflate', 'brotli'];
    for (const algorithm of algorithms) {
      this.algorithmPreferences.set(algorithm, {
        algorithm,
        averageRatio: 0.5, // Neutral starting point
        averageSpeed: 100,  // Neutral starting point
        reliability: 100,
        suitabilityScore: 50 // Neutral starting point
      });
    }
  }

  /**
   * Gets comprehensive compression statistics
   */
  getStatistics(): CompressionStats {
    return { ...this.stats };
  }

  /**
   * Gets algorithm performance metrics
   */
  getAlgorithmPerformance(): Map<string, AlgorithmPerformance> {
    return new Map(this.algorithmPreferences);
  }

  /**
   * Resets all statistics and performance metrics
   */
  resetStats(): void {
    this.stats = {
      totalOperations: 0,
      totalOriginalBytes: 0,
      totalCompressedBytes: 0,
      averageRatio: 0,
      averageCompressionTime: 0,
      averageDecompressionTime: 0,
      algorithmUsage: new Map(),
      performanceHistory: []
    };
    this.initializeAlgorithmPreferences();
  }

  /**
   * Benchmarks all available algorithms on sample data
   */
  async benchmarkAlgorithms(sampleData: Buffer): Promise<Map<string, AlgorithmPerformance>> {
    console.log('🔬 Benchmarking compression algorithms...');
    const results = new Map<string, AlgorithmPerformance>();
    const algorithms: Array<'gzip' | 'deflate' | 'brotli'> = ['gzip', 'deflate', 'brotli'];
    
    for (const algorithm of algorithms) {
      const iterations = 5;
      let totalRatio = 0;
      let totalTime = 0;
      let failures = 0;
      
      for (let i = 0; i < iterations; i++) {
        try {
          const result = await this.compress(sampleData, { algorithm, enableStats: false });
          totalRatio += result.ratio;
          totalTime += result.compressionTime;
        } catch (error) {
          failures++;
        }
      }
      
      const successfulRuns = iterations - failures;
      if (successfulRuns > 0) {
        const avgRatio = totalRatio / successfulRuns;
        const avgTime = totalTime / successfulRuns;
        const reliability = (successfulRuns / iterations) * 100;
        
        results.set(algorithm, {
          algorithm,
          averageRatio: avgRatio,
          averageSpeed: avgTime > 0 ? 1000 / avgTime : 0,
          reliability,
          suitabilityScore: (1 - avgRatio) * 0.6 + (reliability / 100) * 0.4
        });
        
        console.log(`📊 ${algorithm}: ${(avgRatio * 100).toFixed(1)}% ratio, ${avgTime.toFixed(1)}ms avg`);
      }
    }
    
    return results;
  }

  /**
   * Cleans up resources
   */
  async cleanup(): Promise<void> {
    this.removeAllListeners();
    this.resetStats();
    this.emit('cleaned-up');
  }
}