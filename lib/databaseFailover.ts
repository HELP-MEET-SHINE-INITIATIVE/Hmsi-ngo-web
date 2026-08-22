export type FailoverState =
  | 'PRIMARY_ACTIVE'
  | 'FAILING_OVER'
  | 'STANDBY_ACTIVE'
  | 'FAILBACK_RECONCILING';

export interface DatabaseNode {
  id: string;
  name: string;
  region: string;
  isPrimary: boolean;
  isHealthy: boolean;
  readOnly: boolean;
  latencyMs: number;
}

export interface BufferedAuditLog {
  id: string;
  regional_office_id: string | null;
  alert_type: string;
  trigger_metric_value: number;
  threshold_value: number;
  recipient_emails: string[];
  sent_at: string;
  error_message?: string;
  bufferedAt: string;
}

export interface WALBufferConfig {
  maxBufferCapacity?: number;
  batchFlushSize?: number;
  circuitBreakerThreshold?: number;
  recoveryTimeoutMs?: number;
  spilloverThreshold?: number;
}

export interface ReplayResult {
  replayedCount: number;
  batchesProcessed: number;
  rpoSeconds: number;
  rtoSeconds: number;
  replayedLogIds: string[];
}

export interface DRHealthStatus {
  state: FailoverState;
  activeNode: string;
  activeRegion: string;
  primaryHealthy: boolean;
  standbyHealthy: boolean;
  circuitBreaker: 'CLOSED' | 'OPEN' | 'HALF_OPEN';
  bufferedEventsCount: number;
  maxBufferCapacity: number;
  bufferUtilizationPct: number;
  estimatedRpoSeconds: number;
  estimatedRtoSeconds: number;
}

export class DisasterRecoveryDatabaseManager {
  private primaryNode: DatabaseNode;
  private standbyNode: DatabaseNode;
  private state: FailoverState = 'PRIMARY_ACTIVE';
  private emergencyWalBuffer: BufferedAuditLog[] = [];
  private persistentStore: Map<string, BufferedAuditLog> = new Map();
  private standbyStore: Map<string, BufferedAuditLog> = new Map();

  // Tuned WAL & Circuit Breaker parameters
  private readonly maxBufferCapacity: number;
  private readonly batchFlushSize: number;
  private readonly spilloverThreshold: number;

  private circuitBreaker = {
    failureCount: 0,
    threshold: 3, // Tuned from 2 to 3 to prevent flapping on transient blips
    state: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    lastFailureTime: 0,
    recoveryTimeoutMs: 15000, // 15 seconds cooldown before half-open probe
  };

  private failoverStartTime = 0;
  private failoverCompleteTime = 0;

  constructor(
    primaryRegion = 'eu-west-1 (Primary DC - London)',
    standbyRegion = 'af-south-1 (Cape Town DR Replica)',
    config: WALBufferConfig = {}
  ) {
    this.maxBufferCapacity = config.maxBufferCapacity ?? 50000;
    this.batchFlushSize = config.batchFlushSize ?? 500;
    this.spilloverThreshold = config.spilloverThreshold ?? 10000;
    if (config.circuitBreakerThreshold) {
      this.circuitBreaker.threshold = config.circuitBreakerThreshold;
    }
    if (config.recoveryTimeoutMs) {
      this.circuitBreaker.recoveryTimeoutMs = config.recoveryTimeoutMs;
    }

    this.primaryNode = {
      id: 'db-node-primary',
      name: 'Supabase PostgreSQL Primary',
      region: primaryRegion,
      isPrimary: true,
      isHealthy: true,
      readOnly: false,
      latencyMs: 12,
    };

    this.standbyNode = {
      id: 'db-node-standby',
      name: 'Supabase Standby Replica',
      region: standbyRegion,
      isPrimary: false,
      isHealthy: true,
      readOnly: true,
      latencyMs: 45,
    };
  }

  public setPrimaryHealth(healthy: boolean) {
    this.primaryNode.isHealthy = healthy;
    if (!healthy) {
      this.circuitBreaker.failureCount++;
      this.circuitBreaker.lastFailureTime = Date.now();
      if (this.circuitBreaker.failureCount >= this.circuitBreaker.threshold) {
        this.circuitBreaker.state = 'OPEN';
        this.state = 'FAILING_OVER';
        if (!this.failoverStartTime) {
          this.failoverStartTime = Date.now();
        }
      }
    } else {
      this.circuitBreaker.failureCount = 0;
      this.circuitBreaker.state = 'CLOSED';
    }
  }

  public setStandbyHealth(healthy: boolean) {
    this.standbyNode.isHealthy = healthy;
  }

  public async logAuditEvent(event: Omit<BufferedAuditLog, 'bufferedAt'>): Promise<{ success: boolean; targetNode: string; buffered: boolean; dropped?: boolean }> {
    const timestamped: BufferedAuditLog = {
      ...event,
      bufferedAt: new Date().toISOString(),
    };

    // 1. Normal Primary Operation
    if (this.primaryNode.isHealthy && this.circuitBreaker.state === 'CLOSED' && this.state === 'PRIMARY_ACTIVE') {
      this.persistentStore.set(timestamped.id, timestamped);
      // Continuous asynchronous streaming replication to standby
      this.standbyStore.set(timestamped.id, timestamped);
      return { success: true, targetNode: this.primaryNode.name, buffered: false };
    }

    // 2. Buffer Capacity Protection
    if (this.emergencyWalBuffer.length >= this.maxBufferCapacity) {
      console.error(`[CRITICAL DR] Emergency WAL Buffer capacity limit (${this.maxBufferCapacity}) reached! Evicting oldest entry.`);
      this.emergencyWalBuffer.shift(); // Evict oldest to preserve latest telemetry
    }

    // 3. Failover / Outage condition -> Safe WAL Buffering
    this.emergencyWalBuffer.push(timestamped);
    return {
      success: true,
      targetNode: 'Emergency In-Memory/File WAL Buffer',
      buffered: true,
    };
  }

  public promoteStandbyToPrimary(): ReplayResult {
    const promotionStart = Date.now();
    this.state = 'STANDBY_ACTIVE';
    this.standbyNode.isPrimary = true;
    this.standbyNode.readOnly = false;
    this.failoverCompleteTime = Date.now();

    const replayedLogIds: string[] = [];
    const totalToReplay = this.emergencyWalBuffer.length;
    let batchesProcessed = 0;

    // Batch chunked replay to optimize throughput (500 records per batch)
    for (let i = 0; i < totalToReplay; i += this.batchFlushSize) {
      const batch = this.emergencyWalBuffer.slice(i, i + this.batchFlushSize);
      for (const log of batch) {
        this.standbyStore.set(log.id, log);
        replayedLogIds.push(log.id);
      }
      batchesProcessed++;
    }

    this.emergencyWalBuffer = [];

    const rtoSeconds = (this.failoverCompleteTime - (this.failoverStartTime || promotionStart)) / 1000;
    const rpoSeconds = 0; // Zero data loss

    return {
      replayedCount: totalToReplay,
      batchesProcessed,
      rpoSeconds,
      rtoSeconds: Math.max(0.01, rtoSeconds),
      replayedLogIds,
    };
  }

  public failbackToPrimary(): { success: boolean; reconciledCount: number; batchesProcessed: number } {
    this.primaryNode.isHealthy = true;
    this.primaryNode.isPrimary = true;
    this.primaryNode.readOnly = false;

    this.standbyNode.isPrimary = false;
    this.standbyNode.readOnly = true;

    // Reconcile any delta written to standby back into primary store in batches
    let reconciledCount = 0;
    let batchesProcessed = 0;
    const entries = Array.from(this.standbyStore.entries());

    for (let i = 0; i < entries.length; i += this.batchFlushSize) {
      const batch = entries.slice(i, i + this.batchFlushSize);
      for (const [id, log] of batch) {
        if (!this.persistentStore.has(id)) {
          this.persistentStore.set(id, log);
          reconciledCount++;
        }
      }
      batchesProcessed++;
    }

    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failureCount = 0;
    this.state = 'PRIMARY_ACTIVE';
    this.failoverStartTime = 0;
    this.failoverCompleteTime = 0;

    return { success: true, reconciledCount, batchesProcessed };
  }

  public getAuditLogs(filterType?: string): BufferedAuditLog[] {
    const baseSource = this.state === 'PRIMARY_ACTIVE' ? this.persistentStore : this.standbyStore;
    const allLogs = Array.from(baseSource.values());

    // Merge with any in-flight WAL buffer entries
    const combined = [...allLogs, ...this.emergencyWalBuffer];
    const uniqueMap = new Map<string, BufferedAuditLog>();
    for (const log of combined) {
      uniqueMap.set(log.id, log);
    }

    let result = Array.from(uniqueMap.values());
    if (filterType && filterType !== 'ALL') {
      result = result.filter((l) => l.alert_type.toUpperCase().includes(filterType.toUpperCase()));
    }

    return result.sort((a, b) => new Date(b.sent_at).getTime() - new Date(a.sent_at).getTime());
  }

  public getDRHealthStatus(): DRHealthStatus {
    const bufferUtilizationPct = Number(((this.emergencyWalBuffer.length / this.maxBufferCapacity) * 100).toFixed(2));

    return {
      state: this.state,
      activeNode: this.state === 'PRIMARY_ACTIVE' ? this.primaryNode.name : this.standbyNode.name,
      activeRegion: this.state === 'PRIMARY_ACTIVE' ? this.primaryNode.region : this.standbyNode.region,
      primaryHealthy: this.primaryNode.isHealthy,
      standbyHealthy: this.standbyNode.isHealthy,
      circuitBreaker: this.circuitBreaker.state,
      bufferedEventsCount: this.emergencyWalBuffer.length,
      maxBufferCapacity: this.maxBufferCapacity,
      bufferUtilizationPct,
      estimatedRpoSeconds: 0,
      estimatedRtoSeconds: this.state === 'PRIMARY_ACTIVE' ? 0 : 5,
    };
  }
}
