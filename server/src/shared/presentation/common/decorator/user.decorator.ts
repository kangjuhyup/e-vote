import {
  createParamDecorator,
  type ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { UserPrincipal } from '../../../application/security/user-principal';

type UserPrincipalRequest = {
  readonly user?: UserPrincipal;
};

export function getUserPrincipal(context: ExecutionContext): UserPrincipal {
  const request = context.switchToHttp().getRequest<UserPrincipalRequest>();

  if (!(request.user instanceof UserPrincipal)) {
    throw new UnauthorizedException(
      'authenticated user principal is not available',
    );
  }

  return request.user;
}

export const User = createParamDecorator(
  (_data: unknown, context: ExecutionContext): UserPrincipal =>
    getUserPrincipal(context),
);
