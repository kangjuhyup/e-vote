import type { ElectorReference } from '../../../domain/voting/capability-reference';

export const ELECTOR_ACCESS_PORT = Symbol('ELECTOR_ACCESS_PORT');

export interface ElectorAccessPort {
  findById(
    voteId: string,
    electorId: string,
  ): Promise<ElectorReference | undefined>;
}
