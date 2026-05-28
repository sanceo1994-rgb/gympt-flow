// 5 cute 2D otter presets rendered as inline SVG data URLs so they can be
// stored as profile.avatar strings and shown anywhere <img src> works.

export type OtterPreset = {
  id: string;
  bg: string;
  fur: string;
  belly: string;
  label: string;
};

export const OTTER_PRESETS: OtterPreset[] = [
  { id: "peach",  bg: "#FFD6BD", fur: "#9C6A4A", belly: "#FBE6D2", label: "복숭아" },
  { id: "sky",    bg: "#CFE5FF", fur: "#7B5A44", belly: "#F4DCC4", label: "하늘" },
  { id: "mint",   bg: "#CDEEDB", fur: "#6E4A36", belly: "#F4DBC2", label: "민트" },
  { id: "butter", bg: "#FFEAA8", fur: "#8B5A3C", belly: "#F8DBBA", label: "버터" },
  { id: "lilac",  bg: "#E0D2FF", fur: "#7E5240", belly: "#F1D5BB", label: "라일락" },
];

function otterSvg(p: OtterPreset) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="60" fill="${p.bg}"/>
  <circle cx="38" cy="44" r="9" fill="${p.fur}"/>
  <circle cx="82" cy="44" r="9" fill="${p.fur}"/>
  <circle cx="38" cy="44" r="4" fill="${p.belly}" opacity="0.7"/>
  <circle cx="82" cy="44" r="4" fill="${p.belly}" opacity="0.7"/>
  <ellipse cx="60" cy="64" rx="32" ry="30" fill="${p.fur}"/>
  <ellipse cx="60" cy="74" rx="22" ry="20" fill="${p.belly}"/>
  <ellipse cx="49" cy="64" rx="3.2" ry="4" fill="#1a1a1a"/>
  <ellipse cx="71" cy="64" rx="3.2" ry="4" fill="#1a1a1a"/>
  <circle cx="50.2" cy="62.6" r="1.1" fill="#fff"/>
  <circle cx="72.2" cy="62.6" r="1.1" fill="#fff"/>
  <circle cx="44" cy="76" r="3.5" fill="#FF8AA8" opacity="0.55"/>
  <circle cx="76" cy="76" r="3.5" fill="#FF8AA8" opacity="0.55"/>
  <ellipse cx="60" cy="75" rx="3.2" ry="2.4" fill="#2a1a14"/>
  <path d="M56 80 Q60 84 64 80" stroke="#2a1a14" stroke-width="1.8" stroke-linecap="round" fill="none"/>
</svg>`;
}

export function otterDataUrl(preset: OtterPreset): string {
  return `data:image/svg+xml;utf8,${encodeURIComponent(otterSvg(preset))}`;
}

type Props = {
  value: string;
  onChange: (url: string) => void;
};

export function OtterPicker({ value, onChange }: Props) {
  return (
    <div className="rounded-xl bg-surface-muted border border-border p-3.5">
      <p className="text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">기본 프로필 아이콘</p>
      <p className="mt-1 text-[11.5px] text-ink-soft">귀여운 수달 아바타 중 하나를 골라보세요. 언제든 사진으로 바꿀 수 있어요.</p>
      <div className="mt-3 grid grid-cols-5 gap-2">
        {OTTER_PRESETS.map((p) => {
          const url = otterDataUrl(p);
          const active = value === url;
          return (
            <button
              key={p.id}
              type="button"
              onClick={() => onChange(url)}
              title={p.label}
              className={`group relative rounded-2xl p-0.5 border-2 transition ${active ? "border-primary shadow-pop" : "border-transparent hover:border-border-strong"}`}
            >
              <img src={url} alt={p.label} className="h-full w-full rounded-xl block" />
              <p className="mt-1 text-[10px] font-bold text-ink-soft text-center truncate">{p.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
