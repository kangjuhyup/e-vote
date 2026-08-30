import { Injectable } from '@nestjs/common';
import { EntityManager } from '@mikro-orm/postgresql';
import type { VoteStatisticsReadRepositoryPort } from '../../../../application/port/persistence/query/vote-statistics-read-repository.port';
import {
  CandidateVoteResultView,
  VoteResultView,
  VotingChannelResultView,
} from '../../../../application/query/dto/response/vote-result.view';
import { VoteTurnoutView } from '../../../../application/query/dto/response/vote-turnout.view';
import type { CandidateStatus } from '../../../../domain/candidate/type/candidate-status.type';
import type {
  ParticipationUnit,
  PrivacyMode,
  VoteWeightMode,
} from '../../../../domain/vote/type/vote-policy.type';
import type { VotingChannel } from '../../../../domain/vote/type/voting-channel.type';
import type {
  VoteDetailStatus,
  VoteStatus,
} from '../../../../domain/vote/type/vote-status.type';

type TurnoutRow = {
  readonly vote_id: string;
  readonly vote_detail_id: string;
  readonly participation_unit: ParticipationUnit;
  readonly vote_weight_mode: VoteWeightMode;
  readonly group_vote_weight_consistent: boolean;
  readonly eligible_elector_count: number | string;
  readonly eligible_voting_unit_count: number | string;
  readonly participant_count: number | string;
  readonly participated_voting_unit_count: number | string;
  readonly eligible_vote_weight: number | string;
  readonly participated_vote_weight: number | string;
};

type CandidateResultRow = {
  readonly candidateId: string;
  readonly candidateNo: number | string;
  readonly name: string;
  readonly status: CandidateStatus;
  readonly voteCount: number | string;
  readonly weightedVoteCount: number | string;
};

type VotingChannelResultRow = {
  readonly channel: VotingChannel;
  readonly participantCount: number | string;
  readonly participatedVoteWeight: number | string;
};

type ResultRow = {
  readonly vote_id: string;
  readonly vote_detail_id: string;
  readonly vote_status: VoteStatus;
  readonly vote_detail_status: VoteDetailStatus;
  readonly privacy_mode: PrivacyMode;
  readonly participation_unit: ParticipationUnit;
  readonly vote_weight_mode: VoteWeightMode;
  readonly participant_count: number | string;
  readonly participated_vote_weight: number | string;
  readonly candidates: readonly CandidateResultRow[] | string;
  readonly voting_channels: readonly VotingChannelResultRow[] | string;
};

const TURNOUT_QUERY = `
  with policy as (
    select
      v.id as vote_id,
      vd.id as vote_detail_id,
      coalesce(vd.participation_unit_override, v.default_participation_unit) as participation_unit,
      coalesce(vd.vote_weight_mode_override, v.default_vote_weight_mode) as vote_weight_mode
    from vote_details vd
    join votes v on v.id = vd.vote_id
    where v.id = ? and vd.id = ?
  ),
  eligible_electors as (
    select e.id, e.group_key, e.vote_weight
    from electors e
    join policy p on p.vote_id = e.vote_id
    where e.status = 'ELIGIBLE'
  ),
  eligible_voting_units as (
    select
      case when p.participation_unit = 'GROUP' then e.group_key else e.id::text end as unit_key,
      case when p.vote_weight_mode = 'SHARE' then max(e.vote_weight) else 1::numeric end as vote_weight,
      count(distinct e.vote_weight) = 1 as group_vote_weight_consistent
    from eligible_electors e
    cross join policy p
    where p.participation_unit <> 'GROUP' or e.group_key is not null
    group by
      p.participation_unit,
      p.vote_weight_mode,
      case when p.participation_unit = 'GROUP' then e.group_key else e.id::text end
  ),
  cast_participations as (
    select vp.elector_id, vp.group_key, vp.vote_weight
    from vote_participations vp
    join policy p on p.vote_detail_id = vp.vote_detail_id
    where vp.status = 'CAST'
  )
  select
    p.vote_id,
    p.vote_detail_id,
    p.participation_unit,
    p.vote_weight_mode,
    coalesce((
      select bool_and(evu.group_vote_weight_consistent)
      from eligible_voting_units evu
    ), true) as group_vote_weight_consistent,
    (select count(*) from eligible_electors) as eligible_elector_count,
    (select count(*) from eligible_voting_units) as eligible_voting_unit_count,
    (select count(*) from cast_participations) as participant_count,
    (
      select count(distinct case
        when p.participation_unit = 'GROUP' then cp.group_key
        else cp.elector_id::text
      end)
      from cast_participations cp
    ) as participated_voting_unit_count,
    (select coalesce(sum(evu.vote_weight), 0) from eligible_voting_units evu) as eligible_vote_weight,
    (select coalesce(sum(cp.vote_weight), 0) from cast_participations cp) as participated_vote_weight
  from policy p
`;

const RESULT_QUERY = `
  with policy as (
    select
      v.id as vote_id,
      vd.id as vote_detail_id,
      v.status as vote_status,
      vd.status as vote_detail_status,
      coalesce(vd.privacy_mode_override, v.default_privacy_mode) as privacy_mode,
      coalesce(vd.participation_unit_override, v.default_participation_unit) as participation_unit,
      coalesce(vd.vote_weight_mode_override, v.default_vote_weight_mode) as vote_weight_mode
    from vote_details vd
    join votes v on v.id = vd.vote_id
    where v.id = ? and vd.id = ?
  ),
  cast_participations as (
    select vp.voting_channel, vp.vote_weight
    from vote_participations vp
    join policy p on p.vote_detail_id = vp.vote_detail_id
    where vp.status = 'CAST'
  ),
  participation_totals as (
    select
      count(*) as participant_count,
      coalesce(sum(cp.vote_weight), 0) as participated_vote_weight
    from cast_participations cp
  ),
  candidate_results as (
    select
      c.id as candidate_id,
      c.candidate_no,
      c.name,
      c.status,
      coalesce(vr.vote_count, 0) as vote_count,
      coalesce(vr.weighted_vote_count, 0) as weighted_vote_count
    from candidates c
    join policy p on p.vote_detail_id = c.vote_detail_id
    left join vote_results vr
      on vr.vote_detail_id = c.vote_detail_id
      and vr.candidate_id = c.id
  ),
  channel_results as (
    select
      cp.voting_channel,
      count(*) as participant_count,
      coalesce(sum(cp.vote_weight), 0) as participated_vote_weight
    from cast_participations cp
    group by cp.voting_channel
  )
  select
    p.vote_id,
    p.vote_detail_id,
    p.vote_status,
    p.vote_detail_status,
    p.privacy_mode,
    p.participation_unit,
    p.vote_weight_mode,
    pt.participant_count,
    pt.participated_vote_weight,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'candidateId', cr.candidate_id,
          'candidateNo', cr.candidate_no,
          'name', cr.name,
          'status', cr.status,
          'voteCount', cr.vote_count,
          'weightedVoteCount', cr.weighted_vote_count
        ) order by cr.candidate_no, cr.candidate_id
      )
      from candidate_results cr
    ), '[]'::jsonb) as candidates,
    coalesce((
      select jsonb_agg(
        jsonb_build_object(
          'channel', chr.voting_channel,
          'participantCount', chr.participant_count,
          'participatedVoteWeight', chr.participated_vote_weight
        ) order by chr.voting_channel
      )
      from channel_results chr
    ), '[]'::jsonb) as voting_channels
  from policy p
  cross join participation_totals pt
`;

@Injectable()
export class VoteStatisticsReadRepositoryAdapter implements VoteStatisticsReadRepositoryPort {
  constructor(private readonly em: EntityManager) {}

  async getTurnout(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteTurnoutView | undefined> {
    const rows = await this.em
      .getConnection()
      .execute<TurnoutRow[]>(TURNOUT_QUERY, [voteId, voteDetailId]);
    const row = rows[0];

    if (!row) {
      return undefined;
    }

    const eligibleVotingUnitCount = toNumber(row.eligible_voting_unit_count);
    const participatedVotingUnitCount = toNumber(
      row.participated_voting_unit_count,
    );
    const eligibleVoteWeight = toNumber(row.eligible_vote_weight);
    const participatedVoteWeight = toNumber(row.participated_vote_weight);

    return VoteTurnoutView.of({
      voteId: row.vote_id,
      voteDetailId: row.vote_detail_id,
      participationUnit: row.participation_unit,
      voteWeightMode: row.vote_weight_mode,
      groupVoteWeightConsistent: row.group_vote_weight_consistent,
      eligibleElectorCount: toNumber(row.eligible_elector_count),
      eligibleVotingUnitCount,
      participantCount: toNumber(row.participant_count),
      participatedVotingUnitCount,
      turnoutRate: percentage(
        participatedVotingUnitCount,
        eligibleVotingUnitCount,
      ),
      eligibleVoteWeight,
      participatedVoteWeight,
      weightedTurnoutRate: percentage(
        participatedVoteWeight,
        eligibleVoteWeight,
      ),
    });
  }

  async getResult(
    voteId: string,
    voteDetailId: string,
  ): Promise<VoteResultView | undefined> {
    const rows = await this.em
      .getConnection()
      .execute<ResultRow[]>(RESULT_QUERY, [voteId, voteDetailId]);
    const row = rows[0];

    if (!row) {
      return undefined;
    }

    const candidateRows = parseJsonArray<CandidateResultRow>(row.candidates);
    const channelRows = parseJsonArray<VotingChannelResultRow>(
      row.voting_channels,
    );
    const participantCount = toNumber(row.participant_count);
    const participatedVoteWeight = toNumber(row.participated_vote_weight);
    const totalVoteCount = candidateRows.reduce(
      (sum, candidate) => sum + toNumber(candidate.voteCount),
      0,
    );
    const totalWeightedVoteCount = candidateRows.reduce(
      (sum, candidate) => sum + toNumber(candidate.weightedVoteCount),
      0,
    );

    return VoteResultView.of({
      voteId: row.vote_id,
      voteDetailId: row.vote_detail_id,
      voteStatus: row.vote_status,
      voteDetailStatus: row.vote_detail_status,
      privacyMode: row.privacy_mode,
      participationUnit: row.participation_unit,
      voteWeightMode: row.vote_weight_mode,
      participantCount,
      participatedVoteWeight,
      totalVoteCount,
      totalWeightedVoteCount,
      candidates: candidateRows.map((candidate) =>
        CandidateVoteResultView.of({
          candidateId: candidate.candidateId,
          candidateNo: toNumber(candidate.candidateNo),
          name: candidate.name,
          status: candidate.status,
          voteCount: toNumber(candidate.voteCount),
          voteRate: percentage(toNumber(candidate.voteCount), totalVoteCount),
          weightedVoteCount: toNumber(candidate.weightedVoteCount),
          weightedVoteRate: percentage(
            toNumber(candidate.weightedVoteCount),
            totalWeightedVoteCount,
          ),
        }),
      ),
      votingChannels: channelRows.map((channel) =>
        VotingChannelResultView.of({
          channel: channel.channel,
          participantCount: toNumber(channel.participantCount),
          participationRate: percentage(
            toNumber(channel.participantCount),
            participantCount,
          ),
          participatedVoteWeight: toNumber(channel.participatedVoteWeight),
          weightedParticipationRate: percentage(
            toNumber(channel.participatedVoteWeight),
            participatedVoteWeight,
          ),
        }),
      ),
    });
  }
}

function toNumber(value: number | string): number {
  return Number(value);
}

function percentage(numerator: number, denominator: number): number {
  if (denominator <= 0) {
    return 0;
  }

  const value = Math.max(0, Math.min(100, (numerator / denominator) * 100));
  return Math.round(value * 100) / 100;
}

function parseJsonArray<T>(value: readonly T[] | string): readonly T[] {
  return typeof value === 'string' ? (JSON.parse(value) as T[]) : value;
}
