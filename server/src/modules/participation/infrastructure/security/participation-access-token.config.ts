import {
  ParticipationAccessNotConfiguredError,
  type ParticipationAccessTokenPort,
} from '../../application/port/security/participation-access-token.port';
import { HmacParticipationAccessTokenAdapter } from './hmac-participation-access-token.adapter';

export { ParticipationAccessNotConfiguredError } from '../../application/port/security/participation-access-token.port';

export interface ParticipationAccessEnvironment {
  readonly PARTICIPATION_LINK_SIGNING_KEY?: string;
  readonly PARTICIPATION_LINK_SIGNING_KEY_ID?: string;
  readonly PARTICIPATION_LINK_VERIFICATION_KEYS?: string;
  readonly PARTICIPATION_UI_URL?: string;
  readonly PARTICIPATION_ALLOWED_ORIGINS?: string;
}

class NotConfiguredParticipationAccessTokenAdapter implements ParticipationAccessTokenPort {
  issueReference(): never {
    throw new ParticipationAccessNotConfiguredError();
  }
  verifyReference(): never {
    throw new ParticipationAccessNotConfiguredError();
  }
  issueSessionCredentials(): never {
    throw new ParticipationAccessNotConfiguredError();
  }
  deriveCsrfToken(): never {
    throw new ParticipationAccessNotConfiguredError();
  }
  digest(): never {
    throw new ParticipationAccessNotConfiguredError();
  }
}

export function createParticipationAccessTokenAdapter(
  environment: ParticipationAccessEnvironment,
): ParticipationAccessTokenPort {
  const currentKey = environment.PARTICIPATION_LINK_SIGNING_KEY?.trim();
  const currentKeyId =
    environment.PARTICIPATION_LINK_SIGNING_KEY_ID?.trim() || 'current';
  if (!currentKey || Buffer.byteLength(currentKey, 'utf8') < 32) {
    return new NotConfiguredParticipationAccessTokenAdapter();
  }
  const verificationKeys = parseVerificationKeys(
    environment.PARTICIPATION_LINK_VERIFICATION_KEYS,
  );
  return new HmacParticipationAccessTokenAdapter({
    currentKeyId,
    keys: { ...verificationKeys, [currentKeyId]: currentKey },
  });
}

export function resolveParticipationUiUrl(
  environment: ParticipationAccessEnvironment,
): string {
  return (
    environment.PARTICIPATION_UI_URL?.trim() ||
    'http://localhost:3001/participate'
  );
}

export function resolveParticipationAllowedOrigins(
  environment: ParticipationAccessEnvironment,
): readonly string[] {
  const configured = environment.PARTICIPATION_ALLOWED_ORIGINS?.split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);
  if (configured?.includes('*')) {
    throw new Error('wildcard origin is not allowed for participation access');
  }
  if (configured?.length) return [...new Set(configured)];
  return [new URL(resolveParticipationUiUrl(environment)).origin];
}

function parseVerificationKeys(
  value: string | undefined,
): Record<string, string> {
  if (!value?.trim()) return {};
  try {
    const parsed = JSON.parse(value) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[1] === 'string' &&
          Buffer.byteLength(entry[1], 'utf8') >= 32,
      ),
    );
  } catch {
    return {};
  }
}
