import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Events and competitions", description: "Workshops, industrial visits, bootcamps and robotics competitions from GRAAS." };

export default function Page() {
  return (
    <InfoPage
      title="Events and competitions"
      intro="Workshops and visits to learn from. Competitions to prove it. One ticket, one QR code, one certificate at the end."
      status="First calendar published at launch"
      interest="competitions"
      cta={{ title: "Be first to see the calendar", intro: "Pre-register and we will message you when the first events and competitions are announced." }}
      blocks={[
        { heading: "What will run", points: ["Webinars and hands-on workshops", "Industrial visits and bootcamps", "Career fairs and networking meets", "GRAASCON, the annual conference"] },
        { heading: "How a ticket works", points: ["Register free or pay online", "Get a QR ticket on your phone", "Scan in at the door", "Feedback, then your certificate"] },
        { heading: "Competitions", body: "Team challenges with school, college and open divisions.", points: ["Published rulebook and scoring rubric", "Judges who declare conflicts of interest", "Scores locked after the final", "Qualifier, regional and final rounds"] },
        { heading: "Chapters can host", body: "Any chapter can propose an event. Once GRAAS approves it, it appears on the public calendar with registration and check-in ready." },
      ]}
    />
  );
}
