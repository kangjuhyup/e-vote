/* @vitest-environment jsdom */

import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  AttachmentUploadSection,
  type AttachmentUploadSectionProps,
} from '@/features/votes/ui/attachment-upload-section';

const metadata = {
  attachmentType: 'NOTICE' as const,
  originalName: '공고문.pdf',
  mimeType: 'application/pdf',
  sizeBytes: 6,
  sortOrder: 0,
};
const grant = {
  expiresAt: '2099-09-06T12:00:00.000Z',
  metadata,
  storageKey: 'votes/notice-one',
  uploadUrl: 'https://storage.example/notice',
};
const confirmed = {
  attachmentId: 'attachment-one',
  fileId: 'file-one',
  storageKey: grant.storageKey,
};

afterEach(cleanup);

type UploaderProps = AttachmentUploadSectionProps<'NOTICE' | 'GUIDE'>;

function renderUploader(overrides: {
  onConfirmUpload?: UploaderProps['onConfirmUpload'];
  onRequestUpload?: UploaderProps['onRequestUpload'];
  onUploadObject?: UploaderProps['onUploadObject'];
} = {}) {
  const callbacks = {
    onRequestUpload: overrides.onRequestUpload ?? vi.fn().mockResolvedValue(grant),
    onUploadObject: overrides.onUploadObject ?? vi.fn().mockResolvedValue(undefined),
    onConfirmUpload: overrides.onConfirmUpload ?? vi.fn().mockResolvedValue(confirmed),
  };
  render(
    <AttachmentUploadSection
      title="투표 첨부파일"
      description="공고문을 등록합니다."
      typeOptions={[
        { label: '공고문', value: 'NOTICE' },
        { label: '안내 자료', value: 'GUIDE' },
      ]}
      {...callbacks}
    />,
  );
  return callbacks;
}

function selectFile() {
  const file = new File(['notice'], metadata.originalName, {
    type: metadata.mimeType,
  });
  fireEvent.change(screen.getByLabelText('파일'), {
    target: { files: [file] },
  });
  return file;
}

describe('AttachmentUploadSection', () => {
  it('shows a file only after request, object upload, and confirmation succeed', async () => {
    const callbacks = renderUploader();
    const file = selectFile();

    fireEvent.click(screen.getByRole('button', { name: '첨부 등록' }));

    expect(await screen.findByText(metadata.originalName)).toBeTruthy();
    expect(callbacks.onRequestUpload).toHaveBeenCalledWith({
      ...metadata,
      sizeBytes: file.size,
    });
    expect(callbacks.onUploadObject).toHaveBeenCalledWith(grant, file);
    expect(callbacks.onConfirmUpload).toHaveBeenCalledWith({
      ...grant.metadata,
      storageKey: grant.storageKey,
    });
  });

  it('retries only confirmation with the same storage key after confirm fails', async () => {
    const onConfirmUpload = vi
      .fn()
      .mockRejectedValueOnce(new Error('확정 실패'))
      .mockResolvedValueOnce(confirmed);
    const callbacks = renderUploader({ onConfirmUpload });
    selectFile();

    fireEvent.click(screen.getByRole('button', { name: '첨부 등록' }));
    expect((await screen.findByRole('alert')).textContent).toContain(
      '확정 실패',
    );
    fireEvent.click(
      screen.getByRole('button', { name: '등록 확정 다시 시도' }),
    );

    expect(await screen.findByText(metadata.originalName)).toBeTruthy();
    expect(callbacks.onRequestUpload).toHaveBeenCalledTimes(1);
    expect(callbacks.onUploadObject).toHaveBeenCalledTimes(1);
    expect(callbacks.onConfirmUpload).toHaveBeenCalledTimes(2);
    expect(vi.mocked(callbacks.onConfirmUpload).mock.calls[0]?.[0].storageKey).toBe(
      vi.mocked(callbacks.onConfirmUpload).mock.calls[1]?.[0].storageKey,
    );
  });

  it('requests a fresh upload URL when the object upload is retried', async () => {
    const refreshedGrant = {
      ...grant,
      storageKey: 'votes/notice-two',
      uploadUrl: 'https://storage.example/notice-two',
    };
    const onRequestUpload = vi
      .fn()
      .mockResolvedValueOnce(grant)
      .mockResolvedValueOnce(refreshedGrant);
    const onUploadObject = vi
      .fn()
      .mockRejectedValueOnce(new Error('URL 만료'))
      .mockResolvedValueOnce(undefined);
    const onConfirmUpload = vi.fn().mockResolvedValue({
      ...confirmed,
      storageKey: refreshedGrant.storageKey,
    });
    renderUploader({ onConfirmUpload, onRequestUpload, onUploadObject });
    selectFile();

    fireEvent.click(screen.getByRole('button', { name: '첨부 등록' }));
    expect((await screen.findByRole('alert')).textContent).toContain('URL 만료');
    fireEvent.click(
      screen.getByRole('button', { name: '업로드 URL 다시 받아 재시도' }),
    );

    await waitFor(() => expect(onConfirmUpload).toHaveBeenCalledTimes(1));
    expect(onRequestUpload).toHaveBeenCalledTimes(2);
    expect(onUploadObject).toHaveBeenLastCalledWith(
      refreshedGrant,
      expect.any(File),
    );
    expect(onConfirmUpload.mock.calls[0]?.[0].storageKey).toBe(
      refreshedGrant.storageKey,
    );
  });
});
