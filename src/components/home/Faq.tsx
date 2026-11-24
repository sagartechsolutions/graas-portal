const QA = [
  { q: "Who can become a member?", a: "Students from diploma to PhD, working professionals, faculty, schools, colleges and companies. Students under 18 join through a parent or their school." },
  { q: "What does membership cost?", a: "The fee for each plan will be published on the Membership page before applications open. Pre-registering is free." },
  { q: "What happens after I pre-register?", a: "You receive a pre-registration number and an invite link to share. GRAAS will message you on the mobile number you gave on the day membership opens." },
  { q: "Does pre-registering commit me to paying?", a: "No. It reserves your place and lets us tell you when membership opens. You decide whether to join once the fees are published." },
  { q: "Can my college or school start a chapter?", a: "Yes. A chapter needs a group of interested students and a faculty coordinator. Pre-register as a college or school representative and choose “Starting a chapter”." },
  { q: "We are a company. How do we take part?", a: "Industry members can post jobs, internships and automation problems for members to work on, and demonstrate at GRAAS events. Pre-register as an industry representative." },
];

export default function Faq() {
  return (
    <section id="faq" className="section">
      <div className="shell grid gap-10 lg:grid-cols-[0.8fr_1.4fr] lg:gap-16">
        <h2 className="h-section">Questions people ask before joining.</h2>
        <div className="border-t border-line">
          {QA.map((x) => (
            <details key={x.q} className="faq group border-b border-line">
              <summary className="flex items-center justify-between gap-6 py-5 text-lg font-semibold sm:text-xl">
                {x.q}
                <span className="faq-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-line group-open:border-ink group-open:bg-ink group-open:text-white" aria-hidden="true">
                  <svg width="14" height="14" viewBox="0 0 14 14">
                    <path d="M7 1.5v11M1.5 7h11" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
                  </svg>
                </span>
              </summary>
              <p className="max-w-2xl pb-6 text-ink2">{x.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
