'use client';

import type { ChangeEvent } from 'react';

import { formatKoreanMobileNumber } from '@/shared/lib/korean-mobile-number';

import { TextField, type TextFieldProps } from './text-field';

interface PhoneNumberFieldProps
  extends Omit<
    TextFieldProps,
    'autoComplete' | 'inputMode' | 'maxLength' | 'onChange' | 'pattern' | 'type'
  > {
  onValueChange?: (value: string) => void;
}

export function PhoneNumberField({
  hint = '010-1234-5678 형식으로 입력하세요.',
  onValueChange,
  placeholder = '010-1234-5678',
  ...props
}: PhoneNumberFieldProps) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    const formatted = formatKoreanMobileNumber(event.currentTarget.value);
    event.currentTarget.value = formatted;
    onValueChange?.(formatted);
  }

  return (
    <TextField
      {...props}
      type="tel"
      inputMode="numeric"
      autoComplete="tel-national"
      maxLength={13}
      pattern="010-[0-9]{4}-[0-9]{4}"
      placeholder={placeholder}
      hint={hint}
      onChange={handleChange}
    />
  );
}
