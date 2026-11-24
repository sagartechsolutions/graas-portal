/** Site photographs live in /public/photos as <key>-800.webp and <key>-1600.webp. Uploaded photos use a full link. */
export const PHOTOS = {
  hero: { src: "/photos/hero", alt: "A white six-axis industrial robot arm in a bright showroom", ratio: 1800 / 1192 },
  lab: { src: "/photos/lab", alt: "A collaborative robot arm in a clean laboratory", ratio: 1800 / 1013 },
  learn: { src: "/photos/learn", alt: "Engineering students working at a machine in a laboratory", ratio: 1.27 },
  chapters: { src: "/photos/chapters", alt: "Three engineers reviewing work on a laptop in a workshop", ratio: 1.5 },
  compete: { src: "/photos/compete", alt: "A competition robot with yellow wheels on a field mat", ratio: 0.75 },
  industry: { src: "/photos/industry", alt: "Orange robot arms working along a factory production line", ratio: 1.5 },
  assembly: { src: "/photos/assembly", alt: "Robotic arms assembling a car chassis", ratio: 1800 / 909 },
  bluearm: { src: "/photos/bluearm", alt: "A blue industrial robot arm inside a factory cell", ratio: 1800 / 1129 },
  chip: { src: "/photos/chip", alt: "Tweezers placing a microchip on a circuit board", ratio: 1800 / 1352 },
  engineer: { src: "/photos/engineer", alt: "An engineer programming a machine from a laptop", ratio: 1.5 },
  rovers: { src: "/photos/rovers", alt: "Two small wheeled robots built from kits", ratio: 1.5 },
} as const;

export type PhotoKey = keyof typeof PHOTOS;

export function photoSrc(src: string, width: 800 | 1600 = 1600) {
  return src.startsWith("/photos/") ? `${src}-${width}.webp` : src;
}
export function photoSrcSet(src: string) {
  return src.startsWith("/photos/") ? `${src}-800.webp 800w, ${src}-1600.webp 1600w` : undefined;
}
