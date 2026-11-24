import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Industry", description: "Post jobs, internships and automation challenges to GRAAS members." };

export default function Page() {
  return (
    <InfoPage
      title="Where factories meet the people who will automate them"
      intro="Companies bring problems, jobs and shop floors. Students and professionals bring skills and prototypes. GRAAS keeps both sides verified."
      status="Company accounts open after launch"
      interest="industry"
      cta={{ title: "Put your company on the list", intro: "Pre-register as an industry representative and we will contact you before company accounts open." }}
      stepsTitle="How an industry challenge runs"
      steps={["A company posts an automation problem", "GRAAS reviews scope and confidentiality", "Teams propose and the company shortlists", "Prototype, demonstration, and a published case study if the company agrees"]}
      blocks={[
        { heading: "For companies", points: ["Verified company profile with HR and technical users", "Jobs, internships and apprenticeships", "Automation challenges for student teams", "Guest lectures, industrial visits and sponsorship"] },
        { heading: "For students and professionals", points: ["Apply with your GRAAS profile and project portfolio", "Work on problems from real production lines", "Be searchable by employers only if you opt in", "Meet engineers who do this for a living"] },
        { heading: "Confidentiality first", body: "Intellectual property and confidentiality terms are agreed before any sensitive detail is shown to a team." },
      ]}
    />
  );
}
