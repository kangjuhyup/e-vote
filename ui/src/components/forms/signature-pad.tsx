'use client';

import { useRef, useState, type PointerEvent } from 'react';
import { Button } from '@/components/ui/button';

interface SignaturePadProps {
  disabled?: boolean;
  onChange: (file: File | null) => void;
}

export function SignaturePad({
  disabled = false,
  onChange,
}: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<number | null>(null);
  const revision = useRef(0);
  const [error, setError] = useState('');

  function point(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = event.currentTarget;
    const bounds = canvas.getBoundingClientRect();
    return [
      ((event.clientX - bounds.left) * canvas.width) / bounds.width,
      ((event.clientY - bounds.top) * canvas.height) / bounds.height,
    ] as const;
  }

  function clear() {
    revision.current += 1;
    pointer.current = null;
    const canvas = canvasRef.current;
    canvas?.getContext('2d')?.clearRect(0, 0, canvas.width, canvas.height);
    setError('');
    onChange(null);
  }

  function finish(event: PointerEvent<HTMLCanvasElement>) {
    if (pointer.current !== event.pointerId) return;
    pointer.current = null;
    const version = revision.current;
    event.currentTarget.toBlob((blob) => {
      if (version !== revision.current) return;
      if (!blob) {
        setError('서명을 저장하지 못했습니다. 지운 뒤 다시 그려 주세요.');
        return;
      }
      const file = new File([blob], 'signature.png', { type: 'image/png' });
      onChange(file);
    }, 'image/png');
  }

  return (
    <div className="space-y-3">
      <p id="signature-help" className="text-sm text-muted-foreground">
        아래 빈칸에 손가락이나 마우스로 직접 서명해 주세요.
      </p>
      <canvas
        ref={canvasRef}
        width={800}
        height={280}
        aria-label="서명 그리기"
        aria-describedby="signature-help"
        aria-disabled={disabled}
        className="h-40 w-full touch-none rounded-lg border bg-white"
        onPointerDown={(event) => {
          if (disabled || pointer.current !== null || event.button !== 0)
            return;
          const context = event.currentTarget.getContext('2d');
          if (!context) {
            setError(
              '서명 그리기를 지원하지 않는 브라우저입니다. 다른 브라우저에서 다시 시도해 주세요.',
            );
            return;
          }
          revision.current += 1;
          onChange(null);
          setError('');
          pointer.current = event.pointerId;
          event.currentTarget.setPointerCapture(event.pointerId);
          const [x, y] = point(event);
          context.strokeStyle = '#111827';
          context.fillStyle = '#111827';
          context.lineWidth = 3;
          context.lineCap = 'round';
          context.beginPath();
          context.arc(x, y, 1.5, 0, Math.PI * 2);
          context.fill();
          context.beginPath();
          context.moveTo(x, y);
        }}
        onPointerMove={(event) => {
          if (disabled || pointer.current !== event.pointerId) return;
          const context = event.currentTarget.getContext('2d');
          context?.lineTo(...point(event));
          context?.stroke();
        }}
        onPointerUp={finish}
        onPointerCancel={() => {
          if (!disabled) clear();
        }}
        onLostPointerCapture={finish}
      />
      <Button
        type="button"
        variant="outline"
        disabled={disabled}
        onClick={clear}
      >
        서명 지우기
      </Button>
      {error ? (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      ) : null}
    </div>
  );
}
