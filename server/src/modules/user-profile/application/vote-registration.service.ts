import { Inject, Injectable } from '@nestjs/common';

import {
  AUTH_ACCOUNT_REGISTRATION_PORT,
  type AuthAccountRegistrationPort,
} from './port/auth-account-registration.port';
import { UserProfileService } from './user-profile.service';

export interface RegisterVoteAccountInput {
  tenantCode: string;
  username: string;
  password: string;
  name: string;
  email: string;
  phone: string;
}

@Injectable()
export class VoteRegistrationService {
  constructor(
    @Inject(AUTH_ACCOUNT_REGISTRATION_PORT)
    private readonly authAccounts: AuthAccountRegistrationPort,
    private readonly profiles: UserProfileService,
  ) {}

  async register(input: RegisterVoteAccountInput): Promise<void> {
    const account = await this.authAccounts.register(input);
    try {
      await this.profiles.save({
        tenantCode: input.tenantCode,
        userPrincipalId: account.userPrincipalId,
        name: input.name,
        email: input.email,
        phone: input.phone,
      });
    } catch (error) {
      await this.authAccounts
        .remove({
          tenantCode: input.tenantCode,
          userPrincipalId: account.userPrincipalId,
        })
        .catch(() => undefined);
      throw error;
    }
  }
}
