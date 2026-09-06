import { SignaturePad } from '@/components/forms/signature-pad';
import type { SignatureUploadStage } from '../model/participation.types';

interface ParticipationSignatureProps {
  confirmed: boolean;
  disabled: boolean;
  error?: string;
  isPending: boolean;
  onChange: (file: File | null) => void;
  stage: SignatureUploadStage;
}

export function ParticipationSignature({
  confirmed,
  disabled,
  error,
  isPending,
  onChange,
  stage,
}: ParticipationSignatureProps) {
  return (
    <section
      aria-labelledby="signature-title"
      className="mt-5 space-y-4 rounded-xl border bg-background p-4 sm:p-6"
    >
      <h2 id="signature-title" className="font-semibold">
        투표 참여 서명
      </h2>
      <SignaturePad
        disabled={disabled || isPending || confirmed}
        onChange={onChange}
      />
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
      <p role="status" aria-live="polite" className="text-sm">
        {confirmed
          ? '서명 확정 완료'
          : isPending
            ? {
                requesting: '서명 업로드 주소 요청 중…',
                uploading: '서명 이미지 전송 중…',
                confirming: '서명 확정 중…',
              }[stage]
            : '서명을 입력한 뒤 결과 제출을 눌러 주세요.'}
      </p>
    </section>
  );
}
