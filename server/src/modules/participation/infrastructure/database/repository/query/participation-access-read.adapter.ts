import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { ParticipationAccessReadPort } from '../../../../application/port/persistence/query/participation-access-read.port';
import {
  ParticipationAccessBallotView,
  ParticipationAccessCandidateView,
  ParticipationAccessVoteDetailView,
} from '../../../../application/query/dto/response/participation-access.view';
import type { VoteDetailType } from '../../../../../../shared/domain/voting/type/vote-detail.type';
import type {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../../../shared/domain/voting/type/vote-status.type';

interface AccessRow {
  readonly vote_id: string;
  readonly vote_title: string;
  readonly vote_description: string;
  readonly vote_status: VoteStatus;
  readonly started_at: Date | string;
  readonly ended_at: Date | string;
  readonly has_confirmed_signature: boolean;
  readonly vote_detail_id: string | null;
  readonly vote_detail_title: string | null;
  readonly vote_detail_description: string | null;
  readonly vote_detail_type: VoteDetailType | null;
  readonly vote_detail_status: VoteDetailStatus | null;
  readonly vote_detail_sort_order: number | null;
  readonly participated: boolean;
  readonly candidate_id: string | null;
  readonly candidate_no: number | null;
  readonly candidate_name: string | null;
  readonly candidate_description: string | null;
}

@Injectable()
export class ParticipationAccessReadAdapter implements ParticipationAccessReadPort {
  constructor(private readonly em: EntityManager) {}

  async findBallot(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationAccessBallotView | undefined> {
    const rows = await this.em.getConnection().execute<AccessRow[]>(
      `select v.id as vote_id, v.title as vote_title,
              v.description as vote_description, v.status as vote_status,
              v.started_at, v.ended_at,
              exists (
                select 1 from elector_attachments ea
                join files f on f.id = ea.file_id
                where ea.elector_id = ? and ea.type = 'SIGNATURE'
                  and f.status = 'ACTIVE'
              ) as has_confirmed_signature,
              vd.id as vote_detail_id, vd.title as vote_detail_title,
              vd.description as vote_detail_description,
              vd.type as vote_detail_type, vd.status as vote_detail_status,
              vd.sort_order as vote_detail_sort_order,
              exists (
                select 1 from vote_participations vp
                where vp.vote_detail_id = vd.id and vp.elector_id = ?
                  and vp.status = 'CAST'
              ) as participated,
              c.id as candidate_id, c.candidate_no, c.name as candidate_name,
              c.description as candidate_description
       from votes v
       left join vote_details vd on vd.vote_id = v.id and vd.status <> 'CANCELED'
       left join candidates c on c.vote_detail_id = vd.id and c.status = 'ACTIVE'
       where v.id = ?
       order by vd.sort_order, c.candidate_no, c.id`,
      [electorId, electorId, voteId],
      'all',
      this.em.getTransactionContext(),
    );
    const first = rows[0];
    if (!first) return undefined;

    const details = new Map<string, MutableDetail>();
    for (const row of rows) {
      if (!row.vote_detail_id) continue;
      let detail = details.get(row.vote_detail_id);
      if (!detail) {
        detail = {
          id: row.vote_detail_id,
          title: row.vote_detail_title ?? '',
          description: row.vote_detail_description ?? '',
          type: row.vote_detail_type as VoteDetailType,
          status: row.vote_detail_status as VoteDetailStatus,
          sortOrder: Number(row.vote_detail_sort_order),
          participated: Boolean(row.participated),
          candidates: [],
        };
        details.set(detail.id, detail);
      }
      if (row.candidate_id) {
        detail.candidates.push(
          ParticipationAccessCandidateView.of({
            id: row.candidate_id,
            candidateNo: Number(row.candidate_no),
            name: row.candidate_name ?? '',
            description: row.candidate_description ?? '',
          }),
        );
      }
    }

    return ParticipationAccessBallotView.of({
      vote: {
        id: first.vote_id,
        title: first.vote_title,
        description: first.vote_description,
        status: first.vote_status,
        startedAt: new Date(first.started_at),
        endedAt: new Date(first.ended_at),
      },
      hasConfirmedSignature: Boolean(first.has_confirmed_signature),
      voteDetails: [...details.values()].map((detail) =>
        ParticipationAccessVoteDetailView.of(detail),
      ),
    });
  }
}

type MutableDetail = Omit<ParticipationAccessVoteDetailView, 'candidates'> & {
  candidates: Array<ParticipationAccessVoteDetailView['candidates'][number]>;
};
