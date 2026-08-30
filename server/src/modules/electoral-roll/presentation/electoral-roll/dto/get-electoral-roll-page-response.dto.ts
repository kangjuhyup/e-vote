import { ApiProperty } from '@nestjs/swagger';

type ElectoralRollPageItemSource = {
  readonly id: string;
  readonly name: string;
  readonly commissionId: string;
  readonly revision: number;
  readonly memberCount: number;
  readonly updatedAt: Date;
};

export class ElectoralRollPageItemResponse {
  @ApiProperty({ example: 'electoral-roll-1' }) readonly id: string;
  @ApiProperty({ example: '2026 상반기 선거인명부' }) readonly name: string;
  @ApiProperty({ example: 'commission-1' }) readonly commissionId: string;
  @ApiProperty({ example: 2 }) readonly revision: number;
  @ApiProperty({ example: 120 }) readonly memberCount: number;
  @ApiProperty({
    example: '2026-08-30T10:00:00.000Z',
    format: 'date-time',
  })
  readonly updatedAt: string;

  private constructor(source: ElectoralRollPageItemSource) {
    this.id = source.id;
    this.name = source.name;
    this.commissionId = source.commissionId;
    this.revision = source.revision;
    this.memberCount = source.memberCount;
    this.updatedAt = source.updatedAt.toISOString();
  }

  static of(
    source: ElectoralRollPageItemSource,
  ): ElectoralRollPageItemResponse {
    return new ElectoralRollPageItemResponse(source);
  }
}

export class GetElectoralRollPageResponse {
  @ApiProperty({ type: () => [ElectoralRollPageItemResponse] })
  readonly items: readonly ElectoralRollPageItemResponse[];
  @ApiProperty({ example: 1 }) readonly page: number;
  @ApiProperty({ example: 20 }) readonly pageSize: number;
  @ApiProperty({ example: 1 }) readonly totalItems: number;
  @ApiProperty({ example: 1 }) readonly totalPages: number;

  private constructor(source: {
    readonly items: readonly ElectoralRollPageItemSource[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }) {
    this.items = source.items.map((item) =>
      ElectoralRollPageItemResponse.of(item),
    );
    this.page = source.page;
    this.pageSize = source.pageSize;
    this.totalItems = source.totalItems;
    this.totalPages = source.totalPages;
  }

  static of(source: {
    readonly items: readonly ElectoralRollPageItemSource[];
    readonly page: number;
    readonly pageSize: number;
    readonly totalItems: number;
    readonly totalPages: number;
  }): GetElectoralRollPageResponse {
    return new GetElectoralRollPageResponse(source);
  }
}
