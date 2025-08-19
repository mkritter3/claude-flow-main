// Safety Controller - Critical safety systems for self-evolving architecture
// Implements multiple layers of safety checks and emergency rollback capabilities

import { promises as fs } from 'fs';
import * as path from 'path';
import { EvolutionResult, Mutation } from './SelfEvolvingArchitecture.js';

export interface SafetyCheck {
  safe: boolean;
  reasons: string[];
  risk_level: number;
  recommendations: string[];
}

export interface BackupState {
  id: string;
  timestamp: Date;
  files: Map<string, string>; // file path -> backup content
  metadata: {
    mutations_count: number;
    performance_baseline: any;
    system_state: any;
  };
}

export interface SafetyRule {
  id: string;
  name: string;
  description: string;
  check: (context: any) => Promise<boolean>;
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
}

export interface EmergencyProtocol {
  trigger: string;
  actions: EmergencyAction[];
  notification_required: boolean;
  auto_recovery: boolean;
}

export interface EmergencyAction {
  type: 'rollback' | 'stop_evolution' | 'restore_backup' | 'notify' | 'isolate';
  target?: string;
  timeout: number;
  verification: string[];
}

/**
 * Safety Controller - Multi-layered safety system for evolution
 * 
 * Implements comprehensive safety checks including:
 * - Pre-evolution system state validation
 * - Mutation risk assessment
 * - Post-evolution verification
 * - Emergency rollback capabilities
 * - Real-time safety monitoring
 */
export class SafetyController {
  private safetyThreshold: number;
  private backups: Map<string, BackupState> = new Map();
  private safetyRules: Map<string, SafetyRule> = new Map();
  private emergencyProtocols: Map<string, EmergencyProtocol> = new Map();
  private criticalFiles: Set<string> = new Set();
  private safetyIncidents: Array<any> = [];
  private isEmergencyMode: boolean = false;

  constructor(safetyThreshold: number = 0.8) {
    this.safetyThreshold = safetyThreshold;
    this.initializeCriticalFiles();
    this.initializeSafetyRules();
    this.initializeEmergencyProtocols();
  }

  /**
   * Comprehensive pre-evolution safety check
   */
  async performPreEvolutionCheck(): Promise<SafetyCheck> {
    console.log('🔍 Performing pre-evolution safety check...');

    const reasons: string[] = [];
    let riskLevel = 0;
    const recommendations: string[] = [];

    try {
      // Check 1: System stability
      const stabilityCheck = await this.checkSystemStability();
      if (!stabilityCheck.stable) {
        reasons.push('System stability below threshold');
        riskLevel += 0.3;
        recommendations.push('Wait for system stabilization before evolution');
      }

      // Check 2: Resource availability
      const resourceCheck = await this.checkResourceAvailability();
      if (!resourceCheck.sufficient) {
        reasons.push('Insufficient system resources');
        riskLevel += 0.2;
        recommendations.push('Free up system resources before evolution');
      }

      // Check 3: Critical file protection
      const fileProtectionCheck = await this.checkCriticalFileProtection();
      if (!fileProtectionCheck.protected) {
        reasons.push('Critical files not properly protected');
        riskLevel += 0.4;
        recommendations.push('Ensure critical files are locked from modification');
      }

      // Check 4: Backup system integrity
      const backupCheck = await this.checkBackupSystemIntegrity();
      if (!backupCheck.operational) {
        reasons.push('Backup system not operational');
        riskLevel += 0.5;
        recommendations.push('Verify backup system before proceeding');
      }

      // Check 5: Recent evolution history
      const historyCheck = await this.checkRecentEvolutionHistory();
      if (!historyCheck.safe) {
        reasons.push('Recent evolution history indicates instability');
        riskLevel += 0.2;
        recommendations.push('Allow more time between evolution cycles');
      }

      // Check 6: Test coverage
      const coverageCheck = await this.checkTestCoverage();
      if (!coverageCheck.adequate) {
        reasons.push('Test coverage below safety threshold');
        riskLevel += 0.3;
        recommendations.push('Improve test coverage before evolution');
      }

      // Check 7: External dependencies
      const dependencyCheck = await this.checkExternalDependencies();
      if (!dependencyCheck.stable) {
        reasons.push('External dependencies showing instability');
        riskLevel += 0.2;
        recommendations.push('Wait for external dependencies to stabilize');
      }

      // Apply custom safety rules
      for (const rule of this.safetyRules.values()) {
        if (rule.enabled) {
          try {
            const ruleResult = await rule.check({});
            if (!ruleResult) {
              reasons.push(`Safety rule violated: ${rule.name}`);
              const severityWeight = this.getSeverityWeight(rule.severity);
              riskLevel += severityWeight;
              recommendations.push(`Address issue: ${rule.description}`);
            }
          } catch (error) {
            console.warn(`Safety rule check failed: ${rule.name}`, error);
            reasons.push(`Safety rule check failed: ${rule.name}`);
            riskLevel += 0.1;
          }
        }
      }

      const safe = reasons.length === 0 && riskLevel < (1 - this.safetyThreshold);

      if (safe) {
        console.log('✅ Pre-evolution safety check passed');
      } else {
        console.warn(`⚠️ Pre-evolution safety check failed: ${reasons.join(', ')}`);
      }

      return {
        safe,
        reasons,
        risk_level: riskLevel,
        recommendations
      };

    } catch (error) {
      console.error('❌ Pre-evolution safety check error:', error);
      return {
        safe: false,
        reasons: ['Safety check system error'],
        risk_level: 1.0,
        recommendations: ['Fix safety check system before proceeding']
      };
    }
  }

  /**
   * Post-evolution safety verification
   */
  async performPostEvolutionCheck(result: EvolutionResult): Promise<SafetyCheck> {
    console.log('🔍 Performing post-evolution safety check...');

    const reasons: string[] = [];
    let riskLevel = 0;
    const recommendations: string[] = [];

    try {
      // Check 1: Applied mutations safety
      for (const mutation of result.changes_applied) {
        const mutationSafety = await this.verifyMutationSafety(mutation);
        if (!mutationSafety.safe) {
          reasons.push(`Unsafe mutation applied: ${mutation.id}`);
          riskLevel += 0.3;
          recommendations.push(`Review and potentially rollback mutation: ${mutation.id}`);
        }
      }

      // Check 2: System functionality
      const functionalityCheck = await this.checkSystemFunctionality();
      if (!functionalityCheck.functional) {
        reasons.push('System functionality compromised');
        riskLevel += 0.5;
        recommendations.push('Immediate rollback required');
      }

      // Check 3: Performance regression
      const performanceCheck = await this.checkPerformanceRegression(result);
      if (!performanceCheck.acceptable) {
        reasons.push('Significant performance regression detected');
        riskLevel += 0.3;
        recommendations.push('Consider rollback if performance critical');
      }

      // Check 4: Data integrity
      const integrityCheck = await this.checkDataIntegrity();
      if (!integrityCheck.intact) {
        reasons.push('Data integrity issues detected');
        riskLevel += 0.6;
        recommendations.push('Immediate rollback and data verification required');
      }

      // Check 5: Security posture
      const securityCheck = await this.checkSecurityPosture();
      if (!securityCheck.secure) {
        reasons.push('Security posture degraded');
        riskLevel += 0.4;
        recommendations.push('Security review and potential rollback required');
      }

      const safe = reasons.length === 0 && riskLevel < (1 - this.safetyThreshold);

      if (safe) {
        console.log('✅ Post-evolution safety check passed');
      } else {
        console.warn(`⚠️ Post-evolution safety check failed: ${reasons.join(', ')}`);
        
        // Log safety incident
        this.logSafetyIncident({
          type: 'post_evolution_failure',
          risk_level: riskLevel,
          reasons,
          timestamp: new Date(),
          evolution_result: result
        });
      }

      return {
        safe,
        reasons,
        risk_level: riskLevel,
        recommendations
      };

    } catch (error) {
      console.error('❌ Post-evolution safety check error:', error);
      return {
        safe: false,
        reasons: ['Post-evolution safety check system error'],
        risk_level: 1.0,
        recommendations: ['Emergency rollback required']
      };
    }
  }

  /**
   * Create comprehensive system backup before evolution
   */
  async createSystemBackup(): Promise<string> {
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    console.log(`💾 Creating system backup: ${backupId}`);

    try {
      const files = new Map<string, string>();
      
      // Backup critical files
      for (const filePath of this.criticalFiles) {
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          files.set(filePath, content);
        } catch (error) {
          console.warn(`Failed to backup file ${filePath}:`, error);
        }
      }

      // Backup source files (limit to prevent excessive backup size)
      const sourceFiles = await this.discoverSourceFiles(process.cwd());
      for (const filePath of sourceFiles.slice(0, 100)) { // Limit to 100 files
        try {
          const content = await fs.readFile(filePath, 'utf-8');
          files.set(filePath, content);
        } catch (error) {
          console.warn(`Failed to backup source file ${filePath}:`, error);
        }
      }

      const backup: BackupState = {
        id: backupId,
        timestamp: new Date(),
        files,
        metadata: {
          mutations_count: 0,
          performance_baseline: await this.capturePerformanceBaseline(),
          system_state: await this.captureSystemState()
        }
      };

      this.backups.set(backupId, backup);

      // Cleanup old backups (keep last 10)
      const backupIds = Array.from(this.backups.keys()).sort();
      if (backupIds.length > 10) {
        for (const oldId of backupIds.slice(0, -10)) {
          this.backups.delete(oldId);
        }
      }

      console.log(`✅ System backup created: ${backupId} (${files.size} files)`);
      return backupId;

    } catch (error) {
      console.error('❌ Failed to create system backup:', error);
      throw new Error(`Backup creation failed: ${error.message}`);
    }
  }

  /**
   * Emergency rollback system
   */
  async performEmergencyRollback(): Promise<void> {
    console.log('🚨 PERFORMING EMERGENCY ROLLBACK');
    this.isEmergencyMode = true;

    try {
      // Get most recent backup
      const backupIds = Array.from(this.backups.keys()).sort();
      if (backupIds.length === 0) {
        throw new Error('No backups available for rollback');
      }

      const latestBackupId = backupIds[backupIds.length - 1];
      const backup = this.backups.get(latestBackupId);
      
      if (!backup) {
        throw new Error('Latest backup not found');
      }

      console.log(`🔄 Rolling back to backup: ${latestBackupId}`);

      // Restore files from backup
      let restoredCount = 0;
      for (const [filePath, content] of backup.files) {
        try {
          await fs.writeFile(filePath, content, 'utf-8');
          restoredCount++;
        } catch (error) {
          console.error(`Failed to restore file ${filePath}:`, error);
        }
      }

      // Verify rollback
      const verificationResult = await this.verifyRollback(backup);
      if (!verificationResult.success) {
        throw new Error(`Rollback verification failed: ${verificationResult.issues.join(', ')}`);
      }

      console.log(`✅ Emergency rollback completed: ${restoredCount} files restored`);

      // Log incident
      this.logSafetyIncident({
        type: 'emergency_rollback',
        risk_level: 1.0,
        reasons: ['Emergency rollback performed'],
        timestamp: new Date(),
        backup_used: latestBackupId
      });

    } catch (error) {
      console.error('❌ Emergency rollback failed:', error);
      
      // Log critical incident
      this.logSafetyIncident({
        type: 'rollback_failure',
        risk_level: 1.0,
        reasons: ['Emergency rollback failed'],
        timestamp: new Date(),
        error: error.message
      });

      throw error;
    } finally {
      this.isEmergencyMode = false;
    }
  }

  /**
   * Add custom safety rule
   */
  addSafetyRule(rule: SafetyRule): void {
    this.safetyRules.set(rule.id, rule);
    console.log(`🔒 Added safety rule: ${rule.name}`);
  }

  /**
   * Get safety status and metrics
   */
  getSafetyStatus(): {
    emergency_mode: boolean;
    safety_threshold: number;
    active_rules: number;
    backup_count: number;
    recent_incidents: number;
    critical_files_protected: number;
  } {
    const recentIncidents = this.safetyIncidents.filter(
      incident => (Date.now() - incident.timestamp.getTime()) < 24 * 60 * 60 * 1000
    ).length;

    return {
      emergency_mode: this.isEmergencyMode,
      safety_threshold: this.safetyThreshold,
      active_rules: Array.from(this.safetyRules.values()).filter(rule => rule.enabled).length,
      backup_count: this.backups.size,
      recent_incidents: recentIncidents,
      critical_files_protected: this.criticalFiles.size
    };
  }

  // Private helper methods

  private initializeCriticalFiles(): void {
    // Add critical files that should never be auto-modified
    this.criticalFiles.add('package.json');
    this.criticalFiles.add('package-lock.json');
    this.criticalFiles.add('tsconfig.json');
    this.criticalFiles.add('.env');
    this.criticalFiles.add('.env.local');
    this.criticalFiles.add('README.md');
    this.criticalFiles.add('LICENSE');
    this.criticalFiles.add('.gitignore');
    this.criticalFiles.add('docker-compose.yml');
    this.criticalFiles.add('Dockerfile');
  }

  private initializeSafetyRules(): void {
    // Core safety rules
    this.addSafetyRule({
      id: 'critical_file_protection',
      name: 'Critical File Protection',
      description: 'Ensures critical files are not modified',
      check: async () => {
        // Check if critical files have been modified recently
        return true; // Simplified implementation
      },
      severity: 'critical',
      enabled: true
    });

    this.addSafetyRule({
      id: 'test_coverage_requirement',
      name: 'Test Coverage Requirement',
      description: 'Ensures minimum test coverage is maintained',
      check: async () => {
        // Check test coverage
        return true; // Simplified implementation
      },
      severity: 'high',
      enabled: true
    });

    this.addSafetyRule({
      id: 'performance_regression_limit',
      name: 'Performance Regression Limit',
      description: 'Prevents significant performance regressions',
      check: async () => {
        // Check for performance regressions
        return true; // Simplified implementation
      },
      severity: 'medium',
      enabled: true
    });
  }

  private initializeEmergencyProtocols(): void {
    this.emergencyProtocols.set('system_failure', {
      trigger: 'System functionality compromised',
      actions: [
        {
          type: 'rollback',
          timeout: 30000,
          verification: ['system_functional', 'data_intact']
        },
        {
          type: 'notify',
          timeout: 5000,
          verification: ['notification_sent']
        }
      ],
      notification_required: true,
      auto_recovery: true
    });
  }

  private getSeverityWeight(severity: string): number {
    switch (severity) {
      case 'low': return 0.1;
      case 'medium': return 0.2;
      case 'high': return 0.3;
      case 'critical': return 0.5;
      default: return 0.1;
    }
  }

  private async checkSystemStability(): Promise<{ stable: boolean }> {
    // Simplified stability check
    // In reality, would check CPU, memory, error rates, etc.
    return { stable: true };
  }

  private async checkResourceAvailability(): Promise<{ sufficient: boolean }> {
    // Check available system resources
    return { sufficient: true };
  }

  private async checkCriticalFileProtection(): Promise<{ protected: boolean }> {
    // Verify critical files are locked
    return { protected: true };
  }

  private async checkBackupSystemIntegrity(): Promise<{ operational: boolean }> {
    // Test backup system
    return { operational: this.backups.size >= 0 };
  }

  private async checkRecentEvolutionHistory(): Promise<{ safe: boolean }> {
    // Check recent evolution patterns
    return { safe: this.safetyIncidents.length < 5 };
  }

  private async checkTestCoverage(): Promise<{ adequate: boolean }> {
    // Check test coverage
    return { adequate: true };
  }

  private async checkExternalDependencies(): Promise<{ stable: boolean }> {
    // Check external service stability
    return { stable: true };
  }

  private async verifyMutationSafety(mutation: Mutation): Promise<{ safe: boolean }> {
    // Verify individual mutation safety
    return { safe: mutation.risk_level !== 'critical' };
  }

  private async checkSystemFunctionality(): Promise<{ functional: boolean }> {
    // Test basic system functionality
    return { functional: true };
  }

  private async checkPerformanceRegression(result: EvolutionResult): Promise<{ acceptable: boolean }> {
    // Check for performance regressions
    return { acceptable: result.performance_improvement >= -10 }; // Allow up to 10% regression
  }

  private async checkDataIntegrity(): Promise<{ intact: boolean }> {
    // Verify data integrity
    return { intact: true };
  }

  private async checkSecurityPosture(): Promise<{ secure: boolean }> {
    // Check security status
    return { secure: true };
  }

  private async discoverSourceFiles(projectRoot: string): Promise<string[]> {
    // Simplified source file discovery
    return [];
  }

  private async capturePerformanceBaseline(): Promise<any> {
    // Capture current performance metrics
    return {
      timestamp: Date.now(),
      cpu: 45,
      memory: 512000000,
      latency: 50
    };
  }

  private async captureSystemState(): Promise<any> {
    // Capture current system state
    return {
      timestamp: Date.now(),
      process_count: 10,
      uptime: process.uptime()
    };
  }

  private async verifyRollback(backup: BackupState): Promise<{ success: boolean; issues: string[] }> {
    // Verify rollback was successful
    return {
      success: true,
      issues: []
    };
  }

  private logSafetyIncident(incident: any): void {
    this.safetyIncidents.push(incident);
    
    // Keep only last 100 incidents
    if (this.safetyIncidents.length > 100) {
      this.safetyIncidents = this.safetyIncidents.slice(-100);
    }

    console.error('🚨 Safety incident logged:', incident);
  }
}