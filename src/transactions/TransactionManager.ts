/**
 * TransactionManager - Full ACID Transaction Management
 * 
 * Provides comprehensive transaction management with ACID compliance,
 * rollback capabilities, isolation levels, deadlock detection, and
 * distributed coordination across multiple components.
 */

import { EventEmitter } from 'events';

export interface Transaction {
  id: string;
  state: 'active' | 'committed' | 'aborted' | 'preparing' | 'prepared';
  isolationLevel: IsolationLevel;
  readSet: Set<string>;
  writeSet: Map<string, any>;
  locks: Set<string>;
  startTime: number;
  timeout: number;
  savepoints: Map<string, SavePoint>;
  participants: Set<string>; // For distributed transactions
}

export interface SavePoint {
  name: string;
  readSet: Set<string>;
  writeSet: Map<string, any>;
  locks: Set<string>;
  timestamp: number;
}

export interface TransactionOptions {
  isolationLevel?: IsolationLevel;
  timeout?: number;
  readOnly?: boolean;
  distributed?: boolean;
  autoRetry?: boolean;
  maxRetries?: number;
}

export interface LockInfo {
  resource: string;
  type: 'shared' | 'exclusive';
  holder: string;
  granted: boolean;
  waitingTransactions: string[];
}

export type IsolationLevel = 
  | 'READ_UNCOMMITTED' 
  | 'READ_COMMITTED' 
  | 'REPEATABLE_READ' 
  | 'SERIALIZABLE';

export interface TransactionStats {
  totalTransactions: number;
  committedTransactions: number;
  abortedTransactions: number;
  deadlockCount: number;
  averageDuration: number;
  activeTransactions: number;
  lockConflicts: number;
}

export interface DeadlockInfo {
  cycle: string[];
  detectionTime: number;
  victimTransaction: string;
  reason: string;
}

export class TransactionManager extends EventEmitter {
  private transactions: Map<string, Transaction> = new Map();
  private lockTable: Map<string, LockInfo> = new Map();
  private waitForGraph: Map<string, Set<string>> = new Map();
  private stats: TransactionStats;
  private deadlockDetectionInterval: NodeJS.Timeout | null = null;
  
  private defaultOptions: Required<TransactionOptions> = {
    isolationLevel: 'READ_COMMITTED',
    timeout: 30000, // 30 seconds
    readOnly: false,
    distributed: false,
    autoRetry: true,
    maxRetries: 3
  };

  constructor() {
    super();
    this.resetStats();
    this.startDeadlockDetection();
  }

  /**
   * Begins a new transaction
   */
  async beginTransaction(
    id?: string,
    options?: TransactionOptions
  ): Promise<string> {
    const transactionId = id || this.generateTransactionId();
    const opts = { ...this.defaultOptions, ...options };

    if (this.transactions.has(transactionId)) {
      throw new Error(`Transaction ${transactionId} already exists`);
    }

    const transaction: Transaction = {
      id: transactionId,
      state: 'active',
      isolationLevel: opts.isolationLevel,
      readSet: new Set(),
      writeSet: new Map(),
      locks: new Set(),
      startTime: Date.now(),
      timeout: opts.timeout,
      savepoints: new Map(),
      participants: new Set()
    };

    this.transactions.set(transactionId, transaction);
    this.waitForGraph.set(transactionId, new Set());
    
    // Set timeout for automatic abort
    setTimeout(() => {
      if (this.transactions.get(transactionId)?.state === 'active') {
        this.abortTransaction(transactionId, 'Transaction timeout');
      }
    }, opts.timeout);

    console.log(`🔄 Transaction ${transactionId} started with ${opts.isolationLevel} isolation`);
    this.emit('transaction-started', { transactionId, options: opts });
    
    return transactionId;
  }

  /**
   * Commits a transaction with two-phase commit for distributed transactions
   */
  async commitTransaction(transactionId: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      throw new Error(`Transaction ${transactionId} not found`);
    }

    if (transaction.state !== 'active') {
      throw new Error(`Cannot commit transaction ${transactionId} in state ${transaction.state}`);
    }

    try {
      console.log(`🔒 Committing transaction ${transactionId}...`);
      
      // Distributed transaction handling
      if (transaction.participants.size > 0) {
        await this.twoPhaseCommit(transaction);
      } else {
        // Local transaction commit
        await this.performLocalCommit(transaction);
      }

      transaction.state = 'committed';
      this.releaseLocks(transactionId);
      
      // Update statistics
      this.stats.committedTransactions++;
      this.updateAverageDuration(transaction);

      console.log(`✅ Transaction ${transactionId} committed successfully`);
      this.emit('transaction-committed', { 
        transactionId, 
        duration: Date.now() - transaction.startTime 
      });

    } catch (error) {
      console.error(`❌ Commit failed for transaction ${transactionId}:`, error);
      await this.abortTransaction(transactionId, error.message);
      throw error;
    } finally {
      this.cleanup(transactionId);
    }
  }

  /**
   * Aborts a transaction and performs rollback
   */
  async abortTransaction(transactionId: string, reason?: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) {
      console.warn(`Transaction ${transactionId} not found for abort`);
      return;
    }

    if (transaction.state === 'committed' || transaction.state === 'aborted') {
      return; // Already finalized
    }

    try {
      console.log(`🔄 Aborting transaction ${transactionId}: ${reason || 'Manual abort'}`);
      
      transaction.state = 'aborted';
      
      // Perform rollback
      await this.performRollback(transaction);
      
      // Release all locks
      this.releaseLocks(transactionId);
      
      // Update statistics
      this.stats.abortedTransactions++;

      console.log(`❌ Transaction ${transactionId} aborted`);
      this.emit('transaction-aborted', { transactionId, reason });

    } catch (error) {
      console.error(`Error during abort of transaction ${transactionId}:`, error);
    } finally {
      this.cleanup(transactionId);
    }
  }

  /**
   * Creates a savepoint within a transaction
   */
  async createSavepoint(transactionId: string, name: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Cannot create savepoint in transaction ${transactionId}`);
    }

    const savepoint: SavePoint = {
      name,
      readSet: new Set(transaction.readSet),
      writeSet: new Map(transaction.writeSet),
      locks: new Set(transaction.locks),
      timestamp: Date.now()
    };

    transaction.savepoints.set(name, savepoint);
    
    console.log(`📍 Savepoint '${name}' created in transaction ${transactionId}`);
    this.emit('savepoint-created', { transactionId, savepoint: name });
  }

  /**
   * Rolls back to a specific savepoint
   */
  async rollbackToSavepoint(transactionId: string, name: string): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Cannot rollback to savepoint in transaction ${transactionId}`);
    }

    const savepoint = transaction.savepoints.get(name);
    if (!savepoint) {
      throw new Error(`Savepoint '${name}' not found in transaction ${transactionId}`);
    }

    try {
      // Rollback write operations since savepoint
      for (const [resource, value] of transaction.writeSet) {
        if (!savepoint.writeSet.has(resource)) {
          await this.rollbackWrite(resource, value);
          transaction.writeSet.delete(resource);
        }
      }

      // Release locks acquired after savepoint
      for (const lockResource of transaction.locks) {
        if (!savepoint.locks.has(lockResource)) {
          this.releaseLock(lockResource, transactionId);
          transaction.locks.delete(lockResource);
        }
      }

      // Restore sets to savepoint state
      transaction.readSet = new Set(savepoint.readSet);
      transaction.writeSet = new Map(savepoint.writeSet);
      transaction.locks = new Set(savepoint.locks);

      // Remove savepoints created after this one
      for (const [spName, sp] of transaction.savepoints) {
        if (sp.timestamp > savepoint.timestamp) {
          transaction.savepoints.delete(spName);
        }
      }

      console.log(`🔄 Rolled back to savepoint '${name}' in transaction ${transactionId}`);
      this.emit('savepoint-rollback', { transactionId, savepoint: name });

    } catch (error) {
      console.error(`Failed to rollback to savepoint '${name}':`, error);
      throw error;
    }
  }

  /**
   * Acquires a lock on a resource
   */
  async acquireLock(
    transactionId: string,
    resource: string,
    lockType: 'shared' | 'exclusive'
  ): Promise<boolean> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Cannot acquire lock for transaction ${transactionId}`);
    }

    const existingLock = this.lockTable.get(resource);
    
    if (!existingLock) {
      // No existing lock, grant immediately
      this.lockTable.set(resource, {
        resource,
        type: lockType,
        holder: transactionId,
        granted: true,
        waitingTransactions: []
      });
      
      transaction.locks.add(resource);
      return true;
    }

    // Check compatibility
    if (this.isLockCompatible(existingLock, lockType, transactionId)) {
      if (existingLock.type === 'shared' && lockType === 'shared') {
        // Multiple shared locks are allowed
        existingLock.holder += `,${transactionId}`;
        transaction.locks.add(resource);
        return true;
      }
      
      if (existingLock.holder === transactionId) {
        // Lock upgrade/downgrade
        existingLock.type = lockType;
        return true;
      }
    }

    // Lock conflict - add to wait queue
    existingLock.waitingTransactions.push(transactionId);
    this.updateWaitForGraph(transactionId, existingLock.holder);

    // Check for deadlock
    const deadlock = this.detectDeadlock(transactionId);
    if (deadlock) {
      this.resolveDeadlock(deadlock);
      return false;
    }

    // Wait for lock (simplified - in production would use proper queuing)
    console.log(`⏳ Transaction ${transactionId} waiting for ${lockType} lock on ${resource}`);
    this.stats.lockConflicts++;
    
    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.removeFromWaitQueue(resource, transactionId);
        reject(new Error(`Lock timeout for resource ${resource}`));
      }, 5000);

      const checkLock = () => {
        const currentLock = this.lockTable.get(resource);
        if (!currentLock || this.isLockCompatible(currentLock, lockType, transactionId)) {
          clearTimeout(timeout);
          this.grantLock(resource, transactionId, lockType);
          resolve(true);
        } else {
          setTimeout(checkLock, 100); // Check every 100ms
        }
      };

      checkLock();
    });
  }

  /**
   * Reads a resource with appropriate isolation level handling
   */
  async read(transactionId: string, resource: string): Promise<any> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Cannot read for transaction ${transactionId}`);
    }

    // Acquire appropriate read lock based on isolation level
    let lockAcquired = true;
    
    switch (transaction.isolationLevel) {
      case 'READ_UNCOMMITTED':
        // No locks needed
        break;
      case 'READ_COMMITTED':
      case 'REPEATABLE_READ':
      case 'SERIALIZABLE':
        lockAcquired = await this.acquireLock(transactionId, resource, 'shared');
        break;
    }

    if (!lockAcquired) {
      throw new Error(`Failed to acquire read lock for resource ${resource}`);
    }

    // Record in read set for conflict detection
    transaction.readSet.add(resource);

    // Simulate reading the resource
    const value = await this.performRead(resource);
    
    // Release lock immediately for READ_COMMITTED
    if (transaction.isolationLevel === 'READ_COMMITTED') {
      this.releaseLock(resource, transactionId);
    }

    console.log(`📖 Transaction ${transactionId} read resource ${resource}`);
    this.emit('resource-read', { transactionId, resource, value });
    
    return value;
  }

  /**
   * Writes a resource with appropriate lock handling
   */
  async write(transactionId: string, resource: string, value: any): Promise<void> {
    const transaction = this.transactions.get(transactionId);
    if (!transaction || transaction.state !== 'active') {
      throw new Error(`Cannot write for transaction ${transactionId}`);
    }

    // Acquire exclusive lock
    const lockAcquired = await this.acquireLock(transactionId, resource, 'exclusive');
    if (!lockAcquired) {
      throw new Error(`Failed to acquire write lock for resource ${resource}`);
    }

    // Store original value for rollback
    if (!transaction.writeSet.has(resource)) {
      const originalValue = await this.performRead(resource);
      transaction.writeSet.set(resource, { original: originalValue, new: value });
    } else {
      // Update the new value, keep original for rollback
      const existing = transaction.writeSet.get(resource);
      existing.new = value;
    }

    // Perform the write (buffered until commit)
    await this.performWrite(resource, value);

    console.log(`✏️  Transaction ${transactionId} wrote to resource ${resource}`);
    this.emit('resource-written', { transactionId, resource, value });
  }

  /**
   * Two-phase commit for distributed transactions
   */
  private async twoPhaseCommit(transaction: Transaction): Promise<void> {
    console.log(`🔄 Starting two-phase commit for transaction ${transaction.id}`);
    
    // Phase 1: Prepare
    transaction.state = 'preparing';
    const preparePromises = Array.from(transaction.participants).map(participant =>
      this.sendPrepareMessage(transaction.id, participant)
    );

    const prepareResults = await Promise.allSettled(preparePromises);
    const allPrepared = prepareResults.every(result => 
      result.status === 'fulfilled' && result.value === true
    );

    if (!allPrepared) {
      throw new Error('Prepare phase failed - aborting transaction');
    }

    transaction.state = 'prepared';
    
    // Phase 2: Commit
    const commitPromises = Array.from(transaction.participants).map(participant =>
      this.sendCommitMessage(transaction.id, participant)
    );

    await Promise.allSettled(commitPromises);
    
    // Local commit
    await this.performLocalCommit(transaction);
    
    console.log(`✅ Two-phase commit completed for transaction ${transaction.id}`);
  }

  /**
   * Detects deadlocks in the wait-for graph
   */
  private detectDeadlock(startTransaction: string): DeadlockInfo | null {
    const visited = new Set<string>();
    const path = new Set<string>();
    
    const dfs = (current: string): string[] | null => {
      if (path.has(current)) {
        // Cycle detected
        return [current];
      }
      
      if (visited.has(current)) {
        return null;
      }

      visited.add(current);
      path.add(current);

      const waitingFor = this.waitForGraph.get(current);
      if (waitingFor) {
        for (const next of waitingFor) {
          const cycle = dfs(next);
          if (cycle) {
            if (cycle[0] === current) {
              // Complete cycle found
              return cycle;
            } else {
              cycle.unshift(current);
              return cycle;
            }
          }
        }
      }

      path.delete(current);
      return null;
    };

    const cycle = dfs(startTransaction);
    
    if (cycle) {
      this.stats.deadlockCount++;
      return {
        cycle,
        detectionTime: Date.now(),
        victimTransaction: this.selectDeadlockVictim(cycle),
        reason: 'Circular wait dependency detected'
      };
    }

    return null;
  }

  /**
   * Resolves deadlock by aborting the victim transaction
   */
  private resolveDeadlock(deadlock: DeadlockInfo): void {
    console.warn(`💀 Deadlock detected: ${deadlock.cycle.join(' → ')}`);
    console.log(`🎯 Aborting victim transaction: ${deadlock.victimTransaction}`);
    
    this.abortTransaction(deadlock.victimTransaction, 'Deadlock victim');
    
    this.emit('deadlock-resolved', deadlock);
  }

  /**
   * Selects victim for deadlock resolution (youngest transaction)
   */
  private selectDeadlockVictim(cycle: string[]): string {
    let victim = cycle[0];
    let latestStartTime = 0;

    for (const txId of cycle) {
      const tx = this.transactions.get(txId);
      if (tx && tx.startTime > latestStartTime) {
        latestStartTime = tx.startTime;
        victim = txId;
      }
    }

    return victim;
  }

  /**
   * Checks if lock types are compatible
   */
  private isLockCompatible(
    existingLock: LockInfo,
    requestedType: 'shared' | 'exclusive',
    requesterId: string
  ): boolean {
    if (existingLock.holder === requesterId) {
      return true; // Same transaction
    }

    if (existingLock.type === 'shared' && requestedType === 'shared') {
      return true; // Multiple shared locks allowed
    }

    return false; // Exclusive locks conflict with everything
  }

  /**
   * Grants a lock to a transaction
   */
  private grantLock(resource: string, transactionId: string, lockType: 'shared' | 'exclusive'): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    this.lockTable.set(resource, {
      resource,
      type: lockType,
      holder: transactionId,
      granted: true,
      waitingTransactions: []
    });

    transaction.locks.add(resource);
    this.removeFromWaitGraph(transactionId, resource);
  }

  /**
   * Releases all locks held by a transaction
   */
  private releaseLocks(transactionId: string): void {
    const transaction = this.transactions.get(transactionId);
    if (!transaction) return;

    for (const resource of transaction.locks) {
      this.releaseLock(resource, transactionId);
    }

    transaction.locks.clear();
  }

  /**
   * Releases a specific lock
   */
  private releaseLock(resource: string, transactionId: string): void {
    const lock = this.lockTable.get(resource);
    if (!lock || !lock.holder.includes(transactionId)) return;

    if (lock.waitingTransactions.length > 0) {
      // Grant lock to next waiting transaction
      const nextTransaction = lock.waitingTransactions.shift()!;
      lock.holder = nextTransaction;
      
      const transaction = this.transactions.get(nextTransaction);
      if (transaction) {
        transaction.locks.add(resource);
      }
    } else {
      // No waiting transactions, remove lock
      this.lockTable.delete(resource);
    }

    this.removeFromWaitGraph(transactionId, resource);
  }

  /**
   * Updates the wait-for graph for deadlock detection
   */
  private updateWaitForGraph(waiter: string, holder: string): void {
    let waitSet = this.waitForGraph.get(waiter);
    if (!waitSet) {
      waitSet = new Set();
      this.waitForGraph.set(waiter, waitSet);
    }
    
    // Extract individual holders (for shared locks)
    const holders = holder.split(',');
    holders.forEach(h => waitSet!.add(h));
  }

  /**
   * Removes entries from wait-for graph
   */
  private removeFromWaitGraph(waiter: string, resource: string): void {
    const lock = this.lockTable.get(resource);
    if (lock) {
      const waitSet = this.waitForGraph.get(waiter);
      if (waitSet) {
        const holders = lock.holder.split(',');
        holders.forEach(h => waitSet.delete(h));
      }
    }
  }

  /**
   * Removes transaction from waiting queue
   */
  private removeFromWaitQueue(resource: string, transactionId: string): void {
    const lock = this.lockTable.get(resource);
    if (lock) {
      const index = lock.waitingTransactions.indexOf(transactionId);
      if (index > -1) {
        lock.waitingTransactions.splice(index, 1);
      }
    }
  }

  /**
   * Performs the actual read operation (to be implemented by subclasses)
   */
  protected async performRead(resource: string): Promise<any> {
    // Simulate read operation - override in implementation
    return `value_of_${resource}`;
  }

  /**
   * Performs the actual write operation (to be implemented by subclasses)
   */
  protected async performWrite(resource: string, value: any): Promise<void> {
    // Simulate write operation - override in implementation
    console.log(`Writing ${value} to ${resource}`);
  }

  /**
   * Performs rollback of a write operation
   */
  protected async rollbackWrite(resource: string, originalValue: any): Promise<void> {
    // Simulate rollback - override in implementation
    console.log(`Rolling back ${resource} to ${originalValue}`);
  }

  /**
   * Performs local commit operations
   */
  protected async performLocalCommit(transaction: Transaction): Promise<void> {
    // Apply all writes permanently
    for (const [resource, { new: newValue }] of transaction.writeSet) {
      await this.performWrite(resource, newValue);
    }
  }

  /**
   * Performs rollback operations for aborted transaction
   */
  private async performRollback(transaction: Transaction): Promise<void> {
    // Rollback all write operations
    for (const [resource, { original }] of transaction.writeSet) {
      await this.rollbackWrite(resource, original);
    }
  }

  /**
   * Sends prepare message to participant (for distributed transactions)
   */
  private async sendPrepareMessage(transactionId: string, participant: string): Promise<boolean> {
    // Simulate network call to participant
    console.log(`📤 Sending PREPARE to ${participant} for transaction ${transactionId}`);
    return true; // Simulate success
  }

  /**
   * Sends commit message to participant (for distributed transactions)
   */
  private async sendCommitMessage(transactionId: string, participant: string): Promise<void> {
    // Simulate network call to participant
    console.log(`📤 Sending COMMIT to ${participant} for transaction ${transactionId}`);
  }

  /**
   * Starts deadlock detection background process
   */
  private startDeadlockDetection(): void {
    this.deadlockDetectionInterval = setInterval(() => {
      for (const [txId] of this.transactions) {
        const deadlock = this.detectDeadlock(txId);
        if (deadlock) {
          this.resolveDeadlock(deadlock);
          break; // Only resolve one deadlock at a time
        }
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Generates unique transaction ID
   */
  private generateTransactionId(): string {
    return `tx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Cleans up transaction resources
   */
  private cleanup(transactionId: string): void {
    this.transactions.delete(transactionId);
    this.waitForGraph.delete(transactionId);
  }

  /**
   * Updates average duration statistics
   */
  private updateAverageDuration(transaction: Transaction): void {
    const duration = Date.now() - transaction.startTime;
    const total = this.stats.committedTransactions + this.stats.abortedTransactions;
    this.stats.averageDuration = ((this.stats.averageDuration * (total - 1)) + duration) / total;
  }

  /**
   * Resets all statistics
   */
  private resetStats(): void {
    this.stats = {
      totalTransactions: 0,
      committedTransactions: 0,
      abortedTransactions: 0,
      deadlockCount: 0,
      averageDuration: 0,
      activeTransactions: 0,
      lockConflicts: 0
    };
  }

  /**
   * Gets comprehensive transaction statistics
   */
  getStatistics(): TransactionStats {
    this.stats.totalTransactions = this.stats.committedTransactions + this.stats.abortedTransactions;
    this.stats.activeTransactions = this.transactions.size;
    return { ...this.stats };
  }

  /**
   * Gets information about active transactions
   */
  getActiveTransactions(): Array<{ id: string; state: string; duration: number; locks: number }> {
    const active = [];
    const now = Date.now();
    
    for (const [id, tx] of this.transactions) {
      active.push({
        id,
        state: tx.state,
        duration: now - tx.startTime,
        locks: tx.locks.size
      });
    }
    
    return active;
  }

  /**
   * Gets current lock table information
   */
  getLockTable(): LockInfo[] {
    return Array.from(this.lockTable.values());
  }

  /**
   * Shuts down the transaction manager
   */
  async shutdown(): Promise<void> {
    if (this.deadlockDetectionInterval) {
      clearInterval(this.deadlockDetectionInterval);
    }

    // Abort all active transactions
    const activeTransactions = Array.from(this.transactions.keys());
    for (const txId of activeTransactions) {
      await this.abortTransaction(txId, 'System shutdown');
    }

    this.removeAllListeners();
    console.log('🛑 Transaction Manager shutdown complete');
  }
}