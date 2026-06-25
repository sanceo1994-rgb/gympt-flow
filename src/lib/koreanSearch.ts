const CHOSEONG = [
  "ㄱ",
  "ㄲ",
  "ㄴ",
  "ㄷ",
  "ㄸ",
  "ㄹ",
  "ㅁ",
  "ㅂ",
  "ㅃ",
  "ㅅ",
  "ㅆ",
  "ㅇ",
  "ㅈ",
  "ㅉ",
  "ㅊ",
  "ㅋ",
  "ㅌ",
  "ㅍ",
  "ㅎ",
];

export function getKoreanInitials(value: string): string {
  return Array.from(value)
    .map((character) => {
      const code = character.charCodeAt(0) - 0xac00;
      if (code < 0 || code > 11171) return character;
      return CHOSEONG[Math.floor(code / 588)];
    })
    .join("");
}

export function matchesKoreanSearch(value: string, query: string): boolean {
  const normalizedValue = value.trim().toLowerCase();
  const normalizedQuery = query.trim().toLowerCase();
  if (!normalizedQuery) return true;
  return (
    normalizedValue.includes(normalizedQuery) ||
    getKoreanInitials(normalizedValue).includes(normalizedQuery)
  );
}
