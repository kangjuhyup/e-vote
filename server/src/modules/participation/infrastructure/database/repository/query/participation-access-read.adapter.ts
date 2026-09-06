import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type {
  ParticipationAccessReadPort,
  ParticipationAccessReadView,
} from '../../../../../../shared/application/port/capability/participation-access-read.port';

type VoteRow = {
  id: string;
  title: string;
  description: string;
  status: string;
  started_at: Date;
  ended_at: Date;
  identity_verification_required: boolean;
};
type ElectorRow = {
  identifier: string;
  status: string;
  identity_verified: boolean;
};
type BallotRow = {
  id: string;
  title: string;
  description: string;
  type: string;
  status: string;
  sort_order: number;
  participated: boolean;
};
type CandidateRow = {
  id: string;
  vote_detail_id: string;
  candidate_no: number;
  name: string;
  description: string;
};

@Injectable()
export class ParticipationAccessReadAdapter implements ParticipationAccessReadPort {
  constructor(private readonly em: EntityManager) {}

  async find(
    voteId: string,
    electorId: string,
  ): Promise<ParticipationAccessReadView | undefined> {
    const connection = this.em.getConnection();
    const [votes, electors, ballots, candidates] = await Promise.all([
      connection.execute<VoteRow[]>(
        `select id, title, description, status, started_at, ended_at,
                identity_verification_required
         from votes where id = ?`,
        [voteId],
      ),
      connection.execute<ElectorRow[]>(
        `select elector.identifier, elector.status,
                exists (
                  select 1 from elector_identity_verifications verification
                  where verification.elector_id = elector.id
                    and verification.status = 'SUCCESS'
                ) as identity_verified
         from electors elector where elector.id = ? and elector.vote_id = ?`,
        [electorId, voteId],
      ),
      connection.execute<BallotRow[]>(
        `select detail.id, detail.title, detail.description, detail.type,
                detail.status, detail.sort_order,
                exists (
                  select 1 from vote_participations participation
                  where participation.vote_detail_id = detail.id
                    and participation.elector_id = ?
                    and participation.status = 'CAST'
                ) as participated
         from vote_details detail
         where detail.vote_id = ?
         order by detail.sort_order asc, detail.id asc`,
        [electorId, voteId],
      ),
      connection.execute<CandidateRow[]>(
        `select candidate.id, candidate.vote_detail_id, candidate.candidate_no,
                candidate.name, candidate.description
         from candidates candidate
         join vote_details detail on detail.id = candidate.vote_detail_id
         where detail.vote_id = ? and candidate.status = 'ACTIVE'
         order by detail.sort_order asc, candidate.candidate_no asc`,
        [voteId],
      ),
    ]);
    const vote = votes[0];
    const elector = electors[0];
    if (!vote || !elector) return undefined;

    return {
      vote: {
        id: vote.id,
        title: vote.title,
        description: vote.description,
        status: vote.status,
        startedAt: vote.started_at,
        endedAt: vote.ended_at,
        identityVerificationRequired: vote.identity_verification_required,
      },
      elector: {
        label: elector.identifier,
        status: elector.status,
        identityVerified: elector.identity_verified,
      },
      ballots: ballots.map((ballot) => ({
        id: ballot.id,
        title: ballot.title,
        description: ballot.description,
        type: ballot.type,
        status: ballot.status,
        sortOrder: ballot.sort_order,
        participated: ballot.participated,
        candidates: candidates
          .filter((candidate) => candidate.vote_detail_id === ballot.id)
          .map((candidate) => ({
            id: candidate.id,
            candidateNo: candidate.candidate_no,
            name: candidate.name,
            description: candidate.description,
          })),
      })),
    };
  }
}
