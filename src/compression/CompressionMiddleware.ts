/**
 * CompressionMiddleware - Transparent Compression Integration
 * 
 * Provides transparent compression/decompression middleware for database
 * operations, memory management, and data transmission with automatic
 * fallback and error handling.
 */

import { CompressionManager, CompressionResult, DecompressionResult } from './CompressionManager.js';

export interface MiddlewareOptions {
  enableCompression: boolean;
  compressionThreshold: number;
  fallbackToUncompressed: boolean;
  logPerformance: boolean;
}

export interface CompressionMetadata {
  isCompressed: boolean;
  originalSize: number;
  compressedSize: number;
  algorithm: string;
  ratio: number;
}

export class CompressionMiddleware {
  private compressionManager: CompressionManager;
  private options: MiddlewareOptions;

  constructor(
    compressionManager: CompressionManager,
    options?: Partial<MiddlewareOptions>
  ) {
    this.compressionManager = compressionManager;
    this.options = {
      enableCompression: true,
      compressionThreshold: 1024,
      fallbackToUncompressed: true,
      logPerformance: false,
      ...options
    };
  }

  /**
   * Middleware for database storage - compresses data before storage
   */
  async beforeStore(data: any): Promise<{ data: Buffer; metadata: CompressionMetadata }> {
    if (!this.options.enableCompression) {
      const buffer = this.serializeData(data);
      return {
        data: buffer,
        metadata: {
          isCompressed: false,
          originalSize: buffer.length,
          compressedSize: buffer.length,
          algorithm: 'none',
          ratio: 1.0
        }
      };
    }

    try {
      const serialized = this.serializeData(data);
      
      if (serialized.length < this.options.compressionThreshold) {
        return {
          data: serialized,
          metadata: {
            isCompressed: false,
            originalSize: serialized.length,
            compressedSize: serialized.length,
            algorithm: 'none',
            ratio: 1.0
          }
        };
      }

      const result = await this.compressionManager.compress(serialized);
      
      if (this.options.logPerformance) {
        console.log(`📦 Compressed: ${result.originalSize}B → ${result.compressedSize}B (${(result.ratio * 100).toFixed(1)}%) with ${result.algorithm}`);
      }

      return {
        data: result.compressed,
        metadata: {
          isCompressed: true,
          originalSize: result.originalSize,
          compressedSize: result.compressedSize,
          algorithm: result.algorithm,
          ratio: result.ratio
        }
      };

    } catch (error) {
      if (this.options.fallbackToUncompressed) {
        console.warn('Compression failed, falling back to uncompressed:', error.message);
        const buffer = this.serializeData(data);
        return {
          data: buffer,
          metadata: {
            isCompressed: false,
            originalSize: buffer.length,
            compressedSize: buffer.length,
            algorithm: 'none',
            ratio: 1.0
          }
        };
      } else {
        throw new Error(`Compression middleware failed: ${error.message}`);
      }
    }
  }

  /**
   * Middleware for database retrieval - decompresses data after retrieval
   */
  async afterRetrieve(data: Buffer, metadata?: CompressionMetadata): Promise<any> {
    if (!metadata || !metadata.isCompressed) {
      return this.deserializeData(data);
    }

    try {
      const result = await this.compressionManager.decompress(data);
      
      if (this.options.logPerformance) {
        console.log(`📦 Decompressed: ${metadata.compressedSize}B → ${metadata.originalSize}B with ${metadata.algorithm}`);
      }

      return this.deserializeData(result.decompressed);

    } catch (error) {
      if (this.options.fallbackToUncompressed) {
        console.warn('Decompression failed, attempting as uncompressed:', error.message);
        return this.deserializeData(data);
      } else {
        throw new Error(`Decompression middleware failed: ${error.message}`);
      }
    }
  }

  /**
   * Middleware for memory operations - compresses memory entries
   */
  async compressMemoryEntry(entry: any): Promise<{ entry: any; metadata: CompressionMetadata }> {
    if (!entry.content || typeof entry.content !== 'string') {
      return {
        entry,
        metadata: {
          isCompressed: false,
          originalSize: 0,
          compressedSize: 0,
          algorithm: 'none',
          ratio: 1.0
        }
      };
    }

    const { data, metadata } = await this.beforeStore(entry.content);
    
    return {
      entry: {
        ...entry,
        content: data.toString('base64'),
        compression_metadata: metadata
      },
      metadata
    };
  }

  /**
   * Middleware for memory retrieval - decompresses memory entries
   */
  async decompressMemoryEntry(entry: any): Promise<any> {
    if (!entry.compression_metadata?.isCompressed) {
      return entry;
    }

    try {
      const compressedData = Buffer.from(entry.content, 'base64');
      const decompressed = await this.afterRetrieve(compressedData, entry.compression_metadata);
      
      return {
        ...entry,
        content: decompressed,
        compression_metadata: undefined // Remove metadata after decompression
      };
    } catch (error) {
      console.warn('Memory entry decompression failed:', error.message);
      return entry; // Return original entry on failure
    }
  }

  /**
   * Batch compression for multiple items
   */
  async batchCompress(
    items: Array<{ id: string; data: any }>
  ): Promise<Array<{ id: string; data: Buffer; metadata: CompressionMetadata }>> {
    const results = [];
    
    for (const item of items) {
      try {
        const result = await this.beforeStore(item.data);
        results.push({
          id: item.id,
          data: result.data,
          metadata: result.metadata
        });
      } catch (error) {
        console.error(`Batch compression failed for item ${item.id}:`, error);
        // Include uncompressed fallback
        const buffer = this.serializeData(item.data);
        results.push({
          id: item.id,
          data: buffer,
          metadata: {
            isCompressed: false,
            originalSize: buffer.length,
            compressedSize: buffer.length,
            algorithm: 'none',
            ratio: 1.0
          }
        });
      }
    }
    
    return results;
  }

  /**
   * Batch decompression for multiple items
   */
  async batchDecompress(
    items: Array<{ id: string; data: Buffer; metadata?: CompressionMetadata }>
  ): Promise<Array<{ id: string; data: any }>> {
    const results = [];
    
    for (const item of items) {
      try {
        const decompressed = await this.afterRetrieve(item.data, item.metadata);
        results.push({
          id: item.id,
          data: decompressed
        });
      } catch (error) {
        console.error(`Batch decompression failed for item ${item.id}:`, error);
        // Attempt as uncompressed
        try {
          results.push({
            id: item.id,
            data: this.deserializeData(item.data)
          });
        } catch (deserializeError) {
          console.error(`Failed to deserialize item ${item.id}:`, deserializeError);
        }
      }
    }
    
    return results;
  }

  /**
   * Database query result compression middleware
   */
  async compressQueryResult(results: any[]): Promise<{ 
    data: Buffer; 
    metadata: CompressionMetadata;
    resultCount: number;
  }> {
    if (results.length === 0) {
      return {
        data: Buffer.from('[]'),
        metadata: {
          isCompressed: false,
          originalSize: 2,
          compressedSize: 2,
          algorithm: 'none',
          ratio: 1.0
        },
        resultCount: 0
      };
    }

    const { data, metadata } = await this.beforeStore(results);
    
    return {
      data,
      metadata,
      resultCount: results.length
    };
  }

  /**
   * Database query result decompression middleware
   */
  async decompressQueryResult(
    data: Buffer,
    metadata: CompressionMetadata,
    expectedCount?: number
  ): Promise<any[]> {
    const results = await this.afterRetrieve(data, metadata);
    
    if (!Array.isArray(results)) {
      console.warn('Decompressed query result is not an array, wrapping in array');
      return [results];
    }
    
    if (expectedCount && results.length !== expectedCount) {
      console.warn(`Query result count mismatch: expected ${expectedCount}, got ${results.length}`);
    }
    
    return results;
  }

  /**
   * Serializes data to Buffer for compression
   */
  private serializeData(data: any): Buffer {
    if (Buffer.isBuffer(data)) {
      return data;
    }
    
    if (typeof data === 'string') {
      return Buffer.from(data, 'utf-8');
    }
    
    // Serialize objects to JSON
    return Buffer.from(JSON.stringify(data), 'utf-8');
  }

  /**
   * Deserializes Buffer back to original data type
   */
  private deserializeData(buffer: Buffer): any {
    const str = buffer.toString('utf-8');
    
    // Try to parse as JSON first
    try {
      return JSON.parse(str);
    } catch {
      // Return as string if not valid JSON
      return str;
    }
  }

  /**
   * Gets compression statistics from underlying manager
   */
  getCompressionStats() {
    return this.compressionManager.getStatistics();
  }

  /**
   * Updates middleware options
   */
  updateOptions(options: Partial<MiddlewareOptions>): void {
    this.options = { ...this.options, ...options };
  }

  /**
   * Gets current middleware options
   */
  getOptions(): MiddlewareOptions {
    return { ...this.options };
  }
}