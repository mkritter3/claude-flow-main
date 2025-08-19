/**
 * Strategic Intelligence Tools for Claude-Flow
 * Adds systematic problem/solution tracking and strategic intelligence to the existing memory system
 * Based on claude-super-agents strategic intelligence layer but integrated with claude-flow architecture
 */

import { createDatabase } from './sqlite-wrapper.js';
import path from 'path';

export class StrategicIntelligence {
  constructor(options = {}) {
    this.options = {
      dbPath: options.dbPath || path.join(process.cwd(), '.swarm', 'strategic.db'),
      autoInit: options.autoInit !== false,
      ...options,
    };
    
    this.db = null;
    this.isInitialized = false;
    this.statements = new Map();
  }

  async initialize() {
    if (this.isInitialized) return;

    try {
      // Create database and apply schema
      this.db = await createDatabase(this.options.dbPath);
      
      // Load and apply strategic intelligence schema
      const { readFileSync } = await import('fs');
      const schemaPath = new URL('./strategic-intelligence-schema.sql', import.meta.url);
      const schema = readFileSync(schemaPath, 'utf-8');
      this.db.exec(schema);

      // Prepare commonly used statements
      this.prepareStatements();
      
      this.isInitialized = true;
      console.log(`[${new Date().toISOString()}] Strategic Intelligence initialized: ${this.options.dbPath}`);
      
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Strategic Intelligence initialization failed:`, error);
      throw error;
    }
  }

  prepareStatements() {
    const statements = {
      createStrategicItem: `
        INSERT INTO strategic_items (
          id, type, title, domain, file_path, status, priority, impact_level,
          session_id, swarm_id, agent_id, task_id, tags, metadata
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      
      getStrategicItem: `
        SELECT si.*, sm.complexity_analysis, sm.implementation_plan, sm.assigned_agents
        FROM strategic_items si
        LEFT JOIN strategic_metadata sm ON si.id = sm.strategic_id
        WHERE si.id = ?
      `,
      
      updateStrategicStatus: `
        UPDATE strategic_items 
        SET status = ?, agent_last_assessed = ?, agent_confidence = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `,
      
      searchStrategicItems: `
        SELECT si.*, COUNT(sr.target_id) as relationship_count
        FROM strategic_items si
        LEFT JOIN strategic_relationships sr ON si.id = sr.source_id
        WHERE (? = '' OR si.title LIKE ? OR si.domain LIKE ? OR si.tags LIKE ?)
          AND (? = 'all' OR si.type = ?)
          AND (? = 'all' OR si.status = ?)
        GROUP BY si.id
        ORDER BY si.autonomous_score DESC, si.updated_at DESC
        LIMIT ?
      `,
      
      createRelationship: `
        INSERT OR IGNORE INTO strategic_relationships (
          source_id, target_id, relation_type, discovery_agent, confidence, evidence
        ) VALUES (?, ?, ?, ?, ?, ?)
      `,
      
      getRelationships: `
        SELECT sr.*, 
               si_source.title as source_title, si_source.type as source_type,
               si_target.title as target_title, si_target.type as target_type
        FROM strategic_relationships sr
        JOIN strategic_items si_source ON sr.source_id = si_source.id
        JOIN strategic_items si_target ON sr.target_id = si_target.id
        WHERE (sr.source_id = ? OR sr.target_id = ?)
          AND (? = 'all' OR sr.relation_type = ?)
        ORDER BY sr.confidence DESC, sr.created_at DESC
      `,
      
      getDashboard: `
        SELECT * FROM view_strategic_dashboard
        WHERE (? IS NULL OR domain = ?)
        ORDER BY total_items DESC
      `,
      
      getRecentActivity: `
        SELECT * FROM view_recent_strategic_activity
        WHERE (? IS NULL OR domain = ?)
        LIMIT 20
      `,
      
      updateAgentAssessment: `
        UPDATE strategic_items
        SET agent_last_assessed = ?, agent_confidence = ?, autonomous_score = ?, 
            implementation_progress = ?, agent_analysis = ?, updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
      `
    };

    for (const [name, sql] of Object.entries(statements)) {
      this.statements.set(name, this.db.prepare(sql));
    }
  }

  // === CORE STRATEGIC INTELLIGENCE FUNCTIONS ===

  /**
   * Create a new strategic item (problem, solution, assessment, finding)
   */
  async createStrategicItem(data) {
    await this.initialize();
    
    try {
      const {
        id = this.generateStrategicId(data.type, data.domain),
        type,
        title,
        domain,
        file_path = null,
        status = 'new',
        priority = 'medium',
        impact_level = 'medium',
        session_id = null,
        swarm_id = null,
        agent_id = null,
        task_id = null,
        tags = [],
        metadata = {}
      } = data;

      const stmt = this.statements.get('createStrategicItem');
      stmt.run(
        id, type, title, domain, file_path, status, priority, impact_level,
        session_id, swarm_id, agent_id, task_id,
        JSON.stringify(tags), JSON.stringify(metadata)
      );

      // Create initial metadata entry
      const metadataStmt = this.db.prepare(`
        INSERT OR REPLACE INTO strategic_metadata (strategic_id) VALUES (?)
      `);
      metadataStmt.run(id);

      return {
        success: true,
        strategic_id: id,
        type,
        title,
        domain,
        status,
        created_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Failed to create strategic item: ${error.message}`,
        type: 'creation_error'
      };
    }
  }

  /**
   * Get a specific strategic item with all details
   */
  async getStrategicItem(strategicId) {
    await this.initialize();
    
    try {
      const stmt = this.statements.get('getStrategicItem');
      const item = stmt.get(strategicId);
      
      if (!item) {
        return {
          error: `Strategic item '${strategicId}' not found`,
          type: 'not_found'
        };
      }

      // Get relationships
      const relationshipsStmt = this.statements.get('getRelationships');
      const relationships = relationshipsStmt.all(strategicId, strategicId, 'all');

      // Get recent events
      const eventsStmt = this.db.prepare(`
        SELECT * FROM strategic_events 
        WHERE strategic_id = ? 
        ORDER BY timestamp DESC 
        LIMIT 10
      `);
      const recent_events = eventsStmt.all(strategicId);

      return {
        strategic_item: {
          ...item,
          tags: item.tags ? JSON.parse(item.tags) : [],
          metadata: item.metadata ? JSON.parse(item.metadata) : {}
        },
        relationships,
        recent_events
      };

    } catch (error) {
      return {
        error: `Failed to get strategic item: ${error.message}`,
        type: 'retrieval_error'
      };
    }
  }

  /**
   * Update strategic item status with agent context
   */
  async updateStrategicStatus(strategicId, newStatus, agentSource = 'manual', evidence = '') {
    await this.initialize();
    
    try {
      // Check if item exists
      const existingStmt = this.statements.get('getStrategicItem');
      const existing = existingStmt.get(strategicId);
      
      if (!existing) {
        return {
          error: `Strategic item '${strategicId}' not found`,
          type: 'not_found'
        };
      }

      if (existing.status === newStatus) {
        return {
          message: `Status already set to '${newStatus}'`,
          strategic_id: strategicId,
          status: newStatus
        };
      }

      // Update status
      const updateStmt = this.statements.get('updateStrategicStatus');
      updateStmt.run(newStatus, agentSource, 0.8, strategicId);

      // Add evidence event if provided
      if (evidence) {
        const eventStmt = this.db.prepare(`
          INSERT INTO strategic_events (strategic_id, event_type, new_value, agent_source, evidence)
          VALUES (?, 'evidence_added', ?, ?, ?)
        `);
        eventStmt.run(strategicId, newStatus, agentSource, evidence);
      }

      return {
        success: true,
        strategic_id: strategicId,
        old_status: existing.status,
        new_status: newStatus,
        updated_by: agentSource,
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Failed to update strategic status: ${error.message}`,
        type: 'update_error'
      };
    }
  }

  /**
   * Search strategic items with filtering
   */
  async searchStrategicItems(query = '', typeFilter = 'all', statusFilter = 'all', limit = 20) {
    await this.initialize();
    
    try {
      const searchTerm = `%${query}%`;
      const stmt = this.statements.get('searchStrategicItems');
      const results = stmt.all(
        query, searchTerm, searchTerm, searchTerm,
        typeFilter, typeFilter,
        statusFilter, statusFilter,
        limit
      );

      // Parse JSON fields
      const processedResults = results.map(item => ({
        ...item,
        tags: item.tags ? JSON.parse(item.tags) : [],
        metadata: item.metadata ? JSON.parse(item.metadata) : {}
      }));

      return {
        query,
        filters: { type: typeFilter, status: statusFilter },
        total_results: processedResults.length,
        results: processedResults
      };

    } catch (error) {
      return {
        error: `Search failed: ${error.message}`,
        type: 'search_error'
      };
    }
  }

  /**
   * Get strategic intelligence dashboard
   */
  async getStrategicDashboard(domain = null) {
    await this.initialize();
    
    try {
      const dashboardStmt = this.statements.get('getDashboard');
      const domainSummary = dashboardStmt.all(domain, domain);

      const activityStmt = this.statements.get('getRecentActivity');
      const recentActivity = activityStmt.all(domain);

      // Calculate AI metrics
      const aiMetricsStmt = this.db.prepare(`
        SELECT 
          COUNT(CASE WHEN agent_last_assessed IS NOT NULL THEN 1 END) as autonomous_updates,
          AVG(CASE WHEN agent_confidence > 0 THEN agent_confidence END) as average_agent_confidence,
          AVG(CASE WHEN implementation_progress > 0 THEN implementation_progress END) as average_implementation_progress,
          COUNT(DISTINCT agent_last_assessed) as active_ai_agents
        FROM strategic_items
        WHERE (? IS NULL OR domain = ?)
      `);
      const aiMetrics = aiMetricsStmt.get(domain, domain);

      // Status and type distributions
      const statusStmt = this.db.prepare(`
        SELECT status, COUNT(*) as count
        FROM strategic_items
        WHERE (? IS NULL OR domain = ?)
        GROUP BY status
      `);
      const statusDist = statusStmt.all(domain, domain);
      const statusDistribution = Object.fromEntries(statusDist.map(s => [s.status, s.count]));

      const typeStmt = this.db.prepare(`
        SELECT type, COUNT(*) as count
        FROM strategic_items
        WHERE (? IS NULL OR domain = ?)
        GROUP BY type
      `);
      const typeDist = typeStmt.all(domain, domain);
      const typeDistribution = Object.fromEntries(typeDist.map(t => [t.type, t.count]));

      return {
        domain: domain || 'all',
        total_items: domainSummary.reduce((sum, d) => sum + d.total_items, 0),
        domain_summary: Object.fromEntries(domainSummary.map(d => [d.domain, {
          total_items: d.total_items,
          active_items: d.active_items,
          completed_items: d.completed_items,
          blocked_items: d.blocked_items,
          avg_progress: d.avg_progress
        }])),
        status_distribution: statusDistribution,
        type_distribution: typeDistribution,
        ai_metrics: aiMetrics,
        recent_activity: recentActivity.slice(0, 10)
      };

    } catch (error) {
      return {
        error: `Dashboard generation failed: ${error.message}`,
        type: 'dashboard_error'
      };
    }
  }

  /**
   * Get strategic relationships for an item
   */
  async getStrategicRelationships(strategicId, relationTypeFilter = 'all') {
    await this.initialize();
    
    try {
      const stmt = this.statements.get('getRelationships');
      const relationships = stmt.all(strategicId, strategicId, relationTypeFilter, relationTypeFilter);

      const processedRelationships = relationships.map(rel => ({
        ...rel,
        direction: rel.source_id === strategicId ? 'outgoing' : 'incoming',
        related_item: {
          id: rel.source_id === strategicId ? rel.target_id : rel.source_id,
          title: rel.source_id === strategicId ? rel.target_title : rel.source_title,
          type: rel.source_id === strategicId ? rel.target_type : rel.source_type
        }
      }));

      return {
        strategic_id: strategicId,
        relation_type_filter: relationTypeFilter,
        total_relationships: processedRelationships.length,
        relationships: processedRelationships
      };

    } catch (error) {
      return {
        error: `Failed to get relationships: ${error.message}`,
        type: 'relationship_error'
      };
    }
  }

  /**
   * Update agent assessment for a strategic item
   */
  async updateAgentAssessment(strategicId, agentId, assessment) {
    await this.initialize();
    
    try {
      const {
        confidence = 0.5,
        autonomousScore = 0.5,
        implementationProgress = 0.0,
        analysis = ''
      } = assessment;

      const stmt = this.statements.get('updateAgentAssessment');
      stmt.run(agentId, confidence, autonomousScore, implementationProgress, analysis, strategicId);

      return {
        success: true,
        strategic_id: strategicId,
        agent_id: agentId,
        assessment: {
          confidence,
          autonomous_score: autonomousScore,
          implementation_progress: implementationProgress,
          analysis
        },
        updated_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Failed to update agent assessment: ${error.message}`,
        type: 'assessment_error'
      };
    }
  }

  /**
   * Create strategic relationship between items
   */
  async createStrategicRelationship(sourceId, targetId, relationType, agentId = 'manual', confidence = 0.8, evidence = '') {
    await this.initialize();
    
    try {
      const stmt = this.statements.get('createRelationship');
      stmt.run(sourceId, targetId, relationType, agentId, confidence, evidence);

      return {
        success: true,
        source_id: sourceId,
        target_id: targetId,
        relation_type: relationType,
        discovery_agent: agentId,
        confidence,
        created_at: new Date().toISOString()
      };

    } catch (error) {
      return {
        error: `Failed to create relationship: ${error.message}`,
        type: 'relationship_error'
      };
    }
  }

  // === UTILITY FUNCTIONS ===

  /**
   * Generate strategic ID with domain and type prefix
   */
  generateStrategicId(type, domain) {
    const typePrefix = {
      'problem': 'PROB',
      'solution': 'SOL',
      'assessment': 'ASSESS',
      'finding': 'FIND'
    }[type] || 'STRAT';

    const domainCode = domain.toUpperCase().replace(/[^A-Z0-9]/g, '').substring(0, 6);
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    
    return `${typePrefix}_${domainCode}_${timestamp}_${random}`;
  }

  /**
   * Get system statistics
   */
  async getSystemStats() {
    await this.initialize();
    
    const stats = this.db.prepare(`
      SELECT 
        COUNT(*) as total_items,
        COUNT(CASE WHEN status = 'new' THEN 1 END) as new_items,
        COUNT(CASE WHEN status = 'in_progress' THEN 1 END) as active_items,
        COUNT(CASE WHEN status = 'done' THEN 1 END) as completed_items,
        COUNT(CASE WHEN agent_last_assessed IS NOT NULL THEN 1 END) as ai_assessed_items,
        AVG(autonomous_score) as avg_autonomous_score,
        COUNT(DISTINCT domain) as domains,
        COUNT(DISTINCT agent_last_assessed) as active_agents
      FROM strategic_items
    `).get();

    const relationshipStats = this.db.prepare(`
      SELECT COUNT(*) as total_relationships
      FROM strategic_relationships
    `).get();

    return {
      ...stats,
      ...relationshipStats,
      database_path: this.options.dbPath,
      initialized: this.isInitialized
    };
  }

  /**
   * Close database connection
   */
  async close() {
    if (this.db) {
      this.db.close();
      this.db = null;
      this.isInitialized = false;
    }
  }
}

// Export singleton instance for easy use
export const strategicIntelligence = new StrategicIntelligence();

// Export individual functions for MCP tools
export async function createStrategicItem(type, title, domain, filePath = null, status = 'new', metadata = {}) {
  const result = await strategicIntelligence.createStrategicItem({
    type, title, domain, file_path: filePath, status, metadata
  });
  return JSON.stringify(result, null, 2);
}

export async function getStrategicItem(strategicId) {
  const result = await strategicIntelligence.getStrategicItem(strategicId);
  return JSON.stringify(result, null, 2);
}

export async function updateStrategicStatus(strategicId, newStatus, agentSource = 'manual', evidence = '') {
  const result = await strategicIntelligence.updateStrategicStatus(strategicId, newStatus, agentSource, evidence);
  return JSON.stringify(result, null, 2);
}

export async function searchStrategicItems(query = '', typeFilter = 'all', statusFilter = 'all', limit = 20) {
  const result = await strategicIntelligence.searchStrategicItems(query, typeFilter, statusFilter, limit);
  return JSON.stringify(result, null, 2);
}

export async function getStrategicDashboard(domain = null) {
  const result = await strategicIntelligence.getStrategicDashboard(domain);
  return JSON.stringify(result, null, 2);
}

export async function getStrategicRelationships(strategicId, relationTypeFilter = 'all') {
  const result = await strategicIntelligence.getStrategicRelationships(strategicId, relationTypeFilter);
  return JSON.stringify(result, null, 2);
}