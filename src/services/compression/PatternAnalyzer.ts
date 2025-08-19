// Phase 2: AI-Enhanced Dictionary Generation - Pattern Analyzer
// Following the exact specification from compression roadmap Phase 2

export interface Pattern {
  pattern: string;
  frequency: number;
  context: string;
  weight: number;
}

export interface AnalysisResult {
  patterns: Record<string, Pattern>;
  data_classification: string;
  data_signature: string;
  pattern_id: string;
  insights: string[];
}

export class PatternAnalyzer {
  private patterns: Map<string, Pattern> = new Map();
  private sampleData: any[] = [];
  private claude: any; // Will be injected
  
  constructor(claudeClient?: any) {
    this.claude = claudeClient;
  }
  
  async collectSample(data: any) {
    this.sampleData.push(data);
    
    if (this.sampleData.length >= 100) {
      await this.analyzeSamples();
    }
  }
  
  private async analyzeSamples(): Promise<void> {
    if (!this.claude) {
      // Fallback to basic pattern analysis without Claude
      await this.basicPatternAnalysis();
      return;
    }
    
    try {
      const analysis = await this.claude.analyze({
        model: 'claude-3-sonnet-20240229',
        system: 'You are a data compression expert. Analyze patterns for optimal compression.',
        prompt: `Analyze these data samples for compression optimization:
          
          Sample size: ${this.sampleData.length}
          Sample data: ${JSON.stringify(this.sampleData.slice(0, 10))}
          
          Identify:
          1. Common strings/tokens
          2. Repetitive structures
          3. Field patterns
          4. Value distributions
          
          Output a JSON dictionary of common patterns with this structure:
          {
            "patterns": {
              "pattern_key": {
                "pattern": "actual_pattern_string",
                "frequency": number,
                "context": "where_it_appears",
                "weight": number_0_to_1
              }
            },
            "data_classification": "type_of_data",
            "data_signature": "unique_identifier",
            "insights": ["insight1", "insight2"]
          }`,
        max_tokens: 2000
      });
      
      if (analysis.patterns) {
        this.patterns = new Map(Object.entries(analysis.patterns));
      }
      
    } catch (error) {
      console.warn('Claude analysis failed, falling back to basic analysis:', error);
      await this.basicPatternAnalysis();
    }
    
    this.sampleData = []; // Clear samples
  }
  
  private async basicPatternAnalysis(): Promise<void> {
    // Fallback pattern analysis without Claude
    const allStrings = this.sampleData.map(item => JSON.stringify(item)).join(' ');
    const tokens = allStrings.split(/[\s,{}[\]":]+/).filter(t => t.length > 2);
    
    // Count token frequencies
    const frequencies = new Map<string, number>();
    tokens.forEach(token => {
      frequencies.set(token, (frequencies.get(token) || 0) + 1);
    });
    
    // Convert to patterns
    frequencies.forEach((freq, token) => {
      if (freq > 5) { // Only patterns that appear more than 5 times
        this.patterns.set(token, {
          pattern: token,
          frequency: freq,
          context: 'json_field_or_value',
          weight: Math.min(freq / 100, 1.0)
        });
      }
    });
  }
  
  getTopPatterns(n: number = 100): string[] {
    return Array.from(this.patterns.entries())
      .sort((a, b) => b[1].frequency - a[1].frequency)
      .slice(0, n)
      .map(([pattern]) => pattern);
  }
  
  getPatternWeights(): Map<string, number> {
    const weights = new Map<string, number>();
    this.patterns.forEach((pattern, key) => {
      weights.set(key, pattern.weight);
    });
    return weights;
  }
  
  getAllPatterns(): Map<string, Pattern> {
    return new Map(this.patterns);
  }
  
  getAnalysisReport(): AnalysisResult {
    const patternsObj: Record<string, Pattern> = {};
    this.patterns.forEach((pattern, key) => {
      patternsObj[key] = pattern;
    });
    
    return {
      patterns: patternsObj,
      data_classification: this.classifyData(),
      data_signature: this.generateDataSignature(),
      pattern_id: `pattern_${Date.now()}_${this.patterns.size}`,
      insights: this.generateInsights()
    };
  }
  
  private classifyData(): string {
    const patternCount = this.patterns.size;
    const avgFrequency = Array.from(this.patterns.values())
      .reduce((sum, p) => sum + p.frequency, 0) / patternCount;
    
    if (patternCount < 10 && avgFrequency > 50) {
      return 'highly_repetitive';
    } else if (patternCount > 100) {
      return 'diverse_structured';
    } else if (avgFrequency > 20) {
      return 'moderately_repetitive';
    } else {
      return 'sparse_unique';
    }
  }
  
  private generateDataSignature(): string {
    const signature = Array.from(this.patterns.keys())
      .slice(0, 5)
      .sort()
      .join('_');
    return `sig_${signature.substring(0, 20)}_${this.patterns.size}`;
  }
  
  private generateInsights(): string[] {
    const insights: string[] = [];
    const patternCount = this.patterns.size;
    const topPatterns = this.getTopPatterns(5);
    
    insights.push(`Identified ${patternCount} distinct patterns`);
    
    if (patternCount > 50) {
      insights.push('High pattern diversity suggests structured data with good compression potential');
    }
    
    if (topPatterns.some(p => p.length > 10)) {
      insights.push('Long repeating patterns detected - excellent for dictionary compression');
    }
    
    const avgWeight = Array.from(this.patterns.values())
      .reduce((sum, p) => sum + p.weight, 0) / patternCount;
    
    if (avgWeight > 0.5) {
      insights.push('High pattern weights indicate strong compression opportunities');
    }
    
    return insights;
  }
  
  clearPatterns(): void {
    this.patterns.clear();
    this.sampleData = [];
  }
}