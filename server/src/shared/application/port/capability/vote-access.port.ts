import type {
  CandidateReference,
  VoteDetailReference,
  VoteReference,
} from '../../../domain/voting/capability-reference';

export const VOTE_ACCESS_PORT = Symbol('VOTE_ACCESS_PORT');
export interface VoteAccessPort {
  findById(id: string): Promise<VoteReference | undefined>;
}

export const VOTE_DETAIL_ACCESS_PORT = Symbol('VOTE_DETAIL_ACCESS_PORT');
export interface VoteDetailAccessPort {
  findById(id: string): Promise<VoteDetailReference | undefined>;
}

export const CANDIDATE_ACCESS_PORT = Symbol('CANDIDATE_ACCESS_PORT');
export interface CandidateAccessPort {
  findById(id: string): Promise<CandidateReference | undefined>;
}
