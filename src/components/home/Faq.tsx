const QA = [
  { q: "Who can become a member?", a: "Students of any age, from school and diploma to PhD, working professionals, faculty, schools, colleges and companies. Students under 18 join with a parent's or guardian's agreement." },
  { q: "What does membership cost?", a: "Each plan shows its fee on this page and again before you pay. If a plan says the fee is to be announced, you can still create your account and apply; you pay when the fee is published." },
  { q: "How do I pay?", a: "Online through Razorpay, by UPI, card or net banking. GRAAS staff and chapters never collect membership fees in cash." },
  { q: "What do I get the moment I am a member?", a: "A member number, a digital member ID with a QR code that anyone can verify, and a membership certificate. All three are in your account." },
  { q: "Can I get a refund?", a: "In full if you are charged twice, if GRAAS declines your application, or if a payment does not activate your membership. A fee is not refunded once the membership is active. The Refund and cancellation policy has the details." },
  { q: "Can my college or school start a chapter?", a: "Yes. Join as an institution, or as a student or faculty member, and tell us through the Help section of your account. A chapter needs a group of interested students and a faculty coordinator." },
  { q: "We are a company. How do we take part?", a: "Join as an industry member. GRAAS verifies the company first. Industry members will be able to post jobs, internships and automation problems, and demonstrate at GRAAS events." },
];

export default function Faq() {
  return (
    <section id="faq" className="section">
      <div className="shell grid gap-7 lg:grid-cols-[0.8fr_1.4fr] lg:gap-10">
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
