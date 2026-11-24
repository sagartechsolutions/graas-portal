import { LogoMark } from "@/components/site/Logo";
import { QrGlyph } from "@/components/home/MemberCard";

const CARDS = [
  { name: "School Student", series: "SCH", bg: "#ffffff", fg: "#000e21", strip: "#d4d6da" },
  { name: "Student", series: "STU", bg: "#ffffff", fg: "#000e21", strip: "#b7babf" },
  { name: "Professional", series: "PRO", bg: "#ffffff", fg: "#000e21", strip: "#8e919a" },
  { name: "Institution", series: "INS", bg: "#ffffff", fg: "#000e21", strip: "#5a616b" },
  { name: "Industry", series: "IND", bg: "#000e21", fg: "#ffffff", strip: "#02ae3e" },
];

/** Five member cards fanned out: one design, a number series for each kind of member. */
export default function CardFan() {
  return (
    <div className="group relative mx-auto h-[340px] w-full max-w-[560px] sm:h-[400px]" aria-hidden="true">
      {CARDS.map((c, i) => {
        const mid = i - 2;
        return (
          <div
            key={c.series}
            className="fan-card absolute left-1/2 top-1/2 w-[72%] max-w-[330px] transition-transform duration-700 ease-[cubic-bezier(0.16,1,0.3,1)]"
            style={{
              transform: `translate(-50%, -50%) translate(${mid * 44}px, ${Math.abs(mid) * 14 - 14}px) rotate(${mid * 7}deg)`,
              zIndex: 10 - Math.abs(mid),
              animationDelay: `${i * 110}ms`,
            }}
          >
            <div className="flex aspect-[85.6/54] flex-col overflow-hidden rounded-[16px] border border-line shadow-[var(--shadow-lift)]" style={{ background: c.bg, color: c.fg }}>
              <div className="flex flex-1 flex-col justify-between p-[6%]">
                <div className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <LogoMark size={30} tone={c.bg === "#000e21" ? "light" : "dark"} />
                    <span className="text-sm font-bold tracking-[0.06em]">GRAAS</span>
                  </span>
                  <span className="rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold" style={{ background: c.strip, color: c.series === "IND" ? "#fff" : "#000e21" }}>
                    {c.name}
                  </span>
                </div>
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[0.65rem] opacity-60">Member number</p>
                    <p className="readout text-[0.95rem] font-medium tracking-wide">GRAAS-{c.series}-26-00001</p>
                  </div>
                  <span className="rounded-md p-1" style={{ background: c.bg === "#000e21" ? "#ffffff" : "#000e21" }}>
                    <QrGlyph size={34} color={c.bg === "#000e21" ? "#000e21" : "#ffffff"} />
                  </span>
                </div>
              </div>
              <div className="h-[7%]" style={{ background: c.strip }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
