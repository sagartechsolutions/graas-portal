import { TRACKS } from "@/lib/site";

const BARS = ["#b7babf", "#8e919a", "#5a616b", "#000e21"];

/** What members learn, moving past like parts on a line. The list is repeated so the loop has no seam. */
export default function Ticker() {
  return (
    <div className="marquee border-y border-line bg-white py-5" aria-label={`Learning tracks: ${TRACKS.join(", ")}`}>
      <div className="marquee-track ticker">
        {[0, 1, 2].map((copy) =>
          TRACKS.map((t, i) => (
            <span key={`${copy}-${t}`} aria-hidden="true" className="flex items-center gap-4 whitespace-nowrap pr-4 text-xl font-semibold tracking-tight text-ink sm:text-2xl">
              <span className="flex h-6 items-end gap-[3px]">
                {BARS.map((c, b) => (
                  <span key={c} className="w-[5px] rounded-t-[1px]" style={{ height: 8 + ((b + i) % 4) * 5, background: c }} />
                ))}
              </span>
              {t}
            </span>
          )),
        )}
      </div>
    </div>
  );
}
