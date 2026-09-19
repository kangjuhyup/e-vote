export const UPCOMING_VOTE_NOTICE_TEMPLATE = {
  code: 'UPCOMING_VOTE_NOTICE',
  content:
    '[전자투표]\n곧 투표가 시작됩니다. 투표 일정과 참여 방법을 확인해 주세요.',
} as const;

export const VOTE_RESULT_NOTICE_TEMPLATE = {
  code: 'VOTE_RESULT_NOTICE',
  content: '[전자투표]\n투표가 종료되었습니다. 투표 결과를 확인해 주세요.',
} as const;
