import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Param,
  Post,
  Query,
  ServiceUnavailableException,
} from '@nestjs/common';

import { UserPrincipal } from '../../../../shared/application/security/user-principal';
import { Public } from '../../../../shared/presentation/common/decorator/public.decorator';
import { User } from '../../../../shared/presentation/common/decorator/user.decorator';
import { OrganizationMembershipService } from '../../application/organization-membership.service';
import {
  OrganizationApplicationAccessDeniedError,
  OrganizationApplicationNotFoundError,
  OrganizationInvitationExpiredError,
  OrganizationInvitationNotFoundError,
  OrganizationInvitationRecipientMismatchError,
  OrganizationProvisioningUnavailableError,
} from '../../application/organization-onboarding.error';
import {
  CreateOrganizationInvitationBody,
  OrganizationInvitationPageQuery,
  OrganizationInvitationResponse,
  OrganizationInvitationTokenParam,
} from './dto/organization-membership.dto';

@Controller()
export class OrganizationMembershipController {
  constructor(private readonly service: OrganizationMembershipService) {}

  @Post('organizations/:organizationGroupId/invitations')
  async createInvitation(
    @User() user: UserPrincipal,
    @Param('organizationGroupId') organizationGroupId: string,
    @Body() body: CreateOrganizationInvitationBody,
  ) {
    return this.map(async () => {
      const result = await this.service.createInvitation(user, {
        organizationGroupId,
        ...body,
      });
      return {
        ...OrganizationInvitationResponse.of(result.invitation),
        token: result.token,
      };
    });
  }

  @Get('organizations/:organizationGroupId/invitations')
  async getInvitations(
    @User() user: UserPrincipal,
    @Param('organizationGroupId') organizationGroupId: string,
    @Query() query: OrganizationInvitationPageQuery,
  ) {
    return this.map(async () => {
      const page = await this.service.getInvitationPage(
        user,
        organizationGroupId,
        query.page,
        query.pageSize,
      );
      return {
        ...page,
        items: page.items.map(OrganizationInvitationResponse.of),
      };
    });
  }

  @Public()
  @Get('organization-invitations/:token')
  async getInvitation(@Param() param: OrganizationInvitationTokenParam) {
    return this.map(async () =>
      OrganizationInvitationResponse.of(
        await this.service.getInvitation(param.token),
      ),
    );
  }

  @Post('organization-invitations/:token/accept')
  async acceptInvitation(
    @User() user: UserPrincipal,
    @Param() param: OrganizationInvitationTokenParam,
  ) {
    return this.map(async () => ({
      invitation: OrganizationInvitationResponse.of(
        await this.service.acceptInvitation(user, param.token),
      ),
      requiresReauthentication: true,
    }));
  }

  private async map<T>(operation: () => Promise<T>): Promise<T> {
    try {
      return await operation();
    } catch (error) {
      if (error instanceof TypeError) throw new BadRequestException();
      if (
        error instanceof OrganizationApplicationAccessDeniedError ||
        error instanceof OrganizationInvitationRecipientMismatchError
      )
        throw new ForbiddenException();
      if (
        error instanceof OrganizationApplicationNotFoundError ||
        error instanceof OrganizationInvitationNotFoundError
      )
        throw new NotFoundException();
      if (error instanceof OrganizationInvitationExpiredError)
        throw new ConflictException();
      if (error instanceof OrganizationProvisioningUnavailableError)
        throw new ServiceUnavailableException();
      throw error;
    }
  }
}
