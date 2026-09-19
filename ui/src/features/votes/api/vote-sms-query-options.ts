import { keepPreviousData, queryOptions } from '@tanstack/react-query';

import { resolveApiMode } from '@/shared/config/api-mode';

import { voteSmsApi } from './vote-sms-api';
import type { VoteSmsPurpose } from '../model/vote-sms.types';

const apiMode = resolveApiMode();

export function voteSmsTemplateQueryOptions(
  voteId: string,
  purpose: VoteSmsPurpose,
) {
  return queryOptions({
    queryKey: ['vote-sms', apiMode, voteId, purpose, 'template'],
    queryFn: () => voteSmsApi.fetchVoteSmsTemplate(voteId, purpose),
  });
}

export function voteSmsDispatchPageQueryOptions(
  voteId: string,
  page: number,
  pageSize = 20,
) {
  return queryOptions({
    queryKey: ['vote-sms', apiMode, voteId, 'dispatches', page, pageSize],
    queryFn: () => voteSmsApi.fetchDispatchPage(voteId, page, pageSize),
    placeholderData: keepPreviousData,
  });
}

export function voteSmsDispatchQueryOptions(
  voteId: string,
  dispatchId: string,
  page: number,
  pageSize = 50,
) {
  return queryOptions({
    queryKey: [
      'vote-sms',
      apiMode,
      voteId,
      'dispatches',
      dispatchId,
      page,
      pageSize,
    ],
    queryFn: () => voteSmsApi.fetchDispatch(voteId, dispatchId, page, pageSize),
    placeholderData: keepPreviousData,
  });
}
