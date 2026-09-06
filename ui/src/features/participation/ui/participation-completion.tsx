'use client';

import { LottieSvg } from 'lottie-react';
import { Check } from 'lucide-react';

import { cn } from '@/shared/lib/utils';

interface ParticipationCompletionProps {
  className?: string;
}

export function ParticipationCompletion({
  className,
}: ParticipationCompletionProps) {
  return (
    <section
      aria-labelledby="participation-complete-title"
      className={cn(
        'flex-col items-center rounded-2xl border border-emerald-200 bg-emerald-50 px-5 py-7 text-center text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100',
        className,
      )}
    >
      <div
        className="relative mx-auto grid size-48 place-items-center"
        aria-hidden="true"
        data-slot="completion-animation"
      >
        <LottieSvg
          src="/animations/vote-complete.json"
          autoplay
          loop={false}
          className="size-full motion-reduce:hidden"
        />
        <div className="hidden size-24 place-items-center rounded-full bg-emerald-600 text-white shadow-sm motion-reduce:grid">
          <Check className="size-12" strokeWidth={2.5} />
        </div>
      </div>

      <div className="mt-5">
        <h2 id="participation-complete-title" className="text-lg font-bold">
          투표가 완료되었습니다
        </h2>
        <p className="mt-2 max-w-sm text-sm leading-6 text-emerald-800 dark:text-emerald-200">
          투표용지가 안전하게 투표함에 들어갔습니다. 이제 이 화면을 닫아도
          됩니다.
        </p>
      </div>
    </section>
  );
}
