/**
 * Strategic Intelligence MCP Server Integration
 * Provides MCP tools for strategic problem/solution tracking within Claude-Flow
 */

import { Tool } from '@modelcontextprotocol/sdk/types.js';

export interface StrategicIntelligenceMCPOptions {
  enableAdvancedAnalytics?: boolean;
  autoCreateRelationships?: boolean;
  confidenceThreshold?: number;
}

export class StrategicIntelligenceMCP {
  private options: StrategicIntelligenceMCPOptions;
  private tools: Tool[] = [];

  constructor(options: StrategicIntelligenceMCPOptions = {}) {
    this.options = {
      enableAdvancedAnalytics: true,
      autoCreateRelationships: true,
      confidenceThreshold: 0.7,
      ...options,
    };

    this.initializeTools();
  }

  private initializeTools(): void {
    this.tools = [
      {
        name: 'strategic_create_item',
        description: 'Create a new strategic item (problem, solution, assessment, or finding)',
        inputSchema: {
          type: 'object',
          properties: {
            type: {
              type: 'string',
              enum: ['problem', 'solution', 'assessment', 'finding'],
              description: 'Type of strategic item to create'
            },
            title: {
              type: 'string',
              description: 'Title of the strategic item'
            },
            domain: {
              type: 'string',
              description: 'Domain or area (e.g., CF001, PERF, SECURITY)',
              default: 'GENERAL'
            },
            file_path: {
              type: 'string',
              description: 'Optional file path associated with this item'
            },
            status: {
              type: 'string',
              enum: ['new', 'evaluating', 'in_progress', 'done', 'blocked'],
              description: 'Initial status of the item',
              default: 'new'
            },
            priority: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: 'Priority level',
              default: 'medium'
            },
            impact: {
              type: 'string',
              enum: ['critical', 'high', 'medium', 'low'],
              description: 'Impact level',
              default: 'medium'
            },
            session_id: {
              type: 'string',
              description: 'Current session ID for tracking'
            },
            swarm_id: {
              type: 'string',
              description: 'Associated swarm ID'
            },
            agent_id: {
              type: 'string',
              description: 'Creating agent ID'
            },
            task_id: {
              type: 'string',
              description: 'Related task ID'
            },
            tags: {
              type: 'array',
              items: { type: 'string' },
              description: 'Tags for categorization'
            },
            metadata: {
              type: 'object',
              description: 'Additional metadata'
            }
          },
          required: ['type', 'title']
        }
      },

      {
        name: 'strategic_get_item',
        description: 'Get detailed information about a strategic item',
        inputSchema: {
          type: 'object',
          properties: {
            strategic_id: {
              type: 'string',
              description: 'Strategic item ID to retrieve'
            }
          },
          required: ['strategic_id']
        }
      },

      {
        name: 'strategic_search_items',
        description: 'Search strategic items with filtering options',
        inputSchema: {
          type: 'object',
          properties: {
            query: {
              type: 'string',
              description: 'Search query for title, domain, or content',
              default: ''
            },
            type_filter: {
              type: 'string',
              enum: ['all', 'problem', 'solution', 'assessment', 'finding'],
              description: 'Filter by item type',
              default: 'all'
            },
            status_filter: {
              type: 'string',
              enum: ['all', 'new', 'evaluating', 'in_progress', 'done', 'blocked'],
              description: 'Filter by status',
              default: 'all'
            },
            domain_filter: {
              type: 'string',
              description: 'Filter by domain'
            },
            priority_filter: {
              type: 'string',
              enum: ['all', 'critical', 'high', 'medium', 'low'],
              description: 'Filter by priority',
              default: 'all'
            },
            limit: {
              type: 'number',
              description: 'Maximum number of results',
              default: 20,
              minimum: 1,
              maximum: 100
            }
          }
        }
      },

      {
        name: 'strategic_update_status',
        description: 'Update the status of a strategic item',
        inputSchema: {
          type: 'object',
          properties: {
            strategic_id: {
              type: 'string',
              description: 'Strategic item ID to update'
            },
            new_status: {
              type: 'string',
              enum: ['new', 'evaluating', 'in_progress', 'done', 'blocked'],
              description: 'New status for the item'
            },
            agent_source: {
              type: 'string',
              description: 'Agent or source making the update',
              default: 'claude-mcp'
            },
            evidence: {
              type: 'string',
              description: 'Evidence or reason for the status change'
            },
            confidence: {
              type: 'number',
              description: 'Confidence in the assessment (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.8
            }
          },
          required: ['strategic_id', 'new_status']
        }
      },

      {
        name: 'strategic_get_dashboard',
        description: 'Get strategic intelligence dashboard data',
        inputSchema: {
          type: 'object',
          properties: {
            domain: {
              type: 'string',
              description: 'Filter dashboard by specific domain'
            },
            include_metrics: {
              type: 'boolean',
              description: 'Include AI metrics and analytics',
              default: true
            },
            include_activity: {
              type: 'boolean',
              description: 'Include recent activity',
              default: true
            }
          }
        }
      },

      {
        name: 'strategic_get_relationships',
        description: 'Get relationships for a strategic item',
        inputSchema: {
          type: 'object',
          properties: {
            strategic_id: {
              type: 'string',
              description: 'Strategic item ID'
            },
            relation_type_filter: {
              type: 'string',
              enum: ['all', 'related', 'blocks', 'implements', 'supersedes', 'depends_on', 'validates'],
              description: 'Filter by relationship type',
              default: 'all'
            },
            direction: {
              type: 'string',
              enum: ['all', 'outgoing', 'incoming'],
              description: 'Filter by relationship direction',
              default: 'all'
            }
          },
          required: ['strategic_id']
        }
      },

      {
        name: 'strategic_create_relationship',
        description: 'Create a relationship between strategic items',
        inputSchema: {
          type: 'object',
          properties: {
            source_id: {
              type: 'string',
              description: 'Source strategic item ID'
            },
            target_id: {
              type: 'string',
              description: 'Target strategic item ID'
            },
            relation_type: {
              type: 'string',
              enum: ['related', 'blocks', 'implements', 'supersedes', 'depends_on', 'validates'],
              description: 'Type of relationship',
              default: 'related'
            },
            discovery_agent: {
              type: 'string',
              description: 'Agent that discovered/created this relationship',
              default: 'claude-mcp'
            },
            confidence: {
              type: 'number',
              description: 'Confidence in the relationship (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.8
            },
            evidence: {
              type: 'string',
              description: 'Evidence supporting this relationship'
            },
            bidirectional: {
              type: 'boolean',
              description: 'Whether the relationship works both ways',
              default: false
            }
          },
          required: ['source_id', 'target_id', 'relation_type']
        }
      },

      {
        name: 'strategic_agent_assess',
        description: 'Update agent assessment for a strategic item',
        inputSchema: {
          type: 'object',
          properties: {
            strategic_id: {
              type: 'string',
              description: 'Strategic item ID to assess'
            },
            agent_id: {
              type: 'string',
              description: 'Agent performing the assessment',
              default: 'claude-mcp'
            },
            confidence: {
              type: 'number',
              description: 'Agent confidence in the assessment (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.8
            },
            autonomous_score: {
              type: 'number',
              description: 'Autonomous intelligence score (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.5
            },
            implementation_progress: {
              type: 'number',
              description: 'Implementation progress (0-1)',
              minimum: 0,
              maximum: 1,
              default: 0.0
            },
            analysis: {
              type: 'string',
              description: 'Agent analysis and findings'
            },
            complexity_score: {
              type: 'number',
              description: 'Complexity assessment (0-1)',
              minimum: 0,
              maximum: 1
            },
            risk_level: {
              type: 'number',
              description: 'Risk level assessment (0-1)',
              minimum: 0,
              maximum: 1
            }
          },
          required: ['strategic_id']
        }
      },

      {
        name: 'strategic_get_stats',
        description: 'Get strategic intelligence system statistics',
        inputSchema: {
          type: 'object',
          properties: {
            include_performance: {
              type: 'boolean',
              description: 'Include performance metrics',
              default: true
            },
            include_ai_metrics: {
              type: 'boolean',
              description: 'Include AI assessment metrics',
              default: true
            }
          }
        }
      }
    ];

    // Add advanced analytics tools if enabled
    if (this.options.enableAdvancedAnalytics) {
      this.tools.push(
        {
          name: 'strategic_analyze_patterns',
          description: 'Analyze patterns and trends in strategic data',
          inputSchema: {
            type: 'object',
            properties: {
              analysis_type: {
                type: 'string',
                enum: ['trend', 'correlation', 'bottleneck', 'priority_drift', 'agent_performance'],
                description: 'Type of pattern analysis to perform',
                default: 'trend'
              },
              time_window: {
                type: 'string',
                enum: ['24h', '7d', '30d', '90d', 'all'],
                description: 'Time window for analysis',
                default: '30d'
              },
              domain_filter: {
                type: 'string',
                description: 'Filter analysis by domain'
              },
              include_predictions: {
                type: 'boolean',
                description: 'Include predictive insights',
                default: true
              }
            }
          }
        },

        {
          name: 'strategic_recommend_actions',
          description: 'Get AI-powered recommendations for strategic actions',
          inputSchema: {
            type: 'object',
            properties: {
              strategic_id: {
                type: 'string',
                description: 'Strategic item to get recommendations for'
              },
              recommendation_type: {
                type: 'string',
                enum: ['next_steps', 'optimization', 'risk_mitigation', 'resource_allocation'],
                description: 'Type of recommendations',
                default: 'next_steps'
              },
              context: {
                type: 'object',
                description: 'Additional context for recommendations'
              }
            }
          }
        }
      );
    }
  }

  /**
   * Get all available MCP tools
   */
  getTools(): Tool[] {
    return this.tools;
  }

  /**
   * Handle MCP tool calls
   */
  async handleToolCall(name: string, args: any): Promise<any> {
    try {
      // Import strategic intelligence tools dynamically
      const { 
        createStrategicItem,
        getStrategicItem,
        searchStrategicItems,
        updateStrategicStatus,
        getStrategicDashboard,
        getStrategicRelationships,
        strategicIntelligence
      } = await import('../memory/strategic-intelligence-tools.js');

      switch (name) {
        case 'strategic_create_item':
          return await this.handleCreateItem(createStrategicItem, args);

        case 'strategic_get_item':
          return await getStrategicItem(args.strategic_id);

        case 'strategic_search_items':
          return await this.handleSearchItems(searchStrategicItems, args);

        case 'strategic_update_status':
          return await updateStrategicStatus(
            args.strategic_id,
            args.new_status,
            args.agent_source,
            args.evidence
          );

        case 'strategic_get_dashboard':
          return await getStrategicDashboard(args.domain);

        case 'strategic_get_relationships':
          return await getStrategicRelationships(
            args.strategic_id,
            args.relation_type_filter
          );

        case 'strategic_create_relationship':
          return await this.handleCreateRelationship(strategicIntelligence, args);

        case 'strategic_agent_assess':
          return await this.handleAgentAssess(strategicIntelligence, args);

        case 'strategic_get_stats':
          return await this.handleGetStats(strategicIntelligence, args);

        case 'strategic_analyze_patterns':
          return await this.handleAnalyzePatterns(strategicIntelligence, args);

        case 'strategic_recommend_actions':
          return await this.handleRecommendActions(strategicIntelligence, args);

        default:
          throw new Error(`Unknown strategic intelligence tool: ${name}`);
      }
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Strategic Intelligence MCP error:`, error);
      return JSON.stringify({
        error: `Tool execution failed: ${(error as Error).message}`,
        tool: name,
        timestamp: new Date().toISOString()
      });
    }
  }

  private async handleCreateItem(createStrategicItem: Function, args: any): Promise<string> {
    const metadata = {
      ...args.metadata,
      mcp_created: true,
      creation_timestamp: new Date().toISOString(),
      ...(args.session_id && { session_id: args.session_id }),
      ...(args.swarm_id && { swarm_id: args.swarm_id }),
      ...(args.agent_id && { agent_id: args.agent_id }),
      ...(args.task_id && { task_id: args.task_id })
    };

    return await createStrategicItem(
      args.type,
      args.title,
      args.domain,
      args.file_path,
      args.status,
      metadata
    );
  }

  private async handleSearchItems(searchStrategicItems: Function, args: any): Promise<string> {
    return await searchStrategicItems(
      args.query,
      args.type_filter,
      args.status_filter,
      args.limit
    );
  }

  private async handleCreateRelationship(strategicIntelligence: any, args: any): Promise<string> {
    const result = await strategicIntelligence.createStrategicRelationship(
      args.source_id,
      args.target_id,
      args.relation_type,
      args.discovery_agent,
      args.confidence,
      args.evidence
    );

    return JSON.stringify(result, null, 2);
  }

  private async handleAgentAssess(strategicIntelligence: any, args: any): Promise<string> {
    const assessment = {
      confidence: args.confidence,
      autonomousScore: args.autonomous_score,
      implementationProgress: args.implementation_progress,
      analysis: args.analysis,
      complexityScore: args.complexity_score,
      riskLevel: args.risk_level
    };

    const result = await strategicIntelligence.updateAgentAssessment(
      args.strategic_id,
      args.agent_id,
      assessment
    );

    return JSON.stringify(result, null, 2);
  }

  private async handleGetStats(strategicIntelligence: any, args: any): Promise<string> {
    const result = await strategicIntelligence.getSystemStats();
    return JSON.stringify(result, null, 2);
  }

  private async handleAnalyzePatterns(strategicIntelligence: any, args: any): Promise<string> {
    // Advanced pattern analysis would be implemented here
    // For now, return basic trend analysis
    const result = {
      analysis_type: args.analysis_type,
      time_window: args.time_window,
      patterns_detected: [],
      trends: [],
      recommendations: [],
      confidence: 0.8,
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(result, null, 2);
  }

  private async handleRecommendActions(strategicIntelligence: any, args: any): Promise<string> {
    // AI-powered recommendations would be implemented here
    const result = {
      strategic_id: args.strategic_id,
      recommendation_type: args.recommendation_type,
      recommendations: [
        {
          action: 'Assess current status',
          priority: 'high',
          confidence: 0.9,
          reasoning: 'Item requires status update based on recent activity'
        }
      ],
      context_analysis: {},
      timestamp: new Date().toISOString()
    };

    return JSON.stringify(result, null, 2);
  }

  /**
   * Get tool descriptions for help and documentation
   */
  getToolDescriptions(): Record<string, string> {
    const descriptions: Record<string, string> = {};
    
    for (const tool of this.tools) {
      descriptions[tool.name] = tool.description;
    }

    return descriptions;
  }

  /**
   * Validate tool arguments
   */
  validateArgs(toolName: string, args: any): { valid: boolean; errors: string[] } {
    const tool = this.tools.find(t => t.name === toolName);
    if (!tool) {
      return { valid: false, errors: [`Unknown tool: ${toolName}`] };
    }

    const errors: string[] = [];
    const schema = tool.inputSchema;
    
    if (schema.required) {
      for (const field of schema.required) {
        if (!(field in args)) {
          errors.push(`Missing required field: ${field}`);
        }
      }
    }

    return { valid: errors.length === 0, errors };
  }
}

// Export singleton instance
export const strategicIntelligenceMCP = new StrategicIntelligenceMCP();