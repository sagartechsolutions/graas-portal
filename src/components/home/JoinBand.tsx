import Link from "next/link";
import { LogoMark } from "@/components/site/Logo";

/** The closing call to join, as one navy panel. */
export default function JoinBand({ title = "Become a GRAAS member.", text = "Create your account, choose a membership and pay online. Your verified member ID and certificate are issued as soon as the membership is active." }: { title?: string; text?: string }) {
  return (
    <section id="join" className="shell py-10 lg:py-12">
      <div className="relative overflow-hidden rounded-[28px] bg-ink px-6 py-10 text-white sm:px-12 sm:py-10 lg:rounded-[40px] lg:px-20 lg:py-16">
        <LogoMark size={620} tone="light" className="pointer-events-none absolute -bottom-8 -right-10 hidden opacity-[0.07] md:block" />
        <div className="relative max-w-3xl">
          <h2 className="h-section">{title}</h2>
          <p className="lede mt-5 !text-white/75">{text}</p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link href="/join" className="btn btn-light">
              Become a member
            </Link>
            <Link href="/signin" className="btn border-white/25 bg-transparent text-white hover:border-white">
              Sign in
            </Link>
            <Link href="/contact" className="btn border-transparent bg-transparent text-white/80 hover:text-white">
              Ask a question
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
