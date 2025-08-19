// Phase 3: Multi-Algorithm & Quantum-Inspired Compression - Multi-Algorithm Engine
// Following the exact specification from compression roadmap Phase 3

import { Zstd } from '@hpcc-js/wasm-zstd';
import { CompressedData } from './CompressionService.js';
import { 
  CompressionAlgorithm, 
  DataCharacteristics, 
  AIRecommendation,
  Features,
  DataStructureType,
  DataType,
  AlgorithmCapabilities
} from './interfaces.js';

// Individual Algorithm Implementations
class ZstdAlgorithm implements CompressionAlgorithm {
  private zstd: Zstd | null = null;
  
  async initialize() {
    if (!this.zstd) {
      this.zstd = await Zstd.load();
    }
  }
  
  async compress(data: any, options: { level?: number } = {}): Promise<CompressedData> {
    await this.initialize();
    
    if (!this.zstd) {
      throw new Error('Zstd not initialized');
    }
    
    const input = JSON.stringify(data);
    const inputBuffer = Buffer.from(input, 'utf-8');
    const level = options.level || 3;
    
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
  
  async decompress(payload: CompressedData): Promise<any> {
    await this.initialize();
    
    if (!this.zstd || !payload.compressed || payload.algorithm !== 'zstd') {
      return payload;
    }
    
    const compressed = Buffer.from(payload.data, 'base64');
    const decompressed = this.zstd.decompress(new Uint8Array(compressed));
    
    return JSON.parse(Buffer.from(decompressed).toString('utf-8'));
  }
  
  getName(): string {
    return 'zstd';
  }
  
  getCapabilities(): AlgorithmCapabilities {
    return {
      name: 'zstd',
      strengths: ['High compression ratio', 'Fast compression', 'Good balance'],
      weaknesses: ['Memory usage'],
      optimalDataTypes: ['json', 'text', 'repetitive'],
      averageRatio: 0.3,
      averageSpeed: 10
    };
  }
  
  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

class BrotliAlgorithm implements CompressionAlgorithm {
  async compress(data: any, options: { level?: number } = {}): Promise<CompressedData> {
    const zlib = require('zlib');
    const input = JSON.stringify(data);
    const inputBuffer = Buffer.from(input, 'utf-8');
    
    const startTime = Date.now();
    const compressed = zlib.brotliCompressSync(inputBuffer, {
      params: {
        [zlib.constants.BROTLI_PARAM_QUALITY]: options.level || 6
      }
    });
    const compressionTime = Date.now() - startTime;
    
    return {
      compressed: true,
      algorithm: 'brotli',
      level: options.level || 6,
      data: compressed.toString('base64'),
      originalSize: inputBuffer.length,
      compressedSize: compressed.length,
      ratio: compressed.length / inputBuffer.length,
      compressionTime,
      metadata: {
        timestamp: Date.now(),
        checksum: this.calculateChecksum(compressed)
      }
    };
  }
  
  async decompress(payload: CompressedData): Promise<any> {
    if (!payload.compressed || payload.algorithm !== 'brotli') {
      return payload;
    }
    
    const zlib = require('zlib');
    const compressed = Buffer.from(payload.data, 'base64');
    const decompressed = zlib.brotliDecompressSync(compressed);
    
    return JSON.parse(decompressed.toString('utf-8'));
  }
  
  getName(): string {
    return 'brotli';
  }
  
  getCapabilities(): AlgorithmCapabilities {
    return {
      name: 'brotli',
      strengths: ['Excellent for text', 'Web-optimized', 'Great compression ratio'],
      weaknesses: ['Slower compression', 'Higher CPU usage'],
      optimalDataTypes: ['text', 'json', 'mixed'],
      averageRatio: 0.25,
      averageSpeed: 5
    };
  }
  
  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

class LZ4Algorithm implements CompressionAlgorithm {
  async compress(data: any, options: { level?: number } = {}): Promise<CompressedData> {
    // LZ4 simulation using zlib with faster settings
    const zlib = require('zlib');
    const input = JSON.stringify(data);
    const inputBuffer = Buffer.from(input, 'utf-8');
    
    const startTime = Date.now();
    const compressed = zlib.deflateSync(inputBuffer, { level: 1 }); // Fast compression
    const compressionTime = Date.now() - startTime;
    
    return {
      compressed: true,
      algorithm: 'lz4',
      level: 1,
      data: compressed.toString('base64'),
      originalSize: inputBuffer.length,
      compressedSize: compressed.length,
      ratio: compressed.length / inputBuffer.length,
      compressionTime,
      metadata: {
        timestamp: Date.now(),
        checksum: this.calculateChecksum(compressed)
      }
    };
  }
  
  async decompress(payload: CompressedData): Promise<any> {
    if (!payload.compressed || payload.algorithm !== 'lz4') {
      return payload;
    }
    
    const zlib = require('zlib');
    const compressed = Buffer.from(payload.data, 'base64');
    const decompressed = zlib.inflateSync(compressed);
    
    return JSON.parse(decompressed.toString('utf-8'));
  }
  
  getName(): string {
    return 'lz4';
  }
  
  getCapabilities(): AlgorithmCapabilities {
    return {
      name: 'lz4',
      strengths: ['Very fast compression', 'Low latency', 'Low CPU usage'],
      weaknesses: ['Lower compression ratio', 'Less efficient'],
      optimalDataTypes: ['binary', 'number', 'mixed'],
      averageRatio: 0.5,
      averageSpeed: 20
    };
  }
  
  private calculateChecksum(data: Buffer): string {
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(data).digest('hex');
  }
}

export class MultiAlgorithmEngine {
  private algorithms: Map<string, CompressionAlgorithm> = new Map();
  private learner: any; // Will be injected
  private claude: any; // Will be injected
  
  constructor(learner?: any, claudeClient?: any) {
    this.registerAlgorithm('zstd', new ZstdAlgorithm());
    this.registerAlgorithm('brotli', new BrotliAlgorithm());
    this.registerAlgorithm('lz4', new LZ4Algorithm());
    // Quantum algorithm will be added separately
    
    this.learner = learner;
    this.claude = claudeClient;
  }
  
  registerAlgorithm(name: string, algorithm: CompressionAlgorithm): void {
    this.algorithms.set(name, algorithm);
  }
  
  async compressOptimal(data: any): Promise<CompressedData> {
    // Analyze data characteristics
    const characteristics = await this.analyzeData(data);
    
    // Get AI recommendation if available
    const recommendation = await this.getAIRecommendation(characteristics);
    
    if (recommendation.confidence > 0.8) {
      // Use recommended algorithm
      const algorithm = this.algorithms.get(recommendation.algorithm);
      if (algorithm) {
        const result = await algorithm.compress(data);
        this.learn(result, characteristics);
        return result;
      }
    }
    
    // Run parallel compression
    const results = await this.compressParallel(data);
    
    // Select best result
    const best = this.selectBest(results);
    
    // Learn from selection
    this.learn(best, characteristics);
    
    return best;
  }
  
  async compressWithAlgorithm(data: any, algorithmName: string, options?: any): Promise<CompressedData> {
    const algorithm = this.algorithms.get(algorithmName);
    if (!algorithm) {
      throw new Error(`Algorithm ${algorithmName} not found`);
    }
    
    return await algorithm.compress(data, options);
  }
  
  async decompress(payload: CompressedData): Promise<any> {
    const algorithm = this.algorithms.get(payload.algorithm);
    if (!algorithm) {
      // Try to handle unknown algorithms gracefully
      console.warn(`Unknown algorithm: ${payload.algorithm}, returning payload as-is`);
      return payload;
    }
    
    return await algorithm.decompress(payload);
  }
  
  private async analyzeData(data: any): Promise<DataCharacteristics> {
    const json = JSON.stringify(data);
    
    return {
      size: json.length,
      entropy: this.calculateEntropy(json),
      repetition: this.calculateRepetition(json),
      structure: this.analyzeStructure(data),
      dataType: this.detectDataType(data),
      patterns: this.extractPatterns(json)
    };
  }
  
  private async getAIRecommendation(characteristics: DataCharacteristics): Promise<AIRecommendation> {
    if (this.learner) {
      try {
        const prediction = await this.learner.predict(characteristics);
        return {
          algorithm: prediction.algorithm,
          confidence: prediction.confidence,
          expectedRatio: prediction.expectedRatio,
          reason: 'Machine learning prediction'
        };
      } catch (error) {
        console.warn('Learner prediction failed:', error);
      }
    }
    
    // Fallback to heuristic recommendations
    return this.getHeuristicRecommendation(characteristics);
  }
  
  private getHeuristicRecommendation(characteristics: DataCharacteristics): AIRecommendation {
    // Simple heuristic-based algorithm selection
    if (characteristics.repetition > 0.8) {
      return {
        algorithm: 'zstd',
        confidence: 0.9,
        expectedRatio: 0.1,
        reason: 'High repetition detected, zstd optimal for repetitive data'
      };
    }
    
    if (characteristics.dataType === 'text' && characteristics.size > 10000) {
      return {
        algorithm: 'brotli',
        confidence: 0.8,
        expectedRatio: 0.2,
        reason: 'Large text data, brotli excels at text compression'
      };
    }
    
    if (characteristics.size < 1000 || characteristics.entropy > 0.9) {
      return {
        algorithm: 'lz4',
        confidence: 0.7,
        expectedRatio: 0.6,
        reason: 'Small size or high entropy, prioritize speed over ratio'
      };
    }
    
    return {
      algorithm: 'zstd',
      confidence: 0.6,
      expectedRatio: 0.3,
      reason: 'Default choice for balanced performance'
    };
  }
  
  private async compressParallel(data: any): Promise<CompressedData[]> {
    const promises = Array.from(this.algorithms.entries()).map(
      async ([name, algorithm]) => {
        try {
          const start = Date.now();
          const result = await algorithm.compress(data);
          const time = Date.now() - start;
          
          // Add timing information
          return {
            ...result,
            algorithm: name,
            compressionTime: time
          };
        } catch (error) {
          console.error(`${name} compression failed:`, error);
          return null;
        }
      }
    );
    
    const results = await Promise.all(promises);
    return results.filter(r => r !== null) as CompressedData[];
  }
  
  private selectBest(results: CompressedData[]): CompressedData {
    if (results.length === 0) {
      throw new Error('No compression results available');
    }
    
    // Multi-criteria selection
    const scored = results.map(result => ({
      result,
      score: this.calculateScore(result)
    }));
    
    scored.sort((a, b) => b.score - a.score);
    
    return scored[0].result;
  }
  
  private calculateScore(result: CompressedData): number {
    const ratioScore = (1 - result.ratio) * 100; // Lower ratio is better
    const timeScore = Math.max(0, 100 - result.compressionTime); // Faster is better
    
    // Weighted combination: 70% compression ratio, 30% speed
    return ratioScore * 0.7 + timeScore * 0.3;
  }
  
  private learn(result: CompressedData, characteristics: DataCharacteristics): void {
    if (this.learner) {
      this.learner.learn(characteristics, result);
    }
  }
  
  // Data analysis utility methods
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
    // Simple repetition detection
    const chunks = [];
    const chunkSize = Math.min(32, Math.floor(data.length / 10));
    
    for (let i = 0; i < data.length - chunkSize; i += chunkSize) {
      chunks.push(data.substring(i, i + chunkSize));
    }
    
    const uniqueChunks = new Set(chunks);
    return 1 - (uniqueChunks.size / chunks.length);
  }
  
  private analyzeStructure(data: any): DataStructureType {
    if (Array.isArray(data)) {
      return 'array';
    }
    
    if (typeof data === 'object' && data !== null) {
      const keys = Object.keys(data);
      if (keys.length === 0) return 'flat';
      
      const hasNestedObjects = keys.some(key => 
        typeof data[key] === 'object' && data[key] !== null
      );
      
      return hasNestedObjects ? 'nested' : 'flat';
    }
    
    return 'flat';
  }
  
  private detectDataType(data: any): DataType {
    if (typeof data === 'string') return 'text';
    if (typeof data === 'number') return 'number';
    if (Buffer.isBuffer(data)) return 'binary';
    
    // For objects/arrays, analyze content
    const json = JSON.stringify(data);
    const textRatio = (json.match(/[a-zA-Z]/g) || []).length / json.length;
    
    if (textRatio > 0.7) return 'text';
    return 'mixed';
  }
  
  private extractPatterns(data: string): string[] {
    const patterns: string[] = [];
    const minLength = 4;
    const maxLength = 32;
    
    // Extract repeated substrings
    for (let len = minLength; len <= maxLength; len++) {
      const seen = new Map<string, number>();
      
      for (let i = 0; i <= data.length - len; i++) {
        const substr = data.substring(i, i + len);
        seen.set(substr, (seen.get(substr) || 0) + 1);
      }
      
      // Add patterns that repeat more than twice
      for (const [pattern, count] of seen) {
        if (count > 2) {
          patterns.push(pattern);
        }
      }
    }
    
    return patterns.slice(0, 50); // Limit to top 50 patterns
  }
  
  // Statistics and reporting
  getAlgorithmCapabilities(): AlgorithmCapabilities[] {
    return Array.from(this.algorithms.values()).map(alg => alg.getCapabilities());
  }
  
  getAvailableAlgorithms(): string[] {
    return Array.from(this.algorithms.keys());
  }
  
  async benchmark(testData: any[]): Promise<{
    algorithm: string;
    averageRatio: number;
    averageTime: number;
    totalTests: number;
  }[]> {
    const results = [];
    
    for (const [name, algorithm] of this.algorithms) {
      let totalRatio = 0;
      let totalTime = 0;
      let successfulTests = 0;
      
      for (const data of testData) {
        try {
          const result = await algorithm.compress(data);
          totalRatio += result.ratio;
          totalTime += result.compressionTime;
          successfulTests++;
        } catch (error) {
          console.warn(`Benchmark failed for ${name}:`, error);
        }
      }
      
      if (successfulTests > 0) {
        results.push({
          algorithm: name,
          averageRatio: totalRatio / successfulTests,
          averageTime: totalTime / successfulTests,
          totalTests: successfulTests
        });
      }
    }
    
    return results;
  }
}