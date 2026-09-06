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
const attachment = {
  createdAt: '2026-09-06T12:00:00.000Z',
  fileId: confirmed.fileId,
  id: confirmed.attachmentId,
  mimeType: metadata.mimeType,
  originalName: metadata.originalName,
  sizeBytes: metadata.sizeBytes,
  sortOrder: metadata.sortOrder,
  type: metadata.attachmentType,
};

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

type UploaderProps = AttachmentUploadSectionProps<'NOTICE' | 'GUIDE'>;

function renderUploader(overrides: {
  attachments?: UploaderProps['attachments'];
  onConfirmUpload?: UploaderProps['onConfirmUpload'];
  onDeleteAttachment?: UploaderProps['onDeleteAttachment'];
  onDownloadAttachment?: UploaderProps['onDownloadAttachment'];
  onRequestUpload?: UploaderProps['onRequestUpload'];
  onUploadObject?: UploaderProps['onUploadObject'];
} = {}) {
  const callbacks = {
    onRequestUpload: overrides.onRequestUpload ?? vi.fn().mockResolvedValue(grant),
    onUploadObject: overrides.onUploadObject ?? vi.fn().mockResolvedValue(undefined),
    onConfirmUpload: overrides.onConfirmUpload ?? vi.fn().mockResolvedValue(confirmed),
    onDeleteAttachment:
      overrides.onDeleteAttachment ?? vi.fn().mockResolvedValue(undefined),
    onDownloadAttachment:
      overrides.onDownloadAttachment ??
      vi.fn().mockResolvedValue({
        attachmentId: attachment.id,
        downloadUrl: 'https://storage.example/download',
        expiresAt: grant.expiresAt,
      }),
  };
  render(
    <AttachmentUploadSection
      attachments={overrides.attachments ?? []}
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
  it('completes upload without inventing a local attachment projection', async () => {
    const callbacks = renderUploader();
    const file = selectFile();

    fireEvent.click(screen.getByRole('button', { name: '첨부 등록' }));

    await waitFor(() => expect(callbacks.onConfirmUpload).toHaveBeenCalledTimes(1));
    expect(screen.queryByText(metadata.originalName)).toBeNull();
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

    await waitFor(() => expect(callbacks.onConfirmUpload).toHaveBeenCalledTimes(2));
    expect(callbacks.onRequestUpload).toHaveBeenCalledTimes(1);
    expect(callbacks.onUploadObject).toHaveBeenCalledTimes(1);
    expect(callbacks.onConfirmUpload).toHaveBeenCalledTimes(2);
    expect(vi.mocked(callbacks.onConfirmUpload).mock.calls[0]?.[0].storageKey).toBe(
      vi.mocked(callbacks.onConfirmUpload).mock.calls[1]?.[0].storageKey,
    );
  });

  it('downloads and deletes a server-projected attachment', async () => {
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => undefined);
    const callbacks = renderUploader({ attachments: [attachment] });

    fireEvent.click(
      screen.getByRole('button', { name: `${metadata.originalName} 다운로드` }),
    );
    await waitFor(() =>
      expect(callbacks.onDownloadAttachment).toHaveBeenCalledWith(attachment.id),
    );
    expect(click).toHaveBeenCalledTimes(1);

    fireEvent.click(
      screen.getByRole('button', { name: `${metadata.originalName} 삭제` }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: `${metadata.originalName} 삭제 확인` }),
    );
    await waitFor(() =>
      expect(callbacks.onDeleteAttachment).toHaveBeenCalledWith(attachment.id),
    );
  });

  it('keeps download available but hides upload and delete in read-only mode', () => {
    render(
      <AttachmentUploadSection
        attachments={[attachment]}
        description="등록된 파일을 확인합니다."
        onConfirmUpload={vi.fn()}
        onDeleteAttachment={vi.fn()}
        onDownloadAttachment={vi.fn()}
        onRequestUpload={vi.fn()}
        onUploadObject={vi.fn()}
        readOnly
        title="투표 첨부파일"
        typeOptions={[{ label: '공고문', value: 'NOTICE' }]}
      />,
    );

    expect(
      screen.getByRole('button', { name: `${metadata.originalName} 다운로드` }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: '첨부 등록' })).toBeNull();
    expect(
      screen.queryByRole('button', { name: `${metadata.originalName} 삭제` }),
    ).toBeNull();
    expect(screen.queryByLabelText('파일')).toBeNull();
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
