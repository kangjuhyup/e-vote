import { createHash } from 'node:crypto';
import { Inject, Injectable } from '@nestjs/common';
import {
  ParticipationAccessRateLimitExceededError,
  ParticipationAccessRateLimitUnavailableError,
  type ParticipationAccessRateLimitPort,
} from '../../application/port/security/participation-access-rate-limit.port';
import {
  REDIS_CLIENT,
  type RedisClient,
} from '../../../../platform/redis/redis.constants';

const WINDOW_MS = 5 * 60 * 1_000;
const MAX_EXCHANGES_PER_WINDOW = 20;
const INCREMENT_WITH_EXPIRY_SCRIPT = `
local count = redis.call('INCR', KEYS[1])
if count == 1 then
  redis.call('PEXPIRE', KEYS[1], ARGV[1])
end
return count
`;

@Injectable()
export class RedisParticipationAccessRateLimitAdapter implements ParticipationAccessRateLimitPort {
  constructor(@Inject(REDIS_CLIENT) private readonly redis: RedisClient) {}

  async consume(params: {
    readonly clientAddress: string;
    readonly referenceToken: string;
  }): Promise<void> {
    const keys = [
      this.key('client', params.clientAddress),
      this.key('reference', params.referenceToken),
    ];
    try {
      for (const key of keys) {
        const result = await this.redis.eval(
          INCREMENT_WITH_EXPIRY_SCRIPT,
          1,
          key,
          WINDOW_MS,
        );
        const count = Number(result);
        if (!Number.isFinite(count)) {
          throw new ParticipationAccessRateLimitUnavailableError();
        }
        if (count > MAX_EXCHANGES_PER_WINDOW) {
          throw new ParticipationAccessRateLimitExceededError();
        }
      }
    } catch (error) {
      if (
        error instanceof ParticipationAccessRateLimitExceededError ||
        error instanceof ParticipationAccessRateLimitUnavailableError
      ) {
        throw error;
      }
      throw new ParticipationAccessRateLimitUnavailableError();
    }
  }

  private key(dimension: string, value: string): string {
    const digest = createHash('sha256').update(value).digest('hex');
    return `participation-access:exchange:${dimension}:${digest}`;
  }
}
