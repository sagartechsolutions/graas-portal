import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";

export const metadata: Metadata = { title: "Chapters", description: "Start a GRAAS chapter in your college or school." };

export default function Page() {
  return (
    <InfoPage
      title="A GRAAS chapter in your college"
      intro="A chapter is a team of students and a faculty coordinator who run robotics activity on campus, with GRAAS behind them."
      status="Chapter applications open soon"
      interest="chapter"
      cta={{ title: "Bring a chapter to your campus", intro: "Pre-register as a student, faculty member or college representative and we will send the chapter application first." }}
      stepsTitle="How a chapter starts"
      steps={["Students or faculty apply for their institute", "GRAAS verifies the institute and its coordinator", "Founding members join the chapter", "The chapter workspace opens and the first event is planned"]}
      blocks={[
        { heading: "What a chapter gets", points: ["Its own workspace: roster, announcements, events", "Lectures and competitions it can host on campus", "A public chapter page and a place on the leaderboard", "Membership for a whole batch in one step"] },
        { heading: "What a chapter does", points: ["Runs workshops, talks and build sessions", "Sends teams to GRAAS competitions", "Files a short monthly activity report", "Hands over to new officers every year"] },
        { heading: "Scored on real activity", body: "Chapters are ranked by events held, active members and courses completed. Sign-up counts alone do not move a chapter up." },
        { heading: "For schools", body: "School chapters are run by a teacher-coordinator. Students under 18 join with a parent's or guardian's agreement, which the portal records." },
      ]}
    />
  );
}
