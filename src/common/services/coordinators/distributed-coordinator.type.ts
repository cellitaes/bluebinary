export interface NodeInfo {
  nodeId: string;
  ipAddress: string;
  port: number;
  environment: string;
  lastHeartbeat: Date;
  isLeader: boolean;
  status: 'online' | 'offline' | 'syncing';
}

export interface SyncEvent {
  eventId: string;
  nodeId: string;
  timestamp: Date;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  entityType: 'coaster' | 'wagon';
  entityId: string;
  data: any;
  version: number;
  processedBy?: string[];
}

export interface ConflictResolution {
  winningVersion: number;
  winningNodeId: string;
  conflictReason: 'version_conflict' | 'concurrent_update';
  resolvedAt: Date;
}
