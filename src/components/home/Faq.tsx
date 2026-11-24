const QA = [
  { q: "What is GRAAS?", a: "The Global Robotics And Automation Society: a membership society that connects school and college students, professionals, institutions and industry in robotics and automation, through learning, chapters, competitions and industry work." },
  { q: "Who can become a member?", a: "College students from diploma to PhD, working professionals and faculty, colleges and universities, and companies. School students up to Class 12 join free through their school's GRAAS chapter." },
  { q: "Is it free for school students?", a: "Yes. A teacher registers a GRAAS school chapter with a letter from the principal and adds the students. GRAAS approves each student, and every student gets a login, a member ID and a certificate, free." },
  { q: "How does a college chapter work?", a: "A faculty member of a branch leads it, with at least 10 students of that branch and a letter from the principal. The first 15 student memberships are free. More students join at the Student fee, paid by the chapter in one payment or by each student." },
  { q: "What do I get the moment I am a member?", a: "A member number, a digital member ID with a QR code that anyone can verify, and a membership certificate once your profile and photo are complete. All of it is in your account." },
  { q: "How do I pay, and can I get a refund?", a: "Online through Razorpay, by UPI, card or net banking. Fees are never collected in cash. A fee is refunded in full for a duplicate charge, a declined application or a payment that did not activate your membership." },
  { q: "We are a company. How do we take part?", a: "Join as an industry member. GRAAS verifies the company first. Industry members post jobs, internships and automation problems, give guest lectures and sponsor events." },
];

export default function Faq({ title = "Questions people ask about GRAAS." }: { title?: string }) {
  return (
    <section id="faq" className="section">
      <div className="shell grid gap-7 lg:grid-cols-[0.8fr_1.4fr] lg:gap-10">
        <h2 className="h-section">{title}</h2>
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
