// Phase 1: Production-Ready Compression (Days 1-3)
// Following the exact specification from compression roadmap
import { Zstd } from '@hpcc-js/wasm-zstd';
import { createHash } from 'crypto';

export interface CompressedData {
  compressed: boolean;
  algorithm: string;
  level: number;
  data: string;
  originalSize: number;
  compressedSize: number;
  ratio: number;
  compressionTime: number;
  metadata: {
    timestamp: number;
    checksum: string;
  };
}

export class CompressionService {
  private zstd: Zstd | null = null;
  private initialized = false;
  
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
    
    if (!payload.compressed || payload.algorithm !== 'zstd') {
      return payload;
    }
    
    const compressed = Buffer.from(payload.data, 'base64');
    const decompressed = await this.zstd.decompress(compressed);
    
    return JSON.parse(decompressed.toString('utf-8'));
  }
  
  private calculateChecksum(data: Buffer): string {
    return createHash('sha256').update(data).digest('hex');
  }
  
  private getValueSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf-8');
  }
}