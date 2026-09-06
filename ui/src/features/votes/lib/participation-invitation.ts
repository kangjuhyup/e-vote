import type { ParticipationInvitationDispatchResult } from '../model/participation-invitation.types';

export function formatInvitationDispatchResult(result: ParticipationInvitationDispatchResult) {
  return `총 ${result.totalCount.toLocaleString()}명 중 ${result.queuedCount.toLocaleString()}건을 발송 대기열에 등록했습니다.${result.skippedCount > 0 ? ` 휴대전화 정보가 없는 ${result.skippedCount.toLocaleString()}명은 제외했습니다.` : ''}`;
}
