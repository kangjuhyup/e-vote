import {
  createHmac,
  randomBytes,
  timingSafeEqual,
  createHash,
} from 'node:crypto';
import {
  InvalidParticipationAccessTokenError,
  type IssuedParticipationReference,
  type ParticipantSessionCredentials,
  type ParticipationAccessTokenPort,
  type ParticipationReferenceClaims,
} from '../../application/port/security/participation-access-token.port';

interface ReferencePayload {
  readonly invitationId: string;
  readonly generation: number;
  readonly keyId: string;
}

export interface ParticipationAccessSigningKeys {
  readonly currentKeyId: string;
  readonly keys: Readonly<Record<string, string>>;
}

export class HmacParticipationAccessTokenAdapter implements ParticipationAccessTokenPort {
  constructor(private readonly signingKeys: ParticipationAccessSigningKeys) {
    if (!this.signingKeys.keys[this.signingKeys.currentKeyId]) {
      throw new Error('current participation signing key is not configured');
    }
  }

  issueReference(
    invitationId: string,
    generation: number,
  ): IssuedParticipationReference {
    if (
      !invitationId.trim() ||
      !Number.isSafeInteger(generation) ||
      generation < 1
    ) {
      throw new InvalidParticipationAccessTokenError();
    }

    const keyId = this.signingKeys.currentKeyId;
    const payload = Buffer.from(
      JSON.stringify({
        invitationId,
        generation,
        keyId,
      } satisfies ReferencePayload),
    ).toString('base64url');
    const signature = this.sign(payload, this.signingKeys.keys[keyId]);
    const token = `${payload}.${signature}`;

    return { token, tokenDigest: this.digest(token), keyId };
  }

  verifyReference(token: string): ParticipationReferenceClaims {
    try {
      const parts = token.split('.');
      if (parts.length !== 2) {
        throw new InvalidParticipationAccessTokenError();
      }
      const [encodedPayload, encodedSignature] = parts;
      const payload = JSON.parse(
        Buffer.from(encodedPayload, 'base64url').toString('utf8'),
      ) as Partial<ReferencePayload>;
      if (
        typeof payload.invitationId !== 'string' ||
        !payload.invitationId.trim() ||
        typeof payload.generation !== 'number' ||
        !Number.isSafeInteger(payload.generation) ||
        payload.generation < 1 ||
        typeof payload.keyId !== 'string'
      ) {
        throw new InvalidParticipationAccessTokenError();
      }
      const key = this.signingKeys.keys[payload.keyId];
      if (!key) {
        throw new InvalidParticipationAccessTokenError();
      }
      const expected = Buffer.from(this.sign(encodedPayload, key), 'base64url');
      const actual = Buffer.from(encodedSignature, 'base64url');
      if (
        expected.length !== actual.length ||
        !timingSafeEqual(expected, actual)
      ) {
        throw new InvalidParticipationAccessTokenError();
      }

      return {
        invitationId: payload.invitationId,
        generation: payload.generation,
        keyId: payload.keyId,
        tokenDigest: this.digest(token),
      };
    } catch (error) {
      if (error instanceof InvalidParticipationAccessTokenError) {
        throw error;
      }
      throw new InvalidParticipationAccessTokenError();
    }
  }

  issueSessionCredentials(): ParticipantSessionCredentials {
    const sessionToken = randomBytes(32).toString('base64url');
    const csrfToken = this.deriveCsrfToken(sessionToken);
    return {
      sessionToken,
      sessionTokenDigest: this.digest(sessionToken),
      csrfToken,
      csrfTokenDigest: this.digest(csrfToken),
    };
  }

  deriveCsrfToken(sessionToken: string): string {
    if (!sessionToken.trim()) throw new InvalidParticipationAccessTokenError();
    return createHash('sha256')
      .update(`participation-csrf\0${sessionToken}`, 'utf8')
      .digest('base64url');
  }

  digest(value: string): string {
    return createHash('sha256').update(value, 'utf8').digest('hex');
  }

  private sign(payload: string, key: string): string {
    return createHmac('sha256', key)
      .update(payload, 'utf8')
      .digest('base64url');
  }
}
