'use client';

import { useState } from 'react';

import { Select } from '@/components/ui/select';
import {
  DEFAULT_IDENTITY_VERIFICATION_METHOD,
  DEFAULT_IDENTITY_VERIFICATION_PROVIDER,
} from '@/features/votes/lib/identity-verification-policy';
import type {
  IdentityVerificationMethod,
  IdentityVerificationProvider,
  VotingChannel,
} from '@/features/votes/model/vote-operations.types';

interface VoteAccessFieldsProps {
  className?: string;
  defaultIdentityRequired?: boolean;
  defaultIdentityMethod?: string;
  defaultIdentityProvider?: string;
  defaultVotingChannels?: VotingChannel[];
  disabled?: boolean;
}

const channelOptions: Array<{ label: string; value: VotingChannel }> = [
  { label: '온라인', value: 'ONLINE' },
  { label: '현장', value: 'ONSITE' },
  { label: '방문', value: 'VISIT' },
];

const providerOptions: Array<{
  label: string;
  value: IdentityVerificationProvider;
}> = [
  { label: 'PASS', value: 'PASS' },
  { label: '카카오 인증서', value: 'KAKAO_CERT' },
  { label: '네이버 인증서', value: 'NAVER_CERT' },
  { label: '토스 인증서', value: 'TOSS_CERT' },
  { label: '문자 인증', value: 'SMS' },
  { label: '기타', value: 'ETC' },
];

const methodOptions: Array<{
  label: string;
  value: IdentityVerificationMethod;
}> = [
  { label: '휴대전화', value: 'MOBILE' },
  { label: '인증서', value: 'CERTIFICATE' },
  { label: '문자', value: 'SMS' },
  { label: '이메일', value: 'EMAIL' },
  { label: '관리자 확인', value: 'ADMIN' },
];

export function VoteAccessFields({
  className,
  defaultIdentityMethod = DEFAULT_IDENTITY_VERIFICATION_METHOD,
  defaultIdentityProvider = DEFAULT_IDENTITY_VERIFICATION_PROVIDER,
  defaultIdentityRequired = false,
  defaultVotingChannels = ['ONLINE'],
  disabled = false,
}: VoteAccessFieldsProps) {
  const [identityRequired, setIdentityRequired] = useState(
    defaultIdentityRequired,
  );

  return (
    <div className={`grid gap-3 ${className ?? ''}`}>
      <fieldset
        disabled={disabled}
        className="min-w-0 rounded-lg border bg-muted/20 p-3 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-4"
      >
        <legend className="sr-only">허용 채널</legend>
        <p aria-hidden="true" className="text-sm font-semibold">
          허용 채널
        </p>
        <div className="mt-2 grid grid-cols-3 gap-2 sm:mt-0">
          {channelOptions.map((option) => (
            <label
              key={option.value}
              className="flex min-h-11 cursor-pointer items-center justify-center gap-2 rounded-md border bg-background px-2.5 py-2 text-sm font-medium transition-[border-color,background-color,box-shadow] hover:border-foreground/25 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2"
            >
              <input
                type="checkbox"
                name="channel"
                value={option.value}
                defaultChecked={defaultVotingChannels.includes(option.value)}
                className="size-4 shrink-0 accent-[var(--primary)]"
              />
              {option.label}
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset
        disabled={disabled}
        className="min-w-0 rounded-lg border bg-muted/20 p-3 sm:grid sm:grid-cols-[8rem_minmax(0,1fr)] sm:items-center sm:gap-4 sm:px-4"
      >
        <legend className="sr-only">본인인증</legend>
        <p aria-hidden="true" className="text-sm font-semibold">
          본인인증
        </p>
        <label className="mt-2 flex min-h-14 cursor-pointer items-start gap-3 rounded-md border bg-background px-3 py-2.5 transition-[border-color,background-color,box-shadow] hover:border-foreground/25 sm:mt-0 has-[:checked]:border-primary has-[:checked]:bg-primary/5 has-[:checked]:ring-2 has-[:checked]:ring-primary/15 has-[:disabled]:cursor-not-allowed has-[:disabled]:opacity-50 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-ring has-[:focus-visible]:ring-offset-2">
          <input
            type="checkbox"
            name="identityRequired"
            checked={identityRequired}
            onChange={(event) => setIdentityRequired(event.currentTarget.checked)}
            className="mt-0.5 size-5 shrink-0 accent-[var(--primary)]"
          />
          <span className="min-w-0">
            <span className="block text-sm font-medium">본인인증 필수</span>
            <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">
              투표에 참여하기 전에 본인확인을 완료하도록 설정합니다.
            </span>
          </span>
        </label>
        <div className="mt-3 grid gap-3 border-t pt-3 sm:col-start-2 sm:grid-cols-2">
          <label className="grid gap-2 text-sm font-medium">
            인증 제공자
            <Select
              name="identityProvider"
              defaultValue={defaultIdentityProvider}
              disabled={disabled || !identityRequired}
              required={identityRequired}
            >
              {providerOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
          <label className="grid gap-2 text-sm font-medium">
            인증 방식
            <Select
              name="identityMethod"
              defaultValue={defaultIdentityMethod}
              disabled={disabled || !identityRequired}
              required={identityRequired}
            >
              {methodOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </label>
        </div>
      </fieldset>
    </div>
  );
}
