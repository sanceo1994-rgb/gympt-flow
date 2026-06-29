const CHOSEONG = [
  "\u3131",
  "\u3132",
  "\u3134",
  "\u3137",
  "\u3138",
  "\u3139",
  "\u3141",
  "\u3142",
  "\u3143",
  "\u3145",
  "\u3146",
  "\u3147",
  "\u3148",
  "\u3149",
  "\u314a",
  "\u314b",
  "\u314c",
  "\u314d",
  "\u314e",
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
