'use client';

import { useEffect, useState } from 'react';
import { VoteApiError } from '@/shared/api/vote-api-error';
import { participationApi } from '../api/participation-api';
import type { ParticipationAccess } from '../model/participation.types';
import { ParticipationView } from '../ui/participation-view';

type LoadState =
  | { kind: 'loading' }
  | { kind: 'missing' }
  | { kind: 'error'; message: string }
  | { kind: 'ready'; access: ParticipationAccess; token: string };

export function ParticipationContainer() {
  const [state, setState] = useState<LoadState>({ kind: 'loading' });
  const [submittingBallotId, setSubmittingBallotId] = useState<string>();
  const [message, setMessage] = useState<string>();

  useEffect(() => {
    const token = window.location.hash.slice(1);
    if (!token) {
      queueMicrotask(() => setState({ kind: 'missing' }));
      return undefined;
    }
    window.history.replaceState(null, '', `${window.location.pathname}${window.location.search}`);
    let active = true;
    participationApi.getAccess(token)
      .then((access) => active && setState({ kind: 'ready', access, token }))
      .catch((error: unknown) => active && setState({ kind: 'error', message: accessErrorMessage(error) }));
    return () => { active = false; };
  }, []);

  async function cast(voteDetailId: string, selectedCandidateId: string) {
    if (state.kind !== 'ready') return;
    setSubmittingBallotId(voteDetailId);
    setMessage(undefined);
    try {
      await participationApi.cast({ token: state.token, voteDetailId, selectedCandidateId });
      const access = await participationApi.getAccess(state.token);
      setState({ kind: 'ready', access, token: state.token });
      setMessage('선택이 안전하게 제출되었습니다.');
    } catch (error) {
      setMessage(castErrorMessage(error));
    } finally {
      setSubmittingBallotId(undefined);
    }
  }

  return (
    <ParticipationView
      state={state}
      message={message}
      submittingBallotId={submittingBallotId}
      onCast={cast}
    />
  );
}

function accessErrorMessage(error: unknown): string {
  if (error instanceof VoteApiError && error.status === 410) {
    return '참여 링크의 유효기간이 지났거나 새 링크로 교체되었습니다.';
  }
  if (error instanceof VoteApiError && error.status === 404) {
    return '유효하지 않은 참여 링크입니다.';
  }
  return '투표 정보를 불러오지 못했습니다. 잠시 후 다시 시도해 주세요.';
}

function castErrorMessage(error: unknown): string {
  if (error instanceof VoteApiError && error.status === 409) {
    return '이미 참여했거나 현재 이 항목에 투표할 수 없습니다.';
  }
  if (error instanceof VoteApiError && error.status === 410) {
    return '참여 링크가 만료되었습니다. 새 안내 문자를 요청해 주세요.';
  }
  return '선택을 제출하지 못했습니다. 잠시 후 다시 시도해 주세요.';
}
