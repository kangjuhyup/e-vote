import type { SmsDeliveryStatus } from '../../../../../../shared/domain/sms/type/sms-delivery-status.type';
import type { SmsMessagePurpose } from '../../../../../../shared/domain/voting/type/sms-message-purpose.type';

type SmsDispatchSummaryViewProps = {
  readonly id: string;
  readonly voteId: string;
  readonly fieldVotingSessionId?: string;
  readonly purpose: SmsMessagePurpose;
  readonly sentAt: Date;
  readonly recipientCount: number;
  readonly successCount: number;
  readonly failureCount: number;
};

export class SmsDispatchSummaryView {
  readonly fieldVotingSessionId?: string;

  protected constructor(
    readonly id: string,
    readonly voteId: string,
    fieldVotingSessionId: string | undefined,
    readonly purpose: SmsMessagePurpose,
    readonly sentAt: Date,
    readonly recipientCount: number,
    readonly successCount: number,
    readonly failureCount: number,
  ) {
    if (fieldVotingSessionId !== undefined) {
      this.fieldVotingSessionId = fieldVotingSessionId;
    }
  }

  static of(params: SmsDispatchSummaryViewProps): SmsDispatchSummaryView {
    return new SmsDispatchSummaryView(
      params.id,
      params.voteId,
      params.fieldVotingSessionId,
      params.purpose,
      params.sentAt,
      params.recipientCount,
      params.successCount,
      params.failureCount,
    );
  }
}

export class SmsDeliveryView {
  readonly failureReason?: string;

  private constructor(
    readonly electorId: string,
    readonly recipientName: string,
    readonly recipientIdentifier: string,
    readonly status: SmsDeliveryStatus,
    failureReason: string | undefined,
  ) {
    if (failureReason !== undefined) this.failureReason = failureReason;
  }

  static of(params: {
    readonly electorId: string;
    readonly recipientName: string;
    readonly recipientIdentifier: string;
    readonly status: SmsDeliveryStatus;
    readonly failureReason?: string;
  }): SmsDeliveryView {
    return new SmsDeliveryView(
      params.electorId,
      params.recipientName,
      params.recipientIdentifier,
      params.status,
      params.failureReason,
    );
  }
}

export class SmsDispatchView extends SmsDispatchSummaryView {
  private constructor(
    summary: SmsDispatchSummaryViewProps,
    readonly deliveries: readonly SmsDeliveryView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {
    super(
      summary.id,
      summary.voteId,
      summary.fieldVotingSessionId,
      summary.purpose,
      summary.sentAt,
      summary.recipientCount,
      summary.successCount,
      summary.failureCount,
    );
  }

  static of(
    params: SmsDispatchSummaryViewProps & {
      readonly deliveries: readonly SmsDeliveryView[];
      readonly page: number;
      readonly pageSize: number;
      readonly totalItems: number;
      readonly totalPages: number;
    },
  ): SmsDispatchView {
    return new SmsDispatchView(
      params,
      params.deliveries,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}

export class SmsDispatchPageView {
  private constructor(
    readonly items: readonly SmsDispatchSummaryView[],
    readonly page: number,
    readonly pageSize: number,
    readonly totalItems: number,
    readonly totalPages: number,
  ) {}

  static of(params: {
    readonly items: readonly SmsDispatchSummaryView[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }): SmsDispatchPageView {
    return new SmsDispatchPageView(
      params.items,
      params.page,
      params.pageSize,
      params.totalItems,
      params.totalPages,
    );
  }
}
