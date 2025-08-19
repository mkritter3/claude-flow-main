// Compression Learning System Tests
// Following Phase 3 roadmap requirements for AI-driven algorithm selection

import { CompressionLearner } from '../../services/compression/CompressionLearner.js';
import { CompressedData } from '../../services/compression/CompressionService.js';

describe('Compression Learning System', () => {
  let learner: CompressionLearner;

  beforeEach(() => {
    learner = new CompressionLearner();
  });

  describe('Feature Extraction', () => {
    it('should extract meaningful features from data', async () => {
      const testData = {
        text: 'This is a test string with repeated patterns. This is a test string with repeated patterns.',
        numbers: [1, 2, 3, 1, 2, 3, 1, 2, 3],
        structure: {
          nested: {
            deep: 'value'
          }
        }
      };

      // Learn from a compression result
      const mockResult: CompressedData = {
        compressed: true,
        algorithm: 'zstd',
        level: 3,
        data: 'compressed-data',
        originalSize: 1000,
        compressedSize: 300,
        ratio: 0.3,
        compressionTime: 45,
        metadata: {
          timestamp: Date.now(),
          checksum: 'abc123'
        }
      };

      await learner.learn(testData, mockResult);

      const history = learner.getHistory();
      expect(history).toHaveLength(1);

      const features = history[0].features;
      expect(features.size).toBeGreaterThan(0);
      expect(features.entropy).toBeGreaterThan(0);
      expect(features.entropy).toBeLessThanOrEqual(1);
      expect(features.repetition).toBeGreaterThan(0);
      expect(features.repetition).toBeLessThanOrEqual(1);
      expect(features.structure).toBeDefined();
      expect(features.dataType).toBeDefined();

      console.log(`Extracted features: size=${features.size}, entropy=${features.entropy.toFixed(2)}, repetition=${features.repetition.toFixed(2)}`);
    });

    it('should calculate entropy correctly for different data types', async () => {
      const testCases = [
        { name: 'High Entropy', data: Math.random().toString(36).repeat(100), expectedEntropy: 'high' },
        { name: 'Low Entropy', data: 'a'.repeat(1000), expectedEntropy: 'low' },
        { name: 'Medium Entropy', data: 'abcabc'.repeat(100), expectedEntropy: 'medium' }
      ];

      for (const testCase of testCases) {
        const mockResult: CompressedData = {
          compressed: true,
          algorithm: 'test',
          level: 1,
          data: 'data',
          originalSize: 100,
          compressedSize: 50,
          ratio: 0.5,
          compressionTime: 10,
          metadata: { timestamp: Date.now(), checksum: 'test' }
        };

        await learner.learn(testCase.data, mockResult);
        const history = learner.getHistory();
        const features = history[history.length - 1].features;

        if (testCase.expectedEntropy === 'high') {
          expect(features.entropy).toBeGreaterThan(0.7);
        } else if (testCase.expectedEntropy === 'low') {
          expect(features.entropy).toBeLessThan(0.3);
        } else {
          expect(features.entropy).toBeGreaterThan(0.3);
          expect(features.entropy).toBeLessThan(0.7);
        }

        console.log(`${testCase.name}: entropy = ${features.entropy.toFixed(3)}`);
      }
    });

    it('should detect data structure types correctly', async () => {
      const testCases = [
        { data: { simple: 'value' }, expectedStructure: 'flat' },
        { data: { outer: { inner: 'value' } }, expectedStructure: 'nested' },
        { data: [1, 2, 3, 4, 5], expectedStructure: 'array' },
        { data: Array(100).fill('same'), expectedStructure: 'repetitive' }
      ];

      for (const testCase of testCases) {
        const mockResult: CompressedData = {
          compressed: true,
          algorithm: 'test',
          level: 1,
          data: 'data',
          originalSize: 100,
          compressedSize: 50,
          ratio: 0.5,
          compressionTime: 10,
          metadata: { timestamp: Date.now(), checksum: 'test' }
        };

        await learner.learn(testCase.data, mockResult);
        const history = learner.getHistory();
        const features = history[history.length - 1].features;

        expect(features.structure).toBe(testCase.expectedStructure);
        console.log(`Structure detection: ${JSON.stringify(testCase.data).substring(0, 30)}... → ${features.structure}`);
      }
    });

    it('should identify data types accurately', async () => {
      const testCases = [
        { data: 'Hello world!', expectedType: 'text' },
        { data: 42, expectedType: 'number' },
        { data: { mixed: 'content', with: 123, values: true }, expectedType: 'mixed' },
        { data: Buffer.from('binary'), expectedType: 'binary' }
      ];

      for (const testCase of testCases) {
        const mockResult: CompressedData = {
          compressed: true,
          algorithm: 'test',
          level: 1,
          data: 'data',
          originalSize: 100,
          compressedSize: 50,
          ratio: 0.5,
          compressionTime: 10,
          metadata: { timestamp: Date.now(), checksum: 'test' }
        };

        await learner.learn(testCase.data, mockResult);
        const history = learner.getHistory();
        const features = history[history.length - 1].features;

        expect(features.dataType).toBe(testCase.expectedType);
        console.log(`Data type detection: ${typeof testCase.data} → ${features.dataType}`);
      }
    });
  });

  describe('Learning and Prediction', () => {
    it('should make reasonable predictions without training', async () => {
      const testData = {
        repetitive: 'pattern'.repeat(100),
        structure: 'simple'
      };

      const prediction = await learner.predict(testData);

      expect(prediction.algorithm).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      expect(prediction.confidence).toBeLessThanOrEqual(1);
      expect(prediction.expectedRatio).toBeGreaterThan(0);
      expect(prediction.expectedRatio).toBeLessThanOrEqual(1);

      // For repetitive data, should prefer zstd or quantum
      expect(['zstd', 'quantum-inspired']).toContain(prediction.algorithm);
      console.log(`Untrained prediction: ${prediction.algorithm} (confidence: ${prediction.confidence.toFixed(2)})`);
    });

    it('should improve predictions through learning', async () => {
      const trainingData = [
        { data: { type: 'repetitive', content: 'a'.repeat(1000) }, algorithm: 'zstd', ratio: 0.1 },
        { data: { type: 'text', content: 'Natural language text content with variety.' }, algorithm: 'brotli', ratio: 0.3 },
        { data: { type: 'random', content: Math.random().toString() }, algorithm: 'lz4', ratio: 0.8 },
        { data: { type: 'structured', items: Array(50).fill({id: 1}) }, algorithm: 'zstd', ratio: 0.15 }
      ];

      // Get initial prediction
      const testData = { type: 'repetitive', content: 'b'.repeat(1000) };
      const initialPrediction = await learner.predict(testData);

      // Train the learner
      for (let iteration = 0; iteration < 10; iteration++) {
        for (const sample of trainingData) {
          const mockResult: CompressedData = {
            compressed: true,
            algorithm: sample.algorithm,
            level: 3,
            data: 'compressed',
            originalSize: 1000,
            compressedSize: sample.ratio * 1000,
            ratio: sample.ratio,
            compressionTime: 25,
            metadata: { timestamp: Date.now(), checksum: 'test' }
          };
          await learner.learn(sample.data, mockResult);
        }
      }

      // Get prediction after training
      const trainedPrediction = await learner.predict(testData);

      expect(trainedPrediction.confidence).toBeGreaterThanOrEqual(initialPrediction.confidence);
      expect(trainedPrediction.algorithm).toBe('zstd'); // Should learn that repetitive → zstd

      console.log(`Learning improvement: ${initialPrediction.confidence.toFixed(2)} → ${trainedPrediction.confidence.toFixed(2)}`);
      console.log(`Algorithm consistency: ${trainedPrediction.algorithm} for repetitive data`);
    });

    it('should retrain model automatically after sufficient samples', async () => {
      const initialStats = learner.getModelStats();
      expect(initialStats.totalSamples).toBe(0);

      // Add exactly 100 samples to trigger retraining
      for (let i = 0; i < 100; i++) {
        const data = { sample: i, content: `data-${i}` };
        const mockResult: CompressedData = {
          compressed: true,
          algorithm: i % 2 === 0 ? 'zstd' : 'brotli',
          level: 3,
          data: 'compressed',
          originalSize: 100,
          compressedSize: 30,
          ratio: 0.3,
          compressionTime: 20,
          metadata: { timestamp: Date.now(), checksum: 'test' }
        };
        await learner.learn(data, mockResult);
      }

      const finalStats = learner.getModelStats();
      expect(finalStats.totalSamples).toBe(100);
      expect(finalStats.algorithmDistribution.zstd).toBe(50);
      expect(finalStats.algorithmDistribution.brotli).toBe(50);
      expect(finalStats.lastTraining).toBeGreaterThan(0);

      console.log(`Model stats after 100 samples: ${JSON.stringify(finalStats.algorithmDistribution)}`);
    });

    it('should handle heuristic predictions when no model is available', async () => {
      const testCases = [
        { data: { repetitive: 'x'.repeat(1000) }, expectedAlgo: 'zstd' },
        { data: { text: 'This is natural language text content for testing.' }, expectedAlgo: 'brotli' },
        { data: { small: 'tiny' }, expectedAlgo: 'lz4' },
        { data: { random: Math.random().toString() }, expectedAlgo: 'lz4' }
      ];

      for (const testCase of testCases) {
        const prediction = await learner.predict(testCase.data);
        
        expect(prediction.algorithm).toBe(testCase.expectedAlgo);
        expect(prediction.confidence).toBeGreaterThan(0.5);
        
        console.log(`Heuristic: ${JSON.stringify(testCase.data).substring(0, 20)}... → ${prediction.algorithm}`);
      }
    });
  });

  describe('Model Management', () => {
    it('should export and import model state correctly', async () => {
      // Train the model with some data
      const trainingData = [
        { data: 'text data', algorithm: 'brotli', ratio: 0.25 },
        { data: 'x'.repeat(1000), algorithm: 'zstd', ratio: 0.1 },
        { data: { small: 'data' }, algorithm: 'lz4', ratio: 0.7 }
      ];

      for (const sample of trainingData) {
        const mockResult: CompressedData = {
          compressed: true,
          algorithm: sample.algorithm,
          level: 3,
          data: 'compressed',
          originalSize: 1000,
          compressedSize: sample.ratio * 1000,
          ratio: sample.ratio,
          compressionTime: 25,
          metadata: { timestamp: Date.now(), checksum: 'test' }
        };
        await learner.learn(sample.data, mockResult);
      }

      // Export the model
      const exported = learner.exportModel();
      expect(exported.history).toHaveLength(3);
      expect(exported.timestamp).toBeGreaterThan(0);
      expect(exported.modelType).toBeDefined();

      // Create new learner and import
      const newLearner = new CompressionLearner();
      newLearner.importModel(exported);

      const newStats = newLearner.getModelStats();
      const originalStats = learner.getModelStats();

      expect(newStats.totalSamples).toBe(originalStats.totalSamples);
      expect(newStats.algorithmDistribution).toEqual(originalStats.algorithmDistribution);

      console.log('Model export/import successful');
    });

    it('should track model statistics accurately', async () => {
      const algorithms = ['zstd', 'brotli', 'lz4', 'quantum-inspired'];
      const samplesPerAlgorithm = 25;

      for (const algorithm of algorithms) {
        for (let i = 0; i < samplesPerAlgorithm; i++) {
          const data = { algorithm, sample: i };
          const mockResult: CompressedData = {
            compressed: true,
            algorithm,
            level: 3,
            data: 'compressed',
            originalSize: 1000,
            compressedSize: 300,
            ratio: 0.3,
            compressionTime: 20,
            metadata: { timestamp: Date.now(), checksum: 'test' }
          };
          await learner.learn(data, mockResult);
        }
      }

      const stats = learner.getModelStats();
      expect(stats.totalSamples).toBe(algorithms.length * samplesPerAlgorithm);
      
      for (const algorithm of algorithms) {
        expect(stats.algorithmDistribution[algorithm]).toBe(samplesPerAlgorithm);
      }

      expect(stats.lastTraining).toBeGreaterThan(0);
      console.log(`Algorithm distribution: ${JSON.stringify(stats.algorithmDistribution)}`);
    });

    it('should test model accuracy against known data', async () => {
      // Train with known patterns
      const knownPatterns = [
        { data: { pattern: 'repetitive', content: 'a'.repeat(500) }, bestAlgo: 'zstd' },
        { data: { pattern: 'text', content: 'Natural language content with variety and structure.' }, bestAlgo: 'brotli' },
        { data: { pattern: 'small', content: 'tiny' }, bestAlgo: 'lz4' },
        { data: { pattern: 'random', content: Math.random().toString(36) }, bestAlgo: 'lz4' }
      ];

      // Train multiple times
      for (let iteration = 0; iteration < 20; iteration++) {
        for (const pattern of knownPatterns) {
          const mockResult: CompressedData = {
            compressed: true,
            algorithm: pattern.bestAlgo,
            level: 3,
            data: 'compressed',
            originalSize: 1000,
            compressedSize: pattern.bestAlgo === 'zstd' ? 100 : 
                           pattern.bestAlgo === 'brotli' ? 250 : 600,
            ratio: pattern.bestAlgo === 'zstd' ? 0.1 : 
                   pattern.bestAlgo === 'brotli' ? 0.25 : 0.6,
            compressionTime: 25,
            metadata: { timestamp: Date.now(), checksum: 'test' }
          };
          await learner.learn(pattern.data, mockResult);
        }
      }

      // Test accuracy
      const testData = knownPatterns.map(p => ({
        data: { ...p.data, test: true },
        expected: p.bestAlgo
      }));

      const accuracyTest = await learner.testModelAccuracy(testData.map(t => t.data));
      
      expect(accuracyTest.accuracy).toBeGreaterThan(0.5); // Should learn patterns
      expect(accuracyTest.predictions).toHaveLength(testData.length);
      
      accuracyTest.predictions.forEach(pred => {
        expect(pred.confidence).toBeGreaterThan(0);
        expect(pred.confidence).toBeLessThanOrEqual(1);
      });

      console.log(`Model accuracy: ${(accuracyTest.accuracy * 100).toFixed(1)}%`);
    });
  });

  describe('Edge Cases and Error Handling', () => {
    it('should handle empty data gracefully', async () => {
      const emptyData = {};
      const prediction = await learner.predict(emptyData);

      expect(prediction.algorithm).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      
      console.log(`Empty data prediction: ${prediction.algorithm}`);
    });

    it('should handle very large data structures', async () => {
      const largeData = {
        large_array: Array.from({length: 10000}, (_, i) => ({ id: i, value: i * 2 })),
        large_text: 'x'.repeat(100000)
      };

      const prediction = await learner.predict(largeData);

      expect(prediction.algorithm).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      
      // For large repetitive data, should prefer zstd
      expect(['zstd', 'quantum-inspired']).toContain(prediction.algorithm);
      
      console.log(`Large data prediction: ${prediction.algorithm} (confidence: ${prediction.confidence.toFixed(2)})`);
    });

    it('should handle corrupted history data', async () => {
      // Add some normal data first
      const normalData = { test: 'data' };
      const mockResult: CompressedData = {
        compressed: true,
        algorithm: 'zstd',
        level: 3,
        data: 'compressed',
        originalSize: 100,
        compressedSize: 30,
        ratio: 0.3,
        compressionTime: 25,
        metadata: { timestamp: Date.now(), checksum: 'test' }
      };
      await learner.learn(normalData, mockResult);

      // Try to import corrupted data
      const corruptedExport = {
        history: 'not-an-array',
        timestamp: Date.now()
      };

      // Should not crash
      learner.importModel(corruptedExport);
      
      // Should still work with original data
      const prediction = await learner.predict(normalData);
      expect(prediction.algorithm).toBeDefined();
      
      console.log('Gracefully handled corrupted model data');
    });

    it('should provide fallback when AI training fails', async () => {
      // Create learner without Claude client (AI will fail)
      const learnerWithoutAI = new CompressionLearner();

      // Add enough samples to trigger retraining
      for (let i = 0; i < 100; i++) {
        const data = { sample: i };
        const mockResult: CompressedData = {
          compressed: true,
          algorithm: 'zstd',
          level: 3,
          data: 'compressed',
          originalSize: 100,
          compressedSize: 30,
          ratio: 0.3,
          compressionTime: 25,
          metadata: { timestamp: Date.now(), checksum: 'test' }
        };
        await learnerWithoutAI.learn(data, mockResult);
      }

      // Should still make predictions using rule-based fallback
      const prediction = await learnerWithoutAI.predict({ test: 'data' });
      expect(prediction.algorithm).toBeDefined();
      expect(prediction.confidence).toBeGreaterThan(0);
      
      const stats = learnerWithoutAI.getModelStats();
      expect(stats.modelType).toContain('Rule'); // Should use rule-based model
      
      console.log(`Fallback model type: ${stats.modelType}`);
    });
  });
});