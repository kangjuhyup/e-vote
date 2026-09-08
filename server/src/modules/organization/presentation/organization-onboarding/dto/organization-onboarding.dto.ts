import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';
type OrganizationApplicationStatus =
  'PENDING' | 'PROVISIONING' | 'APPROVED' | 'REJECTED' | 'PROVISIONING_FAILED';
type OrganizationType = 'APARTMENT' | 'ASSOCIATION' | 'COMPANY' | 'OTHER';

interface OrganizationApplicationResponseSource {
  readonly props: {
    readonly id: string;
    readonly organizationName: string;
    readonly organizationManagementNumber: string;
    readonly organizationType: OrganizationType;
    readonly contactName: string;
    readonly contactPhone?: string;
    readonly status: OrganizationApplicationStatus;
    readonly submittedAt: Date;
    readonly reviewedAt?: Date;
    readonly rejectionReason?: string;
  };
}

export class SubmitOrganizationApplicationBody {
  @IsString() @IsNotEmpty() @MaxLength(128) organizationName!: string;
  @IsString()
  @MaxLength(50)
  @Matches(/^[A-Za-z0-9_.-]+$/)
  organizationManagementNumber!: string;
  @IsIn(['APARTMENT', 'ASSOCIATION', 'COMPANY', 'OTHER'])
  organizationType!: OrganizationType;
  @IsString() @IsNotEmpty() @MaxLength(64) contactName!: string;
  @IsOptional() @IsString() @MaxLength(32) contactPhone?: string;
}

export class RejectOrganizationApplicationBody {
  @IsString() @IsNotEmpty() @MaxLength(1000) rejectionReason!: string;
}

export class GetOrganizationApplicationPageQuery {
  @Type(() => Number) @Min(1) page = 1;
  @Type(() => Number) @Min(1) @Max(100) pageSize = 20;
  @IsOptional()
  @IsIn([
    'PENDING',
    'PROVISIONING',
    'APPROVED',
    'REJECTED',
    'PROVISIONING_FAILED',
  ])
  status?: OrganizationApplicationStatus;
}

export class OrganizationApplicationResponse {
  @ApiProperty() id!: string;
  @ApiProperty() organizationName!: string;
  @ApiProperty() organizationManagementNumber!: string;
  @ApiProperty() organizationType!: OrganizationType;
  @ApiProperty() contactName!: string;
  @ApiPropertyOptional() contactPhone?: string;
  @ApiProperty() status!: OrganizationApplicationStatus;
  @ApiProperty() submittedAt!: string;
  @ApiPropertyOptional() reviewedAt?: string;
  @ApiPropertyOptional() rejectionReason?: string;

  static of(
    application: OrganizationApplicationResponseSource,
  ): OrganizationApplicationResponse {
    const props = application.props;
    return {
      id: props.id,
      organizationName: props.organizationName,
      organizationManagementNumber: props.organizationManagementNumber,
      organizationType: props.organizationType,
      contactName: props.contactName,
      contactPhone: props.contactPhone,
      status: props.status,
      submittedAt: props.submittedAt.toISOString(),
      reviewedAt: props.reviewedAt?.toISOString(),
      rejectionReason: props.rejectionReason,
    };
  }
}
