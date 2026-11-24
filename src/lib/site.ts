export const ORG = {
  name: "Global Robotics And Automation Society",
  short: "GRAAS",
};

/** Main menu, in order. "More" holds the rest. */
export const NAV = [
  { href: "/", label: "Home" },
  { href: "/about", label: "About" },
  { href: "/membership", label: "Membership" },
  { href: "/chapters", label: "Chapters" },
  { href: "/industries", label: "Industries" },
  { href: "/contact", label: "Contact" },
];

export const PROGRAMS = [
  { href: "/learn", label: "Learn", note: "Live lectures and courses" },
  { href: "/events", label: "Events", note: "Workshops and competitions" },
  { href: "/graascon", label: "GRAASCON", note: "The yearly conference" },
  { href: "/updates", label: "Updates", note: "News from the society" },
  { href: "/gallery", label: "Gallery", note: "Robots, labs and people" },
  { href: "/verify", label: "Verify a member", note: "Check a member ID or chapter" },
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
  series?: string | null;
  self_join?: boolean;
  how_to_join?: string | null;
  name: string;
  tagline: string | null;
  duration_months: number | null;
  price_inr: number | null;
  gst_percent: number;
  benefits: string[];
  requires_approval: boolean;
};
