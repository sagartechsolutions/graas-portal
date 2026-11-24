import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";
import Plans from "@/components/home/Plans";

export const metadata: Metadata = { title: "Membership", description: "GRAAS membership for students, professionals, institutions and industry." };

export default function Page() {
  return (
    <InfoPage
      title="Membership"
      intro="Anyone can open a free account. Membership makes you a verified part of the society, with an ID, a certificate and member pricing."
      status="Membership opens soon"
      interest="membership"
      blocks={[
        { heading: "Free account", points: ["Attend open lectures", "Follow events and announcements", "Collect participation certificates"] },
        { heading: "Member", points: ["Verified member ID with QR code", "Membership certificate", "Member price on paid events and courses", "Member-only sessions and chapter roles"] },
        { heading: "How joining works", body: "Individuals apply, pay online and are active as soon as the payment is confirmed. Institutions and companies are verified first, then pay." },
        { heading: "Under 18?", body: "Students under 18 join through a parent or their school, so that a responsible adult has given consent." },
      ]}
    >
      <Plans heading={false} />
    </InfoPage>
  );
}
