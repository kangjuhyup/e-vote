import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { VoteResultStoragePricingAccessPort } from '../../../../../../shared/application/port/capability/vote-result-storage-pricing-access.port';

type BlockchainVoteDetailCountRow = {
  readonly count: number | string;
};

const COUNT_BLOCKCHAIN_VOTE_DETAILS_QUERY = `
  select count(*)::integer as "count"
  from "vote_details" as "vote_detail"
  inner join "votes" as "vote" on "vote"."id" = "vote_detail"."vote_id"
  where "vote_detail"."vote_id" = ?
    and "vote_detail"."status" <> 'CANCELED'
    and coalesce(
      "vote_detail"."result_storage_mode_override",
      "vote"."default_result_storage_mode"
    ) = 'BLOCKCHAIN'
`;

@Injectable()
export class VoteResultStoragePricingAccessAdapter implements VoteResultStoragePricingAccessPort {
  constructor(private readonly em: EntityManager) {}

  async countBlockchainVoteDetails(voteId: string): Promise<number> {
    const rows = await this.em
      .getConnection()
      .execute<BlockchainVoteDetailCountRow[]>(
        COUNT_BLOCKCHAIN_VOTE_DETAILS_QUERY,
        [voteId],
        'all',
        this.em.getTransactionContext(),
      );

    return Number(rows[0]?.count ?? 0);
  }
}
