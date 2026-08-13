import type { CandidateAggregate } from '../../domain/candidate/candidate.aggregate';

export const CANDIDATE_REPOSITORY_PORT = Symbol('CANDIDATE_REPOSITORY_PORT');

export interface CandidateRepositoryPort {
  nextId(): string;
  findById(candidateId: string): Promise<CandidateAggregate | undefined>;
  save(candidate: CandidateAggregate): Promise<void>;
}
