// Enhanced CompressionService with Phase 3 Multi-Algorithm Support
// Integrating all three phases: Zstd, Dictionary, and Multi-Algorithm
import { Zstd } from '@hpcc-js/wasm-zstd';
import { createHash } from 'crypto';
import { MultiAlgorithmEngine } from './MultiAlgorithmEngine.js';
import { QuantumInspiredAlgorithm } from './QuantumInspiredAlgorithm.js';
import { CompressionLearner } from './CompressionLearner.js';

export interface CompressedData {
  compressed: boolean;
  algorithm: string;
  level?: number;
  data: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  compressionTime: number;
  metadata: {
    timestamp: number;
    checksum: string;
    dictionary?: string;
    dictionary_version?: string;
    superposition?: number;
    entanglement?: any;
  };
}

export class CompressionService {
  private zstd: Zstd | null = null;
  private initialized = false;
  private multiEngine: MultiAlgorithmEngine;
  private learner: CompressionLearner;
  private compressionMode: 'simple' | 'multi-algorithm' = 'multi-algorithm';
  
  constructor(claudeClient?: any) {
    this.learner = new CompressionLearner(claudeClient);
    this.multiEngine = new MultiAlgorithmEngine(this.learner, claudeClient);
    
    // Register quantum algorithm
    const quantumAlgorithm = new QuantumInspiredAlgorithm();
    this.multiEngine.registerAlgorithm('quantum-inspired', quantumAlgorithm);
  }

  async initialize(): Promise<void> {
    if (!this.initialized) {
      this.zstd = await Zstd.load();
      this.initialized = true;
    }
  }

  /**
   * Main compression method - automatically selects best approach
   */
  async compress(data: any, options: {
    level?: number;
    mode?: 'simple' | 'multi-algorithm';
    force_algorithm?: string;
  } = {}): Promise<CompressedData> {
    const startTime = Date.now();
    const mode = options.mode || this.compressionMode;
    
    try {
      let result: CompressedData;

      // Force specific algorithm if requested
      if (options.force_algorithm) {
        result = await this.multiEngine.compressWithAlgorithm(data, options.force_algorithm, options);
      }
      // Use multi-algorithm selection
      else if (mode === 'multi-algorithm') {
        result = await this.multiEngine.compressOptimal(data);
      }
      // Fallback to simple Zstd compression
      else {
        result = await this.compressSimple(data, options.level || 3);
      }

      // Learn from this compression
      await this.learner.learn(data, result);

      return {
        ...result,
        compressionTime: Date.now() - startTime
      };

    } catch (error) {
      console.error('Compression failed, storing uncompressed:', error);
      return this.createUncompressedPayload(data, Date.now() - startTime);
    }
  }

  /**
   * Simple Zstd compression (Phase 1)
   */
  async compressSimple(data: any, level: number = 3): Promise<CompressedData> {
    await this.initialize();
    
    if (!this.zstd) {
      throw new Error('Zstd not initialized');
    }

    const input = JSON.stringify(data);
    const inputBuffer = Buffer.from(input, 'utf-8');
    
    const startTime = Date.now();
    const compressed = this.zstd.compress(new Uint8Array(inputBuffer), level);
    const compressionTime = Date.now() - startTime;
    
    return {
      compressed: true,
      algorithm: 'zstd',
      level,
      data: Buffer.from(compressed).toString('base64'),
      originalSize: inputBuffer.length,
      compressedSize: compressed.length,
      ratio: compressed.length / inputBuffer.length,
      compressionTime,
      metadata: {
        timestamp: Date.now(),
        checksum: this.calculateChecksum(Buffer.from(compressed))
      }
    };
  }

  /**
   * Multi-algorithm compression with AI selection (Phase 3)
   */
  async compressOptimal(data: any): Promise<CompressedData> {
    return this.multiEngine.compressOptimal(data);
  }

  /**
   * Compress with specific algorithm
   */
  async compressWithAlgorithm(data: any, algorithm: string, options?: any): Promise<CompressedData> {
    return this.multiEngine.compressWithAlgorithm(data, algorithm, options);
  }
  
  /**
   * Universal decompression method
   */
  async decompress(payload: CompressedData): Promise<any> {
    if (!payload.compressed) {
      return payload.data || payload;
    }

    try {
      // Multi-algorithm decompression
      if (['zstd', 'brotli', 'lz4', 'quantum-inspired'].includes(payload.algorithm)) {
        return await this.multiEngine.decompress(payload);
      }
      
      // Fallback to simple Zstd decompression
      return await this.decompressSimple(payload);
      
    } catch (error) {
      console.error('Decompression failed:', error);
      throw new Error(`Failed to decompress ${payload.algorithm} data: ${error.message}`);
    }
  }

  /**
   * Simple Zstd decompression
   */
  async decompressSimple(payload: CompressedData): Promise<any> {
    await this.initialize();
    
    if (!this.zstd || !payload.compressed || payload.algorithm !== 'zstd') {
      return payload;
    }
    
    const compressed = Buffer.from(payload.data, 'base64');
    const decompressed = this.zstd.decompress(new Uint8Array(compressed));
    
    return JSON.parse(Buffer.from(decompressed).toString('utf-8'));
  }

  /**
   * Get compression statistics and recommendations
   */
  async getCompressionAnalysis(data: any): Promise<{
    recommendedAlgorithm: string;
    confidence: number;
    expectedRatio: number;
    dataCharacteristics: any;
    availableAlgorithms: string[];
  }> {
    const prediction = await this.learner.predict(data);
    const capabilities = this.multiEngine.getAlgorithmCapabilities();
    
    return {
      recommendedAlgorithm: prediction.algorithm,
      confidence: prediction.confidence,
      expectedRatio: prediction.expectedRatio,
      dataCharacteristics: await this.analyzeDataCharacteristics(data),
      availableAlgorithms: this.multiEngine.getAvailableAlgorithms()
    };
  }

  /**
   * Benchmark all algorithms against test data
   */
  async benchmark(testData: any[]): Promise<{
    algorithm: string;
    averageRatio: number;
    averageTime: number;
    totalTests: number;
  }[]> {
    return this.multiEngine.benchmark(testData);
  }

  /**
   * Get learning statistics
   */
  getLearningStats(): {
    totalSamples: number;
    modelType: string;
    lastTraining: number;
    algorithmDistribution: { [algorithm: string]: number };
  } {
    return this.learner.getModelStats();
  }

  /**
   * Set compression mode
   */
  setCompressionMode(mode: 'simple' | 'multi-algorithm'): void {
    this.compressionMode = mode;
  }

  /**
   * Export learning model for persistence
   */
  exportLearningModel(): any {
    return this.learner.exportModel();
  }

  /**
   * Import learning model from persistence
   */
  importLearningModel(exported: any): void {
    this.learner.importModel(exported);
  }

  // Utility methods
  private async analyzeDataCharacteristics(data: any): Promise<any> {
    const json = JSON.stringify(data);
    return {
      size: json.length,
      entropy: this.calculateEntropy(json),
      repetition: this.calculateRepetition(json),
      dataType: this.detectDataType(data),
      complexity: this.calculateComplexity(data)
    };
  }

  private calculateEntropy(data: string): number {
    const freq: { [key: string]: number } = {};
    
    for (const char of data) {
      freq[char] = (freq[char] || 0) + 1;
    }
    
    let entropy = 0;
    const len = data.length;
    
    for (const count of Object.values(freq)) {
      const p = count / len;
      entropy -= p * Math.log2(p);
    }
    
    return entropy / Math.log2(256); // Normalize to 0-1
  }

  private calculateRepetition(data: string): number {
    const chunks = [];
    const chunkSize = Math.min(32, Math.floor(data.length / 10));
    
    for (let i = 0; i < data.length - chunkSize; i += chunkSize) {
      chunks.push(data.substring(i, i + chunkSize));
    }
    
    const uniqueChunks = new Set(chunks);
    return chunks.length > 0 ? 1 - (uniqueChunks.size / chunks.length) : 0;
  }

  private detectDataType(data: any): string {
    if (typeof data === 'string') return 'text';
    if (typeof data === 'number') return 'number';
    if (Buffer.isBuffer(data)) return 'binary';
    if (Array.isArray(data)) return 'array';
    if (typeof data === 'object' && data !== null) return 'object';
    return 'mixed';
  }

  private calculateComplexity(data: any): number {
    try {
      const json = JSON.stringify(data);
      const depth = this.getObjectDepth(data);
      const keysCount = this.countKeys(data);
      
      // Complexity score based on size, depth, and key count
      return Math.min(1, (json.length / 10000) * 0.4 + (depth / 10) * 0.3 + (keysCount / 100) * 0.3);
    } catch {
      return 0.5; // Default complexity
    }
  }

  private getObjectDepth(obj: any, depth: number = 0): number {
    if (obj === null || typeof obj !== 'object') return depth;
    
    if (Array.isArray(obj)) {
      return Math.max(depth, ...obj.map(item => this.getObjectDepth(item, depth + 1)));
    }
    
    const depths = Object.values(obj).map(value => this.getObjectDepth(value, depth + 1));
    return Math.max(depth, ...depths);
  }

  private countKeys(obj: any): number {
    if (obj === null || typeof obj !== 'object') return 0;
    
    if (Array.isArray(obj)) {
      return obj.reduce((sum, item) => sum + this.countKeys(item), 0);
    }
    
    const keys = Object.keys(obj);
    return keys.length + keys.reduce((sum, key) => sum + this.countKeys(obj[key]), 0);
  }

  private createUncompressedPayload(data: any, compressionTime: number): CompressedData {
    const json = JSON.stringify(data);
    return {
      compressed: false,
      algorithm: 'none',
      data: json,
      originalSize: Buffer.from(json).length,
      compressedSize: Buffer.from(json).length,
      ratio: 1.0,
      compressionTime,
      metadata: {
        timestamp: Date.now(),
        checksum: this.calculateChecksum(Buffer.from(json))
      }
    };
  }

  private calculateChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }

  private getValueSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf-8');
  }
}