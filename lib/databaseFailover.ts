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

export interface ReplayResult {
  replayedCount: number;
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

  private circuitBreaker = {
    failureCount: 0,
    threshold: 2,
    state: 'CLOSED' as 'CLOSED' | 'OPEN' | 'HALF_OPEN',
    lastFailureTime: 0,
    recoveryTimeoutMs: 5000,
  };

  private failoverStartTime = 0;
  private failoverCompleteTime = 0;

  constructor(
    primaryRegion = 'eu-west-1 (Primary DC)',
    standbyRegion = 'af-south-1 (Cape Town DR Replica)'
  ) {
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

  public async logAuditEvent(event: Omit<BufferedAuditLog, 'bufferedAt'>): Promise<{ success: boolean; targetNode: string; buffered: boolean }> {
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

    // 2. Failover / Outage condition -> Safe WAL Buffering
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

    // Replay all buffered emergency logs idempotently into promoted Standby store
    for (const log of this.emergencyWalBuffer) {
      this.standbyStore.set(log.id, log);
      replayedLogIds.push(log.id);
    }

    const replayedCount = this.emergencyWalBuffer.length;
    this.emergencyWalBuffer = [];

    const rtoSeconds = (this.failoverCompleteTime - (this.failoverStartTime || promotionStart)) / 1000;
    const rpoSeconds = 0; // 0 seconds because all logs were safely captured in WAL buffer

    return {
      replayedCount,
      rpoSeconds,
      rtoSeconds: Math.max(0.01, rtoSeconds),
      replayedLogIds,
    };
  }

  public failbackToPrimary(): { success: boolean; reconciledCount: number } {
    this.primaryNode.isHealthy = true;
    this.primaryNode.isPrimary = true;
    this.primaryNode.readOnly = false;

    this.standbyNode.isPrimary = false;
    this.standbyNode.readOnly = true;

    // Reconcile any delta written to standby back into primary store
    let reconciledCount = 0;
    for (const [id, log] of this.standbyStore.entries()) {
      if (!this.persistentStore.has(id)) {
        this.persistentStore.set(id, log);
        reconciledCount++;
      }
    }

    this.circuitBreaker.state = 'CLOSED';
    this.circuitBreaker.failureCount = 0;
    this.state = 'PRIMARY_ACTIVE';
    this.failoverStartTime = 0;
    this.failoverCompleteTime = 0;

    return { success: true, reconciledCount };
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
    return {
      state: this.state,
      activeNode: this.state === 'PRIMARY_ACTIVE' ? this.primaryNode.name : this.standbyNode.name,
      activeRegion: this.state === 'PRIMARY_ACTIVE' ? this.primaryNode.region : this.standbyNode.region,
      primaryHealthy: this.primaryNode.isHealthy,
      standbyHealthy: this.standbyNode.isHealthy,
      circuitBreaker: this.circuitBreaker.state,
      bufferedEventsCount: this.emergencyWalBuffer.length,
      estimatedRpoSeconds: 0,
      estimatedRtoSeconds: this.state === 'PRIMARY_ACTIVE' ? 0 : 5,
    };
  }
}
