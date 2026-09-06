'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useState } from 'react';

import { isApiMockMode } from '@/shared/config/api-mode';

import {
  getParticipationErrorMessage,
  participationApi,
} from '../api/participation-api';
import { ParticipationView } from '../ui/participation-view';

interface ParticipationContainerProps {
  electorId?: string;
  electorLabel: string;
  voteId?: string;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ParticipationContainer({
  electorId,
  electorLabel,
  voteId,
}: ParticipationContainerProps) {
  const apiMockMode = isApiMockMode();
  const hasValidIdentifiers = Boolean(
    voteId &&
      electorId &&
      (apiMockMode ||
        (UUID_PATTERN.test(voteId) && UUID_PATTERN.test(electorId))),
  );
  const [identityVerified, setIdentityVerified] = useState(false);
  const [completedBallotIds, setCompletedBallotIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const accessQuery = useQuery({
    queryKey: ['participation', 'access', voteId, electorId],
    queryFn: () =>
      participationApi.getAccess({
        electorId: electorId!,
        electorLabel,
        voteId: voteId!,
      }),
    enabled: hasValidIdentifiers,
    retry: false,
  });

  const authenticationMutation = useMutation({
    mutationFn: participationApi.authenticate,
    onMutate: () => {
      setErrorMessage(undefined);
      setMessage(undefined);
    },
    onSuccess: (result) => {
      if (!result.identityVerified) {
        setIdentityVerified(false);
        setErrorMessage(
          '개발용 Mock 본인확인 결과가 실패로 반환되었습니다. 새 요청으로 다시 시도해 주세요.',
        );
        return;
      }
      setIdentityVerified(true);
      setMessage(
        '개발용 Mock 본인확인이 완료되었습니다. 실제 PASS 또는 SMS 인증 결과가 아닙니다.',
      );
    },
    onError: (error) => {
      setErrorMessage(getParticipationErrorMessage(error, 'authenticate'));
    },
  });

  const castMutation = useMutation({
    mutationFn: participationApi.cast,
    onMutate: () => {
      setErrorMessage(undefined);
      setMessage(undefined);
    },
    onSuccess: (result) => {
      setCompletedBallotIds((current) => {
        const next = new Set(current);
        next.add(result.voteDetailId);
        return next;
      });
      setMessage(
        '선택이 서버에 기록되었습니다. 남은 투표 항목은 각각 제출해 주세요.',
      );
    },
    onError: (error) => {
      setErrorMessage(getParticipationErrorMessage(error, 'cast'));
    },
  });

  if (!voteId || !electorId) {
    return (
      <ParticipationView
        electorIdentityState="unverified"
        onAuthenticate={async () => undefined}
        onCast={async () => undefined}
        state={{ kind: 'missing' }}
      />
    );
  }

  if (
    !apiMockMode &&
    (!UUID_PATTERN.test(voteId) || !UUID_PATTERN.test(electorId))
  ) {
    return (
      <ParticipationView
        electorIdentityState="unverified"
        onAuthenticate={async () => undefined}
        onCast={async () => undefined}
        state={{
          kind: 'error',
          message: '참여 링크의 투표 또는 선거인 식별자가 올바르지 않습니다.',
        }}
      />
    );
  }

  const access = accessQuery.data
    ? {
        ...accessQuery.data,
        ballots: accessQuery.data.ballots.map((ballot) => ({
          ...ballot,
          participated: completedBallotIds.has(ballot.id),
        })),
        elector: {
          ...accessQuery.data.elector,
          identityVerified,
        },
      }
    : undefined;

  return (
    <ParticipationView
      electorIdentityState={
        authenticationMutation.isPending
          ? 'verifying'
          : identityVerified
            ? 'verified'
            : 'unverified'
      }
      errorMessage={
        accessQuery.isError
          ? getParticipationErrorMessage(accessQuery.error, 'load')
          : errorMessage
      }
      message={message}
      onAuthenticate={async () => {
        try {
          await authenticationMutation.mutateAsync({ electorId, voteId });
        } catch {
          // The mutation callback renders the accessible error message.
        }
      }}
      onCast={async (voteDetailId, selectedCandidateId) => {
        try {
          await castMutation.mutateAsync({
            electorId,
            selectedCandidateId,
            voteDetailId,
            voteId,
          });
        } catch {
          // The mutation callback retains the ballot and renders the error.
        }
      }}
      onRetryLoad={() => void accessQuery.refetch()}
      state={
        accessQuery.isLoading
          ? { kind: 'loading' }
          : access
            ? { kind: 'ready', access }
            : {
                kind: 'error',
                message: getParticipationErrorMessage(
                  accessQuery.error,
                  'load',
                ),
              }
      }
      submittingBallotId={
        castMutation.isPending ? castMutation.variables?.voteDetailId : undefined
      }
    />
  );
}
