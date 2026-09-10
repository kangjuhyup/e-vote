/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { PhoneNumberField } from '@/components/forms/phone-number-field';
import {
  formatKoreanMobileNumber,
  toKoreanMobileE164,
} from '@/shared/lib/korean-mobile-number';

afterEach(cleanup);

describe('PhoneNumberField', () => {
  it('formats domestic mobile digits while typing', () => {
    const onValueChange = vi.fn();
    render(
      <PhoneNumberField
        id="phone"
        name="phone"
        label="휴대전화 번호"
        onValueChange={onValueChange}
      />,
    );

    const input = screen.getByLabelText('휴대전화 번호');
    fireEvent.change(input, { target: { value: '01012345678' } });

    expect(input).toHaveProperty('value', '010-1234-5678');
    expect(onValueChange).toHaveBeenLastCalledWith('010-1234-5678');
    expect(input.getAttribute('pattern')).toBe('010-[0-9]{4}-[0-9]{4}');
  });
});

describe('Korean mobile number conversion', () => {
  it('converts the display format to E.164', () => {
    expect(toKoreanMobileE164('010-1234-5678')).toBe('+821012345678');
    expect(formatKoreanMobileNumber('+821012345678')).toBe('010-1234-5678');
  });

  it('rejects non-010 and overlong numbers', () => {
    expect(toKoreanMobileE164('011-1234-5678')).toBeUndefined();
    expect(toKoreanMobileE164('010-1234-56789')).toBeUndefined();
  });
});
