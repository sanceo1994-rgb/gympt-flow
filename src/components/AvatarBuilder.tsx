// Lets a user build a simple avatar from a color + fitness icon instead of
// uploading a photo — handy on mobile signup where a camera roll picker is
// extra friction. Stored as an inline SVG data URL so it works anywhere an
// <img src> avatar is already rendered across the app.
export type AvatarColor = { id: string; hex: string; label: string };

export const AVATAR_COLORS: AvatarColor[] = [
  { id: "pink", hex: "#FF4E97", label: "핑크" },
  { id: "blue", hex: "#4F8EF7", label: "블루" },
  { id: "green", hex: "#34C76F", label: "그린" },
  { id: "orange", hex: "#FF9F1C", label: "오렌지" },
  { id: "violet", hex: "#8B5CF6", label: "바이올렛" },
];

type ShapeNode = { tag: "path" | "circle" | "line"; attrs: Record<string, string> };
export type AvatarIcon = { id: string; label: string; shapes: ShapeNode[] };

// Path data lifted from lucide-react's footprints/weight/dumbbell/biceps-flexed/timer
// icons (ISC licensed) so the picker stays visually consistent with the rest
// of the app's icon set.
export const AVATAR_ICONS: AvatarIcon[] = [
  {
    id: "shoe",
    label: "운동화",
    shapes: [
      { tag: "path", attrs: { d: "M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z" } },
      { tag: "path", attrs: { d: "M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z" } },
      { tag: "path", attrs: { d: "M16 17h4" } },
      { tag: "path", attrs: { d: "M4 13h4" } },
    ],
  },
  {
    id: "kettlebell",
    label: "케틀벨",
    shapes: [
      { tag: "circle", attrs: { cx: "12", cy: "5", r: "3" } },
      { tag: "path", attrs: { d: "M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z" } },
    ],
  },
  {
    id: "dumbbell",
    label: "덤벨",
    shapes: [
      { tag: "path", attrs: { d: "M17.596 12.768a2 2 0 1 0 2.829-2.829l-1.768-1.767a2 2 0 0 0 2.828-2.829l-2.828-2.828a2 2 0 0 0-2.829 2.828l-1.767-1.768a2 2 0 1 0-2.829 2.829z" } },
      { tag: "path", attrs: { d: "m2.5 21.5 1.4-1.4" } },
      { tag: "path", attrs: { d: "m20.1 3.9 1.4-1.4" } },
      { tag: "path", attrs: { d: "M5.343 21.485a2 2 0 1 0 2.829-2.828l1.767 1.768a2 2 0 1 0 2.829-2.829l-6.364-6.364a2 2 0 1 0-2.829 2.829l1.768 1.767a2 2 0 0 0-2.828 2.829z" } },
      { tag: "path", attrs: { d: "m9.6 14.4 4.8-4.8" } },
    ],
  },
  {
    id: "muscle",
    label: "근육",
    shapes: [
      { tag: "path", attrs: { d: "M12.409 13.017A5 5 0 0 1 22 15c0 3.866-4 7-9 7-4.077 0-8.153-.82-10.371-2.462-.426-.316-.631-.832-.62-1.362C2.118 12.723 2.627 2 10 2a3 3 0 0 1 3 3 2 2 0 0 1-2 2c-1.105 0-1.64-.444-2-1" } },
      { tag: "path", attrs: { d: "M15 14a5 5 0 0 0-7.584 2" } },
      { tag: "path", attrs: { d: "M9.964 6.825C8.019 7.977 9.5 13 8 15" } },
    ],
  },
  {
    id: "stopwatch",
    label: "스톱워치",
    shapes: [
      { tag: "line", attrs: { x1: "10", x2: "14", y1: "2", y2: "2" } },
      { tag: "line", attrs: { x1: "12", x2: "15", y1: "14", y2: "11" } },
      { tag: "circle", attrs: { cx: "12", cy: "14", r: "8" } },
    ],
  },
];

function shapesToSvg(shapes: ShapeNode[]): string {
  return shapes
    .map((s) => `<${s.tag} ${Object.entries(s.attrs).map(([k, v]) => `${k}="${v}"`).join(" ")} />`)
    .join("");
}

export function avatarDataUrl(colorHex: string, icon: AvatarIcon): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120">
  <rect width="120" height="120" rx="60" fill="${colorHex}"/>
  <g transform="translate(30 30) scale(2.5)" fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
    ${shapesToSvg(icon.shapes)}
  </g>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

export function AvatarBuilder({
  colorId,
  iconId,
  onChange,
}: {
  colorId: string;
  iconId: string;
  onChange: (next: { colorId: string; iconId: string }) => void;
}) {
  const color = AVATAR_COLORS.find((c) => c.id === colorId) ?? AVATAR_COLORS[0];
  const icon = AVATAR_ICONS.find((i) => i.id === iconId) ?? AVATAR_ICONS[0];

  return (
    <div>
      <div className="grid place-items-center">
        <span
          className="grid h-32 w-32 place-items-center rounded-full shadow-pop"
          style={{ background: color.hex }}
        >
          <img src={avatarDataUrl(color.hex, icon)} alt="" className="h-32 w-32" />
        </span>
      </div>

      <p className="mt-5 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">색상 선택</p>
      <div className="mt-2 flex gap-2.5">
        {AVATAR_COLORS.map((c) => {
          const active = c.id === color.id;
          return (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ colorId: c.id, iconId: icon.id })}
              title={c.label}
              className={`grid h-11 w-11 place-items-center rounded-full ring-2 transition ${active ? "ring-ink" : "ring-transparent hover:ring-border-strong"}`}
              style={{ background: c.hex }}
            >
              {active && <span className="h-4 w-4 rounded-full bg-white" />}
            </button>
          );
        })}
      </div>

      <p className="mt-5 text-[11px] font-extrabold uppercase tracking-wider text-ink-soft">아이콘 선택</p>
      <div className="mt-2 grid grid-cols-3 gap-2.5">
        {AVATAR_ICONS.map((i) => {
          const active = i.id === icon.id;
          return (
            <button
              key={i.id}
              type="button"
              onClick={() => onChange({ colorId: color.id, iconId: i.id })}
              className={`relative rounded-2xl border-2 bg-white p-3 text-center transition ${active ? "border-primary bg-primary/[0.04]" : "border-border hover:border-border-strong"}`}
            >
              <img src={avatarDataUrl(color.hex, i)} alt="" className="mx-auto h-10 w-10" />
              <p className="mt-1.5 text-[11px] font-bold text-ink-soft">{i.label}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
