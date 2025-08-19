// Quantum-Inspired Algorithm Specific Tests
// Following Phase 3 roadmap requirements for quantum compression

import { QuantumInspiredAlgorithm } from '../../services/compression/QuantumInspiredAlgorithm.js';

describe('Quantum-Inspired Compression Algorithm', () => {
  let algorithm: QuantumInspiredAlgorithm;

  beforeEach(() => {
    algorithm = new QuantumInspiredAlgorithm();
  });

  describe('Quantum State Encoding', () => {
    it('should encode data into quantum state representation', async () => {
      const testData = {
        binary: [1, 0, 1, 1, 0],
        frequency: 'AAABBBCCC',
        phase: { oscillation: Math.PI / 4 }
      };

      const result = await algorithm.compress(testData);

      expect(result.compressed).toBe(true);
      expect(result.algorithm).toBe('quantum-inspired');
      expect(result.metadata.superposition).toBeGreaterThan(0);
      expect(result.metadata.entanglement).toBeDefined();
      expect(result.metadata.entanglement.pairs).toBeInstanceOf(Array);
      expect(result.metadata.entanglement.correlations).toBeInstanceOf(Array);
      
      console.log(`Quantum encoding: ${result.metadata.superposition} superposition states`);
      console.log(`Entanglement: ${result.metadata.entanglement.pairs.length} correlated pairs`);
    });

    it('should find quantum entanglement in repetitive patterns', async () => {
      const repetitiveData = {
        pattern1: 'ABAB'.repeat(50),
        pattern2: 'CDCD'.repeat(50),
        pattern3: 'EFEF'.repeat(50)
      };

      const result = await algorithm.compress(repetitiveData);

      expect(result.metadata.entanglement.pairs.length).toBeGreaterThan(0);
      expect(result.metadata.entanglement.correlations.length).toBeGreaterThan(0);
      
      // Should detect strong correlations in repetitive patterns
      const strongCorrelations = result.metadata.entanglement.correlations.filter(c => Math.abs(c) > 0.7);
      expect(strongCorrelations.length).toBeGreaterThan(0);
      
      console.log(`Found ${strongCorrelations.length} strong quantum correlations (>0.7)`);
    });

    it('should handle complex nested data structures', async () => {
      const complexData = {
        matrix: [
          [1, 2, 3],
          [4, 5, 6],
          [7, 8, 9]
        ],
        waves: {
          sine: Array.from({length: 32}, (_, i) => Math.sin(i * Math.PI / 16)),
          cosine: Array.from({length: 32}, (_, i) => Math.cos(i * Math.PI / 16))
        },
        metadata: {
          dimension: 3,
          frequency: 16,
          amplitude: 1.0
        }
      };

      const result = await algorithm.compress(complexData);

      expect(result.compressed).toBe(true);
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.ratio).toBeLessThan(1);
      expect(result.metadata.superposition).toBeGreaterThan(30); // Should have many amplitude states
      
      console.log(`Complex data compression: ${(result.ratio * 100).toFixed(1)}% of original size`);
    });
  });

  describe('Quantum Optimization Algorithms', () => {
    it('should apply quantum Fourier transform optimization', async () => {
      const frequencyData = {
        signal: Array.from({length: 64}, (_, i) => 
          Math.sin(2 * Math.PI * i / 64) + 0.5 * Math.cos(4 * Math.PI * i / 64)
        ),
        spectrum: 'frequency-domain-data'
      };

      const result = await algorithm.compress(frequencyData);

      // QFT optimization should identify frequency patterns
      expect(result.compressed).toBe(true);
      expect(result.metadata.superposition).toBeGreaterThan(0);
      
      // For frequency data, compression should be effective
      expect(result.ratio).toBeLessThan(0.8);
      
      console.log(`QFT-optimized compression ratio: ${(result.ratio * 100).toFixed(1)}%`);
    });

    it('should use Grover-inspired amplitude amplification', async () => {
      const dataWithImportantElements = {
        noise: Array.from({length: 100}, () => Math.random() * 0.1),
        signal: [1.0, 1.0, 1.0], // Important elements that should be amplified
        more_noise: Array.from({length: 100}, () => Math.random() * 0.1)
      };

      const result = await algorithm.compress(dataWithImportantElements);

      expect(result.compressed).toBe(true);
      expect(result.metadata.entanglement.pairs.length).toBeGreaterThan(0);
      
      // Grover optimization should find and amplify important patterns
      console.log(`Grover optimization found ${result.metadata.entanglement.pairs.length} important correlations`);
    });

    it('should apply variational quantum eigensolver optimization', async () => {
      const optimizationData = {
        parameters: Array.from({length: 20}, (_, i) => i * 0.1),
        constraints: Array.from({length: 10}, (_, i) => i * i),
        objective: 'minimize-representation-cost'
      };

      const result = await algorithm.compress(optimizationData);

      expect(result.compressed).toBe(true);
      
      // VQE should iteratively optimize the representation
      expect(result.ratio).toBeGreaterThan(0);
      expect(result.compressionTime).toBeGreaterThan(0);
      
      console.log(`VQE optimization completed in ${result.compressionTime}ms`);
    });
  });

  describe('Quantum Measurement and Decompression', () => {
    it('should perform quantum measurement to classical state', async () => {
      const quantumData = {
        superposition: ['state1', 'state2', 'state3'],
        measurement: 'classical-collapse'
      };

      const compressed = await algorithm.compress(quantumData);
      const decompressed = await algorithm.decompress(compressed);

      expect(decompressed.quantum_decompressed).toBe(true);
      expect(decompressed.superposition_count).toBeGreaterThan(0);
      expect(decompressed.reconstruction_fidelity).toBeGreaterThan(0);
      expect(decompressed.reconstruction_fidelity).toBeLessThanOrEqual(1);
      
      console.log(`Quantum measurement fidelity: ${(decompressed.reconstruction_fidelity * 100).toFixed(1)}%`);
    });

    it('should handle quantum run-length encoding', async () => {
      const runLengthData = {
        sequence: 'AAAAAABBBBBBCCCCCCDDDDDD',
        tolerance: 'quantum-superposition-based'
      };

      const result = await algorithm.compress(runLengthData);

      expect(result.compressed).toBe(true);
      
      // Quantum run-length encoding should be effective for repetitive sequences
      expect(result.ratio).toBeLessThan(0.7);
      
      console.log(`Quantum run-length encoding: ${(result.ratio * 100).toFixed(1)}% compression`);
    });

    it('should reconstruct quantum state from classical measurement', async () => {
      const originalData = {
        quantum_experiment: true,
        entangled_pairs: [[0, 1], [2, 3], [4, 5]],
        measurement_basis: 'computational'
      };

      const compressed = await algorithm.compress(originalData);
      expect(compressed.metadata.entanglement.pairs.length).toBeGreaterThan(0);
      
      const decompressed = await algorithm.decompress(compressed);
      
      expect(decompressed.quantum_decompressed).toBe(true);
      expect(decompressed.entanglement_pairs).toBeGreaterThan(0);
      expect(decompressed.note).toContain('Quantum-inspired decompression completed');
      
      console.log(`Reconstructed quantum state with ${decompressed.entanglement_pairs} entangled pairs`);
    });
  });

  describe('Quantum Algorithm Capabilities', () => {
    it('should report correct quantum algorithm capabilities', () => {
      const capabilities = algorithm.getCapabilities();

      expect(capabilities.name).toBe('quantum-inspired');
      expect(capabilities.strengths).toContain('Theoretical maximum compression');
      expect(capabilities.strengths).toContain('Parallel state exploration');
      expect(capabilities.strengths).toContain('Quantum superposition encoding');
      expect(capabilities.strengths).toContain('Entanglement-based optimization');
      
      expect(capabilities.weaknesses).toContain('Theoretical/experimental');
      expect(capabilities.weaknesses).toContain('High computational complexity');
      
      expect(capabilities.optimalDataTypes).toContain('repetitive');
      expect(capabilities.optimalDataTypes).toContain('structured');
      expect(capabilities.optimalDataTypes).toContain('quantum-suitable');
      
      expect(capabilities.averageRatio).toBe(0.05); // Theoretical 95%+ compression
      expect(capabilities.averageSpeed).toBe(2); // Slower due to complexity
      
      console.log(`Quantum algorithm: ${capabilities.strengths.length} strengths, ${capabilities.weaknesses.length} limitations`);
    });

    it('should handle algorithm identification correctly', () => {
      expect(algorithm.getName()).toBe('quantum-inspired');
    });
  });

  describe('Quantum Compression Edge Cases', () => {
    it('should handle empty data gracefully', async () => {
      const emptyData = {};

      const result = await algorithm.compress(emptyData);

      expect(result.compressed).toBe(true);
      expect(result.algorithm).toBe('quantum-inspired');
      expect(result.originalSize).toBe(2); // "{}"
      expect(result.compressedSize).toBeGreaterThan(0);
    });

    it('should handle very small data efficiently', async () => {
      const smallData = { x: 1 };

      const result = await algorithm.compress(smallData);

      expect(result.compressed).toBe(true);
      expect(result.compressionTime).toBeLessThan(100);
      expect(result.metadata.superposition).toBeGreaterThan(0);
    });

    it('should handle highly random data', async () => {
      const randomData = {
        random_array: Array.from({length: 100}, () => Math.random()),
        random_string: Math.random().toString(36).repeat(50),
        random_object: Object.fromEntries(
          Array.from({length: 20}, (_, i) => [`key_${Math.random()}`, Math.random()])
        )
      };

      const result = await algorithm.compress(randomData);

      expect(result.compressed).toBe(true);
      
      // Random data should still compress somewhat due to JSON structure
      expect(result.ratio).toBeLessThan(1);
      expect(result.ratio).toBeGreaterThan(0.5); // But not very well
      
      console.log(`Random data compression: ${(result.ratio * 100).toFixed(1)}%`);
    });

    it('should handle decompression of non-quantum data gracefully', async () => {
      const nonQuantumPayload = {
        compressed: true,
        algorithm: 'not-quantum',
        data: 'some-data'
      };

      // Should return the payload as-is since it's not quantum-compressed
      const result = await algorithm.decompress(nonQuantumPayload as any);
      expect(result).toEqual(nonQuantumPayload);
    });
  });

  describe('Quantum Performance Characteristics', () => {
    it('should demonstrate theoretical maximum compression on ideal data', async () => {
      const idealQuantumData = {
        superposition_states: Array(1000).fill('|0⟩'),
        entangled_system: {
          alice: Array(500).fill('↑'),
          bob: Array(500).fill('↓')
        },
        quantum_fourier_basis: Array.from({length: 64}, (_, i) => 
          Math.cos(2 * Math.PI * i / 64)
        )
      };

      const result = await algorithm.compress(idealQuantumData);

      // Should achieve very high compression for quantum-ideal data
      expect(result.ratio).toBeLessThan(0.1); // >90% compression
      expect(result.metadata.superposition).toBeGreaterThan(100);
      expect(result.metadata.entanglement.pairs.length).toBeGreaterThan(10);
      
      console.log(`Quantum ideal compression: ${((1 - result.ratio) * 100).toFixed(1)}%`);
      console.log(`Quantum features: ${result.metadata.superposition} superpositions, ${result.metadata.entanglement.pairs.length} entanglements`);
    });

    it('should show computational complexity characteristics', async () => {
      const complexityTestData = {
        size_64: 'x'.repeat(64),
        size_128: 'x'.repeat(128),
        size_256: 'x'.repeat(256)
      };

      const start = Date.now();
      const result = await algorithm.compress(complexityTestData);
      const time = Date.now() - start;

      expect(result.compressed).toBe(true);
      expect(time).toBeGreaterThan(0);
      
      // Quantum algorithm should show higher complexity but still reasonable performance
      console.log(`Quantum complexity: ${time}ms for ${JSON.stringify(complexityTestData).length} bytes`);
    });

    it('should validate quantum coherence properties', async () => {
      const coherentData = {
        wave_function: Array.from({length: 32}, (_, i) => ({
          real: Math.cos(i * Math.PI / 16),
          imaginary: Math.sin(i * Math.PI / 16)
        })),
        phase_relationships: 'coherent'
      };

      const result = await algorithm.compress(coherentData);

      expect(result.compressed).toBe(true);
      
      // Coherent quantum data should show strong entanglement
      const strongEntanglements = result.metadata.entanglement.correlations.filter(c => Math.abs(c) > 0.8);
      expect(strongEntanglements.length).toBeGreaterThan(0);
      
      console.log(`Quantum coherence: ${strongEntanglements.length} strong phase correlations detected`);
    });
  });
});