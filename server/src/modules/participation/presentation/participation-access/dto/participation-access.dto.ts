import { ApiProperty } from '@nestjs/swagger';
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  MaxLength,
  Min,
} from 'class-validator';

const SIGNATURE_MIME_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;
const SIGNATURE_MAX_SIZE_BYTES = 5 * 1024 * 1024;

export class ExchangeParticipationAccessBody {
  @IsString()
  @IsNotEmpty()
  @ApiProperty({ description: 'SMS URL fragment에서 꺼낸 서명된 접근 토큰' })
  readonly token!: string;
}

export class CastParticipationAccessBody {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteDetailId!: string;

  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly selectedCandidateId!: string;
}

export class ParticipationAccessVoteDetailParam {
  @IsUUID()
  @ApiProperty({ format: 'uuid' })
  readonly voteDetailId!: string;
}

export class ParticipationSignatureUploadBody {
  @IsString()
  @IsNotEmpty()
  @MaxLength(255)
  @ApiProperty({ maxLength: 255 })
  readonly originalName!: string;

  @IsIn(SIGNATURE_MIME_TYPES)
  @ApiProperty({ enum: SIGNATURE_MIME_TYPES })
  readonly mimeType!: string;

  @IsInt()
  @Min(1)
  @Max(SIGNATURE_MAX_SIZE_BYTES)
  @ApiProperty({ minimum: 1, maximum: SIGNATURE_MAX_SIZE_BYTES })
  readonly sizeBytes!: number;
}

export class ConfirmParticipationSignatureUploadBody extends ParticipationSignatureUploadBody {
  @IsString() @IsNotEmpty() @ApiProperty() readonly storageKey!: string;
  @IsOptional()
  @IsString()
  @ApiProperty({ required: false })
  readonly checksum?: string;
}

export class ParticipationSignatureUploadResponse {
  @ApiProperty() readonly storageKey!: string;
  @ApiProperty() readonly uploadUrl!: string;
  @ApiProperty({
    description: '서명 이미지 PUT 요청에 그대로 적용할 HTTP 헤더입니다.',
    type: 'object',
    additionalProperties: { type: 'string' },
    example: {
      'Content-Type': 'image/png',
      'x-amz-meta-purpose': 'elector-participation-signature',
    },
  })
  readonly uploadHeaders!: Readonly<Record<string, string>>;
  @ApiProperty({ format: 'date-time' }) readonly expiresAt!: Date;
  static of(
    params: ParticipationSignatureUploadResponse,
  ): ParticipationSignatureUploadResponse {
    return Object.assign(new ParticipationSignatureUploadResponse(), params);
  }
}

export class ConfirmParticipationSignatureUploadResponse {
  @ApiProperty({ format: 'uuid' }) readonly fileId!: string;
  @ApiProperty() readonly storageKey!: string;
  static of(
    params: ConfirmParticipationSignatureUploadResponse,
  ): ConfirmParticipationSignatureUploadResponse {
    return Object.assign(
      new ConfirmParticipationSignatureUploadResponse(),
      params,
    );
  }
}

export class ParticipationAccessCandidateResponse {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly candidateNo!: number;
  @ApiProperty() readonly name!: string;
  @ApiProperty() readonly description!: string;
}

export class ParticipationAccessVoteDetailResponse {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly title!: string;
  @ApiProperty() readonly description!: string;
  @ApiProperty({ enum: ['CANDIDATE', 'YES_NO'] }) readonly type!: string;
  @ApiProperty({ enum: ['DRAFT', 'OPEN', 'CLOSED', 'CANCELED'] })
  readonly status!: string;
  @ApiProperty() readonly sortOrder!: number;
  @ApiProperty() readonly participated!: boolean;
  @ApiProperty({ type: [ParticipationAccessCandidateResponse] })
  readonly candidates!: readonly ParticipationAccessCandidateResponse[];
}

export class ParticipationAccessVoteResponse {
  @ApiProperty({ format: 'uuid' }) readonly id!: string;
  @ApiProperty() readonly title!: string;
  @ApiProperty() readonly description!: string;
  @ApiProperty({ enum: ['FINALIZED', 'OPEN', 'CLOSED'] })
  readonly status!: string;
  @ApiProperty({ format: 'date-time' }) readonly startedAt!: Date;
  @ApiProperty({ format: 'date-time' }) readonly endedAt!: Date;
}

export class ParticipationAccessPermittedActionsResponse {
  @ApiProperty() readonly uploadSignature!: boolean;
  @ApiProperty() readonly participate!: boolean;
  @ApiProperty() readonly readResults!: boolean;
}

export class ParticipationAuthenticationRequiredResponse {
  @ApiProperty({ enum: [true] }) readonly authenticationRequired = true;
  @ApiProperty({ format: 'uuid' }) readonly voteId!: string;
  @ApiProperty({ format: 'uuid' }) readonly electorId!: string;

  static of(params: {
    readonly voteId: string;
    readonly electorId: string;
  }): ParticipationAuthenticationRequiredResponse {
    return Object.assign(new ParticipationAuthenticationRequiredResponse(), {
      voteId: params.voteId,
      electorId: params.electorId,
    });
  }
}

export class ParticipationAccessResponse {
  @ApiProperty({ enum: ['PARTICIPATE', 'RESULT_READ'] })
  readonly scope: 'PARTICIPATE' | 'RESULT_READ';

  @ApiProperty({ format: 'uuid' })
  readonly voteId: string;

  @ApiProperty({ required: false })
  readonly csrfToken?: string;

  @ApiProperty({ format: 'date-time', required: false })
  readonly sessionExpiresAt?: string;

  @ApiProperty({ required: false, type: ParticipationAccessVoteResponse })
  readonly vote?: ParticipationAccessVoteResponse;

  @ApiProperty({
    required: false,
    type: [ParticipationAccessVoteDetailResponse],
  })
  readonly voteDetails?: readonly ParticipationAccessVoteDetailResponse[];

  @ApiProperty({ required: false })
  readonly hasConfirmedSignature?: boolean;

  @ApiProperty({
    required: false,
    type: ParticipationAccessPermittedActionsResponse,
  })
  readonly permittedActions?: ParticipationAccessPermittedActionsResponse;

  private constructor(params: ParticipationAccessResponse) {
    this.scope = params.scope;
    this.voteId = params.voteId;
    if (params.csrfToken) this.csrfToken = params.csrfToken;
    if (params.sessionExpiresAt)
      this.sessionExpiresAt = params.sessionExpiresAt;
    if (params.vote) this.vote = params.vote;
    if (params.voteDetails) this.voteDetails = params.voteDetails;
    if (params.hasConfirmedSignature !== undefined) {
      this.hasConfirmedSignature = params.hasConfirmedSignature;
    }
    if (params.permittedActions)
      this.permittedActions = params.permittedActions;
  }

  static of(params: ParticipationAccessResponse): ParticipationAccessResponse {
    return new ParticipationAccessResponse(params);
  }
}
