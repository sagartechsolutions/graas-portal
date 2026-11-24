import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";
import { ORG } from "@/lib/site";

export const metadata: Metadata = { title: "About", description: `About the ${ORG.name}.` };

export default function Page() {
  return (
    <InfoPage
      title="Robotics and automation, open to everyone who wants to build"
      intro={`The ${ORG.name} (GRAAS) connects students, teachers, professionals, institutions and industry so that skills, projects and opportunities move between them.`}
      blocks={[
        { heading: "Why GRAAS exists", body: "Robotics and automation are changing how things are made. Too many students meet them only in a textbook, and too many factories cannot find people who have built anything. GRAAS exists to close that gap." },
        { heading: "What we do", points: ["Teach through live lectures and courses", "Organise chapters in schools and colleges", "Run events, competitions and a yearly conference", "Bring industry problems to student teams"] },
        { heading: "Who it is for", points: ["School, diploma, degree and postgraduate students", "Working engineers, faculty and researchers", "Schools, colleges and universities", "Manufacturers and automation companies"] },
        { heading: "How we measure ourselves", body: "By what members finish and build: lectures attended, courses completed, projects shown, people placed. Sign-up counts are not the score." },
      ]}
    />
  );
}
