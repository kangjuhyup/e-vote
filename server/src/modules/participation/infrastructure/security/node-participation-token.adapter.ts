import { createHash, randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { ParticipationTokenPort } from '../../application/port/security/participation-token.port';

@Injectable()
export class NodeParticipationTokenAdapter implements ParticipationTokenPort {
  issue(): { rawToken: string; digest: string } {
    const rawToken = randomBytes(32).toString('base64url');
    return { rawToken, digest: this.digest(rawToken) };
  }

  digest(rawToken: string): string {
    return createHash('sha256').update(rawToken, 'utf8').digest('hex');
  }
}
