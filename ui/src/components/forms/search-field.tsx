"use client";

import { Search } from "lucide-react";

interface SearchFieldProps {
  label: string;
  name?: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  value: string;
}

export function SearchField({
  label,
  name = "search",
  onValueChange,
  placeholder,
  value,
}: SearchFieldProps) {
  return (
    <label className="relative block">
      <span className="sr-only">{label}</span>
      <Search
        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
        aria-hidden="true"
      />
      <input
        type="search"
        name={name}
        autoComplete="off"
        spellCheck={false}
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className="h-11 w-full rounded-md border bg-background pl-9 pr-3 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] sm:h-10"
        placeholder={placeholder}
      />
    </label>
  );
}
