import Reveal from "@/components/ui/Reveal";

/** Plain facts about how GRAAS works. No invented counts: every line is a rule of the society. */
export default function Facts({ freeSeats = 15, maxDiscount = 40 }: { freeSeats?: number; maxDiscount?: number }) {
  const facts = [
    { big: "5", unit: "ways to belong", text: "School student, student, professional, institution, industry" },
    { big: "₹0", unit: "for school students", text: "Through their school's GRAAS chapter" },
    { big: String(freeSeats), unit: "free seats", text: "In every new college chapter" },
    { big: `${maxDiscount}%`, unit: "off, pay once", text: "On the longest membership length" },
    { big: "QR", unit: "on every ID", text: "Anyone can verify a member in seconds" },
  ];
  return (
    <section className="border-y border-line bg-white">
      <div className="shell grid grid-cols-2 divide-line py-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x">
        {facts.map((f, i) => (
          <Reveal key={f.unit} delay={i * 0.06} className="px-2 py-6 lg:px-6">
            <p className="flex items-baseline gap-2">
              <span className="readout text-4xl font-medium tracking-tight 2xl:text-5xl">{f.big}</span>
              <span className="font-semibold">{f.unit}</span>
            </p>
            <p className="mt-1.5 text-sm text-ink2">{f.text}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}
