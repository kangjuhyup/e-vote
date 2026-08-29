export const DATABASE_HEALTH_PORT = Symbol('DATABASE_HEALTH_PORT');

export type DatabaseHealthResult =
  | {
      status: 'up';
    }
  | {
      status: 'down';
      reason: string;
    };

export interface DatabaseHealthPort {
  ping(): Promise<DatabaseHealthResult>;
}
