import type { ParticipationReference } from '../../../domain/voting/capability-reference';

export const PARTICIPATION_ACCESS_PORT = Symbol('PARTICIPATION_ACCESS_PORT');

export interface ParticipationAccessPort {
  findById(id: string): Promise<ParticipationReference | undefined>;
}
