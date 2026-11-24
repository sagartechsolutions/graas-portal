import type { Metadata } from "next";
import Link from "next/link";
import PreRegister from "@/components/home/PreRegister";
import { FaqList } from "@/components/sections/Blocks";
import Icon, { IconTile } from "@/components/ui/Icon";
import { getOrg } from "@/lib/data";

export const metadata: Metadata = { title: "Contact", description: "Write to GRAAS about membership, chapters, industry partnerships or GRAASCON." };

export default async function Page() {
  const org = await getOrg();
  const email = org.email ?? "connect@graas.org.in";
  const cards = [
    { icon: "mail", title: "Email", value: email, href: `mailto:${email}`, note: "We reply within two working days." },
    ...(org.phone ? [{ icon: "phone", title: "Phone or WhatsApp", value: org.phone, href: `tel:${org.phone.replace(/\s/g, "")}`, note: "Working days, 10 am to 6 pm." }] : []),
    ...(org.address ? [{ icon: "pin", title: "Address", value: org.address, href: undefined as string | undefined, note: "" }] : []),
  ];
  return (
    <>
      <section className="relative overflow-hidden">
        <div className="shell grid gap-8 pb-8 pt-8 lg:grid-cols-[1.1fr_1fr] lg:items-end lg:pt-10">
          <div>
            <p className="chip">
              <span className="dot dot-live" />
              We read every message
            </p>
            <h1 className="h-display mt-5 !text-[clamp(2.4rem,1.4rem+3.6vw,4.4rem)]">Talk to GRAAS.</h1>
            <p className="lede mt-5">Membership, chapters, industry partnerships, events or GRAASCON. Pick the quickest way below, or send a message and we will reply on the number or email you give.</p>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
            {cards.map((c) => (
              <li key={c.title} className="card flex items-start gap-4 p-5">
                <IconTile name={c.icon} tone="green" />
                <span className="min-w-0">
                  <span className="block text-sm text-ink2">{c.title}</span>
                  {c.href ? (
                    <a href={c.href} className="block break-words font-semibold underline decoration-go decoration-2 underline-offset-4">
                      {c.value}
                    </a>
                  ) : (
                    <span className="block font-semibold">{c.value}</span>
                  )}
                  {c.note && <span className="mt-0.5 block text-sm text-ink2">{c.note}</span>}
                </span>
              </li>
            ))}
          </ul>
        </div>
        <div className="shell grid gap-3 pb-6 sm:grid-cols-2 xl:grid-cols-4">
          {[
            { href: "/membership", icon: "id", t: "Joining or paying", d: "Benefits, fees and how to join" },
            { href: "/chapters", icon: "people", t: "Starting a chapter", d: "College and school chapters" },
            { href: "/account", icon: "key", t: "Already a member?", d: "Write from Help in your account" },
            { href: "/forgot", icon: "lock", t: "Can't sign in?", d: "Reset your password" },
          ].map((x) => (
            <Link key={x.href} href={x.href} className="card card-lift group flex items-center gap-3 p-4">
              <Icon name={x.icon} size={22} />
              <span className="flex-1">
                <span className="block font-semibold">{x.t}</span>
                <span className="block text-sm text-ink2">{x.d}</span>
              </span>
              <Icon name="arrow" size={18} className="text-ink2 transition-transform group-hover:translate-x-1" />
            </Link>
          ))}
        </div>
      </section>
      <PreRegister contact title="Send GRAAS a message" intro="Tell us who you are and what you need. Members get faster answers from the Help tab in their account." />
      <section className="section">
        <div className="shell grid gap-7 lg:grid-cols-[0.8fr_1.4fr] lg:gap-10">
          <h2 className="h-section">Quick answers.</h2>
          <FaqList
            items={[
              { q: "I paid but my membership is not active.", a: "Open your account: payments are matched automatically within a few minutes. If it still shows unpaid after an hour, write from the Help tab with the time of payment." },
              { q: "I did not get the 6-digit code.", a: "Look in Spam or Promotions, then press Send a new code. Codes work for 10 minutes." },
              { q: "Our school wants to join.", a: "A teacher can register the school as a GRAAS school chapter at graas.org.in/chapters/apply. Every school student is free." },
              { q: "I am a chapter student and lost my login email.", a: "Ask your chapter coordinator to send the login again from the chapter console, or use Forgot password with the email the chapter gave." },
            ]}
          />
        </div>
      </section>
    </>
  );
}
