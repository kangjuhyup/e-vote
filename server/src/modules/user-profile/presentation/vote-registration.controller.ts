import {
  Body,
  ConflictException,
  Controller,
  Post,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import { Public } from '../../../shared/presentation/common/decorator/public.decorator';
import { AuthAccountAlreadyExistsError } from '../application/port/auth-account-registration.port';
import { VoteRegistrationService } from '../application/vote-registration.service';
import { RegisterVoteAccountBody } from './vote-registration.dto';

@Controller('registrations')
export class VoteRegistrationController {
  constructor(
    private readonly service: VoteRegistrationService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post()
  async register(@Body() body: RegisterVoteAccountBody) {
    try {
      await this.service.register({
        ...body,
        tenantCode:
          this.config.get<string>('AUTH_OIDC_TENANT_CODE') ?? 'e-vote',
      });
      return { success: true };
    } catch (error) {
      if (error instanceof AuthAccountAlreadyExistsError) {
        throw new ConflictException(
          '이미 사용 중인 아이디, 이메일 또는 전화번호입니다.',
        );
      }
      throw new ServiceUnavailableException(
        '회원가입을 완료하지 못했습니다. 잠시 후 다시 시도하세요.',
      );
    }
  }
}
