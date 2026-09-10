'use client';

import { useMutation } from '@tanstack/react-query';
import { useState } from 'react';

import { registerAccount } from '@/features/auth/api/registration-api';
import type {
  SignUpDraft,
  SignUpInput,
} from '@/features/auth/model/auth.types';
import { toKoreanMobileE164 } from '@/shared/lib/korean-mobile-number';

import { SignUpForm } from '../ui/sign-up-form';
import { SignUpSuccess } from '../ui/sign-up-success';

const initialDraft: SignUpDraft = {
  confirmPassword: '',
  email: '',
  name: '',
  password: '',
  phone: '',
  username: '',
};

function toSignUpInput(draft: SignUpDraft): SignUpInput {
  const phone = toKoreanMobileE164(draft.phone);
  if (!phone) throw new TypeError('invalid Korean mobile number');
  return {
    email: draft.email.trim(),
    name: draft.name.trim(),
    phone,
    username: draft.username.trim(),
    password: draft.password,
  };
}

export function SignUpContainer({
  invitationToken,
}: {
  invitationToken?: string;
}) {
  const [draft, setDraft] = useState(initialDraft);
  const [validationError, setValidationError] = useState<string>();
  const [registeredUsername, setRegisteredUsername] = useState<string>();
  const registration = useMutation({
    mutationFn: (input: SignUpInput) => registerAccount(input),
    onSuccess: (_, input) => setRegisteredUsername(input.username),
  });

  const handleFieldChange = (field: keyof SignUpDraft, value: string) => {
    setDraft((currentDraft) => ({ ...currentDraft, [field]: value }));
    setValidationError(undefined);
    registration.reset();
  };

  const handleSubmit = () => {
    if (!draft.name.trim() || !draft.email.trim() || !draft.phone.trim()) {
      setValidationError('이름, 이메일, 휴대전화 번호를 모두 입력해 주세요.');
      return;
    }
    if (!toKoreanMobileE164(draft.phone)) {
      setValidationError('휴대전화 번호를 010-1234-5678 형식으로 입력해 주세요.');
      return;
    }
    if (draft.password !== draft.confirmPassword) {
      setValidationError('비밀번호와 비밀번호 확인이 일치하지 않습니다.');
      return;
    }

    setValidationError(undefined);
    registration.mutate(toSignUpInput(draft));
  };

  if (registeredUsername) {
    return (
      <SignUpSuccess
        username={registeredUsername}
        continueTo={
          invitationToken
            ? `/organization/invitations/${encodeURIComponent(invitationToken)}`
            : '/'
        }
      />
    );
  }

  return (
    <SignUpForm
      draft={draft}
      loginHref={
        invitationToken
          ? `/organization/invitations/${encodeURIComponent(invitationToken)}`
          : '/'
      }
      error={
        validationError ??
        (registration.error instanceof Error
          ? registration.error.message
          : undefined)
      }
      isPending={registration.isPending}
      onFieldChange={handleFieldChange}
      onSubmit={handleSubmit}
    />
  );
}
