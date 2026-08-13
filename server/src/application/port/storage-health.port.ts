export const STORAGE_HEALTH_PORT = Symbol('STORAGE_HEALTH_PORT');

export type StorageHealthResult =
  | {
      status: 'up';
    }
  | {
      status: 'down';
      reason: string;
    };

export interface StorageHealthPort {
  ping(): Promise<StorageHealthResult>;
}
