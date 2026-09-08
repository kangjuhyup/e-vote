'use client';

import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { ReactNode } from 'react';
import { useState } from 'react';

import { PageShell } from '@/components/layout/page-shell';
import { Button } from '@/components/ui/button';
import { voteOperationsApi } from '@/features/votes/api/vote-operations-api';

import { CommissionSetup } from '../ui/commission-setup';
import { VoteNavigation } from '../ui/vote-navigation';

interface CommissionSetupContainerProps {
  account?: ReactNode;
}

export function CommissionSetupContainer({
  account,
}: CommissionSetupContainerProps) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const [draftErrorMessage, setDraftErrorMessage] = useState<string>();
  const createMutation = useMutation({
    mutationFn: (name: string) => voteOperationsApi.createCommission(name),
    onSuccess: async (commission) => {
      await queryClient.invalidateQueries({
        queryKey: ['vote-operations', voteOperationsApi.mode, 'commissions'],
      });
      router.replace(
        `/commissions?commissionId=${encodeURIComponent(commission.id)}`,
      );
    },
  });
  const errorMessage =
    draftErrorMessage ??
    (createMutation.error instanceof Error
      ? createMutation.error.message
      : undefined);

  return (
    <PageShell
      account={account}
      navigation={
        <VoteNavigation
          current="commissions"
          isMockMode={voteOperationsApi.mode === 'mock'}
        />
      }
      eyebrow="조직 관리"
      title="새 위원회 만들기"
      description="위원회 기본 정보를 입력한 뒤 위원 구성으로 이어갑니다."
      actions={
        <Button type="button" variant="outline" asChild>
          <Link href="/commissions">
            <ArrowLeft aria-hidden="true" />
            위원회 목록
          </Link>
        </Button>
      }
    >
      <CommissionSetup
        errorMessage={errorMessage}
        isSubmitting={createMutation.isPending}
        onCreate={(name) => {
          const normalizedName = name.trim();
          createMutation.reset();
          if (!normalizedName) {
            setDraftErrorMessage('위원회 이름을 입력하세요.');
            return;
          }
          setDraftErrorMessage(undefined);
          createMutation.mutate(normalizedName);
        }}
      />
    </PageShell>
  );
}
