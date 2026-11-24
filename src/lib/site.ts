export const ORG = {
  name: "Global Robotics And Automation Society",
  short: "GRAAS",
};

export const PROGRAMS = [
  { href: "/learn", label: "Learn", note: "Live lectures and courses" },
  { href: "/chapters", label: "Chapters", note: "A GRAAS team on your campus" },
  { href: "/events", label: "Events", note: "Workshops and competitions" },
  { href: "/industry", label: "Industry", note: "Jobs and real problems" },
];

export const NAV = [
  { href: "/membership", label: "Membership" },
  { href: "/updates", label: "Updates" },
  { href: "/gallery", label: "Gallery" },
  { href: "/about", label: "About" },
];

export const TRACKS = [
  "Robotics basics",
  "PLC and SCADA",
  "Industrial automation",
  "ROS",
  "IoT and embedded",
  "Machine vision",
  "AI for automation",
  "Control systems",
  "CAD and simulation",
];

export const LEAD_KINDS = [
  { value: "student", label: "Student", org: "College or institute" },
  { value: "professional", label: "Working professional", org: "Company" },
  { value: "faculty", label: "Faculty or teacher", org: "College or school" },
  { value: "college", label: "College representative", org: "College name" },
  { value: "school", label: "School representative", org: "School name" },
  { value: "industry", label: "Industry representative", org: "Company name" },
  { value: "parent", label: "Parent of a student under 18", org: "Student's school or college" },
] as const;

export const INTERESTS = [
  { value: "membership", label: "Membership" },
  { value: "lectures", label: "Live lectures" },
  { value: "chapter", label: "Starting a chapter" },
  { value: "competitions", label: "Competitions" },
  { value: "courses", label: "Courses" },
  { value: "jobs", label: "Jobs and internships" },
  { value: "industry", label: "Industry challenges" },
  { value: "graascon", label: "GRAASCON 2027" },
] as const;

export type Plan = {
  code: string;
  audience: "student" | "professional" | "institution" | "industry";
  name: string;
  tagline: string | null;
  duration_months: number | null;
  price_inr: number | null;
  gst_percent: number;
  benefits: string[];
  requires_approval: boolean;
};
