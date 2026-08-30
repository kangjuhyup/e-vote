"use client";

import { useMutation } from "@tanstack/react-query";
import { useState } from "react";

import { registerAccount } from "@/features/auth/api/registration-api";
import type {
  SignUpDraft,
  SignUpInput,
} from "@/features/auth/model/auth.types";

import { SignUpForm } from "../ui/sign-up-form";
import { SignUpSuccess } from "../ui/sign-up-success";

const initialDraft: SignUpDraft = {
  confirmPassword: "",
  email: "",
  password: "",
  phone: "",
  username: "",
};

function toSignUpInput(draft: SignUpDraft): SignUpInput {
  const email = draft.email.trim();
  const phone = draft.phone.trim();

  return {
    username: draft.username.trim(),
    password: draft.password,
    ...(email ? { email } : {}),
    ...(phone ? { phone } : {}),
  };
}

export function SignUpContainer() {
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
    if (draft.password !== draft.confirmPassword) {
      setValidationError("비밀번호와 비밀번호 확인이 일치하지 않습니다.");
      return;
    }

    setValidationError(undefined);
    registration.mutate(toSignUpInput(draft));
  };

  if (registeredUsername) {
    return <SignUpSuccess username={registeredUsername} />;
  }

  return (
    <SignUpForm
      draft={draft}
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
