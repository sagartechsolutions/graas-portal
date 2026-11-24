import type { Metadata } from "next";
import PolicyArticle from "@/components/policy/PolicyArticle";

export const metadata: Metadata = { title: "Privacy policy", description: "How GRAAS uses the details you share." };

export default function Page() {
  return (
    <section className="shell pb-12 pt-7 lg:pb-16 lg:pt-10">
      <PolicyArticle slug="privacy" />
    </section>
  );
}
