/**
 * Strategic Intelligence Integration Tests for Claude-Flow
 * Tests the complete strategic intelligence system integration
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { StrategicIntelligence } from '../memory/strategic-intelligence-tools.js';
import { StrategicIdGenerator } from '../utils/strategic-id-generator.js';
import { strategicIntelligenceMCP } from '../mcp/strategic-intelligence-mcp.js';
import { promises as fs } from 'fs';
import path from 'path';
import os from 'os';

describe('Strategic Intelligence System', () => {
  let testDbPath: string;
  let strategicIntelligence: StrategicIntelligence;

  beforeEach(async () => {
    // Create temporary database for testing
    const tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'strategic-test-'));
    testDbPath = path.join(tempDir, 'test-strategic.db');
    
    strategicIntelligence = new StrategicIntelligence({
      dbPath: testDbPath,
      autoInit: true
    });
    
    await strategicIntelligence.initialize();
  });

  afterEach(async () => {
    await strategicIntelligence.close();
    
    // Clean up test database
    try {
      await fs.unlink(testDbPath);
      await fs.rmdir(path.dirname(testDbPath));
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('Strategic ID Generation', () => {
    it('should generate valid strategic IDs', () => {
      const id = StrategicIdGenerator.generateSimple('problem', 'claude-flow');
      expect(id).toMatch(/^PROB_CF_\d{8}_[A-Z0-9]{4}$/);
    });

    it('should parse strategic IDs correctly', () => {
      const id = 'PROB_CF_12345678_AB12';
      const parsed = StrategicIdGenerator.parse(id);
      
      expect(parsed.valid).toBe(true);
      expect(parsed.prefix).toBe('PROB');
      expect(parsed.domain).toBe('CF');
      expect(parsed.timestamp).toBe('12345678');
      expect(parsed.sequence).toBe('AB12');
    });

    it('should validate strategic ID format', () => {
      expect(StrategicIdGenerator.validate('PROB_CF_12345678_AB12')).toBe(true);
      expect(StrategicIdGenerator.validate('invalid-id')).toBe(false);
      expect(StrategicIdGenerator.validate('PROB_CF_123')).toBe(false);
    });

    it('should generate relationship IDs', () => {
      const sourceId = 'PROB_CF_12345678_AB12';
      const targetId = 'SOL_CF_87654321_CD34';
      const relationId = StrategicIdGenerator.generateRelationshipId(sourceId, targetId, 'implements');
      
      expect(relationId).toMatch(/^REL_[A-Z0-9]+_[A-Z0-9]+_[A-Z0-9]+_\d{8}$/);
    });

    it('should generate batch IDs', () => {
      const batchId = StrategicIdGenerator.generateBatchId('performance', 'session-123');
      expect(batchId).toMatch(/^BATCH_PERF_\d{8}_[A-Z0-9]{4}_[A-Z0-9]{8}$/);
    });
  });

  describe('Strategic Item Management', () => {
    it('should create strategic items successfully', async () => {
      const result = await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Test Performance Issue',
        domain: 'PERFORMANCE',
        priority: 'high',
        status: 'new'
      });

      expect(result.success).toBe(true);
      expect(result.strategic_id).toMatch(/^PROB_PERFORM_\d{8}_[A-Z0-9]{4}$/);
      expect(result.type).toBe('problem');
      expect(result.title).toBe('Test Performance Issue');
    });

    it('should retrieve strategic items with details', async () => {
      // Create test item
      const createResult = await strategicIntelligence.createStrategicItem({
        type: 'solution',
        title: 'Test Solution',
        domain: 'TESTING',
        priority: 'medium'
      });

      const itemId = createResult.strategic_id!;
      const result = await strategicIntelligence.getStrategicItem(itemId);

      expect(result.strategic_item).toBeDefined();
      expect(result.strategic_item.id).toBe(itemId);
      expect(result.strategic_item.title).toBe('Test Solution');
      expect(result.relationships).toEqual([]);
      expect(result.recent_events).toEqual([]);
    });

    it('should handle non-existent strategic items', async () => {
      const result = await strategicIntelligence.getStrategicItem('NONEXISTENT_ID');
      
      expect(result.error).toBeDefined();
      expect(result.type).toBe('not_found');
    });

    it('should update strategic item status', async () => {
      // Create test item
      const createResult = await strategicIntelligence.createStrategicItem({
        type: 'assessment',
        title: 'Test Assessment',
        domain: 'TESTING',
        status: 'new'
      });

      const itemId = createResult.strategic_id!;
      const updateResult = await strategicIntelligence.updateStrategicStatus(
        itemId,
        'in_progress',
        'test-agent',
        'Starting work on assessment'
      );

      expect(updateResult.success).toBe(true);
      expect(updateResult.old_status).toBe('new');
      expect(updateResult.new_status).toBe('in_progress');
      expect(updateResult.updated_by).toBe('test-agent');
    });

    it('should search strategic items', async () => {
      // Create test items
      await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Search Test Problem',
        domain: 'SEARCH_TEST',
        priority: 'high'
      });

      await strategicIntelligence.createStrategicItem({
        type: 'solution',
        title: 'Search Test Solution',
        domain: 'SEARCH_TEST',
        priority: 'medium'
      });

      const searchResult = await strategicIntelligence.searchStrategicItems(
        'Search Test',
        'all',
        'all',
        10
      );

      expect(searchResult.total_results).toBe(2);
      expect(searchResult.results).toHaveLength(2);
      expect(searchResult.results[0].title).toContain('Search Test');
    });
  });

  describe('Strategic Relationships', () => {
    let problemId: string;
    let solutionId: string;

    beforeEach(async () => {
      // Create test items
      const problemResult = await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Relationship Test Problem',
        domain: 'REL_TEST'
      });
      problemId = problemResult.strategic_id!;

      const solutionResult = await strategicIntelligence.createStrategicItem({
        type: 'solution',
        title: 'Relationship Test Solution',
        domain: 'REL_TEST'
      });
      solutionId = solutionResult.strategic_id!;
    });

    it('should create strategic relationships', async () => {
      const result = await strategicIntelligence.createStrategicRelationship(
        problemId,
        solutionId,
        'implements',
        'test-agent',
        0.9,
        'Solution implements the problem fix'
      );

      expect(result.success).toBe(true);
      expect(result.source_id).toBe(problemId);
      expect(result.target_id).toBe(solutionId);
      expect(result.relation_type).toBe('implements');
      expect(result.confidence).toBe(0.9);
    });

    it('should retrieve strategic relationships', async () => {
      // Create relationship
      await strategicIntelligence.createStrategicRelationship(
        problemId,
        solutionId,
        'related',
        'test-agent',
        0.8
      );

      const result = await strategicIntelligence.getStrategicRelationships(problemId);

      expect(result.total_relationships).toBe(1);
      expect(result.relationships).toHaveLength(1);
      expect(result.relationships[0].relation_type).toBe('related');
      expect(result.relationships[0].direction).toBe('outgoing');
    });
  });

  describe('Agent Assessment', () => {
    let testItemId: string;

    beforeEach(async () => {
      const result = await strategicIntelligence.createStrategicItem({
        type: 'finding',
        title: 'Assessment Test Finding',
        domain: 'ASSESS_TEST'
      });
      testItemId = result.strategic_id!;
    });

    it('should update agent assessments', async () => {
      const assessment = {
        confidence: 0.85,
        autonomousScore: 0.75,
        implementationProgress: 0.3,
        analysis: 'This finding requires further investigation'
      };

      const result = await strategicIntelligence.updateAgentAssessment(
        testItemId,
        'assessment-agent',
        assessment
      );

      expect(result.success).toBe(true);
      expect(result.strategic_id).toBe(testItemId);
      expect(result.agent_id).toBe('assessment-agent');
      expect(result.assessment.confidence).toBe(0.85);
      expect(result.assessment.autonomous_score).toBe(0.75);
    });
  });

  describe('Strategic Dashboard', () => {
    beforeEach(async () => {
      // Create test data for dashboard
      await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Dashboard Test Problem 1',
        domain: 'DASHBOARD',
        status: 'new',
        priority: 'high'
      });

      await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Dashboard Test Problem 2',
        domain: 'DASHBOARD',
        status: 'in_progress',
        priority: 'medium'
      });

      await strategicIntelligence.createStrategicItem({
        type: 'solution',
        title: 'Dashboard Test Solution',
        domain: 'DASHBOARD',
        status: 'done',
        priority: 'low'
      });
    });

    it('should generate dashboard data', async () => {
      const result = await strategicIntelligence.getStrategicDashboard();

      expect(result.total_items).toBeGreaterThan(0);
      expect(result.status_distribution).toBeDefined();
      expect(result.type_distribution).toBeDefined();
      expect(result.ai_metrics).toBeDefined();
      
      // Check status distribution
      expect(result.status_distribution.new).toBeGreaterThan(0);
      expect(result.status_distribution.in_progress).toBeGreaterThan(0);
      expect(result.status_distribution.done).toBeGreaterThan(0);
    });

    it('should filter dashboard by domain', async () => {
      const result = await strategicIntelligence.getStrategicDashboard('DASHBOARD');

      expect(result.domain).toBe('DASHBOARD');
      expect(result.total_items).toBe(3);
    });
  });

  describe('System Statistics', () => {
    it('should provide system statistics', async () => {
      // Create some test data
      await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Stats Test',
        domain: 'STATS'
      });

      const stats = await strategicIntelligence.getSystemStats();

      expect(stats.total_items).toBeGreaterThan(0);
      expect(stats.new_items).toBeGreaterThan(0);
      expect(stats.domains).toBeGreaterThan(0);
      expect(stats.database_path).toBe(testDbPath);
      expect(stats.initialized).toBe(true);
    });
  });

  describe('MCP Integration', () => {
    it('should provide MCP tools', () => {
      const tools = strategicIntelligenceMCP.getTools();
      
      expect(tools.length).toBeGreaterThan(0);
      expect(tools.find(t => t.name === 'strategic_create_item')).toBeDefined();
      expect(tools.find(t => t.name === 'strategic_search_items')).toBeDefined();
      expect(tools.find(t => t.name === 'strategic_get_dashboard')).toBeDefined();
    });

    it('should validate tool arguments', () => {
      const validation = strategicIntelligenceMCP.validateArgs('strategic_create_item', {
        type: 'problem',
        title: 'Test Problem'
      });

      expect(validation.valid).toBe(true);
      expect(validation.errors).toHaveLength(0);
    });

    it('should reject invalid tool arguments', () => {
      const validation = strategicIntelligenceMCP.validateArgs('strategic_create_item', {
        type: 'problem'
        // Missing required 'title' field
      });

      expect(validation.valid).toBe(false);
      expect(validation.errors).toContain('Missing required field: title');
    });
  });

  describe('Error Handling', () => {
    it('should handle database errors gracefully', async () => {
      const badDb = new StrategicIntelligence({
        dbPath: '/invalid/path/database.db'
      });

      await expect(badDb.initialize()).rejects.toThrow();
    });

    it('should handle invalid strategic IDs', async () => {
      const result = await strategicIntelligence.updateStrategicStatus(
        'INVALID_ID',
        'done',
        'test-agent'
      );

      expect(result.error).toBeDefined();
      expect(result.type).toBe('not_found');
    });

    it('should handle duplicate relationships gracefully', async () => {
      // Create test items
      const problem = await strategicIntelligence.createStrategicItem({
        type: 'problem',
        title: 'Duplicate Test Problem',
        domain: 'DUP_TEST'
      });

      const solution = await strategicIntelligence.createStrategicItem({
        type: 'solution',
        title: 'Duplicate Test Solution',
        domain: 'DUP_TEST'
      });

      // Create first relationship
      const first = await strategicIntelligence.createStrategicRelationship(
        problem.strategic_id!,
        solution.strategic_id!,
        'implements',
        'test-agent'
      );

      // Try to create duplicate relationship
      const second = await strategicIntelligence.createStrategicRelationship(
        problem.strategic_id!,
        solution.strategic_id!,
        'implements',
        'test-agent'
      );

      expect(first.success).toBe(true);
      expect(second.success).toBe(true); // Should succeed due to INSERT OR IGNORE
    });
  });

  describe('Integration with Claude-Flow Memory', () => {
    it('should integrate with session management', async () => {
      const sessionId = 'test-session-123';
      const swarmId = 'test-swarm-456';

      const result = await strategicIntelligence.createStrategicItem({
        type: 'task',
        title: 'Session Integration Test',
        domain: 'SESSION',
        session_id: sessionId,
        swarm_id: swarmId
      });

      expect(result.success).toBe(true);
      
      // Verify the item was created with session context
      const retrieved = await strategicIntelligence.getStrategicItem(result.strategic_id!);
      expect(retrieved.strategic_item.session_id).toBe(sessionId);
      expect(retrieved.strategic_item.swarm_id).toBe(swarmId);
    });

    it('should support agent coordination', async () => {
      const agentId = 'coordination-agent';
      const taskId = 'task-789';

      const assessment = {
        confidence: 0.9,
        autonomousScore: 0.8,
        implementationProgress: 0.5,
        analysis: 'Agent coordination test successful'
      };

      // Create item
      const createResult = await strategicIntelligence.createStrategicItem({
        type: 'assessment',
        title: 'Agent Coordination Test',
        domain: 'COORD',
        agent_id: agentId,
        task_id: taskId
      });

      // Update assessment
      const assessResult = await strategicIntelligence.updateAgentAssessment(
        createResult.strategic_id!,
        agentId,
        assessment
      );

      expect(assessResult.success).toBe(true);
      expect(assessResult.agent_id).toBe(agentId);
    });
  });
});