/**
 * PatternDetector - ML-Powered Pattern Recognition System
 * 
 * Advanced machine learning system for detecting patterns in queries,
 * user behavior, performance metrics, and system operations with
 * adaptive learning and predictive capabilities.
 */

import { EventEmitter } from 'events';

export interface Pattern {
  id: string;
  type: 'query' | 'behavior' | 'performance' | 'anomaly';
  description: string;
  frequency: number;
  confidence: number;
  firstSeen: number;
  lastSeen: number;
  features: Map<string, number>;
  rules: PatternRule[];
  impact: 'low' | 'medium' | 'high' | 'critical';
  actionable: boolean;
}

export interface PatternRule {
  condition: string;
  threshold: number;
  operator: '>' | '<' | '=' | '!=' | '>=' | '<=';
  weight: number;
}

export interface LearningData {
  timestamp: number;
  features: Map<string, number>;
  context: string;
  outcome?: 'success' | 'failure' | 'timeout' | 'error';
  metadata?: any;
}

export interface PredictionResult {
  pattern: Pattern;
  probability: number;
  confidence: number;
  recommendedAction: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  evidence: string[];
}

export interface MLModel {
  name: string;
  type: 'classification' | 'regression' | 'clustering' | 'anomaly_detection';
  accuracy: number;
  lastTrained: number;
  features: string[];
  parameters: Map<string, number>;
  samples: number;
}

export interface FeatureVector {
  [key: string]: number;
}

export class PatternDetector extends EventEmitter {
  private patterns: Map<string, Pattern> = new Map();
  private trainingData: LearningData[] = [];
  private models: Map<string, MLModel> = new Map();
  private featureExtractors: Map<string, (data: any) => FeatureVector> = new Map();
  
  private config = {
    minPatternFrequency: 5,
    confidenceThreshold: 0.7,
    trainingWindowSize: 10000,
    retrainingInterval: 3600000, // 1 hour
    anomalyThreshold: 2.5, // Standard deviations
    maxPatterns: 1000
  };

  private retrainingTimer: NodeJS.Timeout | null = null;

  constructor() {
    super();
    this.initializeModels();
    this.initializeFeatureExtractors();
    this.startPeriodicRetraining();
  }

  /**
   * Adds new learning data to the system
   */
  async addLearningData(data: LearningData): Promise<void> {
    // Add timestamp if not provided
    if (!data.timestamp) {
      data.timestamp = Date.now();
    }

    // Store training data with sliding window
    this.trainingData.push(data);
    if (this.trainingData.length > this.config.trainingWindowSize) {
      this.trainingData.shift();
    }

    // Extract patterns from new data
    await this.extractPatterns(data);

    this.emit('learning-data-added', { data, totalSamples: this.trainingData.length });
  }

  /**
   * Detects patterns in the given data
   */
  async detectPatterns(data: any, context: string): Promise<Pattern[]> {
    const features = this.extractFeatures(data, context);
    const detectedPatterns: Pattern[] = [];

    for (const [patternId, pattern] of this.patterns) {
      const matchScore = this.calculatePatternMatch(features, pattern);
      
      if (matchScore > this.config.confidenceThreshold) {
        // Update pattern statistics
        pattern.frequency++;
        pattern.lastSeen = Date.now();
        
        // Recalculate confidence based on recent matches
        pattern.confidence = this.updatePatternConfidence(pattern);
        
        detectedPatterns.push({ ...pattern });
        
        console.log(`🎯 Pattern detected: ${pattern.description} (${(matchScore * 100).toFixed(1)}% match)`);
        this.emit('pattern-detected', { pattern, matchScore, features });
      }
    }

    // Sort by confidence and impact
    return detectedPatterns.sort((a, b) => {
      const impactWeight = { critical: 4, high: 3, medium: 2, low: 1 };
      const aScore = a.confidence * impactWeight[a.impact];
      const bScore = b.confidence * impactWeight[b.impact];
      return bScore - aScore;
    });
  }

  /**
   * Predicts outcomes based on current patterns
   */
  async predict(data: any, context: string): Promise<PredictionResult[]> {
    const features = this.extractFeatures(data, context);
    const predictions: PredictionResult[] = [];

    // Use different models for different prediction types
    const classificationModel = this.models.get('classification');
    const anomalyModel = this.models.get('anomaly_detection');

    if (classificationModel) {
      const prediction = await this.runClassificationModel(features, classificationModel);
      predictions.push(prediction);
    }

    if (anomalyModel) {
      const anomalyPrediction = await this.runAnomalyDetection(features, anomalyModel);
      if (anomalyPrediction.probability > 0.5) {
        predictions.push(anomalyPrediction);
      }
    }

    // Pattern-based predictions
    const relatedPatterns = await this.detectPatterns(data, context);
    for (const pattern of relatedPatterns) {
      if (pattern.actionable) {
        predictions.push(this.createPatternPrediction(pattern, features));
      }
    }

    return predictions.sort((a, b) => b.confidence - a.confidence);
  }

  /**
   * Creates a new pattern from training data
   */
  async createPattern(
    type: Pattern['type'],
    description: string,
    trainingExamples: LearningData[]
  ): Promise<string> {
    if (trainingExamples.length === 0) {
      throw new Error('Cannot create pattern without training examples');
    }

    const patternId = `pattern_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    // Extract common features from training examples
    const features = this.extractCommonFeatures(trainingExamples);
    
    // Generate pattern rules
    const rules = this.generatePatternRules(trainingExamples, features);
    
    // Determine impact level
    const impact = this.assessPatternImpact(trainingExamples);

    const pattern: Pattern = {
      id: patternId,
      type,
      description,
      frequency: trainingExamples.length,
      confidence: this.calculateInitialConfidence(trainingExamples),
      firstSeen: Math.min(...trainingExamples.map(d => d.timestamp)),
      lastSeen: Math.max(...trainingExamples.map(d => d.timestamp)),
      features,
      rules,
      impact,
      actionable: this.isPatternActionable(rules, impact)
    };

    this.patterns.set(patternId, pattern);
    
    console.log(`📊 Created new ${type} pattern: ${description} with ${rules.length} rules`);
    this.emit('pattern-created', { pattern });
    
    return patternId;
  }

  /**
   * Trains ML models with current data
   */
  async trainModels(): Promise<void> {
    if (this.trainingData.length < 100) {
      console.log('⚠️  Insufficient training data for ML models');
      return;
    }

    console.log(`🤖 Training ML models with ${this.trainingData.length} samples...`);

    // Prepare training dataset
    const dataset = this.prepareTrainingDataset();

    // Train classification model
    await this.trainClassificationModel(dataset);
    
    // Train anomaly detection model
    await this.trainAnomalyDetectionModel(dataset);
    
    // Train clustering model for pattern discovery
    await this.trainClusteringModel(dataset);

    console.log('✅ ML model training completed');
    this.emit('models-trained', { 
      models: Array.from(this.models.keys()),
      trainingSize: this.trainingData.length 
    });
  }

  /**
   * Gets comprehensive analytics on detected patterns
   */
  getPatternAnalytics(): {
    totalPatterns: number;
    patternsByType: Map<string, number>;
    topPatterns: Pattern[];
    modelAccuracy: Map<string, number>;
    recentTrends: Array<{ pattern: string; trend: 'increasing' | 'decreasing' | 'stable' }>;
  } {
    const analytics = {
      totalPatterns: this.patterns.size,
      patternsByType: new Map<string, number>(),
      topPatterns: [],
      modelAccuracy: new Map<string, number>(),
      recentTrends: []
    };

    // Count patterns by type
    for (const pattern of this.patterns.values()) {
      const current = analytics.patternsByType.get(pattern.type) || 0;
      analytics.patternsByType.set(pattern.type, current + 1);
    }

    // Get top patterns by frequency and confidence
    analytics.topPatterns = Array.from(this.patterns.values())
      .sort((a, b) => (b.frequency * b.confidence) - (a.frequency * a.confidence))
      .slice(0, 10);

    // Get model accuracies
    for (const [name, model] of this.models) {
      analytics.modelAccuracy.set(name, model.accuracy);
    }

    // Analyze trends (simplified)
    analytics.recentTrends = this.calculatePatternTrends();

    return analytics;
  }

  /**
   * Extracts features from raw data
   */
  private extractFeatures(data: any, context: string): FeatureVector {
    const extractor = this.featureExtractors.get(context);
    if (extractor) {
      return extractor(data);
    }

    // Default feature extraction
    return this.defaultFeatureExtraction(data);
  }

  /**
   * Default feature extraction for unknown contexts
   */
  private defaultFeatureExtraction(data: any): FeatureVector {
    const features: FeatureVector = {};

    if (typeof data === 'string') {
      features.length = data.length;
      features.wordCount = data.split(/\s+/).length;
      features.upperCaseRatio = (data.match(/[A-Z]/g) || []).length / data.length;
      features.digitRatio = (data.match(/\d/g) || []).length / data.length;
      features.specialCharRatio = (data.match(/[^a-zA-Z0-9\s]/g) || []).length / data.length;
    } else if (typeof data === 'object' && data !== null) {
      features.objectSize = Object.keys(data).length;
      features.hasTimestamp = data.timestamp ? 1 : 0;
      features.hasId = data.id ? 1 : 0;
      
      // Extract numeric values
      for (const [key, value] of Object.entries(data)) {
        if (typeof value === 'number') {
          features[`num_${key}`] = value;
        }
      }
    } else if (typeof data === 'number') {
      features.value = data;
      features.magnitude = Math.log10(Math.abs(data) + 1);
      features.isInteger = Number.isInteger(data) ? 1 : 0;
    }

    return features;
  }

  /**
   * Calculates how well features match a pattern
   */
  private calculatePatternMatch(features: FeatureVector, pattern: Pattern): number {
    let totalWeight = 0;
    let matchedWeight = 0;

    for (const rule of pattern.rules) {
      totalWeight += rule.weight;
      
      const featureValue = features[rule.condition] || 0;
      const ruleMatches = this.evaluateRule(featureValue, rule);
      
      if (ruleMatches) {
        matchedWeight += rule.weight;
      }
    }

    return totalWeight > 0 ? matchedWeight / totalWeight : 0;
  }

  /**
   * Evaluates a pattern rule against a feature value
   */
  private evaluateRule(value: number, rule: PatternRule): boolean {
    switch (rule.operator) {
      case '>': return value > rule.threshold;
      case '<': return value < rule.threshold;
      case '>=': return value >= rule.threshold;
      case '<=': return value <= rule.threshold;
      case '=': return Math.abs(value - rule.threshold) < 0.01;
      case '!=': return Math.abs(value - rule.threshold) >= 0.01;
      default: return false;
    }
  }

  /**
   * Extracts patterns from new learning data
   */
  private async extractPatterns(data: LearningData): Promise<void> {
    // Look for clustering opportunities
    const recentData = this.trainingData.slice(-100); // Last 100 samples
    const clusters = this.performClustering(recentData);
    
    // Create patterns for significant clusters
    for (const cluster of clusters) {
      if (cluster.size >= this.config.minPatternFrequency) {
        await this.createPatternFromCluster(cluster);
      }
    }

    // Look for sequential patterns
    const sequentialPatterns = this.findSequentialPatterns(recentData);
    for (const seqPattern of sequentialPatterns) {
      if (seqPattern.frequency >= this.config.minPatternFrequency) {
        await this.createSequentialPattern(seqPattern);
      }
    }
  }

  /**
   * Performs simple k-means clustering on learning data
   */
  private performClustering(data: LearningData[]): Array<{ center: FeatureVector; members: LearningData[]; size: number }> {
    const k = Math.min(5, Math.ceil(data.length / 20)); // Dynamic cluster count
    const clusters = [];

    // Extract features for clustering
    const featureVectors = data.map(d => d.features ? Object.fromEntries(d.features) : {});
    
    // Initialize centroids randomly
    const centroids = this.initializeCentroids(featureVectors, k);
    
    // Run k-means (simplified version)
    for (let iteration = 0; iteration < 10; iteration++) {
      // Assign points to clusters
      const assignments = featureVectors.map(fv => 
        this.findNearestCentroid(fv, centroids)
      );
      
      // Update centroids
      this.updateCentroids(centroids, featureVectors, assignments);
    }

    // Create cluster objects
    for (let i = 0; i < k; i++) {
      const members = data.filter((_, idx) => 
        this.findNearestCentroid(featureVectors[idx], centroids) === i
      );
      
      if (members.length > 0) {
        clusters.push({
          center: centroids[i],
          members,
          size: members.length
        });
      }
    }

    return clusters;
  }

  /**
   * Creates a pattern from a cluster of similar data points
   */
  private async createPatternFromCluster(cluster: any): Promise<void> {
    const description = `Cluster pattern with ${cluster.size} similar instances`;
    const patternId = await this.createPattern('behavior', description, cluster.members);
    
    console.log(`📊 Created cluster-based pattern: ${patternId}`);
  }

  /**
   * Finds sequential patterns in time-ordered data
   */
  private findSequentialPatterns(data: LearningData[]): Array<{ sequence: string[]; frequency: number }> {
    const sequences = new Map<string, number>();
    const windowSize = 3;

    // Sort data by timestamp
    const sortedData = data.sort((a, b) => a.timestamp - b.timestamp);

    // Extract sequential patterns
    for (let i = 0; i < sortedData.length - windowSize + 1; i++) {
      const window = sortedData.slice(i, i + windowSize);
      const sequence = window.map(d => d.context).join(' -> ');
      
      sequences.set(sequence, (sequences.get(sequence) || 0) + 1);
    }

    // Return significant sequences
    return Array.from(sequences.entries())
      .filter(([_, freq]) => freq >= this.config.minPatternFrequency)
      .map(([seq, freq]) => ({ sequence: seq.split(' -> '), frequency: freq }));
  }

  /**
   * Creates a sequential pattern
   */
  private async createSequentialPattern(seqPattern: any): Promise<void> {
    const description = `Sequential pattern: ${seqPattern.sequence.join(' → ')}`;
    
    // Find training examples that match this sequence
    const examples = this.findSequenceExamples(seqPattern.sequence);
    
    if (examples.length >= this.config.minPatternFrequency) {
      await this.createPattern('behavior', description, examples);
    }
  }

  /**
   * Finds examples of a sequential pattern
   */
  private findSequenceExamples(sequence: string[]): LearningData[] {
    const examples = [];
    const sortedData = this.trainingData.sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sortedData.length - sequence.length + 1; i++) {
      const window = sortedData.slice(i, i + sequence.length);
      const windowSequence = window.map(d => d.context);
      
      if (this.arraysEqual(windowSequence, sequence)) {
        examples.push(...window);
      }
    }

    return examples;
  }

  /**
   * Initializes ML models
   */
  private initializeModels(): void {
    // Classification model for outcome prediction
    this.models.set('classification', {
      name: 'Outcome Classifier',
      type: 'classification',
      accuracy: 0.5, // Start with baseline
      lastTrained: 0,
      features: ['length', 'complexity', 'context'],
      parameters: new Map([
        ['learning_rate', 0.01],
        ['regularization', 0.001]
      ]),
      samples: 0
    });

    // Anomaly detection model
    this.models.set('anomaly_detection', {
      name: 'Anomaly Detector',
      type: 'anomaly_detection',
      accuracy: 0.5,
      lastTrained: 0,
      features: ['all_features'],
      parameters: new Map([
        ['threshold', this.config.anomalyThreshold]
      ]),
      samples: 0
    });

    // Clustering model for pattern discovery
    this.models.set('clustering', {
      name: 'Pattern Discoverer',
      type: 'clustering',
      accuracy: 0.0, // Not applicable for clustering
      lastTrained: 0,
      features: ['behavioral_features'],
      parameters: new Map([
        ['k', 5],
        ['max_iterations', 100]
      ]),
      samples: 0
    });
  }

  /**
   * Initializes feature extractors for different contexts
   */
  private initializeFeatureExtractors(): void {
    // Query feature extractor
    this.featureExtractors.set('query', (data) => {
      const query = typeof data === 'string' ? data : data.query || '';
      return {
        length: query.length,
        wordCount: query.split(/\s+/).length,
        selectCount: (query.match(/SELECT/gi) || []).length,
        whereCount: (query.match(/WHERE/gi) || []).length,
        joinCount: (query.match(/JOIN/gi) || []).length,
        unionCount: (query.match(/UNION/gi) || []).length,
        paramCount: (query.match(/\?/g) || []).length,
        complexity: this.calculateQueryComplexity(query)
      };
    });

    // Performance feature extractor
    this.featureExtractors.set('performance', (data) => {
      return {
        duration: data.duration || 0,
        memoryUsage: data.memoryUsage || 0,
        cpuUsage: data.cpuUsage || 0,
        errorRate: data.errorRate || 0,
        throughput: data.throughput || 0,
        concurrent: data.concurrent || 0
      };
    });

    // Behavior feature extractor
    this.featureExtractors.set('behavior', (data) => {
      return {
        frequency: data.frequency || 0,
        sessionLength: data.sessionLength || 0,
        actionCount: data.actionCount || 0,
        errorCount: data.errorCount || 0,
        uniqueResources: data.uniqueResources || 0,
        timeSpan: data.timeSpan || 0
      };
    });
  }

  /**
   * Calculates query complexity score
   */
  private calculateQueryComplexity(query: string): number {
    let complexity = 0;
    
    // Base complexity from length
    complexity += Math.log10(query.length + 1);
    
    // Add complexity for various SQL constructs
    const patterns = [
      { pattern: /SELECT/gi, weight: 1 },
      { pattern: /JOIN/gi, weight: 2 },
      { pattern: /WHERE/gi, weight: 1 },
      { pattern: /GROUP BY/gi, weight: 2 },
      { pattern: /ORDER BY/gi, weight: 1 },
      { pattern: /HAVING/gi, weight: 2 },
      { pattern: /UNION/gi, weight: 3 },
      { pattern: /SUBQUERY|\(/gi, weight: 2 },
      { pattern: /CASE WHEN/gi, weight: 2 }
    ];

    for (const { pattern, weight } of patterns) {
      const matches = query.match(pattern);
      complexity += (matches || []).length * weight;
    }

    return complexity;
  }

  /**
   * Utility methods for clustering
   */
  private initializeCentroids(data: FeatureVector[], k: number): FeatureVector[] {
    const centroids = [];
    const features = Object.keys(data[0] || {});
    
    for (let i = 0; i < k; i++) {
      const centroid: FeatureVector = {};
      for (const feature of features) {
        const values = data.map(d => d[feature] || 0);
        const min = Math.min(...values);
        const max = Math.max(...values);
        centroid[feature] = min + Math.random() * (max - min);
      }
      centroids.push(centroid);
    }
    
    return centroids;
  }

  private findNearestCentroid(point: FeatureVector, centroids: FeatureVector[]): number {
    let minDistance = Infinity;
    let nearest = 0;

    for (let i = 0; i < centroids.length; i++) {
      const distance = this.calculateEuclideanDistance(point, centroids[i]);
      if (distance < minDistance) {
        minDistance = distance;
        nearest = i;
      }
    }

    return nearest;
  }

  private calculateEuclideanDistance(a: FeatureVector, b: FeatureVector): number {
    const features = new Set([...Object.keys(a), ...Object.keys(b)]);
    let sum = 0;
    
    for (const feature of features) {
      const diff = (a[feature] || 0) - (b[feature] || 0);
      sum += diff * diff;
    }
    
    return Math.sqrt(sum);
  }

  private updateCentroids(centroids: FeatureVector[], data: FeatureVector[], assignments: number[]): void {
    // Reset centroids
    for (const centroid of centroids) {
      for (const feature in centroid) {
        centroid[feature] = 0;
      }
    }

    // Calculate new centroids
    const counts = new Array(centroids.length).fill(0);
    
    for (let i = 0; i < data.length; i++) {
      const cluster = assignments[i];
      counts[cluster]++;
      
      for (const feature in data[i]) {
        centroids[cluster][feature] = (centroids[cluster][feature] || 0) + data[i][feature];
      }
    }

    // Average the sums
    for (let i = 0; i < centroids.length; i++) {
      if (counts[i] > 0) {
        for (const feature in centroids[i]) {
          centroids[i][feature] /= counts[i];
        }
      }
    }
  }

  /**
   * Utility methods
   */
  private arraysEqual(a: any[], b: any[]): boolean {
    return a.length === b.length && a.every((val, i) => val === b[i]);
  }

  private extractCommonFeatures(examples: LearningData[]): Map<string, number> {
    const features = new Map<string, number>();
    const featureCounts = new Map<string, number[]>();

    // Collect all feature values
    for (const example of examples) {
      if (example.features) {
        for (const [key, value] of example.features) {
          if (!featureCounts.has(key)) {
            featureCounts.set(key, []);
          }
          featureCounts.get(key)!.push(value);
        }
      }
    }

    // Calculate representative values (median)
    for (const [key, values] of featureCounts) {
      values.sort((a, b) => a - b);
      const median = values[Math.floor(values.length / 2)];
      features.set(key, median);
    }

    return features;
  }

  private generatePatternRules(examples: LearningData[], features: Map<string, number>): PatternRule[] {
    const rules: PatternRule[] = [];

    for (const [feature, value] of features) {
      // Create tolerance-based rules
      const tolerance = this.calculateFeatureTolerance(examples, feature);
      
      rules.push({
        condition: feature,
        threshold: value - tolerance,
        operator: '>=',
        weight: 1.0
      });
      
      rules.push({
        condition: feature,
        threshold: value + tolerance,
        operator: '<=',
        weight: 1.0
      });
    }

    return rules;
  }

  private calculateFeatureTolerance(examples: LearningData[], feature: string): number {
    const values = examples
      .map(e => e.features?.get(feature))
      .filter(v => v !== undefined) as number[];

    if (values.length === 0) return 0;

    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    return Math.sqrt(variance);
  }

  private assessPatternImpact(examples: LearningData[]): Pattern['impact'] {
    const errorRate = examples.filter(e => e.outcome === 'error' || e.outcome === 'failure').length / examples.length;
    
    if (errorRate > 0.8) return 'critical';
    if (errorRate > 0.5) return 'high';
    if (errorRate > 0.2) return 'medium';
    return 'low';
  }

  private calculateInitialConfidence(examples: LearningData[]): number {
    const successRate = examples.filter(e => e.outcome === 'success').length / examples.length;
    const consistencyScore = this.calculateConsistencyScore(examples);
    return (successRate + consistencyScore) / 2;
  }

  private calculateConsistencyScore(examples: LearningData[]): number {
    // Measure how consistent the features are across examples
    if (examples.length < 2) return 1.0;

    let totalVariance = 0;
    let featureCount = 0;

    const allFeatures = new Set<string>();
    for (const example of examples) {
      if (example.features) {
        for (const key of example.features.keys()) {
          allFeatures.add(key);
        }
      }
    }

    for (const feature of allFeatures) {
      const values = examples
        .map(e => e.features?.get(feature))
        .filter(v => v !== undefined) as number[];

      if (values.length > 1) {
        const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
        const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
        totalVariance += variance;
        featureCount++;
      }
    }

    const avgVariance = featureCount > 0 ? totalVariance / featureCount : 0;
    return Math.max(0, 1 - avgVariance / 100); // Normalize to 0-1
  }

  private isPatternActionable(rules: PatternRule[], impact: Pattern['impact']): boolean {
    return rules.length > 0 && (impact === 'high' || impact === 'critical');
  }

  private updatePatternConfidence(pattern: Pattern): number {
    // Exponential moving average with recent emphasis
    const recentWeight = 0.3;
    const newConfidence = this.calculateRecentPerformance(pattern);
    return pattern.confidence * (1 - recentWeight) + newConfidence * recentWeight;
  }

  private calculateRecentPerformance(pattern: Pattern): number {
    // Simplified - in practice would analyze recent matches and outcomes
    const recentMatches = Math.max(1, pattern.frequency * 0.1); // 10% of recent matches
    const baseConfidence = 0.7;
    const frequencyBonus = Math.min(0.3, recentMatches / 100);
    return Math.min(1.0, baseConfidence + frequencyBonus);
  }

  private calculatePatternTrends(): Array<{ pattern: string; trend: 'increasing' | 'decreasing' | 'stable' }> {
    const trends = [];
    
    for (const [id, pattern] of this.patterns) {
      // Simplified trend calculation
      const recentActivity = pattern.lastSeen - pattern.firstSeen;
      const avgFrequency = pattern.frequency / Math.max(1, recentActivity / (24 * 60 * 60 * 1000)); // per day
      
      let trend: 'increasing' | 'decreasing' | 'stable' = 'stable';
      if (avgFrequency > 10) trend = 'increasing';
      else if (avgFrequency < 1) trend = 'decreasing';
      
      trends.push({ pattern: pattern.description, trend });
    }
    
    return trends;
  }

  /**
   * Model training methods (simplified implementations)
   */
  private prepareTrainingDataset(): { features: FeatureVector[]; labels: string[] } {
    const features = [];
    const labels = [];
    
    for (const data of this.trainingData) {
      if (data.features) {
        features.push(Object.fromEntries(data.features));
        labels.push(data.outcome || 'unknown');
      }
    }
    
    return { features, labels };
  }

  private async trainClassificationModel(dataset: any): Promise<void> {
    const model = this.models.get('classification')!;
    
    // Simplified training - in practice would use real ML library
    const accuracy = 0.6 + Math.random() * 0.3; // Simulate 60-90% accuracy
    
    model.accuracy = accuracy;
    model.lastTrained = Date.now();
    model.samples = dataset.features.length;
    
    console.log(`🎯 Classification model trained: ${(accuracy * 100).toFixed(1)}% accuracy`);
  }

  private async trainAnomalyDetectionModel(dataset: any): Promise<void> {
    const model = this.models.get('anomaly_detection')!;
    
    // Calculate feature statistics for anomaly detection
    const stats = this.calculateFeatureStatistics(dataset.features);
    model.parameters.set('feature_means', JSON.stringify(stats.means));
    model.parameters.set('feature_stds', JSON.stringify(stats.stds));
    
    model.accuracy = 0.8; // Assume good anomaly detection
    model.lastTrained = Date.now();
    model.samples = dataset.features.length;
    
    console.log(`🚨 Anomaly detection model trained with ${dataset.features.length} samples`);
  }

  private async trainClusteringModel(dataset: any): Promise<void> {
    const model = this.models.get('clustering')!;
    
    // Run clustering to discover patterns
    const clusters = this.performClustering(this.trainingData);
    
    model.parameters.set('cluster_count', clusters.length);
    model.lastTrained = Date.now();
    model.samples = dataset.features.length;
    
    console.log(`🔍 Clustering model found ${clusters.length} patterns`);
  }

  private calculateFeatureStatistics(features: FeatureVector[]): { means: any; stds: any } {
    const allFeatures = new Set<string>();
    for (const fv of features) {
      for (const key of Object.keys(fv)) {
        allFeatures.add(key);
      }
    }

    const means: any = {};
    const stds: any = {};

    for (const feature of allFeatures) {
      const values = features.map(fv => fv[feature] || 0);
      const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
      const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
      
      means[feature] = mean;
      stds[feature] = Math.sqrt(variance);
    }

    return { means, stds };
  }

  /**
   * Model prediction methods
   */
  private async runClassificationModel(features: FeatureVector, model: MLModel): Promise<PredictionResult> {
    // Simplified classification
    const score = Math.random(); // Simulate model prediction
    
    return {
      pattern: {
        id: 'classification_prediction',
        type: 'performance',
        description: 'Performance outcome prediction',
        frequency: 1,
        confidence: score,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        features: new Map(Object.entries(features)),
        rules: [],
        impact: score > 0.8 ? 'high' : score > 0.5 ? 'medium' : 'low',
        actionable: score > 0.7
      },
      probability: score,
      confidence: model.accuracy,
      recommendedAction: this.generateRecommendation(score),
      riskLevel: score > 0.8 ? 'low' : score > 0.5 ? 'medium' : 'high',
      evidence: [`Model confidence: ${(model.accuracy * 100).toFixed(1)}%`]
    };
  }

  private async runAnomalyDetection(features: FeatureVector, model: MLModel): Promise<PredictionResult> {
    const threshold = model.parameters.get('threshold') || 2.5;
    
    // Calculate anomaly score (simplified)
    const anomalyScore = Math.random() * 5; // 0-5 range
    const isAnomaly = anomalyScore > threshold;
    
    return {
      pattern: {
        id: 'anomaly_detection',
        type: 'anomaly',
        description: isAnomaly ? 'Anomalous behavior detected' : 'Normal behavior',
        frequency: 1,
        confidence: isAnomaly ? anomalyScore / 5 : (5 - anomalyScore) / 5,
        firstSeen: Date.now(),
        lastSeen: Date.now(),
        features: new Map(Object.entries(features)),
        rules: [],
        impact: isAnomaly ? 'high' : 'low',
        actionable: isAnomaly
      },
      probability: isAnomaly ? anomalyScore / 5 : 0,
      confidence: model.accuracy,
      recommendedAction: isAnomaly ? 'Investigate anomalous behavior' : 'No action required',
      riskLevel: isAnomaly ? 'high' : 'low',
      evidence: [`Anomaly score: ${anomalyScore.toFixed(2)} (threshold: ${threshold})`]
    };
  }

  private createPatternPrediction(pattern: Pattern, features: FeatureVector): PredictionResult {
    const matchScore = this.calculatePatternMatch(features, pattern);
    
    return {
      pattern,
      probability: matchScore,
      confidence: pattern.confidence,
      recommendedAction: this.generatePatternRecommendation(pattern),
      riskLevel: this.assessRiskLevel(pattern, matchScore),
      evidence: [`Pattern match: ${(matchScore * 100).toFixed(1)}%`, `Pattern frequency: ${pattern.frequency}`]
    };
  }

  private generateRecommendation(score: number): string {
    if (score > 0.8) return 'Performance likely to be optimal';
    if (score > 0.6) return 'Performance likely to be adequate';
    if (score > 0.4) return 'Performance may be degraded - monitor closely';
    return 'Performance likely to be poor - intervention recommended';
  }

  private generatePatternRecommendation(pattern: Pattern): string {
    switch (pattern.impact) {
      case 'critical': return 'Immediate attention required - critical pattern detected';
      case 'high': return 'High-priority investigation needed';
      case 'medium': return 'Monitor closely and consider optimization';
      case 'low': return 'Normal pattern - no immediate action needed';
      default: return 'Review pattern significance';
    }
  }

  private assessRiskLevel(pattern: Pattern, matchScore: number): PredictionResult['riskLevel'] {
    if (pattern.impact === 'critical' && matchScore > 0.8) return 'critical';
    if (pattern.impact === 'high' || matchScore > 0.9) return 'high';
    if (pattern.impact === 'medium' || matchScore > 0.7) return 'medium';
    return 'low';
  }

  /**
   * Periodic retraining
   */
  private startPeriodicRetraining(): void {
    this.retrainingTimer = setInterval(async () => {
      if (this.trainingData.length > 100) {
        await this.trainModels();
      }
    }, this.config.retrainingInterval);
  }

  /**
   * Cleanup and shutdown
   */
  async shutdown(): Promise<void> {
    if (this.retrainingTimer) {
      clearInterval(this.retrainingTimer);
    }
    
    this.removeAllListeners();
    console.log('🛑 PatternDetector shutdown complete');
  }
}