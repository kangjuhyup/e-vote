/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { VoteSmsManagement } from '@/features/votes/ui/vote-sms-management';
import type { VoteSmsPurpose } from '@/features/votes/model/vote-sms.types';

describe('Vote SMS fixed templates', () => {
  afterEach(cleanup);

  it.each([
    ['UPCOMING_VOTE_NOTICE', '곧 투표가 시작됩니다.'],
    ['VOTE_RESULT_NOTICE', '투표가 종료되었습니다.'],
  ] as const)(
    'previews and sends the %s template without a text editor',
    (purpose, content) => {
      const onSend = vi.fn();
      render(
        <VoteSmsManagement
          dispatches={[]}
          isHistoryLoading={false}
          isSending={false}
          isTemplateLoading={false}
          onPageChange={() => undefined}
          onRetryHistory={() => undefined}
          onRetryTemplate={() => undefined}
          onSend={onSend}
          page={1}
          purpose={purpose as VoteSmsPurpose}
          template={{ code: purpose, content: `[전자투표]\n${content}` }}
          totalPages={0}
          voteId="vote-1"
        />,
      );

      expect(screen.getByText((text) => text.includes(content))).toBeTruthy();
      expect(screen.queryByRole('textbox')).toBeNull();
      fireEvent.click(screen.getByRole('button', { name: /문자 발송/ }));
      expect(onSend).toHaveBeenCalledWith(purpose);
    },
  );

  it('blocks an unpaid notice and links back to the payment order', () => {
    const onSend = vi.fn();
    render(
      <VoteSmsManagement
        dispatches={[]}
        isHistoryLoading={false}
        isSending={false}
        isTemplateLoading={false}
        onPageChange={() => undefined}
        onRetryHistory={() => undefined}
        onRetryTemplate={() => undefined}
        onSend={onSend}
        page={1}
        paymentHref="/billing/vote-usage-orders/order-1"
        purpose="UPCOMING_VOTE_NOTICE"
        sendBlockedReason="결제 완료 후 발송할 수 있습니다."
        template={{ code: 'UPCOMING_VOTE_NOTICE', content: '안내 문자' }}
        totalPages={0}
        voteId="vote-1"
      />,
    );

    expect(screen.getByRole('button', { name: '투표 예정 안내 문자 발송' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.getByRole('link', { name: '결제 이어하기' })).toHaveProperty(
      'href',
      expect.stringContaining('/billing/vote-usage-orders/order-1'),
    );
    expect(onSend).not.toHaveBeenCalled();
  });
});
