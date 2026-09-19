import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  ACCESS_TOKEN_VERIFIER_PORT,
  AUTHZ_ASSERTION_HEADER,
  AccessTokenVerificationUnavailableError,
  type AccessTokenVerifierPort,
} from '../../../application/port/security/access-token-verifier.port';
import type { UserPrincipal } from '../../../application/security/user-principal';
import { PUBLIC_ROUTE_METADATA_KEY } from '../decorator/public.decorator';

type AuthenticatedRequest = {
  readonly headers: {
    readonly authorization?: string | string[];
    readonly [AUTHZ_ASSERTION_HEADER]?: string | string[];
  };
  user?: UserPrincipal;
};

function getBearerToken(authorization: string | string[] | undefined): string {
  if (typeof authorization !== 'string') {
    throw new UnauthorizedException('bearer access token is required');
  }

  const match = /^Bearer ([^\s]+)$/.exec(authorization);
  if (!match) {
    throw new UnauthorizedException('bearer access token is required');
  }

  return match[1];
}

@Injectable()
export class AuthenticatedUserGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    @Inject(ACCESS_TOKEN_VERIFIER_PORT)
    private readonly accessTokenVerifier: AccessTokenVerifierPort,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(
      PUBLIC_ROUTE_METADATA_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    delete request.user;
    const accessToken = getBearerToken(request.headers.authorization);
    const assertion = request.headers[AUTHZ_ASSERTION_HEADER];
    if (typeof assertion !== 'string') {
      throw new UnauthorizedException('verified identity is required');
    }

    try {
      request.user = await this.accessTokenVerifier.verify(
        accessToken,
        assertion,
      );
      return true;
    } catch (error) {
      delete request.user;
      if (error instanceof AccessTokenVerificationUnavailableError) {
        throw new ServiceUnavailableException(
          'authentication service is unavailable',
        );
      }
      throw new UnauthorizedException('invalid or expired access token');
    }
  }
}
