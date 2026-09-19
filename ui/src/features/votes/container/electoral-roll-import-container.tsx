"use client";

import {
  ElectoralRollImportCard,
  type ElectoralRollImportCardProps,
} from "@/features/votes/ui/electoral-roll-import-card";

import { useElectoralRollImport } from "../hooks/use-electoral-roll-import";

export function ElectoralRollImportContainer(props: ElectoralRollImportCardProps) {
  const control = useElectoralRollImport(props);
  return <ElectoralRollImportCard {...props} control={control} />;
}
