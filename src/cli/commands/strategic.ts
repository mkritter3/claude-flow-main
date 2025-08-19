/**
 * Strategic Intelligence CLI Commands for Claude-Flow
 * Provides command-line interface for strategic problem/solution tracking
 */

import { Command } from 'commander';
import chalk from 'chalk';
import Table from 'cli-table3';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import inquirer from 'inquirer';

export const strategicCommand = new Command()
  .name('strategic')
  .description('Strategic Intelligence & Tracking System')
  .addCommand(createStrategicCommand())
  .addCommand(searchStrategicCommand())
  .addCommand(dashboardStrategicCommand())
  .addCommand(statusStrategicCommand())
  .addCommand(relationshipsStrategicCommand())
  .addCommand(assessStrategicCommand());

function createStrategicCommand(): Command {
  return new Command()
    .name('create')
    .description('Create a new strategic document')
    .argument('<type>', 'Strategic item type (problem, solution, assessment, finding)')
    .argument('<title>', 'Title of the strategic item')
    .option('-d, --domain <domain>', 'Domain ID (e.g., CF001, PERF001)', 'GENERAL')
    .option('-p, --priority <priority>', 'Priority level', 'medium')
    .option('-i, --impact <impact>', 'Impact level', 'medium')
    .option('-f, --file <file>', 'Associated file path')
    .option('-s, --status <status>', 'Initial status', 'new')
    .option('--interactive', 'Interactive mode for detailed input')
    .action(async (type: string, title: string, options: any) => {
      try {
        if (options.interactive) {
          await interactiveCreateStrategic(type, title, options);
        } else {
          await createStrategicItem(type, title, options);
        }
      } catch (error) {
        console.error(chalk.red('Error creating strategic item:'), (error as Error).message);
        process.exit(1);
      }
    });
}

function searchStrategicCommand(): Command {
  return new Command()
    .name('search')
    .description('Search strategic items')
    .argument('[query]', 'Search query', '')
    .option('-t, --type <type>', 'Filter by type (problem, solution, assessment, finding)', 'all')
    .option('-s, --status <status>', 'Filter by status (new, evaluating, in_progress, done, blocked)', 'all')
    .option('-l, --limit <limit>', 'Maximum number of results', '20')
    .option('--json', 'Output in JSON format')
    .action(async (query: string, options: any) => {
      try {
        await searchStrategicItems(query, options);
      } catch (error) {
        console.error(chalk.red('Error searching strategic items:'), (error as Error).message);
        process.exit(1);
      }
    });
}

function dashboardStrategicCommand(): Command {
  return new Command()
    .name('dashboard')
    .description('Show strategic intelligence dashboard')
    .argument('[item-id]', 'Show details for specific strategic item')
    .option('-d, --domain <domain>', 'Filter by domain')
    .option('--json', 'Output in JSON format')
    .option('-w, --watch', 'Watch mode - continuously update dashboard')
    .action(async (itemId: string, options: any) => {
      try {
        if (options.watch) {
          await watchStrategicDashboard(itemId, options);
        } else {
          await showStrategicDashboard(itemId, options);
        }
      } catch (error) {
        console.error(chalk.red('Error showing dashboard:'), (error as Error).message);
        process.exit(1);
      }
    });
}

function statusStrategicCommand(): Command {
  return new Command()
    .name('update-status')
    .description('Update the status of a strategic item')
    .argument('<strategic-id>', 'Strategic item ID')
    .argument('<new-status>', 'New status (new, evaluating, in_progress, done, blocked)')
    .option('-a, --agent <agent>', 'Agent making the update', 'manual')
    .option('-e, --evidence <evidence>', 'Evidence supporting the status change')
    .action(async (strategicId: string, newStatus: string, options: any) => {
      try {
        await updateStrategicStatus(strategicId, newStatus, options);
      } catch (error) {
        console.error(chalk.red('Error updating status:'), (error as Error).message);
        process.exit(1);
      }
    });
}

function relationshipsStrategicCommand(): Command {
  return new Command()
    .name('relationships')
    .description('Show relationships for a strategic item')
    .argument('<strategic-id>', 'Strategic item ID')
    .option('-t, --type <type>', 'Filter by relation type', 'all')
    .option('--create <target-id>', 'Create relationship to target ID')
    .option('--relation <relation>', 'Relationship type for creation', 'related')
    .action(async (strategicId: string, options: any) => {
      try {
        if (options.create) {
          await createStrategicRelationship(strategicId, options.create, options.relation);
        } else {
          await showStrategicRelationships(strategicId, options);
        }
      } catch (error) {
        console.error(chalk.red('Error with relationships:'), (error as Error).message);
        process.exit(1);
      }
    });
}

function assessStrategicCommand(): Command {
  return new Command()
    .name('assess')
    .description('AI agent assessment of strategic item')
    .argument('<strategic-id>', 'Strategic item ID')
    .option('-a, --agent <agent>', 'Agent ID', 'claude-strategic')
    .option('-c, --confidence <confidence>', 'Confidence score (0-1)', '0.8')
    .option('-s, --score <score>', 'Autonomous score (0-1)', '0.5')
    .option('-p, --progress <progress>', 'Implementation progress (0-1)', '0.0')
    .option('--analysis <analysis>', 'Analysis text')
    .action(async (strategicId: string, options: any) => {
      try {
        await assessStrategicItem(strategicId, options);
      } catch (error) {
        console.error(chalk.red('Error assessing strategic item:'), (error as Error).message);
        process.exit(1);
      }
    });
}

// Implementation functions

async function createStrategicItem(type: string, title: string, options: any): Promise<void> {
  const { createStrategicItem: createItem } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await createItem(
    type,
    title,
    options.domain,
    options.file,
    options.status,
    {
      priority: options.priority,
      impact: options.impact,
      cli_created: true,
      created_at: new Date().toISOString()
    }
  );

  const data = JSON.parse(result);
  
  if (data.error) {
    console.error(chalk.red('Error:'), data.error);
    return;
  }

  console.log(chalk.green('✓ Strategic item created successfully'));
  console.log(chalk.cyan('ID:'), data.strategic_id);
  console.log(chalk.white('Type:'), data.type);
  console.log(chalk.white('Title:'), data.title);
  console.log(chalk.white('Domain:'), data.domain);
  console.log(chalk.white('Status:'), data.status);
  
  // Offer to create associated file
  if (!options.file && type === 'problem') {
    const createFile = await inquirer.prompt([{
      type: 'confirm',
      name: 'create',
      message: 'Create problem documentation file?',
      default: true
    }]);
    
    if (createFile.create) {
      await createStrategicFile(data.strategic_id, type, title, data.domain);
    }
  }
}

async function interactiveCreateStrategic(type: string, title: string, options: any): Promise<void> {
  console.log(chalk.cyan.bold(`Creating Strategic ${type.charAt(0).toUpperCase() + type.slice(1)}`));
  console.log('─'.repeat(50));

  const answers = await inquirer.prompt([
    {
      type: 'input',
      name: 'domain',
      message: 'Domain ID:',
      default: options.domain || 'GENERAL',
      validate: (input: string) => input.length >= 2 || 'Domain must be at least 2 characters'
    },
    {
      type: 'list',
      name: 'priority',
      message: 'Priority level:',
      choices: ['critical', 'high', 'medium', 'low'],
      default: options.priority || 'medium'
    },
    {
      type: 'list',
      name: 'impact',
      message: 'Impact level:',
      choices: ['critical', 'high', 'medium', 'low'],
      default: options.impact || 'medium'
    },
    {
      type: 'input',
      name: 'file',
      message: 'Associated file path (optional):',
      default: options.file
    },
    {
      type: 'editor',
      name: 'description',
      message: 'Detailed description (opens editor):'
    }
  ]);

  const extendedOptions = { ...options, ...answers };
  await createStrategicItem(type, title, extendedOptions);
}

async function searchStrategicItems(query: string, options: any): Promise<void> {
  const { searchStrategicItems: search } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await search(query, options.type, options.status, parseInt(options.limit));
  const data = JSON.parse(result);

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.error) {
    console.error(chalk.red('Error:'), data.error);
    return;
  }

  console.log(chalk.cyan.bold('Strategic Search Results'));
  console.log(`Query: '${data.query}' | Type: ${data.filters.type} | Status: ${data.filters.status}`);
  console.log(`Total Results: ${data.total_results}\n`);

  if (data.results.length === 0) {
    console.log(chalk.yellow('No strategic items found'));
    return;
  }

  const table = new Table({
    head: ['ID', 'Type', 'Title', 'Domain', 'Status', 'Priority', 'Score', 'Updated'],
    colWidths: [20, 12, 40, 12, 12, 10, 8, 12]
  });

  for (const item of data.results) {
    const statusColor = getStatusColor(item.status);
    const priorityColor = getPriorityColor(item.priority);
    const typeIcon = getTypeIcon(item.type);
    
    table.push([
      chalk.gray(item.id.substring(0, 18)),
      `${typeIcon} ${item.type}`,
      item.title.substring(0, 35) + (item.title.length > 35 ? '...' : ''),
      item.domain,
      statusColor(item.status),
      priorityColor(item.priority),
      (item.autonomous_score || 0).toFixed(1),
      formatDate(item.updated_at)
    ]);
  }

  console.log(table.toString());
}

async function showStrategicDashboard(itemId?: string, options: any = {}): Promise<void> {
  if (itemId) {
    await showStrategicItemDetails(itemId, options);
  } else {
    await showStrategicOverview(options);
  }
}

async function showStrategicItemDetails(itemId: string, options: any): Promise<void> {
  const { getStrategicItem } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await getStrategicItem(itemId);
  const data = JSON.parse(result);

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.error) {
    console.error(chalk.red('Error:'), data.error);
    return;
  }

  const item = data.strategic_item;
  
  console.log(chalk.cyan.bold(`Strategic Item Details`));
  console.log('─'.repeat(60));
  console.log(`${getTypeIcon(item.type)} ${chalk.white('ID:')} ${item.id}`);
  console.log(`${chalk.white('Type:')} ${item.type} | ${chalk.white('Status:')} ${getStatusColor(item.status)(item.status)} | ${chalk.white('Domain:')} ${item.domain}`);
  console.log(`${chalk.white('Title:')} ${item.title}`);
  
  if (item.file_path) {
    console.log(`${chalk.white('File:')} ${item.file_path}`);
  }

  console.log(`${chalk.white('Priority:')} ${getPriorityColor(item.priority)(item.priority)} | ${chalk.white('Impact:')} ${item.impact_level}`);
  
  if (item.agent_last_assessed) {
    console.log('\n' + chalk.cyan.bold('Autonomous Intelligence:'));
    console.log(`${chalk.white('Last Assessed:')} ${item.agent_last_assessed}`);
    console.log(`${chalk.white('Confidence:')} ${(item.agent_confidence || 0).toFixed(2)}`);
    console.log(`${chalk.white('Autonomous Score:')} ${(item.autonomous_score || 0).toFixed(2)}`);
    console.log(`${chalk.white('Progress:')} ${((item.implementation_progress || 0) * 100).toFixed(0)}%`);
  }

  if (data.relationships.length > 0) {
    console.log('\n' + chalk.cyan.bold(`Relationships (${data.relationships.length}):`));
    for (const rel of data.relationships.slice(0, 5)) {
      const direction = rel.direction === 'outgoing' ? '→' : '←';
      console.log(`  ${rel.relation_type} ${direction} ${rel.related_item.id}: ${rel.related_item.title}`);
    }
  }

  if (data.recent_events.length > 0) {
    console.log('\n' + chalk.cyan.bold('Recent Events:'));
    for (const event of data.recent_events.slice(0, 3)) {
      const time = formatDate(event.timestamp);
      console.log(`  ${time} - ${event.event_type} by ${event.agent_source || 'system'}`);
    }
  }
}

async function showStrategicOverview(options: any): Promise<void> {
  const { getStrategicDashboard } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await getStrategicDashboard(options.domain);
  const data = JSON.parse(result);

  if (options.json) {
    console.log(JSON.stringify(data, null, 2));
    return;
  }

  if (data.error) {
    console.error(chalk.red('Error:'), data.error);
    return;
  }

  console.log(chalk.cyan.bold('Strategic Intelligence Dashboard'));
  console.log('─'.repeat(60));
  console.log(`Domain: ${data.domain} | Total Items: ${data.total_items}\n`);

  // Status Distribution
  console.log(chalk.cyan.bold('Status Distribution:'));
  const statusTable = new Table({ head: ['Status', 'Count', 'Percentage'] });
  for (const [status, count] of Object.entries(data.status_distribution)) {
    const percentage = ((count as number / data.total_items) * 100).toFixed(1);
    statusTable.push([
      getStatusColor(status)(status),
      count,
      `${percentage}%`
    ]);
  }
  console.log(statusTable.toString());

  // Type Distribution
  console.log('\n' + chalk.cyan.bold('Type Distribution:'));
  const typeTable = new Table({ head: ['Type', 'Count', 'Icon'] });
  for (const [type, count] of Object.entries(data.type_distribution)) {
    typeTable.push([
      type,
      count,
      getTypeIcon(type)
    ]);
  }
  console.log(typeTable.toString());

  // AI Metrics
  console.log('\n' + chalk.cyan.bold('AI Intelligence Metrics:'));
  const aiTable = new Table({ head: ['Metric', 'Value'] });
  aiTable.push(
    ['Autonomous Updates', data.ai_metrics.autonomous_updates],
    ['Average Confidence', (data.ai_metrics.average_agent_confidence || 0).toFixed(2)],
    ['Average Progress', ((data.ai_metrics.average_implementation_progress || 0) * 100).toFixed(0) + '%'],
    ['Active AI Agents', data.ai_metrics.active_ai_agents]
  );
  console.log(aiTable.toString());

  // Recent Activity
  if (data.recent_activity.length > 0) {
    console.log('\n' + chalk.cyan.bold('Recent Activity:'));
    for (const activity of data.recent_activity.slice(0, 5)) {
      const time = formatDate(activity.timestamp);
      const statusColor = getStatusColor(activity.status);
      console.log(`${time} - ${activity.event_type}: ${getTypeIcon(activity.type)} ${activity.title} (${statusColor(activity.status)})`);
    }
  }
}

async function watchStrategicDashboard(itemId?: string, options: any = {}): Promise<void> {
  const interval = 5000; // 5 seconds

  console.log(chalk.cyan('Watching Strategic Intelligence Dashboard...'));
  console.log(chalk.gray('Press Ctrl+C to stop\n'));

  // eslint-disable-next-line no-constant-condition
  while (true) {
    console.clear();
    console.log(chalk.cyan.bold('Strategic Intelligence Monitor'));
    console.log(chalk.gray(`Last updated: ${new Date().toLocaleTimeString()}\n`));

    try {
      await showStrategicDashboard(itemId, { ...options, json: false });
    } catch (error) {
      console.error(chalk.red('Update failed:'), (error as Error).message);
    }

    await new Promise((resolve) => setTimeout(resolve, interval));
  }
}

async function updateStrategicStatus(strategicId: string, newStatus: string, options: any): Promise<void> {
  const { updateStrategicStatus: updateStatus } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await updateStatus(strategicId, newStatus, options.agent, options.evidence);
  const data = JSON.parse(result);

  if (data.error) {
    console.error(chalk.red('Error:'), data.error);
    return;
  }

  if (data.message) {
    console.log(chalk.yellow(data.message));
    return;
  }

  console.log(chalk.green('✓ Status updated successfully'));
  console.log(`${chalk.white('ID:')} ${data.strategic_id}`);
  console.log(`${chalk.white('Status:')} ${getStatusColor(data.old_status)(data.old_status)} → ${getStatusColor(data.new_status)(data.new_status)}`);
  console.log(`${chalk.white('Updated by:')} ${data.updated_by}`);
}

async function showStrategicRelationships(strategicId: string, options: any): Promise<void> {
  const { getStrategicRelationships } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await getStrategicRelationships(strategicId, options.type);
  const data = JSON.parse(result);

  if (data.error) {
    console.error(chalk.red('Error:'), data.error);
    return;
  }

  console.log(chalk.cyan.bold(`Relationships for ${data.strategic_id}`));
  console.log(`Filter: ${data.relation_type_filter} | Total: ${data.total_relationships}\n`);

  if (data.relationships.length === 0) {
    console.log(chalk.yellow('No relationships found'));
    return;
  }

  const table = new Table({
    head: ['Direction', 'Type', 'Related Item', 'Title', 'Confidence'],
    colWidths: [12, 15, 20, 40, 12]
  });

  for (const rel of data.relationships) {
    const direction = rel.direction === 'outgoing' ? '→' : '←';
    const confidence = (rel.confidence || 0).toFixed(2);
    
    table.push([
      direction,
      rel.relation_type,
      chalk.gray(rel.related_item.id.substring(0, 18)),
      rel.related_item.title.substring(0, 35),
      confidence
    ]);
  }

  console.log(table.toString());
}

async function createStrategicRelationship(sourceId: string, targetId: string, relationType: string): Promise<void> {
  const { strategicIntelligence } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const result = await strategicIntelligence.createStrategicRelationship(
    sourceId, 
    targetId, 
    relationType, 
    'claude-cli',
    0.8,
    'Created via CLI'
  );

  if (result.error) {
    console.error(chalk.red('Error:'), result.error);
    return;
  }

  console.log(chalk.green('✓ Relationship created successfully'));
  console.log(`${chalk.white('Type:')} ${result.relation_type}`);
  console.log(`${chalk.white('Source:')} ${result.source_id}`);
  console.log(`${chalk.white('Target:')} ${result.target_id}`);
}

async function assessStrategicItem(strategicId: string, options: any): Promise<void> {
  const { strategicIntelligence } = await import('../../../memory/strategic-intelligence-tools.js');
  
  const assessment = {
    confidence: parseFloat(options.confidence),
    autonomousScore: parseFloat(options.score),
    implementationProgress: parseFloat(options.progress),
    analysis: options.analysis || ''
  };

  const result = await strategicIntelligence.updateAgentAssessment(
    strategicId,
    options.agent,
    assessment
  );

  if (result.error) {
    console.error(chalk.red('Error:'), result.error);
    return;
  }

  console.log(chalk.green('✓ Agent assessment updated successfully'));
  console.log(`${chalk.white('Strategic ID:')} ${result.strategic_id}`);
  console.log(`${chalk.white('Agent:')} ${result.agent_id}`);
  console.log(`${chalk.white('Confidence:')} ${result.assessment.confidence.toFixed(2)}`);
  console.log(`${chalk.white('Autonomous Score:')} ${result.assessment.autonomous_score.toFixed(2)}`);
  console.log(`${chalk.white('Progress:')} ${(result.assessment.implementation_progress * 100).toFixed(0)}%`);
}

async function createStrategicFile(strategicId: string, type: string, title: string, domain: string): Promise<void> {
  const fileName = `${strategicId.toLowerCase().replace(/_/g, '-')}.md`;
  const filePath = path.join(process.cwd(), '.strategic', fileName);
  
  // Ensure directory exists
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  
  const template = generateStrategicTemplate(type, title, domain, strategicId);
  await fs.writeFile(filePath, template);
  
  console.log(chalk.green('✓ Strategic file created:'), filePath);
}

function generateStrategicTemplate(type: string, title: string, domain: string, strategicId: string): string {
  const date = new Date().toISOString().split('T')[0];
  
  return `# ${title}

**Strategic ID**: ${strategicId}  
**Type**: ${type}  
**Domain**: ${domain}  
**Date**: ${date}  
**Status**: new  

## Overview

${type === 'problem' ? 'Describe the problem in detail...' : ''}
${type === 'solution' ? 'Describe the proposed solution...' : ''}
${type === 'assessment' ? 'Provide analysis and assessment...' : ''}
${type === 'finding' ? 'Document the finding...' : ''}

## Context

- Background information
- Relevant stakeholders
- Related systems/components

## Impact

- Potential consequences
- Affected systems
- Risk assessment

## Next Steps

- [ ] Action item 1
- [ ] Action item 2
- [ ] Action item 3

## References

- Related strategic items
- External documentation
- Code references

---
*Generated by Claude-Flow Strategic Intelligence*
`;
}

// Utility functions for formatting

function getStatusColor(status: string): (text: string) => string {
  switch (status.toLowerCase()) {
    case 'new': return chalk.blue;
    case 'evaluating': return chalk.yellow;
    case 'in_progress': return chalk.cyan;
    case 'done': return chalk.green;
    case 'blocked': return chalk.red;
    default: return chalk.gray;
  }
}

function getPriorityColor(priority: string): (text: string) => string {
  switch (priority.toLowerCase()) {
    case 'critical': return chalk.red.bold;
    case 'high': return chalk.red;
    case 'medium': return chalk.yellow;
    case 'low': return chalk.green;
    default: return chalk.gray;
  }
}

function getTypeIcon(type: string): string {
  switch (type.toLowerCase()) {
    case 'problem': return '🔴';
    case 'solution': return '💡';
    case 'assessment': return '📊';
    case 'finding': return '🔍';
    default: return '📄';
  }
}

function formatDate(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'now';
  if (diffMins < 60) return `${diffMins}m`;
  if (diffHours < 24) return `${diffHours}h`;
  if (diffDays < 7) return `${diffDays}d`;
  return date.toLocaleDateString();
}