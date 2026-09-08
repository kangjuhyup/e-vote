'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import {
  consumeParticipationAccessToken,
  getParticipationAccessErrorMessage,
  participationAccessApi,
  participationAccessPreviewApi,
} from '../api/participation-access-api';
import type {
  ParticipationAccessSession,
  ParticipationResult,
} from '../model/participation-access.types';
import type { ParticipationAccess } from '../model/participation.types';
import { ParticipationSignature } from '../ui/participation-signature';
import { ParticipationResultView } from '../ui/participation-result-view';
import { ParticipationView } from '../ui/participation-view';

interface ParticipationAccessContainerProps {
  previewMode?: boolean;
}

export function ParticipationAccessContainer({ previewMode = false }: ParticipationAccessContainerProps) {
  const router = useRouter();
  const client = previewMode ? participationAccessPreviewApi : participationAccessApi;
  const initialized = useRef(false);
  const submitting = useRef(false);
  const [access, setAccess] = useState<ParticipationAccessSession>();
  const [completedIds, setCompletedIds] = useState<Set<string>>(() => new Set());
  const [errorMessage, setErrorMessage] = useState<string>();
  const [loading, setLoading] = useState(true);
  const [redirecting, setRedirecting] = useState(false);
  const [loadingResultId, setLoadingResultId] = useState<string>();
  const [results, setResults] = useState<Record<string, ParticipationResult>>({});
  const [signatureFile, setSignatureFile] = useState<File | null>(null);
  const [signatureStage, setSignatureStage] = useState<'requesting' | 'uploading' | 'confirming'>('requesting');
  const [submittingResults, setSubmittingResults] = useState(false);
  const [submittingBallotId, setSubmittingBallotId] = useState<string>();

  async function loadAccess() {
    setLoading(true);
    setErrorMessage(undefined);
    try {
      const next = await client.getAccess();
      setAccess(next);
      setCompletedIds(new Set((next.voteDetails ?? []).filter((detail) => detail.participated).map((detail) => detail.id)));
    } catch (error) {
      setErrorMessage(getParticipationAccessErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (initialized.current) return;
    initialized.current = true;
    const token = previewMode ? null : consumeParticipationAccessToken(window.location, window.history);
    void (async () => {
      setLoading(true);
      try {
        if (token) {
          const exchange = await client.exchange(token);
          if ('authenticationRequired' in exchange) {
            const query = new URLSearchParams({
              voteId: exchange.voteId,
              electorId: exchange.electorId,
            });
            setRedirecting(true);
            router.replace(`/participate?${query.toString()}`);
            return;
          }
        }
        const next = await client.getAccess();
        setAccess(next);
        setCompletedIds(new Set((next.voteDetails ?? []).filter((detail) => detail.participated).map((detail) => detail.id)));
      } catch (error) {
        setErrorMessage(getParticipationAccessErrorMessage(error));
      } finally {
        setLoading(false);
      }
    })();
  }, [client, previewMode, router]);

  if (loading || redirecting) {
    return (
      <ParticipationView
        accessMode="permanent-link"
        electorIdentityState="verified"
        onAuthenticate={async () => undefined}
        onSubmitResults={async () => undefined}
        state={{ kind: 'loading' }}
      />
    );
  }
  if (!access) {
    return (
      <ParticipationView
        accessMode="permanent-link"
        electorIdentityState="verified"
        onAuthenticate={async () => undefined}
        onRetryLoad={() => void loadAccess()}
        onSubmitResults={async () => undefined}
        state={{ kind: 'error', message: errorMessage ?? '문자로 받은 참여 링크를 다시 열어 주세요.' }}
      />
    );
  }
  if (access.scope === 'RESULT_READ') {
    return (
      <ParticipationResultView
        access={access}
        errorMessage={errorMessage}
        loadingVoteDetailId={loadingResultId}
        results={results}
        onLoadResult={(voteDetailId) => {
          setLoadingResultId(voteDetailId);
          setErrorMessage(undefined);
          void client.getResult(voteDetailId).then((result) => {
            setResults((current) => ({ ...current, [voteDetailId]: result }));
          }).catch((error) => {
            setErrorMessage(getParticipationAccessErrorMessage(error));
          }).finally(() => setLoadingResultId(undefined));
        }}
      />
    );
  }

  const viewAccess = toParticipationViewAccess(access, completedIds);
  const hasConfirmedSignature = Boolean(access.hasConfirmedSignature);
  const canParticipate = Boolean(access.permittedActions?.participate && access.csrfToken);
  const canUploadSignature = Boolean(access.permittedActions?.uploadSignature && access.csrfToken);

  return (
    <ParticipationView
      accessMode="permanent-link"
      electorIdentityState="verified"
      errorMessage={errorMessage}
      hasSignature={hasConfirmedSignature || Boolean(signatureFile)}
      isPreview={previewMode}
      isSubmitting={submittingResults}
      onAuthenticate={async () => undefined}
      onResetSignature={() => setSignatureFile(null)}
      onRetryLoad={() => void loadAccess()}
      onSubmitResults={async (selections) => {
        const csrfToken = access.csrfToken;
        const pending = (access.voteDetails ?? []).filter((detail) => !completedIds.has(detail.id));
        if (submitting.current || !csrfToken || !canParticipate || pending.length === 0) return;
        if (!hasConfirmedSignature && (!signatureFile || !canUploadSignature)) return;
        if (pending.some((detail) => !detail.candidates.some((candidate) => candidate.id === selections[detail.id]))) return;
        submitting.current = true;
        setSubmittingResults(true);
        setErrorMessage(undefined);
        try {
          if (!hasConfirmedSignature && signatureFile) {
            await client.uploadSignature({
              blob: signatureFile,
              csrfToken,
              onStage: setSignatureStage,
              originalName: signatureFile.name,
            });
            setAccess((current) => current ? { ...current, hasConfirmedSignature: true } : current);
          }
          for (const detail of pending) {
            setSubmittingBallotId(detail.id);
            await client.participate({
              csrfToken,
              selectedCandidateId: selections[detail.id],
              voteDetailId: detail.id,
            });
            setCompletedIds((current) => new Set(current).add(detail.id));
          }
        } catch (error) {
          setErrorMessage(getParticipationAccessErrorMessage(error));
        } finally {
          setSubmittingBallotId(undefined);
          setSubmittingResults(false);
          submitting.current = false;
        }
      }}
      signatureContent={
        hasConfirmedSignature ? (
          <section className="mt-5 rounded-xl border bg-background p-4 text-sm sm:p-6">
            서버에서 확정된 서명이 확인되었습니다.
          </section>
        ) : (
          <ParticipationSignature
            confirmed={false}
            disabled={!canUploadSignature || submittingResults}
            error={errorMessage}
            isPending={submittingResults && !hasConfirmedSignature}
            onChange={setSignatureFile}
            stage={signatureStage}
          />
        )
      }
      state={{ kind: 'ready', access: viewAccess }}
      submittingBallotId={submittingBallotId}
    />
  );
}

function toParticipationViewAccess(
  access: ParticipationAccessSession,
  completedIds: Set<string>,
): ParticipationAccess {
  const vote = access.vote;
  return {
    ballots: (access.voteDetails ?? []).map((detail) => ({
      ...detail,
      participated: detail.participated || completedIds.has(detail.id),
    })),
    elector: { identityVerified: true, label: '링크를 받은 선거인' },
    vote: {
      description: vote?.description ?? '',
      endedAt: vote?.endedAt ?? '',
      id: vote?.id ?? '',
      identityVerificationRequired: false,
      startedAt: vote?.startedAt ?? '',
      status: vote?.status ?? 'FINALIZED',
      title: vote?.title ?? '투표',
      votingChannels: ['ONLINE'],
    },
  };
}
