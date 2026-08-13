export const REDIS_HEALTH_PORT = Symbol('REDIS_HEALTH_PORT');

export type RedisHealthResult =
  | {
      status: 'up';
    }
  | {
      status: 'down';
      reason: string;
    };

export interface RedisHealthPort {
  ping(): Promise<RedisHealthResult>;
}
