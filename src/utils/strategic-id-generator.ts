/**
 * Strategic ID Convention System for Claude-Flow
 * Generates consistent, traceable IDs for strategic intelligence items
 * Following claude-super-agents pattern but integrated with claude-flow architecture
 */

export interface StrategicIdConfig {
  type: 'problem' | 'solution' | 'assessment' | 'finding' | 'roadmap' | 'task';
  domain: string;
  sessionId?: string;
  swarmId?: string;
  agentId?: string;
  customPrefix?: string;
}

export interface StrategicIdMetadata {
  id: string;
  type: string;
  domain: string;
  prefix: string;
  timestamp: string;
  sessionInfo?: {
    sessionId: string;
    swarmId?: string;
    agentId?: string;
  };
  generation: {
    created_at: string;
    version: string;
    generator: string;
  };
}

export class StrategicIdGenerator {
  private static readonly VERSION = '1.0.0';
  private static readonly GENERATOR = 'claude-flow-strategic';
  
  // Type prefix mappings
  private static readonly TYPE_PREFIXES: Record<string, string> = {
    problem: 'PROB',
    solution: 'SOL', 
    assessment: 'ASSESS',
    finding: 'FIND',
    roadmap: 'ROADMAP',
    task: 'TASK'
  };

  // Domain code mappings for common domains
  private static readonly DOMAIN_CODES: Record<string, string> = {
    'claude-flow': 'CF',
    'performance': 'PERF',
    'security': 'SEC',
    'architecture': 'ARCH',
    'memory': 'MEM',
    'agents': 'AGT',
    'swarm': 'SWARM',
    'mcp': 'MCP',
    'cli': 'CLI',
    'coordination': 'COORD',
    'intelligence': 'INTEL',
    'general': 'GEN'
  };

  /**
   * Generate a new strategic ID with full metadata
   */
  static generate(config: StrategicIdConfig): StrategicIdMetadata {
    const {
      type,
      domain,
      sessionId,
      swarmId,
      agentId,
      customPrefix
    } = config;

    // Get type prefix
    const typePrefix = customPrefix || this.TYPE_PREFIXES[type];
    if (!typePrefix) {
      throw new Error(`Unknown strategic item type: ${type}`);
    }

    // Generate domain code
    const domainCode = this.generateDomainCode(domain);
    
    // Generate timestamp component
    const timestamp = this.generateTimestampComponent();
    
    // Generate sequence component
    const sequence = this.generateSequenceComponent();
    
    // Generate session component if available
    const sessionComponent = sessionId ? this.generateSessionComponent(sessionId) : '';
    
    // Construct the ID
    const id = this.constructId(typePrefix, domainCode, timestamp, sequence, sessionComponent);
    
    // Create metadata
    const metadata: StrategicIdMetadata = {
      id,
      type,
      domain,
      prefix: typePrefix,
      timestamp: new Date().toISOString(),
      generation: {
        created_at: new Date().toISOString(),
        version: this.VERSION,
        generator: this.GENERATOR
      }
    };

    // Add session info if available
    if (sessionId || swarmId || agentId) {
      metadata.sessionInfo = {
        sessionId: sessionId || '',
        swarmId,
        agentId
      };
    }

    return metadata;
  }

  /**
   * Generate a simple strategic ID (backward compatibility)
   */
  static generateSimple(type: string, domain: string): string {
    const metadata = this.generate({ type: type as any, domain });
    return metadata.id;
  }

  /**
   * Parse a strategic ID and extract its components
   */
  static parse(strategicId: string): {
    prefix: string;
    domain: string;
    timestamp: string;
    sequence: string;
    session?: string;
    valid: boolean;
    metadata?: any;
  } {
    try {
      // Expected format: PREFIX_DOMAIN_TIMESTAMP_SEQUENCE[_SESSION]
      const parts = strategicId.split('_');
      
      if (parts.length < 4) {
        return { prefix: '', domain: '', timestamp: '', sequence: '', valid: false };
      }

      const [prefix, domain, timestamp, sequence, ...sessionParts] = parts;
      const session = sessionParts.length > 0 ? sessionParts.join('_') : undefined;

      // Validate components
      const valid = this.validateIdComponents(prefix, domain, timestamp, sequence);

      return {
        prefix,
        domain,
        timestamp,
        sequence,
        session,
        valid,
        metadata: {
          type: this.getTypeFromPrefix(prefix),
          generated_by: this.GENERATOR,
          parsed_at: new Date().toISOString()
        }
      };
    } catch (error) {
      return { prefix: '', domain: '', timestamp: '', sequence: '', valid: false };
    }
  }

  /**
   * Validate strategic ID format
   */
  static validate(strategicId: string): boolean {
    const parsed = this.parse(strategicId);
    return parsed.valid;
  }

  /**
   * Generate cross-reference ID for relationships
   */
  static generateRelationshipId(sourceId: string, targetId: string, relationType: string): string {
    const sourceHash = this.hashId(sourceId);
    const targetHash = this.hashId(targetId);
    const relationHash = this.hashString(relationType);
    const timestamp = this.generateTimestampComponent();
    
    return `REL_${sourceHash}_${targetHash}_${relationHash}_${timestamp}`;
  }

  /**
   * Generate batch ID for multiple related strategic items
   */
  static generateBatchId(domain: string, sessionId?: string): string {
    const domainCode = this.generateDomainCode(domain);
    const timestamp = this.generateTimestampComponent();
    const random = this.generateSequenceComponent();
    const sessionComponent = sessionId ? this.generateSessionComponent(sessionId) : '';
    
    return this.constructId('BATCH', domainCode, timestamp, random, sessionComponent);
  }

  /**
   * Generate continuation ID for follow-up items
   */
  static generateContinuationId(parentId: string, suffix: string = 'CONT'): string {
    const parsed = this.parse(parentId);
    if (!parsed.valid) {
      throw new Error(`Invalid parent ID: ${parentId}`);
    }

    const newSequence = this.generateSequenceComponent();
    return `${parsed.prefix}_${parsed.domain}_${parsed.timestamp}_${newSequence}_${suffix}`;
  }

  // Private helper methods

  private static generateDomainCode(domain: string): string {
    // Check if domain has a predefined code
    const normalizedDomain = domain.toLowerCase().replace(/[^a-z0-9]/g, '');
    const predefinedCode = this.DOMAIN_CODES[normalizedDomain];
    
    if (predefinedCode) {
      return predefinedCode;
    }

    // Generate code from domain name
    const words = domain.split(/[^a-zA-Z0-9]+/).filter(w => w.length > 0);
    
    if (words.length === 1) {
      // Single word: take first 6 characters, uppercase
      return words[0].substring(0, 6).toUpperCase();
    } else {
      // Multiple words: take first 2-3 chars from each word
      const chars = words.map(w => w.substring(0, Math.max(1, Math.floor(6 / words.length))));
      return chars.join('').substring(0, 6).toUpperCase();
    }
  }

  private static generateTimestampComponent(): string {
    // Use last 8 digits of timestamp for shorter IDs
    return Date.now().toString().slice(-8);
  }

  private static generateSequenceComponent(): string {
    // Generate 4-character alphanumeric sequence
    const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    let result = '';
    for (let i = 0; i < 4; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }

  private static generateSessionComponent(sessionId: string): string {
    // Take first 8 characters of session ID hash
    return this.hashString(sessionId).substring(0, 8).toUpperCase();
  }

  private static constructId(prefix: string, domain: string, timestamp: string, sequence: string, session: string = ''): string {
    const baseParts = [prefix, domain, timestamp, sequence];
    if (session) {
      baseParts.push(session);
    }
    return baseParts.join('_');
  }

  private static hashString(input: string): string {
    let hash = 0;
    for (let i = 0; i < input.length; i++) {
      const char = input.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return Math.abs(hash).toString(36).toUpperCase();
  }

  private static hashId(id: string): string {
    return this.hashString(id).substring(0, 6);
  }

  private static validateIdComponents(prefix: string, domain: string, timestamp: string, sequence: string): boolean {
    // Validate prefix (2-8 uppercase letters)
    if (!/^[A-Z]{2,8}$/.test(prefix)) return false;
    
    // Validate domain (2-8 alphanumeric characters)
    if (!/^[A-Z0-9]{2,8}$/.test(domain)) return false;
    
    // Validate timestamp (8 digits)
    if (!/^\d{8}$/.test(timestamp)) return false;
    
    // Validate sequence (4 alphanumeric characters)
    if (!/^[A-Z0-9]{4}$/.test(sequence)) return false;
    
    return true;
  }

  private static getTypeFromPrefix(prefix: string): string {
    for (const [type, typePrefix] of Object.entries(this.TYPE_PREFIXES)) {
      if (typePrefix === prefix) {
        return type;
      }
    }
    return 'unknown';
  }

  /**
   * Generate ID with auto-incremental sequence for domains
   */
  static generateWithAutoSequence(
    type: string,
    domain: string,
    getLastSequence?: (domain: string, type: string) => Promise<number>
  ): Promise<string> {
    // This would integrate with the database to get auto-incremental sequences
    // For now, return a standard ID
    return Promise.resolve(this.generateSimple(type, domain));
  }

  /**
   * Generate hierarchical ID for sub-items
   */
  static generateHierarchical(parentId: string, childType: string, index?: number): string {
    const parsed = this.parse(parentId);
    if (!parsed.valid) {
      throw new Error(`Invalid parent ID: ${parentId}`);
    }

    const childPrefix = this.TYPE_PREFIXES[childType] || 'CHILD';
    const indexStr = index !== undefined ? index.toString().padStart(2, '0') : this.generateSequenceComponent().substring(0, 2);
    
    return `${childPrefix}_${parsed.domain}_${parsed.timestamp}_${parsed.sequence}_${indexStr}`;
  }

  /**
   * Extract domain relationships from IDs
   */
  static extractDomainRelationships(ids: string[]): Record<string, string[]> {
    const domains: Record<string, string[]> = {};
    
    for (const id of ids) {
      const parsed = this.parse(id);
      if (parsed.valid) {
        if (!domains[parsed.domain]) {
          domains[parsed.domain] = [];
        }
        domains[parsed.domain].push(id);
      }
    }
    
    return domains;
  }

  /**
   * Generate summary ID for a collection of strategic items
   */
  static generateSummaryId(itemIds: string[], summaryType: string = 'SUMMARY'): string {
    if (itemIds.length === 0) {
      throw new Error('Cannot generate summary ID for empty collection');
    }

    // Extract common domain
    const domains = this.extractDomainRelationships(itemIds);
    const domainKeys = Object.keys(domains);
    const commonDomain = domainKeys.length === 1 ? domainKeys[0] : 'MULTI';
    
    // Generate hash of all item IDs
    const itemsHash = this.hashString(itemIds.sort().join('|'));
    const timestamp = this.generateTimestampComponent();
    
    return `${summaryType}_${commonDomain}_${timestamp}_${itemsHash.substring(0, 4)}`;
  }
}

// Export convenience functions
export function generateStrategicId(type: string, domain: string): string {
  return StrategicIdGenerator.generateSimple(type, domain);
}

export function parseStrategicId(id: string) {
  return StrategicIdGenerator.parse(id);
}

export function validateStrategicId(id: string): boolean {
  return StrategicIdGenerator.validate(id);
}

export function generateRelationshipId(sourceId: string, targetId: string, relationType: string): string {
  return StrategicIdGenerator.generateRelationshipId(sourceId, targetId, relationType);
}

// Export types
export type { StrategicIdConfig, StrategicIdMetadata };