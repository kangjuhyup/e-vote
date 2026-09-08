import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  NotFoundException,
  Post,
  Put,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserProfileService } from '../application/user-profile.service';
import { Public } from '../../../shared/presentation/common/decorator/public.decorator';
import { User } from '../../../shared/presentation/common/decorator/user.decorator';
import type { UserPrincipal } from '../../../shared/application/security/user-principal';
import {
  RegisterUserProfileBody,
  SaveUserProfileBody,
} from './user-profile.dto';

@Controller()
export class UserProfileController {
  constructor(
    private readonly service: UserProfileService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @Post('internal/user-profiles')
  register(
    @Headers('x-vote-registration-secret') secret: string | undefined,
    @Body() body: RegisterUserProfileBody,
  ) {
    if (
      !secret ||
      secret !== this.config.get<string>('VOTE_PROFILE_REGISTRATION_SECRET')
    )
      throw new ForbiddenException();
    return this.service.save(body);
  }

  @Get('user-profile/me')
  async getMine(@User() user: UserPrincipal) {
    const profile = await this.service.findMine(user.tenantCode ?? '', user.id);
    if (!profile) throw new NotFoundException();
    return profile.props;
  }

  @Put('user-profile/me')
  saveMine(@User() user: UserPrincipal, @Body() body: SaveUserProfileBody) {
    return this.service.save({
      ...body,
      tenantCode: user.tenantCode ?? '',
      userPrincipalId: user.id,
    });
  }
}
