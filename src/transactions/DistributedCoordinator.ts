/**
 * DistributedCoordinator - Distributed Transaction Coordination
 * 
 * Coordinates transactions across multiple nodes/components with
 * consensus algorithms, failure recovery, and network partition handling.
 */

import { EventEmitter } from 'events';
import { TransactionManager, Transaction } from './TransactionManager.js';

export interface DistributedNode {
  id: string;
  endpoint: string;
  status: 'active' | 'failed' | 'suspected' | 'recovering';
  lastHeartbeat: number;
  role: 'coordinator' | 'participant';
  transactions: Set<string>;
}

export interface CoordinationMessage {
  type: 'PREPARE' | 'COMMIT' | 'ABORT' | 'VOTE_COMMIT' | 'VOTE_ABORT' | 'HEARTBEAT' | 'RECOVERY';
  transactionId: string;
  senderId: string;
  timestamp: number;
  data?: any;
}

export interface DistributedTransaction extends Transaction {
  coordinatorId: string;
  participantNodes: Set<string>;
  votes: Map<string, 'commit' | 'abort'>;
  phase: 'preparing' | 'committing' | 'aborting' | 'completed';
}

export interface CoordinatorElection {
  candidateId: string;
  term: number;
  votes: Set<string>;
  startTime: number;
}

export interface RecoveryInfo {
  transactionId: string;
  lastKnownState: string;
  participantStates: Map<string, string>;
  recoveryStrategy: 'commit' | 'abort' | 'inquiry';
}

export class DistributedCoordinator extends EventEmitter {
  private nodeId: string;
  private nodes: Map<string, DistributedNode> = new Map();
  private distributedTransactions: Map<string, DistributedTransaction> = new Map();
  private transactionManager: TransactionManager;
  
  private isCoordinator: boolean = false;
  private currentTerm: number = 0;
  private coordinatorId: string | null = null;
  private election: CoordinationElection | null = null;
  
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private failureDetectionInterval: NodeJS.Timeout | null = null;
  
  private messageHandlers: Map<string, (message: CoordinationMessage) => Promise<void>> = new Map();
  
  private config = {
    heartbeatInterval: 1000, // 1 second
    failureTimeout: 5000,    // 5 seconds
    electionTimeout: 3000,   // 3 seconds
    maxRetries: 3,
    batchSize: 100
  };

  constructor(nodeId: string, transactionManager: TransactionManager) {
    super();
    this.nodeId = nodeId;
    this.transactionManager = transactionManager;
    this.initializeMessageHandlers();
  }

  /**
   * Starts the distributed coordinator
   */
  async start(): Promise<void> {
    // Register self as a node
    this.nodes.set(this.nodeId, {
      id: this.nodeId,
      endpoint: `node://${this.nodeId}`,
      status: 'active',
      lastHeartbeat: Date.now(),
      role: 'participant',
      transactions: new Set()
    });

    // Start background processes
    this.startHeartbeat();
    this.startFailureDetection();
    
    // If first node, become coordinator
    if (this.nodes.size === 1) {
      await this.becomeCoordinator();
    } else {
      // Trigger coordinator election
      await this.startCoordinatorElection();
    }

    console.log(`🌐 Distributed Coordinator started on node ${this.nodeId}`);
    this.emit('coordinator-started', { nodeId: this.nodeId, isCoordinator: this.isCoordinator });
  }

  /**
   * Adds a new node to the cluster
   */
  async addNode(nodeId: string, endpoint: string): Promise<void> {
    const node: DistributedNode = {
      id: nodeId,
      endpoint,
      status: 'active',
      lastHeartbeat: Date.now(),
      role: 'participant',
      transactions: new Set()
    };

    this.nodes.set(nodeId, node);
    
    // Send cluster info to new node
    await this.sendClusterInfo(nodeId);
    
    console.log(`➕ Node ${nodeId} added to cluster`);
    this.emit('node-added', { nodeId, endpoint });
  }

  /**
   * Removes a node from the cluster
   */
  async removeNode(nodeId: string): Promise<void> {
    const node = this.nodes.get(nodeId);
    if (!node) return;

    // Handle ongoing transactions for this node
    for (const txId of node.transactions) {
      const dtx = this.distributedTransactions.get(txId);
      if (dtx) {
        if (dtx.coordinatorId === nodeId) {
          // Coordinator failed, trigger recovery
          await this.handleCoordinatorFailure(txId);
        } else {
          // Participant failed, mark as aborted
          await this.handleParticipantFailure(txId, nodeId);
        }
      }
    }

    this.nodes.delete(nodeId);
    
    // If coordinator failed, start election
    if (this.coordinatorId === nodeId) {
      this.coordinatorId = null;
      this.isCoordinator = false;
      await this.startCoordinatorElection();
    }

    console.log(`➖ Node ${nodeId} removed from cluster`);
    this.emit('node-removed', { nodeId });
  }

  /**
   * Begins a distributed transaction
   */
  async beginDistributedTransaction(
    transactionId: string,
    participantNodes: string[]
  ): Promise<string> {
    if (!this.isCoordinator) {
      throw new Error('Only coordinator can begin distributed transactions');
    }

    // Validate all participants are available
    for (const nodeId of participantNodes) {
      const node = this.nodes.get(nodeId);
      if (!node || node.status !== 'active') {
        throw new Error(`Participant node ${nodeId} is not available`);
      }
    }

    // Create local transaction
    const localTxId = await this.transactionManager.beginTransaction(transactionId, {
      distributed: true,
      timeout: 60000 // 1 minute for distributed transactions
    });

    // Create distributed transaction
    const distributedTx: DistributedTransaction = {
      ...(await this.getTransactionInfo(localTxId)),
      coordinatorId: this.nodeId,
      participantNodes: new Set(participantNodes),
      votes: new Map(),
      phase: 'preparing'
    };

    this.distributedTransactions.set(transactionId, distributedTx);

    // Add to each participant's transaction set
    for (const nodeId of participantNodes) {
      const node = this.nodes.get(nodeId);
      if (node) {
        node.transactions.add(transactionId);
      }
    }

    console.log(`🔄 Started distributed transaction ${transactionId} with ${participantNodes.length} participants`);
    this.emit('distributed-transaction-started', { transactionId, participants: participantNodes });

    return transactionId;
  }

  /**
   * Commits a distributed transaction using 2PC
   */
  async commitDistributedTransaction(transactionId: string): Promise<void> {
    const dtx = this.distributedTransactions.get(transactionId);
    if (!dtx) {
      throw new Error(`Distributed transaction ${transactionId} not found`);
    }

    if (!this.isCoordinator || dtx.coordinatorId !== this.nodeId) {
      throw new Error('Only the coordinator can commit distributed transactions');
    }

    try {
      console.log(`🔄 Starting 2PC for transaction ${transactionId}`);
      
      // Phase 1: Prepare
      dtx.phase = 'preparing';
      const prepareSuccess = await this.sendPreparePhase(dtx);
      
      if (!prepareSuccess) {
        dtx.phase = 'aborting';
        await this.sendAbortPhase(dtx);
        throw new Error('Prepare phase failed - transaction aborted');
      }

      // Phase 2: Commit
      dtx.phase = 'committing';
      await this.sendCommitPhase(dtx);
      
      // Commit locally
      await this.transactionManager.commitTransaction(dtx.id);
      
      dtx.phase = 'completed';
      dtx.state = 'committed';

      console.log(`✅ Distributed transaction ${transactionId} committed successfully`);
      this.emit('distributed-transaction-committed', { transactionId });

    } catch (error) {
      console.error(`❌ Distributed transaction ${transactionId} commit failed:`, error);
      await this.abortDistributedTransaction(transactionId);
      throw error;
    } finally {
      this.cleanupDistributedTransaction(transactionId);
    }
  }

  /**
   * Aborts a distributed transaction
   */
  async abortDistributedTransaction(transactionId: string): Promise<void> {
    const dtx = this.distributedTransactions.get(transactionId);
    if (!dtx) {
      console.warn(`Distributed transaction ${transactionId} not found for abort`);
      return;
    }

    try {
      console.log(`🔄 Aborting distributed transaction ${transactionId}`);
      
      dtx.phase = 'aborting';
      
      // Send abort to all participants
      await this.sendAbortPhase(dtx);
      
      // Abort locally
      await this.transactionManager.abortTransaction(dtx.id, 'Distributed transaction abort');
      
      dtx.phase = 'completed';
      dtx.state = 'aborted';

      console.log(`❌ Distributed transaction ${transactionId} aborted`);
      this.emit('distributed-transaction-aborted', { transactionId });

    } catch (error) {
      console.error(`Error during distributed transaction abort:`, error);
    } finally {
      this.cleanupDistributedTransaction(transactionId);
    }
  }

  /**
   * Handles incoming coordination messages
   */
  async handleMessage(message: CoordinationMessage): Promise<void> {
    const handler = this.messageHandlers.get(message.type);
    if (handler) {
      try {
        await handler(message);
      } catch (error) {
        console.error(`Error handling ${message.type} message:`, error);
      }
    } else {
      console.warn(`Unknown message type: ${message.type}`);
    }
  }

  /**
   * Sends prepare phase messages to all participants
   */
  private async sendPreparePhase(dtx: DistributedTransaction): Promise<boolean> {
    const preparePromises = Array.from(dtx.participantNodes).map(nodeId =>
      this.sendMessage(nodeId, {
        type: 'PREPARE',
        transactionId: dtx.id,
        senderId: this.nodeId,
        timestamp: Date.now()
      })
    );

    // Wait for all responses with timeout
    const timeout = new Promise(resolve => setTimeout(() => resolve(false), 30000));
    const prepareResults = await Promise.race([
      Promise.allSettled(preparePromises),
      timeout
    ]);

    if (prepareResults === false) {
      console.error('Prepare phase timed out');
      return false;
    }

    // Check if all participants voted commit
    const allCommit = Array.from(dtx.votes.values()).every(vote => vote === 'commit');
    const allResponded = dtx.votes.size === dtx.participantNodes.size;

    return allCommit && allResponded;
  }

  /**
   * Sends commit phase messages to all participants
   */
  private async sendCommitPhase(dtx: DistributedTransaction): Promise<void> {
    const commitPromises = Array.from(dtx.participantNodes).map(nodeId =>
      this.sendMessage(nodeId, {
        type: 'COMMIT',
        transactionId: dtx.id,
        senderId: this.nodeId,
        timestamp: Date.now()
      })
    );

    // Fire and forget - participants must commit
    await Promise.allSettled(commitPromises);
  }

  /**
   * Sends abort phase messages to all participants
   */
  private async sendAbortPhase(dtx: DistributedTransaction): Promise<void> {
    const abortPromises = Array.from(dtx.participantNodes).map(nodeId =>
      this.sendMessage(nodeId, {
        type: 'ABORT',
        transactionId: dtx.id,
        senderId: this.nodeId,
        timestamp: Date.now()
      })
    );

    await Promise.allSettled(abortPromises);
  }

  /**
   * Starts coordinator election process
   */
  private async startCoordinatorElection(): Promise<void> {
    if (this.election) {
      return; // Election already in progress
    }

    console.log(`🗳️  Starting coordinator election from node ${this.nodeId}`);
    
    this.election = {
      candidateId: this.nodeId,
      term: this.currentTerm + 1,
      votes: new Set([this.nodeId]), // Vote for self
      startTime: Date.now()
    };

    // Send election requests to all nodes
    const electionPromises = Array.from(this.nodes.keys())
      .filter(nodeId => nodeId !== this.nodeId)
      .map(nodeId => this.requestVote(nodeId, this.election!.term));

    // Wait for responses
    await Promise.allSettled(electionPromises);

    // Check if won election
    const majorityNeeded = Math.floor(this.nodes.size / 2) + 1;
    if (this.election.votes.size >= majorityNeeded) {
      await this.becomeCoordinator();
    } else {
      console.log(`❌ Election failed: ${this.election.votes.size}/${majorityNeeded} votes`);
      this.election = null;
    }
  }

  /**
   * Becomes the cluster coordinator
   */
  private async becomeCoordinator(): Promise<void> {
    this.isCoordinator = true;
    this.coordinatorId = this.nodeId;
    this.currentTerm = this.election?.term || this.currentTerm + 1;
    
    // Update own role
    const selfNode = this.nodes.get(this.nodeId);
    if (selfNode) {
      selfNode.role = 'coordinator';
    }

    // Announce leadership
    await this.announceLeadership();
    
    console.log(`👑 Node ${this.nodeId} became coordinator for term ${this.currentTerm}`);
    this.emit('coordinator-elected', { nodeId: this.nodeId, term: this.currentTerm });
    
    this.election = null;
  }

  /**
   * Handles coordinator failure and recovery
   */
  private async handleCoordinatorFailure(transactionId: string): Promise<void> {
    const dtx = this.distributedTransactions.get(transactionId);
    if (!dtx) return;

    console.log(`🚨 Coordinator failure detected for transaction ${transactionId}`);

    // Determine recovery strategy based on transaction phase
    let recoveryStrategy: 'commit' | 'abort' | 'inquiry';
    
    if (dtx.phase === 'preparing') {
      // If still in prepare phase, abort
      recoveryStrategy = 'abort';
    } else if (dtx.phase === 'committing') {
      // If in commit phase, commit
      recoveryStrategy = 'commit';
    } else {
      // Uncertain state, need inquiry
      recoveryStrategy = 'inquiry';
    }

    await this.executeRecovery(transactionId, recoveryStrategy);
  }

  /**
   * Handles participant failure
   */
  private async handleParticipantFailure(transactionId: string, nodeId: string): Promise<void> {
    const dtx = this.distributedTransactions.get(transactionId);
    if (!dtx) return;

    console.log(`🚨 Participant ${nodeId} failed for transaction ${transactionId}`);

    // Remove failed participant from transaction
    dtx.participantNodes.delete(nodeId);
    dtx.votes.delete(nodeId);

    // If we're in prepare phase and don't have enough votes, abort
    if (dtx.phase === 'preparing') {
      const remainingVotes = Array.from(dtx.votes.values()).filter(v => v === 'commit').length;
      const requiredVotes = dtx.participantNodes.size;
      
      if (remainingVotes < requiredVotes) {
        await this.abortDistributedTransaction(transactionId);
      }
    }
  }

  /**
   * Executes transaction recovery
   */
  private async executeRecovery(transactionId: string, strategy: 'commit' | 'abort' | 'inquiry'): Promise<void> {
    console.log(`🔄 Executing ${strategy} recovery for transaction ${transactionId}`);

    switch (strategy) {
      case 'commit':
        await this.commitDistributedTransaction(transactionId);
        break;
      case 'abort':
        await this.abortDistributedTransaction(transactionId);
        break;
      case 'inquiry':
        await this.performInquiryRecovery(transactionId);
        break;
    }
  }

  /**
   * Performs inquiry-based recovery
   */
  private async performInquiryRecovery(transactionId: string): Promise<void> {
    const dtx = this.distributedTransactions.get(transactionId);
    if (!dtx) return;

    // Query all participants about transaction state
    const inquiryPromises = Array.from(dtx.participantNodes).map(nodeId =>
      this.sendMessage(nodeId, {
        type: 'RECOVERY',
        transactionId,
        senderId: this.nodeId,
        timestamp: Date.now()
      })
    );

    const responses = await Promise.allSettled(inquiryPromises);
    
    // Analyze responses to determine action
    const commitResponses = responses.filter(r => 
      r.status === 'fulfilled' && r.value === 'committed'
    ).length;

    const abortResponses = responses.filter(r => 
      r.status === 'fulfilled' && r.value === 'aborted'
    ).length;

    if (commitResponses > 0) {
      // If any participant committed, we must commit
      await this.commitDistributedTransaction(transactionId);
    } else {
      // Otherwise, abort
      await this.abortDistributedTransaction(transactionId);
    }
  }

  /**
   * Initializes message handlers
   */
  private initializeMessageHandlers(): void {
    this.messageHandlers.set('PREPARE', async (message) => {
      const canCommit = await this.handlePrepareMessage(message);
      await this.sendMessage(message.senderId, {
        type: canCommit ? 'VOTE_COMMIT' : 'VOTE_ABORT',
        transactionId: message.transactionId,
        senderId: this.nodeId,
        timestamp: Date.now()
      });
    });

    this.messageHandlers.set('COMMIT', async (message) => {
      await this.handleCommitMessage(message);
    });

    this.messageHandlers.set('ABORT', async (message) => {
      await this.handleAbortMessage(message);
    });

    this.messageHandlers.set('VOTE_COMMIT', async (message) => {
      const dtx = this.distributedTransactions.get(message.transactionId);
      if (dtx) {
        dtx.votes.set(message.senderId, 'commit');
      }
    });

    this.messageHandlers.set('VOTE_ABORT', async (message) => {
      const dtx = this.distributedTransactions.get(message.transactionId);
      if (dtx) {
        dtx.votes.set(message.senderId, 'abort');
      }
    });

    this.messageHandlers.set('HEARTBEAT', async (message) => {
      const node = this.nodes.get(message.senderId);
      if (node) {
        node.lastHeartbeat = Date.now();
        node.status = 'active';
      }
    });

    this.messageHandlers.set('RECOVERY', async (message) => {
      await this.handleRecoveryMessage(message);
    });
  }

  /**
   * Handles prepare message from coordinator
   */
  private async handlePrepareMessage(message: CoordinationMessage): Promise<boolean> {
    try {
      // Check if we can commit this transaction
      const localTx = await this.getTransactionInfo(message.transactionId);
      return localTx && localTx.state === 'active';
    } catch {
      return false;
    }
  }

  /**
   * Handles commit message from coordinator
   */
  private async handleCommitMessage(message: CoordinationMessage): Promise<void> {
    try {
      await this.transactionManager.commitTransaction(message.transactionId);
    } catch (error) {
      console.error(`Failed to commit transaction ${message.transactionId}:`, error);
    }
  }

  /**
   * Handles abort message from coordinator
   */
  private async handleAbortMessage(message: CoordinationMessage): Promise<void> {
    try {
      await this.transactionManager.abortTransaction(message.transactionId, 'Coordinator abort');
    } catch (error) {
      console.error(`Failed to abort transaction ${message.transactionId}:`, error);
    }
  }

  /**
   * Handles recovery message
   */
  private async handleRecoveryMessage(message: CoordinationMessage): Promise<void> {
    try {
      const tx = await this.getTransactionInfo(message.transactionId);
      const response = tx ? tx.state : 'unknown';
      
      await this.sendMessage(message.senderId, {
        type: 'RECOVERY',
        transactionId: message.transactionId,
        senderId: this.nodeId,
        timestamp: Date.now(),
        data: response
      });
    } catch (error) {
      console.error(`Recovery inquiry failed for ${message.transactionId}:`, error);
    }
  }

  /**
   * Sends a message to a node (simulated)
   */
  private async sendMessage(nodeId: string, message: CoordinationMessage): Promise<any> {
    const node = this.nodes.get(nodeId);
    if (!node || node.status !== 'active') {
      throw new Error(`Node ${nodeId} is not available`);
    }

    // Simulate network delay and potential failures
    const delay = Math.random() * 100; // 0-100ms delay
    await new Promise(resolve => setTimeout(resolve, delay));

    // Simulate 5% message loss
    if (Math.random() < 0.05) {
      throw new Error(`Message to ${nodeId} lost`);
    }

    console.log(`📤 Sent ${message.type} to ${nodeId} for transaction ${message.transactionId}`);
    return 'success';
  }

  /**
   * Sends cluster information to a node
   */
  private async sendClusterInfo(nodeId: string): Promise<void> {
    // Send current cluster state to new node
    const clusterInfo = {
      nodes: Array.from(this.nodes.values()),
      coordinatorId: this.coordinatorId,
      term: this.currentTerm
    };

    console.log(`📋 Sending cluster info to ${nodeId}`);
  }

  /**
   * Requests vote for coordinator election
   */
  private async requestVote(nodeId: string, term: number): Promise<boolean> {
    try {
      // Simulate vote request
      console.log(`🗳️  Requesting vote from ${nodeId} for term ${term}`);
      
      // Simple simulation - nodes vote for first candidate
      if (this.election) {
        this.election.votes.add(nodeId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  }

  /**
   * Announces leadership to all nodes
   */
  private async announceLeadership(): Promise<void> {
    const announcements = Array.from(this.nodes.keys())
      .filter(nodeId => nodeId !== this.nodeId)
      .map(nodeId => this.sendMessage(nodeId, {
        type: 'HEARTBEAT',
        transactionId: '',
        senderId: this.nodeId,
        timestamp: Date.now(),
        data: { term: this.currentTerm, role: 'coordinator' }
      }));

    await Promise.allSettled(announcements);
  }

  /**
   * Starts heartbeat process
   */
  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      if (this.isCoordinator) {
        // Send heartbeats to all participants
        for (const nodeId of this.nodes.keys()) {
          if (nodeId !== this.nodeId) {
            this.sendMessage(nodeId, {
              type: 'HEARTBEAT',
              transactionId: '',
              senderId: this.nodeId,
              timestamp: Date.now()
            }).catch(() => {
              // Ignore heartbeat failures
            });
          }
        }
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Starts failure detection process
   */
  private startFailureDetection(): void {
    this.failureDetectionInterval = setInterval(() => {
      const now = Date.now();
      const failedNodes = [];

      for (const [nodeId, node] of this.nodes) {
        if (nodeId !== this.nodeId && 
            now - node.lastHeartbeat > this.config.failureTimeout && 
            node.status === 'active') {
          node.status = 'failed';
          failedNodes.push(nodeId);
        }
      }

      // Handle failed nodes
      for (const nodeId of failedNodes) {
        this.removeNode(nodeId).catch(error => {
          console.error(`Error removing failed node ${nodeId}:`, error);
        });
      }
    }, this.config.heartbeatInterval);
  }

  /**
   * Gets transaction information from local manager
   */
  private async getTransactionInfo(transactionId: string): Promise<Transaction | null> {
    // This would interface with the local transaction manager
    // Simplified for demonstration
    return null;
  }

  /**
   * Cleans up distributed transaction
   */
  private cleanupDistributedTransaction(transactionId: string): void {
    this.distributedTransactions.delete(transactionId);
    
    // Remove from all node transaction sets
    for (const node of this.nodes.values()) {
      node.transactions.delete(transactionId);
    }
  }

  /**
   * Gets cluster status
   */
  getClusterStatus(): {
    nodeId: string;
    isCoordinator: boolean;
    coordinatorId: string | null;
    term: number;
    nodes: DistributedNode[];
    activeTransactions: number;
  } {
    return {
      nodeId: this.nodeId,
      isCoordinator: this.isCoordinator,
      coordinatorId: this.coordinatorId,
      term: this.currentTerm,
      nodes: Array.from(this.nodes.values()),
      activeTransactions: this.distributedTransactions.size
    };
  }

  /**
   * Shuts down the distributed coordinator
   */
  async shutdown(): Promise<void> {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }
    
    if (this.failureDetectionInterval) {
      clearInterval(this.failureDetectionInterval);
    }

    // Abort all active distributed transactions
    const activeTxs = Array.from(this.distributedTransactions.keys());
    for (const txId of activeTxs) {
      await this.abortDistributedTransaction(txId);
    }

    this.removeAllListeners();
    console.log(`🛑 Distributed Coordinator ${this.nodeId} shutdown complete`);
  }
}