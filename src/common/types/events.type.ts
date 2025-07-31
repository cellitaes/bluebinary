export type SyncOperation = 'CREATE' | 'UPDATE' | 'DELETE';
export type EntityType = 'coaster' | 'wagon';

export interface SyncEvent {
  eventId: string;
  nodeId: string;
  timestamp: Date;
  operation: SyncOperation;
  entityType: EntityType;
  entityId: string;
  data: any;
  version: number;
}
