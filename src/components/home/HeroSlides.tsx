"use client";

import { useEffect, useState } from "react";
import Photo from "@/components/ui/Photo";
import { PHOTOS, type PhotoKey } from "@/lib/photos";

const KEYS: PhotoKey[] = ["hero", "industry", "assembly", "bluearm"];

/** The hero photograph: four robotics scenes that cross-fade with a slow push-in. Stays on the first for reduced motion. */
export default function HeroSlides() {
  const [i, setI] = useState(0);
  const [auto, setAuto] = useState(true);
  useEffect(() => {
    if (!auto || window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => setI((v) => (v + 1) % KEYS.length), 5200);
    return () => clearInterval(id);
  }, [auto]);
  return (
    <div className="relative h-full w-full overflow-hidden rounded-[28px] bg-mist">
      {KEYS.map((k, n) => (
        <div key={k} className={`absolute inset-0 transition-opacity duration-[1400ms] ease-out ${n === i ? "opacity-100" : "opacity-0"}`} aria-hidden={n !== i}>
          <Photo src={PHOTOS[k].src} alt={n === i ? PHOTOS[k].alt : ""} eager={n === 0} sizes="(min-width: 1024px) 50vw, 100vw" className={`h-full w-full ${n === i ? "kenburns" : ""}`} />
        </div>
      ))}
      <div className="absolute bottom-4 right-4 flex gap-1.5 rounded-full bg-ink/45 p-1.5 backdrop-blur-sm">
        {KEYS.map((k, n) => (
          <button
            key={k}
            type="button"
            aria-label={`Show photo ${n + 1} of ${KEYS.length}`}
            aria-current={n === i}
            onClick={() => {
              setI(n);
              setAuto(false);
            }}
            className={`h-2 rounded-full transition-all duration-500 ${n === i ? "w-7 bg-go" : "w-2 bg-white/70 hover:bg-white"}`}
          />
        ))}
      </div>
    </div>
  );
}
