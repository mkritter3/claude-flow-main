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
  
  async decompress(payload: CompressedData): Promise<any> {
    await this.initialize();
    
    if (!this.zstd) {
      throw new Error('Zstd not initialized');
    }
    
    if (!payload.compressed) {
      return payload;
    }
    
    // Handle both regular zstd and dictionary-based compression
    if (payload.algorithm !== 'zstd' && payload.algorithm !== 'zstd-dict') {
      return payload;
    }
    
    const compressed = Buffer.from(payload.data, 'base64');
    const decompressed = this.zstd.decompress(new Uint8Array(compressed));
    
    return JSON.parse(Buffer.from(decompressed).toString('utf-8'));
  }
  
  private calculateChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }
  
  private getValueSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf-8');
  }
}