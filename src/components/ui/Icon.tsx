/** Line icons drawn for GRAAS, on a 24-unit grid with a 1.8 stroke. Decorative: give the text next to them the meaning. */
const PATHS: Record<string, string> = {
  learn: "M3 8.5 12 4l9 4.5-9 4.5-9-4.5ZM7 10.5V15c0 1.4 2.2 3 5 3s5-1.6 5-3v-4.5M21 8.5V14",
  build: "M14.5 4.5a4 4 0 0 0-5 5L4 15l2 2 3-3 2 2 3.5-3.5a4 4 0 0 0 5-5l-2.5 2.5-2-.5-.5-2 2.5-2.5Z",
  trophy: "M8 4h8v5a4 4 0 0 1-8 0V4ZM8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v3M9 20h6M10 16h4v4h-4z",
  briefcase: "M4 8h16v11H4zM9 8V5h6v3M4 13h16",
  id: "M3 6h18v12H3zM7 10a2 2 0 1 0 4 0 2 2 0 0 0-4 0ZM5.5 15.5c.7-1.4 2-2 3.5-2s2.8.6 3.5 2M14 10h4M14 13h4",
  certificate: "M5 4h14v12H5zM8 8h8M8 11h5M14.5 15.5l-1.5 4.5 2.5-1.2L18 20l-1.5-4.5M17 14.5a2.2 2.2 0 1 1-4.4 0 2.2 2.2 0 0 1 4.4 0Z",
  people: "M9 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3.5 19c.6-3 2.7-4.5 5.5-4.5s4.9 1.5 5.5 4.5M16 5.5a3 3 0 0 1 0 5.5M17.5 14.7c1.6.5 2.7 1.9 3 4.3",
  mic: "M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3ZM6 11a6 6 0 0 0 12 0M12 17v4M9 21h6",
  star: "m12 3.5 2.6 5.3 5.8.8-4.2 4.1 1 5.8-5.2-2.7-5.2 2.7 1-5.8L3.6 9.6l5.8-.8L12 3.5Z",
  rupee: "M7 5h10M7 9h10M7 5c5 0 7 1.6 7 4s-2 4-7 4l7 6",
  shield: "M12 3 4.5 6v6c0 4.4 3.2 7.6 7.5 9 4.3-1.4 7.5-4.6 7.5-9V6L12 3ZM8.8 12l2.3 2.3 4.2-4.6",
  factory: "M3 20V10l5 3V10l5 3V10l5 3V5h3v15H3ZM7 17h2M12 17h2M17 17h1",
  school: "M3 10 12 5l9 5M5 10v9h14v-9M10 19v-5h4v5M12 8.5v.01",
  college: "M3 9 12 4l9 5H3ZM5 9v9M9.5 9v9M14.5 9v9M19 9v9M3 20h18",
  chart: "M4 20V4M4 20h16M8 16v-5M12 16V8M16 16v-3M20 16V6",
  handshake: "M3 10l4-4 4 2 2-1 4 1 4 4M3 10l5 6 2-1 2 2 2-1 2 1 2-3M10 8l-3 3 2 2",
  calendar: "M4 6h16v14H4zM4 10h16M8 3v4M16 3v4M8 14h2M14 14h2M8 17h2",
  globe: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM3 12h18M12 3c2.5 2.5 3.5 5.5 3.5 9S14.5 18.5 12 21c-2.5-2.5-3.5-5.5-3.5-9S9.5 5.5 12 3Z",
  robot: "M8 8h8a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H8a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3ZM12 8V5M12 4.5v.01M9.5 13v.5M14.5 13v.5M9.5 16.5h5M3 13v2M21 13v2",
  check: "M5 12.5 10 17 19 7",
  upload: "M12 16V4M7 9l5-5 5 5M4 16v4h16v-4",
  letter: "M4 6h16v12H4zM4 7l8 6 8-6",
  key: "M14.5 9.5a4 4 0 1 1-1.2-2.8l7.2 7.2V17h-2.5v2H15.5v-2.5l-2.2-2.2M8.5 11a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z",
  sparkle: "M12 3v4M12 17v4M3 12h4M17 12h4M6 6l2.5 2.5M15.5 15.5 18 18M18 6l-2.5 2.5M8.5 15.5 6 18",
  clock: "M12 21a9 9 0 1 0 0-18 9 9 0 0 0 0 18ZM12 7v5l3 2",
  lock: "M6 11h12v9H6zM8.5 11V8a3.5 3.5 0 0 1 7 0v3",
  phone: "M8 3h8v18H8zM11 18h2",
  mail: "M3 6h18v12H3zM3 7l9 6 9-6",
  pin: "M12 21s-6.5-5.5-6.5-11a6.5 6.5 0 0 1 13 0C18.5 15.5 12 21 12 21ZM12 12.5a2.5 2.5 0 1 0 0-5 2.5 2.5 0 0 0 0 5Z",
  arrow: "M5 12h14M13 6l6 6-6 6",
  grid: "M4 4h7v7H4zM13 4h7v7h-7zM4 13h7v7H4zM13 13h7v7h-7z",
};

export type IconName = keyof typeof PATHS;
export const iconPath = (name: string) => PATHS[name] ?? PATHS.star;

export default function Icon({ name, size = 24, className = "", strokeWidth = 1.8 }: { name: IconName | string; size?: number; className?: string; strokeWidth?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={strokeWidth} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" className={className}>
      <path d={PATHS[name] ?? PATHS.star} />
    </svg>
  );
}

/** An icon in a soft tile, used to head benefit cards. */
export function IconTile({ name, tone = "mist", size = 22 }: { name: IconName | string; tone?: "mist" | "green" | "ink"; size?: number }) {
  const cls = tone === "green" ? "bg-go-soft text-go-deep" : tone === "ink" ? "bg-ink text-white" : "bg-mist text-ink";
  return (
    <span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl ${cls}`}>
      <Icon name={name} size={size} />
    </span>
  );
}
