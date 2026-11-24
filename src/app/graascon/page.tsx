import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";
import { getGraascon } from "@/lib/data";

export const metadata: Metadata = { title: "GRAASCON 2027", description: "The GRAAS conference on robotics and automation." };

export default async function Page() {
  const g = await getGraascon();
  return (
    <InfoPage
      title={`GRAASCON ${g.year}`}
      intro="The first GRAAS conference on robotics and automation, bringing research papers, industry demonstrations and student projects under one roof."
      status={g.dates ? `${g.dates}${g.venue ? `, ${g.venue}` : ""}` : "Dates and venue to be announced"}
      interest="graascon"
      cta={{ title: "Get the dates the day they are set", intro: "Pre-register and we will send dates, the call for papers and registration details as each is announced." }}
      blocks={[
        { heading: "For researchers", body: "A call for papers across robotics and automation tracks, with peer review that is independent of sponsorship and registration fees.", points: g.cfp_url ? ["Paper submission is open"] : ["Tracks and submission dates to be announced"] },
        { heading: "For students", points: ["Present a project or poster", "Meet companies and researchers", "Student registration category"] },
        { heading: "For industry", points: ["Demonstrate products and automation lines", "Exhibition and sponsorship packages", "Meet graduating talent"] },
        { heading: "For delegates", points: ["Technical sessions and keynotes", "Workshops alongside the main programme", "A verified participation certificate"] },
      ]}
    />
  );
}
