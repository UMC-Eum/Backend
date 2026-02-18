export function toPositiveInt(v: unknown): number | null {
  const n =
    typeof v === 'number'
      ? v
      : typeof v === 'string'
        ? Number(v)
        : Array.isArray(v) && typeof v[0] === 'string'
          ? Number(v[0])
          : NaN;

  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}

export function shorten(input: string, maxLen = 140): string {
  const s = input.trim();
  if (s.length <= maxLen) return s;
  return `${s.slice(0, maxLen)}…`;
}
