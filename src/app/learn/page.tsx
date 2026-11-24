import type { Metadata } from "next";
import InfoPage from "@/components/site/InfoPage";
import { TRACKS } from "@/lib/site";

export const metadata: Metadata = { title: "Learn", description: "Live lectures, replays and courses in robotics and automation from GRAAS." };

export default function Page() {
  return (
    <InfoPage
      title="Learn robotics the way it is practised"
      intro="Start with a free live lecture. Go deeper with courses that end in a project, a quiz and a certificate you earn."
      status="Opening after membership launch"
      interest="lectures"
      cta={{ title: "Hear about the first lecture", intro: "Pre-register and we will message you when the first open lecture is scheduled." }}
      blocks={[
        { heading: "Open lectures", body: "Free, live and public. Ask questions during the session, then watch the replay with slides and notes.", points: ["Streamed live so anyone can join", "Replay page for every session", "A short quiz and a participation certificate afterwards"] },
        { heading: "Classroom sessions", body: "Smaller live classes for cohorts and paid courses, with a trainer who can see who is following and who is stuck.", points: ["Attendance recorded for you", "Assignments reviewed by the trainer", "Recordings for enrolled learners"] },
        { heading: "Courses", body: "Self-paced lessons with videos, readings, quizzes and assignments, at school, diploma, degree and professional levels.", points: TRACKS },
        { heading: "Certificates that mean something", body: "Attending earns a participation certificate. Finishing the assessment earns a completion certificate. Each carries a QR code anyone can verify." },
        { heading: "For teachers and trainers", points: ["Propose a lecture or author a course", "Run batches and track learner progress", "Question banks and grading built in"] },
      ]}
    />
  );
}
