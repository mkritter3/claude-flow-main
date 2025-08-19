// Phase 3: Multi-Algorithm & Quantum-Inspired Compression - Interfaces
// Following the exact specification from compression roadmap Phase 3

import { CompressedData } from './CompressionService.js';

export interface CompressionAlgorithm {
  compress(data: any, options?: any): Promise<CompressedData>;
  decompress(payload: CompressedData): Promise<any>;
  getName(): string;
  getCapabilities(): AlgorithmCapabilities;
}

export interface AlgorithmCapabilities {
  name: string;
  strengths: string[];
  weaknesses: string[];
  optimalDataTypes: string[];
  averageRatio: number;
  averageSpeed: number;
}

export interface DataCharacteristics {
  size: number;
  entropy: number;
  repetition: number;
  structure: DataStructureType;
  dataType: DataType;
  patterns: string[];
}

export interface AIRecommendation {
  algorithm: string;
  confidence: number;
  expectedRatio: number;
  reason: string;
}

export interface AlgorithmPrediction {
  algorithm: string;
  confidence: number;
  expectedRatio: number;
}

export interface CompressionHistory {
  features: Features;
  algorithm: string;
  ratio: number;
  time: number;
  timestamp: number;
}

export interface Features {
  size: number;
  entropy: number;
  repetition: number;
  structure: DataStructureType;
  dataType: DataType;
}

export interface PredictionModel {
  predict(features: Features): Promise<AlgorithmPrediction>;
  train(history: CompressionHistory[]): Promise<void>;
}

export interface QuantumState {
  amplitudes: number[];
  phases: number[];
  entanglement: EntanglementMap;
  originalSize: number;
}

export interface EncodedState {
  real: number[];
  imaginary: number[];
}

export interface EntanglementMap {
  pairs: [number, number][];
  correlations: number[];
}

export type DataStructureType = 'flat' | 'nested' | 'array' | 'mixed' | 'repetitive';
export type DataType = 'json' | 'text' | 'binary' | 'number' | 'mixed';