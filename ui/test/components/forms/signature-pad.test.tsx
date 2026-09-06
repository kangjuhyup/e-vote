/* @vitest-environment jsdom */
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SignaturePad } from '@/components/forms/signature-pad';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

function setup() {
  vi.stubGlobal('PointerEvent', MouseEvent);
  const context = {
    clearRect: vi.fn(),
    beginPath: vi.fn(),
    arc: vi.fn(),
    fill: vi.fn(),
    moveTo: vi.fn(),
    lineTo: vi.fn(),
    stroke: vi.fn(),
  };
  vi.spyOn(HTMLCanvasElement.prototype, 'getContext').mockReturnValue(
    context as unknown as CanvasRenderingContext2D,
  );
  const onChange = vi.fn();
  render(<SignaturePad onChange={onChange} />);
  const canvas = screen.getByLabelText('서명 그리기') as HTMLCanvasElement;
  canvas.setPointerCapture = vi.fn();
  vi.spyOn(canvas, 'getBoundingClientRect').mockReturnValue({
    left: 0,
    top: 0,
    width: 400,
    height: 140,
  } as DOMRect);
  return { canvas, context, onChange };
}

describe('Signature image input', () => {
  it('generates a PNG image from pointer strokes and clears its selection on erase', () => {
    const { canvas, context, onChange } = setup();
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) =>
      callback(new Blob(['ink'], { type: 'image/png' })),
    );
    fireEvent.pointerDown(canvas, { clientX: 10, clientY: 10, button: 0 });
    fireEvent.pointerMove(canvas, { clientX: 30, clientY: 20 });
    fireEvent.pointerUp(canvas);
    expect(context.lineTo).toHaveBeenCalledWith(60, 40);
    expect(onChange.mock.lastCall?.[0]).toMatchObject({
      name: 'signature.png',
      type: 'image/png',
      size: 3,
    });
    fireEvent.click(screen.getByRole('button', { name: '서명 지우기' }));
    expect(onChange.mock.lastCall?.[0]).toBeNull();
  });

  it('ignores image generation that finishes after the user has cleared the signature', () => {
    const { canvas, onChange } = setup();
    let finish!: BlobCallback;
    vi.spyOn(canvas, 'toBlob').mockImplementation((callback) => {
      finish = callback;
    });
    fireEvent.pointerDown(canvas, { button: 0 });
    fireEvent.pointerUp(canvas);
    fireEvent.click(screen.getByRole('button', { name: '서명 지우기' }));
    finish(new Blob(['old signature'], { type: 'image/png' }));
    expect(onChange.mock.lastCall?.[0]).toBeNull();
  });

  it('only accepts direct drawing and has no file picker', () => {
    setup();
    expect(document.querySelector('input[type="file"]')).toBeNull();
    expect(screen.getByText(/손가락이나 마우스로 직접 서명/)).toBeTruthy();
  });
});
