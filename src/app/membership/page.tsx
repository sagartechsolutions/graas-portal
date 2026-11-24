import type { Metadata } from "next";
import Plans from "@/components/home/Plans";
import RulesGlance from "@/components/home/RulesGlance";
import InfoPage from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Membership", description: "GRAAS membership for students, professionals, institutions and industry: benefits, fees, rules and how to join." };

export default function Page() {
  return (
    <InfoPage
      title="Membership"
      intro="Join online in a few minutes. Membership makes you a verified part of the society, with a member ID, a certificate and member pricing."
      status="Membership is open"
      interest="membership"
      blocks={[
        { heading: "Every member receives", points: ["A member number that stays with you", "A digital member ID with a QR code anyone can verify", "A membership certificate for the current period", "Members' sessions, and member pricing on paid events and courses", "A help desk inside your account"] },
        { heading: "How joining works", body: "Choose a membership and create your account. Individuals pay online and are active as soon as the payment is confirmed. Institutions and companies are verified by GRAAS first, then pay.", points: ["Payment by UPI, card or net banking through Razorpay", "A receipt for every payment in your account", "Nothing is ever collected in cash"] },
        { heading: "Validity and renewal", points: ["Valid for the period of your plan, from the day it becomes active", "Renewal opens 60 days before the end date", "Renewing early adds a full period: you lose no days", "Your member number is kept when you renew"] },
        { heading: "Fees and refunds", body: "The fee shown on the day you pay is the one that applies. A fee is refunded in full for a duplicate charge, a declined application, or a payment that did not activate your membership. It is not refunded once the membership is active." },
        { heading: "Under 18?", body: "You can join online too. When you apply, give the name and mobile number of a parent or guardian who agrees to your membership." },
        { heading: "Check any member", body: "Scan the QR code on a member ID, or type the member number on the Verify page, to see whether a membership is current." },
      ]}
    >
      <div className="pt-12">
        <Plans />
      </div>
      <RulesGlance />
    </InfoPage>
  );
}
