import { ApiProperty } from '@nestjs/swagger';
import { MaskedPersonalData } from '../../../../../shared/presentation/common/decorator/masked-personal-data.decorator';

const SmsMessagePurposeResponse = {
  ParticipationReminder: 'VOTE_PARTICIPATION_REMINDER',
  ResultNotice: 'VOTE_RESULT_NOTICE',
  UpcomingNotice: 'UPCOMING_VOTE_NOTICE',
  FieldVotingSessionNotice: 'FIELD_VOTING_SESSION_NOTICE',
} as const;

const SmsDeliveryStatusResponse = {
  Success: 'SUCCESS',
  Failure: 'FAILURE',
} as const;

type SmsMessagePurposeResponse =
  (typeof SmsMessagePurposeResponse)[keyof typeof SmsMessagePurposeResponse];
type SmsDeliveryStatusResponse =
  (typeof SmsDeliveryStatusResponse)[keyof typeof SmsDeliveryStatusResponse];

type SmsDispatchSummarySource = {
  readonly id: string;
  readonly voteId: string;
  readonly fieldVotingSessionId?: string;
  readonly purpose: SmsMessagePurposeResponse;
  readonly sentAt: Date;
  readonly recipientCount: number;
  readonly successCount: number;
  readonly failureCount: number;
};

type SmsDeliverySource = {
  readonly electorId: string;
  readonly recipientName: string;
  readonly recipientIdentifier: string;
  readonly status: SmsDeliveryStatusResponse;
  readonly failureReason?: string;
};

export class GetSmsDispatchSummaryResponse {
  @ApiProperty() readonly id: string;
  @ApiProperty() readonly voteId: string;
  @ApiProperty({ required: false }) readonly fieldVotingSessionId?: string;
  @ApiProperty({ enum: Object.values(SmsMessagePurposeResponse) })
  readonly purpose: SmsMessagePurposeResponse;
  @ApiProperty({ format: 'date-time' }) readonly sentAt: string;
  @ApiProperty({ minimum: 0 }) readonly recipientCount: number;
  @ApiProperty({ minimum: 0 }) readonly successCount: number;
  @ApiProperty({ minimum: 0 }) readonly failureCount: number;

  protected constructor(source: SmsDispatchSummarySource) {
    this.id = source.id;
    this.voteId = source.voteId;
    if (source.fieldVotingSessionId !== undefined) {
      this.fieldVotingSessionId = source.fieldVotingSessionId;
    }
    this.purpose = source.purpose;
    this.sentAt = source.sentAt.toISOString();
    this.recipientCount = source.recipientCount;
    this.successCount = source.successCount;
    this.failureCount = source.failureCount;
  }

  static of(source: SmsDispatchSummarySource): GetSmsDispatchSummaryResponse {
    return new GetSmsDispatchSummaryResponse(source);
  }
}

export class GetSmsDeliveryResponse {
  @ApiProperty() readonly electorId: string;
  @MaskedPersonalData('name')
  @ApiProperty({ description: '응답 직렬화 시 마스킹되는 수신자 이름입니다.' })
  readonly recipientName: string;
  @ApiProperty() readonly recipientIdentifier: string;
  @ApiProperty({ enum: Object.values(SmsDeliveryStatusResponse) })
  readonly status: SmsDeliveryStatusResponse;
  @ApiProperty({ required: false }) readonly failureReason?: string;

  private constructor(source: SmsDeliverySource) {
    this.electorId = source.electorId;
    this.recipientName = source.recipientName;
    this.recipientIdentifier = source.recipientIdentifier;
    this.status = source.status;
    if (source.failureReason !== undefined) {
      this.failureReason = source.failureReason;
    }
  }

  static of(source: SmsDeliverySource): GetSmsDeliveryResponse {
    return new GetSmsDeliveryResponse(source);
  }
}

export class GetSmsDispatchResponse extends GetSmsDispatchSummaryResponse {
  @ApiProperty({ type: () => [GetSmsDeliveryResponse] })
  readonly deliveries: readonly GetSmsDeliveryResponse[];
  @ApiProperty() readonly page: number;
  @ApiProperty() readonly pageSize: number;
  @ApiProperty() readonly totalItems: number;
  @ApiProperty() readonly totalPages: number;

  private constructor(
    source: SmsDispatchSummarySource & {
      readonly deliveries: readonly SmsDeliverySource[];
      readonly page: number;
      readonly pageSize: number;
      readonly totalItems: number;
      readonly totalPages: number;
    },
  ) {
    super(source);
    this.deliveries = source.deliveries.map((delivery) =>
      GetSmsDeliveryResponse.of(delivery),
    );
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(
    source: SmsDispatchSummarySource & {
      readonly deliveries: readonly SmsDeliverySource[];
      readonly page: number;
      readonly pageSize: number;
      readonly totalItems: number;
      readonly totalPages: number;
    },
  ): GetSmsDispatchResponse {
    return new GetSmsDispatchResponse(source);
  }
}

export class GetSmsDispatchPageResponse {
  @ApiProperty({ type: () => [GetSmsDispatchSummaryResponse] })
  readonly items: readonly GetSmsDispatchSummaryResponse[];
  @ApiProperty() readonly page: number;
  @ApiProperty() readonly pageSize: number;
  @ApiProperty() readonly totalItems: number;
  @ApiProperty() readonly totalPages: number;

  private constructor(source: {
    readonly items: readonly SmsDispatchSummarySource[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }) {
    this.items = source.items.map((item) =>
      GetSmsDispatchSummaryResponse.of(item),
    );
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: {
    readonly items: readonly SmsDispatchSummarySource[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }): GetSmsDispatchPageResponse {
    return new GetSmsDispatchPageResponse(source);
  }
}
