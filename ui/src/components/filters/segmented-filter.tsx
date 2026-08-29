"use client";

import { Button } from "@/components/ui/button";

export interface SegmentedFilterOption<TValue extends string> {
  label: string;
  value: TValue;
}

interface SegmentedFilterProps<TValue extends string> {
  ariaLabel: string;
  onValueChange: (value: TValue) => void;
  options: Array<SegmentedFilterOption<TValue>>;
  value: TValue;
}

export function SegmentedFilter<TValue extends string>({
  ariaLabel,
  onValueChange,
  options,
  value,
}: SegmentedFilterProps<TValue>) {
  return (
    <div aria-label={ariaLabel} className="flex flex-wrap gap-2" role="group">
      {options.map((option) => (
        <Button
          key={option.value}
          type="button"
          variant={value === option.value ? "default" : "outline"}
          size="sm"
          aria-pressed={value === option.value}
          onClick={() => onValueChange(option.value)}
        >
          {option.label}
        </Button>
      ))}
    </div>
  );
}
