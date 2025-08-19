// Evolution Engine - Core coordination for self-evolving architecture
// Manages evolution phases, safety systems, and performance tracking

import { SelfEvolvingArchitecture, EvolutionResult, Mutation } from './SelfEvolvingArchitecture.js';
import { EvolutionMetrics } from './EvolutionMetrics.js';
import { SafetyController } from './SafetyController.js';

export interface EvolutionConfiguration {
  enabled: boolean;
  evolution_interval: number; // milliseconds
  max_mutations_per_cycle: number;
  safety_threshold: number;
  performance_threshold: number;
  thinking_budget: number;
  risk_tolerance: 'conservative' | 'moderate' | 'aggressive';
  backup_retention: number; // days
  rollback_timeout: number; // milliseconds
}

export interface EvolutionCycle {
  id: string;
  start_time: Date;
  end_time?: Date;
  phase: EvolutionPhase;
  mutations_attempted: number;
  mutations_applied: number;
  performance_improvement: number;
  safety_score: number;
  thinking_tokens_used: number;
  status: 'running' | 'completed' | 'failed' | 'aborted';
  error?: string;
}

export enum EvolutionPhase {
  IDLE = 'idle',
  ANALYSIS = 'analysis',
  PLANNING = 'planning',
  MUTATION_GENERATION = 'mutation_generation',
  TESTING = 'testing',
  SELECTION = 'selection',
  APPLICATION = 'application',
  VERIFICATION = 'verification',
  ROLLBACK = 'rollback'
}

export interface EvolutionHistory {
  cycles: EvolutionCycle[];
  total_improvements: number;
  successful_mutations: number;
  failed_mutations: number;
  average_improvement: number;
  safety_incidents: number;
  rollback_count: number;
}

/**
 * Evolution Engine - Orchestrates the self-evolving architecture system
 * 
 * This engine coordinates between the analysis, mutation, testing, and application
 * phases while maintaining strict safety controls and performance monitoring.
 */
export class EvolutionEngine {
  private config: EvolutionConfiguration;
  private architecture: SelfEvolvingArchitecture;
  private metrics: EvolutionMetrics;
  private safety: SafetyController;
  private currentCycle: EvolutionCycle | null = null;
  private history: EvolutionHistory;
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;

  constructor(
    config: EvolutionConfiguration,
    claudeClient?: any,
    thinkingEngine?: any
  ) {
    this.config = config;
    this.architecture = new SelfEvolvingArchitecture(claudeClient, thinkingEngine);
    this.metrics = new EvolutionMetrics();
    this.safety = new SafetyController(config.safety_threshold);
    this.history = this.initializeHistory();
  }

  /**
   * Start the evolution engine with continuous cycles
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      throw new Error('Evolution engine is already running');
    }

    if (!this.config.enabled) {
      console.log('🔒 Evolution engine is disabled in configuration');
      return;
    }

    console.log('🚀 Starting evolution engine...');
    this.isRunning = true;

    // Run initial evolution cycle
    await this.runEvolutionCycle();

    // Schedule recurring evolution cycles
    if (this.config.evolution_interval > 0) {
      this.intervalId = setInterval(async () => {
        if (this.isRunning && !this.currentCycle) {
          await this.runEvolutionCycle();
        }
      }, this.config.evolution_interval);
    }

    console.log(`✅ Evolution engine started with ${this.config.evolution_interval}ms interval`);
  }

  /**
   * Stop the evolution engine gracefully
   */
  async stop(): Promise<void> {
    console.log('🛑 Stopping evolution engine...');
    this.isRunning = false;

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    // Wait for current cycle to complete if running
    if (this.currentCycle && this.currentCycle.status === 'running') {
      console.log('⏳ Waiting for current evolution cycle to complete...');
      let timeout = 30000; // 30 second timeout
      while (this.currentCycle && this.currentCycle.status === 'running' && timeout > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
        timeout -= 1000;
      }

      if (this.currentCycle && this.currentCycle.status === 'running') {
        console.warn('⚠️ Force aborting current evolution cycle');
        await this.abortCurrentCycle();
      }
    }

    console.log('✅ Evolution engine stopped');
  }

  /**
   * Run a single evolution cycle
   */
  async runEvolutionCycle(): Promise<EvolutionResult> {
    const cycleId = `evolution-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    this.currentCycle = {
      id: cycleId,
      start_time: new Date(),
      phase: EvolutionPhase.ANALYSIS,
      mutations_attempted: 0,
      mutations_applied: 0,
      performance_improvement: 0,
      safety_score: 1.0,
      thinking_tokens_used: 0,
      status: 'running'
    };

    console.log(`🧬 Starting evolution cycle: ${cycleId}`);

    try {
      // Safety pre-check
      await this.updatePhase(EvolutionPhase.ANALYSIS);
      const safetyCheck = await this.safety.performPreEvolutionCheck();
      if (!safetyCheck.safe) {
        throw new Error(`Safety check failed: ${safetyCheck.reasons.join(', ')}`);
      }

      // Run the evolution process
      await this.updatePhase(EvolutionPhase.PLANNING);
      const evolutionResult = await this.architecture.evolve();

      // Update cycle metrics
      this.currentCycle.mutations_attempted = evolutionResult.metadata.mutations_tested;
      this.currentCycle.mutations_applied = evolutionResult.changes_applied.length;
      this.currentCycle.performance_improvement = evolutionResult.performance_improvement;
      this.currentCycle.safety_score = evolutionResult.metadata.safety_score;
      this.currentCycle.thinking_tokens_used = evolutionResult.metadata.thinking_tokens_used;

      // Verify evolution meets thresholds
      await this.updatePhase(EvolutionPhase.VERIFICATION);
      if (evolutionResult.performance_improvement < this.config.performance_threshold) {
        console.warn(`⚠️ Performance improvement ${evolutionResult.performance_improvement}% below threshold ${this.config.performance_threshold}%`);
      }

      if (evolutionResult.metadata.safety_score < this.config.safety_threshold) {
        throw new Error(`Safety score ${evolutionResult.metadata.safety_score} below threshold ${this.config.safety_threshold}`);
      }

      // Post-evolution safety check
      const postSafetyCheck = await this.safety.performPostEvolutionCheck(evolutionResult);
      if (!postSafetyCheck.safe) {
        throw new Error(`Post-evolution safety check failed: ${postSafetyCheck.reasons.join(', ')}`);
      }

      // Complete cycle successfully
      this.currentCycle.end_time = new Date();
      this.currentCycle.status = 'completed';
      
      // Update history and metrics
      this.updateHistory(this.currentCycle);
      await this.metrics.recordEvolutionCycle(this.currentCycle, evolutionResult);

      console.log(`✅ Evolution cycle completed: ${evolutionResult.changes_applied.length} mutations applied, ${evolutionResult.performance_improvement.toFixed(2)}% improvement`);

      const result = evolutionResult;
      this.currentCycle = null;
      return result;

    } catch (error) {
      console.error(`❌ Evolution cycle failed:`, error);
      
      // Handle failure
      await this.updatePhase(EvolutionPhase.ROLLBACK);
      this.currentCycle.status = 'failed';
      this.currentCycle.error = error.message;
      this.currentCycle.end_time = new Date();

      // Perform safety rollback if needed
      await this.safety.performEmergencyRollback();

      // Update history
      this.updateHistory(this.currentCycle);

      const failedResult: EvolutionResult = {
        evolved: false,
        changes_applied: [],
        performance_improvement: 0,
        next_evolution_scheduled: new Date(Date.now() + this.config.evolution_interval * 2), // Double interval after failure
        metadata: {
          analysis_depth: 0,
          thinking_tokens_used: 0,
          mutations_tested: 0,
          safety_score: 0
        }
      };

      this.currentCycle = null;
      return failedResult;
    }
  }

  /**
   * Trigger manual evolution cycle
   */
  async triggerEvolution(): Promise<EvolutionResult> {
    if (this.currentCycle) {
      throw new Error('Evolution cycle already in progress');
    }

    console.log('🔄 Manually triggered evolution cycle');
    return await this.runEvolutionCycle();
  }

  /**
   * Get current evolution status
   */
  getStatus(): {
    running: boolean;
    current_cycle?: EvolutionCycle;
    history: EvolutionHistory;
    metrics: any;
  } {
    return {
      running: this.isRunning,
      current_cycle: this.currentCycle || undefined,
      history: this.history,
      metrics: this.metrics.getSummary()
    };
  }

  /**
   * Update evolution configuration
   */
  updateConfiguration(newConfig: Partial<EvolutionConfiguration>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (!newConfig.enabled && this.isRunning) {
      this.stop();
    }

    console.log('🔧 Evolution configuration updated');
  }

  /**
   * Get evolution history and analytics
   */
  getEvolutionAnalytics(): {
    total_cycles: number;
    success_rate: number;
    average_improvement: number;
    total_mutations: number;
    safety_incidents: number;
    performance_trend: number[];
    recent_activity: EvolutionCycle[];
  } {
    const cycles = this.history.cycles;
    const successfulCycles = cycles.filter(c => c.status === 'completed');
    const recentCycles = cycles.slice(-10);

    return {
      total_cycles: cycles.length,
      success_rate: cycles.length > 0 ? successfulCycles.length / cycles.length : 0,
      average_improvement: this.history.average_improvement,
      total_mutations: this.history.successful_mutations + this.history.failed_mutations,
      safety_incidents: this.history.safety_incidents,
      performance_trend: recentCycles.map(c => c.performance_improvement),
      recent_activity: recentCycles
    };
  }

  /**
   * Emergency stop with immediate rollback
   */
  async emergencyStop(): Promise<void> {
    console.log('🚨 EMERGENCY STOP - Halting evolution and performing rollback');
    
    this.isRunning = false;
    
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }

    if (this.currentCycle) {
      await this.abortCurrentCycle();
    }

    // Perform emergency rollback
    await this.safety.performEmergencyRollback();
    
    console.log('🔒 Emergency stop completed');
  }

  // Private helper methods

  private async updatePhase(phase: EvolutionPhase): Promise<void> {
    if (this.currentCycle) {
      this.currentCycle.phase = phase;
      console.log(`📍 Evolution phase: ${phase}`);
    }
  }

  private async abortCurrentCycle(): Promise<void> {
    if (this.currentCycle) {
      this.currentCycle.status = 'aborted';
      this.currentCycle.end_time = new Date();
      this.updateHistory(this.currentCycle);
      this.currentCycle = null;
    }
  }

  private initializeHistory(): EvolutionHistory {
    return {
      cycles: [],
      total_improvements: 0,
      successful_mutations: 0,
      failed_mutations: 0,
      average_improvement: 0,
      safety_incidents: 0,
      rollback_count: 0
    };
  }

  private updateHistory(cycle: EvolutionCycle): void {
    this.history.cycles.push(cycle);

    if (cycle.status === 'completed') {
      this.history.successful_mutations += cycle.mutations_applied;
      this.history.total_improvements += cycle.performance_improvement;
      
      const completedCycles = this.history.cycles.filter(c => c.status === 'completed');
      this.history.average_improvement = this.history.total_improvements / completedCycles.length;
    } else if (cycle.status === 'failed') {
      this.history.failed_mutations += cycle.mutations_attempted;
      if (cycle.error?.includes('safety')) {
        this.history.safety_incidents++;
      }
    } else if (cycle.status === 'aborted') {
      this.history.rollback_count++;
    }

    // Keep only last 100 cycles
    if (this.history.cycles.length > 100) {
      this.history.cycles = this.history.cycles.slice(-100);
    }
  }
}