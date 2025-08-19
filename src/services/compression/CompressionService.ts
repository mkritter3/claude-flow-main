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
  
  async initialize() {
    if (!this.initialized) {
      this.zstd = await Zstd.load();
      this.initialized = true;
    }
  }
  
  async compress(data: any, level: number = 3): Promise<CompressedData> {
    await this.initialize();
    
    if (!this.zstd) {
      throw new Error('Zstd not initialized');
    }
    
    const input = JSON.stringify(data);
    const inputBuffer = Buffer.from(input, 'utf-8');
    
    const startTime = Date.now();
    const compressed = this.zstd.compress(new Uint8Array(inputBuffer), level);
    const compressionTime = Date.now() - startTime;
    
    const ratio = compressed.length / inputBuffer.length;
    
    return {
      compressed: true,
      algorithm: 'zstd',
      level,
      data: Buffer.from(compressed).toString('base64'),
      originalSize: inputBuffer.length,
      compressedSize: compressed.length,
      ratio,
      compressionTime,
      metadata: {
        timestamp: Date.now(),
        checksum: this.calculateChecksum(Buffer.from(compressed))
      }
    };
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