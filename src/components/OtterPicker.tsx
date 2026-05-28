// 5 cute 2D otter presets — inline SVG rendered as data URLs so they can be
// stored as profile.avatar strings and shown anywhere an <img src> works.

export type OtterPreset = {
  id: string;
  bg: string;       // background color
  fur: string;      // main fur color
  belly: string;    // belly/face color
  label: string;
};

export const OTTER_PRESETS: OtterPreset[] = [
  { id: "peach",  bg: "#FFE3D2", fur: "#9C6A4A", belly: "#F8DCC2", label: "복숭아 수달" },
  { id: "sky",    bg: "#D6ECFF", fur: "#7B5A44", belly: "#F2D8BE", label: "하늘 수달" },
  { id: "mint",   bg: "#D6F2E1", fur: "#6E4A36", belly: "#F4DBC2", label: "민트 수달" },
  { id: "butter", bg: "#FFF1B8", fur: "#8B5A3C", belly: "#F6D7B8", label: "버터 수달" },
  { id: "lilac",  bg: "#E7DBFF", fur: "#7E5240", belly: "#F1D5BB", label: "라일락 수달" },
];

function otterSvg(p: OtterPreset) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="60" fill="${p.bg}"/>
  <!-- ears -->
  <circle cx="38" cy="42" r="9" fill="${p.fur}"/>
  <circle cx="82" cy="42" r="9" fill="${p.fur}"/>
  <circle cx="38" cy="42" r="4" fill="${p.belly}" opacity="0.7"/>
  <circle cx="82" cy="42" r="4" fill="${p.belly}" opacity="0.7"/>
  <!-- head -->
  <ellipse cx="60" cy="62" rx="32" ry="30" fill="${p.fur}"/>
  <!-- face/belly patch -->
  <ellipse cx="60" cy="72" rx="22" ry="20" fill="${p.belly}"/>
  <!-- eyes -->
  <ellipse cx="49" cy="62" rx="3.2" ry="4" fill="#1a1a1a"/>
  <ellipse cx="71" cy="62" rx="3.2" ry="4" fill="#1a1a1a"/>
  <circle cx="50.2" cy="60.6" r="1.1" fill="#fff"/>
  <circle cx="72.2" cy="60.6" r="1.1" fill="#fff"/>
  <!-- cheek blush -->
  <circle cx="44" cy="74" r="3.5" fill="#FF8AA8" opacity="0.55"/>
  <circle cx="76" cy="74" r="3.5" fill="#FF8AA8" opacity="0.55"/>
  <!-- nose -->
  <ellipse cx="60" cy="73" rx="3.2" ry="2.4" fill="#2a1a14"/>
  <!-- mouth -->
  <path d="M56 78 Q60 82 64 78" stroke="#2a1a14" stroke-width="1.8" stroke-linecap="round" fill="none"/>
  <!-- whiskers (very subtle) -->
  <path d="M40 76 L48 77 M40 80 L48 80 M80 76 L72 77 M80 80 L72 80" stroke="${p.fur}" stroke-width="1" opacity="0.45" stroke-linecap="round"/>
</svg>`;
}

export function otterDataUrl(preset: OtterPreset): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(otterSvg(preset))}`;
}

export function isOtterAvatar(url: string | undefined | null): boolean {
  return !!url && url.startsWith("data:image/svg+xml") && url.includes("PickGymOtter") === false && url.includes("60' cy='42'") === false ? true : !!url && url.startsWith("data:image/svg+xml");
}
