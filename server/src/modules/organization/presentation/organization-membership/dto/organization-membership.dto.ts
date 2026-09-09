import { Transform } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const ORGANIZATION_INVITATION_ROLES = ['MEMBER', 'MANAGER'] as const;
type OrganizationInvitationRole =
  (typeof ORGANIZATION_INVITATION_ROLES)[number];
interface OrganizationInvitationResponseSource {
  readonly props: {
    readonly id: string;
    readonly organizationName: string;
    readonly organizationGroupId: string;
    readonly contactHint: string;
    readonly role: OrganizationInvitationRole;
    readonly status: string;
    readonly invitedAt: Date;
    readonly expiresAt: Date;
    readonly acceptedAt?: Date;
  };
}

export class AddOrganizationMemberBody {
  @IsString() @IsNotEmpty() @MaxLength(254) readonly identifier!: string;
  @IsIn(ORGANIZATION_INVITATION_ROLES)
  readonly role!: OrganizationInvitationRole;
}
export class CreateOrganizationInvitationBody {
  @IsString() @IsNotEmpty() @MaxLength(254) readonly contact!: string;
  @IsIn(ORGANIZATION_INVITATION_ROLES)
  readonly role!: OrganizationInvitationRole;
}
export class OrganizationInvitationTokenParam {
  @IsString() @IsNotEmpty() @MaxLength(128) readonly token!: string;
}
export class OrganizationInvitationPageQuery {
  @Transform(({ value }) => Number(value)) @IsInt() @Min(1) readonly page = 1;
  @Transform(({ value }) => Number(value))
  @IsInt()
  @Min(1)
  @Max(100)
  readonly pageSize = 20;
}
export class OrganizationInvitationResponse {
  private constructor(
    readonly id: string,
    readonly organizationName: string,
    readonly organizationGroupId: string,
    readonly contactHint: string,
    readonly role: OrganizationInvitationRole,
    readonly status: string,
    readonly invitedAt: Date,
    readonly expiresAt: Date,
    readonly acceptedAt?: Date,
  ) {}
  static of(this: void, invitation: OrganizationInvitationResponseSource) {
    const p = invitation.props;
    return new OrganizationInvitationResponse(
      p.id,
      p.organizationName,
      p.organizationGroupId,
      p.contactHint,
      p.role,
      p.status,
      p.invitedAt,
      p.expiresAt,
      p.acceptedAt,
    );
  }
}
