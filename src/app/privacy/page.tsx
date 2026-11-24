import type { Metadata } from "next";
import PolicyArticle from "@/components/policy/PolicyArticle";

export const metadata: Metadata = { title: "Privacy policy", description: "How GRAAS uses the details you share." };

export default function Page() {
  return (
    <section className="shell pb-20 pt-10 lg:pb-28 lg:pt-14">
      <PolicyArticle slug="privacy" />
    </section>
  );
}
