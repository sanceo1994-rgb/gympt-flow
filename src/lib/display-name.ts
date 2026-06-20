const LEGACY_NAME_REPAIRS = new Map<string, string>([
  ["�׽�ƮƮ���̳�", "테스트트레이너"],
]);

const CONTROL_CHARACTERS = /[\x00-\x1F\x7F]/g;

// Mojibake from a UTF-8 string round-tripped through the wrong codepage can
// produce valid code points that no real display name would contain. Trust
// only plausible name characters and let callers fall back to another source.
const ALLOWED_NAME_CHARACTERS =
  /^[\p{Script=Hangul}\p{Script=Latin}\p{Number}\s.,'’\-_·]+$/u;

export function normalizeDisplayName(value: unknown): string | null {
  if (typeof value !== "string") return null;

  const compact = value.replace(CONTROL_CHARACTERS, "").trim().normalize("NFC");
  if (!compact) return null;

  const repaired = LEGACY_NAME_REPAIRS.get(compact) ?? compact;
  if (repaired.length > 40 || !ALLOWED_NAME_CHARACTERS.test(repaired)) return null;

  return repaired;
}

export function pickDisplayName(...values: unknown[]): string | null {
  for (const value of values) {
    const normalized = normalizeDisplayName(value);
    if (normalized) return normalized;
  }
  return null;
}

export function needsDisplayNameRepair(value: unknown, canonical: string): boolean {
  if (typeof value !== "string" || value.trim() === canonical) return false;
  const normalized = normalizeDisplayName(value);
  return normalized === canonical || normalized === null;
}
