import type { Metadata } from "next";
import Link from "next/link";
import { ORG } from "@/lib/site";

export const metadata: Metadata = { title: "Privacy", description: "How GRAAS uses the details you share." };

const items = [
  { h: "What we collect", p: "When you pre-register or send a message we keep what you type into the form: your name, mobile number, email if you give one, city, college or company, and what you asked to hear about. We also record the page you came from and a scrambled form of your network address, which is used only to stop spam." },
  { h: "Why we collect it", p: "To tell you when membership, lectures, chapters, events or GRAASCON open, to answer your message, and to plan where GRAAS should start chapters and programmes." },
  { h: "Who sees it", p: "GRAAS staff who handle membership, chapters and support. We do not sell your details or pass them to advertisers." },
  { h: "How we contact you", p: "By WhatsApp, phone or email, and only because you ticked the box that allows it. Reply to any message asking us to stop and we will." },
  { h: "People under 18", p: "Pre-registration is for adults. A parent, guardian or school can register on behalf of a younger student." },
  { h: "Seeing, correcting or deleting your details", p: "Send a request from the contact page using the same mobile number and we will show, correct or delete what we hold." },
];

export default function Page() {
  return (
    <section className="mx-auto max-w-3xl px-5 py-14 sm:px-8 lg:py-20">
      <h1 className="h-section">How we use your details</h1>
      <p className="lede mt-5 !max-w-none">This notice covers pre-registration and messages sent through this website to the {ORG.name}.</p>
      <div className="mt-10 grid gap-8">
        {items.map((i) => (
          <div key={i.h} className="border-t border-line pt-6">
            <h2 className="h-card">{i.h}</h2>
            <p className="mt-2 text-ink2">{i.p}</p>
          </div>
        ))}
      </div>
      <p className="mt-10">
        <Link href="/contact" className="btn btn-ghost">
          Go to the contact page
        </Link>
      </p>
    </section>
  );
}
