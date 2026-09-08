/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { readIdentityVerificationPolicy } from '@/features/votes/lib/identity-verification-policy';
import { VoteAccessFields } from '@/features/votes/ui/vote-access-fields';

describe('VoteAccessFields', () => {
  afterEach(cleanup);

  it('submits no provider or method when identity verification is optional', () => {
    const onSubmit = vi.fn((event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      const data = new FormData(event.currentTarget);
      expect(readIdentityVerificationPolicy(data)).toEqual({ required: false });
      expect(data.has('identityProvider')).toBe(false);
      expect(data.has('identityMethod')).toBe(false);
    });
    render(<form onSubmit={onSubmit}><VoteAccessFields /><button type="submit">저장</button></form>);
    fireEvent.click(screen.getByRole('button', { name: '저장' }));
    expect(onSubmit).toHaveBeenCalledOnce();
  });

  it('enables explicit defaults and submits PASS mobile verification when required', () => {
    let submitted: ReturnType<typeof readIdentityVerificationPolicy> | undefined;
    render(
      <form onSubmit={(event) => {
        event.preventDefault();
        submitted = readIdentityVerificationPolicy(new FormData(event.currentTarget));
      }}>
        <VoteAccessFields />
        <button type="submit">저장</button>
      </form>,
    );

    expect(screen.getByRole('combobox', { name: '인증 제공자' })).toHaveProperty('disabled', true);
    fireEvent.click(screen.getByRole('checkbox', { name: /본인인증 필수/ }));
    expect(screen.getByRole('combobox', { name: '인증 제공자' })).toHaveProperty('value', 'PASS');
    expect(screen.getByRole('combobox', { name: '인증 방식' })).toHaveProperty('value', 'MOBILE');
    fireEvent.click(screen.getByRole('button', { name: '저장' }));

    expect(submitted).toEqual({ required: true, provider: 'PASS', method: 'MOBILE' });
  });
});
