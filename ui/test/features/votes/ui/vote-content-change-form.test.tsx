/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { voteFixtureDetails } from '@/features/votes/api/votes-fixtures';
import { VoteContentChangeForm } from '@/features/votes/ui/vote-content-change-form';
import { AdminVoteContentChangesContent } from '@/features/admin/ui/admin-vote-content-changes-content';
import type { VoteContentChangeRequest } from '@/features/votes/model/vote-content-change.types';

afterEach(cleanup);

const request: VoteContentChangeRequest = {
  id: 'request', voteId: 'active-general', tenantId: 'tenant',
  submittedByUserPrincipalId: 'creator', status: 'PENDING',
  reason: '공식 변경 요청', documentFileId: 'document',
  proposal: { title: '변경된 제목', attachmentChanges: [
    { action: 'REMOVE', attachmentId: 'old-attachment' },
    { action: 'ADD', fileId: 'new-file' },
  ] },
  snapshot: {
    title: '기존 제목', description: '기존 안내문',
    endedAt: '2026-09-22T09:00:00.000Z', attachments: [{
      id: 'old-attachment', kind: 'VOTE_ATTACHMENT', fileName: 'old.pdf', attachmentType: 'NOTICE',
    }],
  },
  files: [{ id: 'new-file', kind: 'CANDIDATE_ATTACHMENT', candidateId: 'candidate-1',
    originalName: 'new.pdf', mimeType: 'application/pdf', sizeBytes: 100 }],
  submittedAt: '2026-09-19T09:00:00.000Z',
};

describe('vote content change UI', () => {
  it('requires an uploaded sealed document and reason before author submission', () => {
    const onSubmit = vi.fn();
    const vote = voteFixtureDetails[0];
    const props = {
      vote, requests: [], title: vote.title, description: vote.description,
      endedAt: '2026-09-22T18:00', reason: '공식 변경 요청',
      stagedAttachments: [], removedAttachmentIds: [], target: 'vote',
      attachmentType: 'NOTICE', isUploading: false, isSubmitting: false,
      onTitleChange: vi.fn(), onDescriptionChange: vi.fn(), onEndedAtChange: vi.fn(),
      onReasonChange: vi.fn(), onDocumentSelect: vi.fn(), onAttachmentSelect: vi.fn(),
      onTargetChange: vi.fn(), onAttachmentTypeChange: vi.fn(),
      onToggleRemoval: vi.fn(), onRemoveStaged: vi.fn(), onSubmit,
      onDownloadDocument: vi.fn(),
    };
    const { rerender } = render(<VoteContentChangeForm {...props} />);
    expect(screen.getAllByText('기존 값')).toHaveLength(3);
    expect(screen.getByRole('textbox', { name: '변경할 값 · 투표 제목' })).toBeTruthy();
    expect((screen.getByRole('button', { name: '공문과 변경안 제출' }) as HTMLButtonElement).disabled).toBe(true);
    rerender(<VoteContentChangeForm {...props} documentName="sealed.pdf" />);
    fireEvent.click(screen.getByRole('button', { name: '공문과 변경안 제출' }));
    expect(onSubmit).toHaveBeenCalledOnce();
    rerender(<VoteContentChangeForm {...props} documentName="sealed.pdf" requests={[request]} />);
    expect((screen.getByRole('button', { name: '공문과 변경안 제출' }) as HTMLButtonElement).disabled).toBe(true);
    expect(screen.getByText('제목: 기존 제목 → 변경된 제목')).toBeTruthy();
    expect(screen.getByText('첨부파일: old.pdf → 제거')).toBeTruthy();
    expect(screen.getByText('첨부파일: 없음 → new.pdf')).toBeTruthy();
  });

  it('compares each existing value with the proposed value and requires explicit admin confirmation', () => {
    const onApprove = vi.fn();
    const onReject = vi.fn();
    render(<AdminVoteContentChangesContent
      requests={[request]} selected={request} selectedId={request.id}
      rejectionReason="" approvalConfirmed={false} isReviewing={false}
      onSelect={vi.fn()} onRejectionReasonChange={vi.fn()}
      onApprovalConfirmedChange={vi.fn()} onDownloadDocument={vi.fn()}
      onDownloadFile={vi.fn()} onApprove={onApprove} onReject={onReject}
    />);
    const titleRow = screen.getByRole('heading', { name: '제목' }).parentElement;
    expect(titleRow?.textContent).toContain('기존 값');
    expect(titleRow?.textContent).toContain('기존 제목');
    expect(titleRow?.textContent).toContain('→');
    expect(titleRow?.textContent).toContain('변경할 값');
    expect(titleRow?.textContent).toContain('변경된 제목');
    expect(screen.getByText('old.pdf → 제거')).toBeTruthy();
    expect(screen.getByText('없음 → 후보자 · new.pdf')).toBeTruthy();
    expect((screen.getByRole('button', { name: '승인하고 변경 적용' }) as HTMLButtonElement).disabled).toBe(true);
    expect((screen.getByRole('button', { name: '요청 거절' }) as HTMLButtonElement).disabled).toBe(true);
  });
});
