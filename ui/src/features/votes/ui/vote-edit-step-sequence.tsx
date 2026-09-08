import { ChevronDown } from 'lucide-react';
import type { ReactNode } from 'react';

export type VoteEditStepKey =
  'attachments' | 'ballot' | 'basics' | 'commission' | 'electors' | 'review';

interface VoteEditStepSequenceProps {
  children: ReactNode;
}

interface VoteEditStepProps {
  children: ReactNode;
  description: string;
  isOpen: boolean;
  onToggle: () => void;
  step: number;
  stepKey: VoteEditStepKey;
  title: string;
}

export function VoteEditStepSequence({ children }: VoteEditStepSequenceProps) {
  return (
    <section
      aria-labelledby="vote-edit-step-sequence-title"
      className="space-y-3"
    >
      <div className="flex items-center justify-between gap-3 px-1">
        <div>
          <h2 id="vote-edit-step-sequence-title" className="font-semibold">
            투표 설정 단계
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">
            필요한 단계를 열어 내용을 확인하고 수정하세요.
          </p>
        </div>
        <span className="shrink-0 text-sm tabular-nums text-muted-foreground">
          6단계
        </span>
      </div>
      <ol className="space-y-3">{children}</ol>
    </section>
  );
}

export function VoteEditStep({
  children,
  description,
  isOpen,
  onToggle,
  step,
  stepKey,
  title,
}: VoteEditStepProps) {
  const contentId = `vote-edit-step-${stepKey}`;
  const titleId = `${contentId}-title`;

  return (
    <li>
      <section className="overflow-hidden rounded-lg border bg-card shadow-sm">
        <button
          type="button"
          aria-controls={contentId}
          aria-expanded={isOpen}
          aria-label={`${step}단계 ${title} ${isOpen ? '접기' : '펼치기'}`}
          className="flex min-h-20 w-full items-center gap-3 px-4 py-4 text-left transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset sm:px-5"
          onClick={onToggle}
        >
          <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-semibold tabular-nums ${
              isOpen
                ? 'bg-primary text-primary-foreground'
                : 'border bg-background text-muted-foreground'
            }`}
          >
            {step}
          </span>
          <span className="min-w-0 flex-1">
            <span id={titleId} className="block font-semibold">
              {title}
            </span>
            <span className="mt-1 block text-sm leading-5 text-muted-foreground">
              {description}
            </span>
          </span>
          <ChevronDown
            aria-hidden="true"
            className={`size-5 shrink-0 text-muted-foreground transition-transform ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </button>
        <div
          id={contentId}
          role="region"
          aria-labelledby={titleId}
          className={isOpen ? 'border-t bg-muted/10 p-3 sm:p-4' : 'hidden'}
        >
          {children}
        </div>
      </section>
    </li>
  );
}
