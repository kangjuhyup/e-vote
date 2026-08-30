const DEFAULT_PAGE = 1;
const DEFAULT_PAGE_SIZE = 20;
const MAX_PAGE_SIZE = 100;

export function normalizePageQuery(params: {
  readonly page?: number;
  readonly pageSize?: number;
}): { readonly page: number; readonly pageSize: number } {
  return {
    page: normalizePositiveInteger(params.page, DEFAULT_PAGE),
    pageSize: normalizePositiveInteger(
      params.pageSize,
      DEFAULT_PAGE_SIZE,
      MAX_PAGE_SIZE,
    ),
  };
}

function normalizePositiveInteger(
  value: number | undefined,
  defaultValue: number,
  maxValue?: number,
): number {
  if (value === undefined || !Number.isFinite(value) || value < 1) {
    return defaultValue;
  }

  const normalized = Math.trunc(value);

  return maxValue === undefined ? normalized : Math.min(normalized, maxValue);
}
