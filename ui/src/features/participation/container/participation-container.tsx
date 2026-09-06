'use client';

import { useMutation, useQuery } from '@tanstack/react-query';
import { useRef, useState } from 'react';
import { VoteApiError } from '@/shared/api/vote-api-error';
import { ParticipationSignature } from '../ui/participation-signature';
import type {
  SignatureUploadStage,
  VotingChannel,
} from '../model/participation.types';

import { isApiMockMode } from '@/shared/config/api-mode';

import {
  getParticipationErrorMessage,
  participationApi,
  participationPreviewApi,
} from '../api/participation-api';
import { ParticipationView } from '../ui/participation-view';

interface ParticipationContainerProps {
  electorId?: string;
  electorLabel: string;
  previewMode?: boolean;
  voteId?: string;
  votingChannel?: VotingChannel;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function ParticipationContainer(props: ParticipationContainerProps) {
  return (
    <ParticipationSession
      key={`${props.voteId}:${props.electorId}:${props.previewMode}:${props.votingChannel}`}
      {...props}
    />
  );
}

function ParticipationSession({
  electorId,
  electorLabel,
  previewMode = false,
  voteId,
  votingChannel = 'ONLINE',
}: ParticipationContainerProps) {
  const apiMockMode = isApiMockMode();
  const client = previewMode ? participationPreviewApi : participationApi;
  const resolvedVoteId = voteId ?? mockAccessIds.voteId;
  const resolvedElectorId = electorId ?? mockAccessIds.electorId;
  const hasValidIdentifiers =
    previewMode ||
    Boolean(
      voteId &&
      electorId &&
      (apiMockMode ||
        (UUID_PATTERN.test(voteId) && UUID_PATTERN.test(electorId))),
    );
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureStage, setSignatureStage] =
    useState<SignatureUploadStage>('requesting');
  const submissionBusy = useRef(false);
  const [submittingResults, setSubmittingResults] = useState(false);
  const [identityVerified, setIdentityVerified] = useState(false);
  const [completedBallotIds, setCompletedBallotIds] = useState<Set<string>>(
    () => new Set(),
  );
  const [message, setMessage] = useState<string>();
  const [errorMessage, setErrorMessage] = useState<string>();

  const accessQuery = useQuery({
    queryKey: [
      'participation',
      previewMode ? 'preview' : 'access',
      resolvedVoteId,
      resolvedElectorId,
    ],
    queryFn: () =>
      client.getAccess({
        electorId: resolvedElectorId,
        electorLabel,
        voteId: resolvedVoteId,
      }),
    enabled: hasValidIdentifiers,
    retry: false,
  });

  const authenticationMutation = useMutation({
    mutationFn: client.authenticate,
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
        previewMode
          ? undefined
          : '개발용 Mock 본인확인이 완료되었습니다. 실제 PASS 또는 SMS 인증 결과가 아닙니다.',
      );
    },
    onError: (error) => {
      setErrorMessage(getParticipationErrorMessage(error, 'authenticate'));
    },
  });

  const signatureMutation = useMutation({
    mutationFn: client.uploadSignature,
    retry: false,
  });

  const castMutation = useMutation({
    mutationFn: client.cast,
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
        previewMode ? undefined : '선택이 서버에 기록되었습니다.',
      );
    },
    onError: (error) => {
      if (error instanceof VoteApiError && error.status === 409)
        signatureMutation.reset();
      setErrorMessage(getParticipationErrorMessage(error, 'cast'));
    },
  });

  if (!previewMode && (!voteId || !electorId)) {
    return (
      <ParticipationView
        electorIdentityState="unverified"
        onAuthenticate={async () => undefined}
        onSubmitResults={async () => undefined}
        state={{ kind: 'missing' }}
      />
    );
  }

  if (
    !previewMode &&
    !apiMockMode &&
    (!UUID_PATTERN.test(resolvedVoteId) ||
      !UUID_PATTERN.test(resolvedElectorId))
  ) {
    return (
      <ParticipationView
        electorIdentityState="unverified"
        onAuthenticate={async () => undefined}
        onSubmitResults={async () => undefined}
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
      isPreview={previewMode}
      votingChannel={votingChannel}
      onResetSignature={() => {
        setSignatureFile(null);
        signatureMutation.reset();
      }}
      hasSignature={Boolean(signatureFile || signatureMutation.data)}
      isSubmitting={submittingResults}
      signatureContent={
        identityVerified ? (
          <ParticipationSignature
            confirmed={Boolean(signatureMutation.data)}
            disabled={
              submittingResults ||
              access?.vote.status !== 'OPEN' ||
              !access.vote.votingChannels.includes(votingChannel)
            }
            error={
              signatureMutation.isError
                ? getParticipationErrorMessage(
                    signatureMutation.error,
                    'signature',
                  )
                : undefined
            }
            isPending={signatureMutation.isPending}
            stage={signatureStage}
            onChange={(file) => {
              setSignatureFile(file);
              signatureMutation.reset();
            }}
          />
        ) : null
      }
      onAuthenticate={async () => {
        try {
          await authenticationMutation.mutateAsync({
            electorId: resolvedElectorId,
            voteId: resolvedVoteId,
          });
        } catch {
          // The mutation callback renders the accessible error message.
        }
      }}
      onSubmitResults={async (selections) => {
        const pendingBallots =
          access?.ballots.filter((ballot) => !ballot.participated) ?? [];
        if (
          submissionBusy.current ||
          !identityVerified ||
          (!signatureFile && !signatureMutation.data) ||
          access?.vote.status !== 'OPEN' ||
          !access.vote.votingChannels.includes(votingChannel) ||
          pendingBallots.length === 0 ||
          pendingBallots.some(
            (ballot) =>
              ballot.status !== 'OPEN' ||
              !ballot.candidates.some(
                (candidate) => candidate.id === selections[ballot.id],
              ),
          )
        )
          return;
        submissionBusy.current = true;
        setSubmittingResults(true);
        setErrorMessage(undefined);
        try {
          // Await the server confirmation directly; React mutation state updates can lag behind it.
          if (!signatureMutation.data && signatureFile) {
            setSignatureStage('requesting');
            await signatureMutation.mutateAsync({
              voteId: resolvedVoteId,
              electorId: resolvedElectorId,
              blob: signatureFile,
              originalName: signatureFile.name,
              onStage: setSignatureStage,
            });
          }
          for (const ballot of pendingBallots) {
            await castMutation.mutateAsync({
              electorId: resolvedElectorId,
              voteId: resolvedVoteId,
              voteDetailId: ballot.id,
              selectedCandidateId: selections[ballot.id],
              votingChannel,
            });
          }
        } catch {
          // Mutation errors remain visible. Retry retains the drawing and skips completed ballots.
        } finally {
          submissionBusy.current = false;
          setSubmittingResults(false);
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
        castMutation.isPending
          ? castMutation.variables?.voteDetailId
          : undefined
      }
    />
  );
}

const mockAccessIds = {
  electorId: '55555555-5555-4555-8555-555555555555',
  voteId: '11111111-1111-4111-8111-111111111111',
} as const;
