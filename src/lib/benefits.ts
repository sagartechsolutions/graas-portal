import type { PhotoKey } from "./photos";

/**
 * What each kind of member gets, in plain words. Prices are never written here: they come from the plans in the
 * database. Benefits describe what membership includes; programmes open in stages, and members are first in line.
 */
export type BenefitGroup = { title: string; icon: string; items: string[] };
export type MemberType = {
  key: "school" | "student" | "professional" | "institution" | "industry" | "chapter";
  plan: string | null;
  name: string;
  short: string;
  who: string;
  promise: string;
  photo: PhotoKey;
  icon: string;
  bar: number;
  tone: string;
  series: string;
  groups: BenefitGroup[];
  needs: string[];
  steps: string[];
  cta: { label: string; href: string };
  note?: string;
};

export const MEMBER_TYPES: MemberType[] = [
  {
    key: "school",
    plan: "school-student",
    name: "School Student",
    short: "School students",
    who: "Students from Class 1 to Class 12, through their school's GRAAS chapter.",
    promise: "Free for every school student. A first robotics club, real kits and a verified start, long before college.",
    photo: "arduino",
    icon: "school",
    bar: 8,
    tone: "#d4d6da",
    series: "SCH",
    groups: [
      { title: "Learn the basics, properly", icon: "learn", items: ["Free live sessions and workshops made for school students: sensors, motors, simple circuits and first programs", "Talks by engineers and industry leaders who build things for a living", "Step-by-step learning paths, from a blinking light to a moving robot"] },
      { title: "Build and compete", icon: "trophy", items: ["Robotics club activity in school, run by a teacher coordinator", "Workshops and inter-school robot challenges", "Show a project at GRAAS events and get feedback from engineers"] },
      { title: "Recognised from day one", icon: "certificate", items: ["A verified member ID with a QR code", "A membership certificate in the student's name", "Participation certificates from GRAAS events, each with its own QR"] },
      { title: "Safe and supervised", icon: "shield", items: ["Added only by the school, approved by GRAAS", "A parent's or guardian's name and mobile recorded for every student under 18", "A teacher coordinator who sees the whole group"] },
      { title: "A head start for college", icon: "sparkle", items: ["Move to Student membership on joining college", "The member number stays the same, so the record keeps growing", "A portfolio of certificates before the first year of engineering"] },
    ],
    needs: ["A teacher who agrees to coordinate the school chapter", "A letter from the principal (template provided)", "Each student's name, class, date of birth and an email (their own or a parent's)"],
    steps: ["A teacher registers the school chapter", "The teacher adds students, one by one or from Excel", "GRAAS checks the letter and approves each student", "Every student gets a login by email, free"],
    cta: { label: "Register your school", href: "/chapters/apply?kind=school" },
    note: "School students cannot join on their own. Only a school's GRAAS chapter can add them, and GRAAS approves every student.",
  },
  {
    key: "student",
    plan: "student-annual",
    name: "Student",
    short: "College students",
    who: "Diploma, ITI, degree, postgraduate and PhD students in any branch.",
    promise: "The fastest way from classroom theory to real robots, real competitions and real jobs.",
    photo: "learn",
    icon: "learn",
    bar: 12,
    tone: "#b7babf",
    series: "STU",
    groups: [
      { title: "Learn from people who build", icon: "learn", items: ["Industry-leader lectures: plant heads and automation leads on real projects and careers", "Live sessions and webinars, online and offline, free or at the member price", "Courses that end in a project and an assessment, not just a video", "Tracks in PLC and SCADA, ROS, machine vision, IoT and AI for automation"] },
      { title: "Build with a team", icon: "build", items: ["A GRAAS chapter in your own branch: start one or join one", "Hands-on workshops, build sessions and project reviews", "Team up across colleges for bigger projects"] },
      { title: "Compete and get noticed", icon: "trophy", items: ["Robot competitions, hackathons and inter-college challenges", "A student track at GRAASCON, the GRAAS conference", "Results and certificates that anyone can verify with a scan"] },
      { title: "A way into industry", icon: "briefcase", items: ["Jobs, internships, projects and problem statements from verified companies, in one place", "Apply with your GRAAS profile and a one-click resume", "Companies see your number only after you both accept", "Industrial visits and guest lectures"] },
      { title: "Proof that counts", icon: "id", items: ["A verified member ID with a QR code", "A membership certificate and a pledge certificate", "A participation certificate for every event you attend"] },
    ],
    needs: ["Your college, course, year and branch", "A date of birth (a parent's or guardian's details if you are under 18)", "An email and a mobile number"],
    steps: ["Create your account in about two minutes", "Confirm your email with a 6-digit code", "Pay online, for 1 year or longer and save", "Your member ID and certificate are ready at once"],
    cta: { label: "Join as a student", href: "/join?plan=student-annual" },
    note: "In a GRAAS college chapter, the first 15 students of the chapter are members free of charge.",
  },
  {
    key: "professional",
    plan: "professional-annual",
    name: "Professional",
    short: "Professionals and faculty",
    who: "Working engineers, technicians, faculty members and researchers.",
    promise: "Stay sharp, share what you know, and be seen as one of the people who move automation forward.",
    photo: "engineer",
    icon: "mic",
    bar: 16,
    tone: "#8e919a",
    series: "PRO",
    groups: [
      { title: "Keep your skills current", icon: "learn", items: ["Advanced live sessions and webinars on PLC, SCADA, robotics, ROS and machine vision", "Industry-leader lectures, free or at the member price", "Jobs and projects from member companies, matched to your skills"] },
      { title: "Speak, mentor, judge", icon: "mic", items: ["Host your own paid or free sessions as a GRAAS expert", "Mentor student teams and chapters", "Judge competitions and project reviews"] },
      { title: "A network that matters", icon: "people", items: ["Meet engineers, faculty and companies at GRAAS events", "An opt-in professional directory", "GRAASCON, the yearly conference"] },
      { title: "Recognised standing", icon: "certificate", items: ["A verified member ID with a QR code", "A membership certificate", "Credit as speaker, mentor or judge on GRAAS programmes"] },
    ],
    needs: ["Your organisation and designation", "An email and a mobile number"],
    steps: ["Create your account", "Confirm your email", "Pay online, for 1 year or longer and save", "Member ID and certificate at once"],
    cta: { label: "Join as a professional", href: "/join?plan=professional-annual" },
  },
  {
    key: "institution",
    plan: "institution-annual",
    name: "Institution",
    short: "Colleges and universities",
    who: "Engineering colleges, polytechnics, universities, ITIs and schools that want an institution-wide partnership.",
    promise: "Bring industry-grade robotics and automation activity to your campus, with GRAAS behind every chapter.",
    photo: "chapters",
    icon: "college",
    bar: 20,
    tone: "#5a616b",
    series: "INS",
    groups: [
      { title: "A recognised partner", icon: "shield", items: ["A verified institution profile", "An institution membership certificate", "A place in the GRAAS institution list"] },
      { title: "Chapters in every branch", icon: "grid", items: ["Run GRAAS chapters department by department, each with a faculty coordinator", "Bring a whole batch in at once from an Excel sheet", "Chapter workspace and activity reports"] },
      { title: "On your campus", icon: "calendar", items: ["Host GRAAS lectures, workshops and competitions", "Faculty development sessions on automation topics", "Industry talks and visits for your students"] },
      { title: "Evidence you can use", icon: "chart", items: ["Records of activities, participants and certificates", "Useful for institutional reports and accreditation files", "Every certificate verifiable by QR"] },
    ],
    needs: ["The institution's name, city and website", "A contact person and designation", "GRAAS verifies the institution before payment"],
    steps: ["Apply online", "GRAAS verifies the institution", "Pay online", "Start chapters and add students"],
    cta: { label: "Apply as an institution", href: "/join?plan=institution-annual" },
  },
  {
    key: "industry",
    plan: "industry-annual",
    name: "Industry",
    short: "Companies",
    who: "Manufacturers, automation companies, system integrators and technology firms.",
    promise: "Meet the people who will automate your plant, and shape what they learn before they reach you.",
    photo: "industry",
    icon: "factory",
    bar: 24,
    tone: "#000e21",
    series: "IND",
    groups: [
      { title: "Hire people who have built", icon: "briefcase", items: ["Post jobs, internships, projects, problem statements and challenges", "See applicants' profiles, resumes and verified certificates", "GRAAS suggests your top 5 matching members for every post"] },
      { title: "Solve real problems", icon: "build", items: ["Publish automation challenges for student teams", "Confidentiality agreed before any detail is shared", "Prototypes and demonstrations from shortlisted teams"] },
      { title: "Be seen where it counts", icon: "star", items: ["A verified company profile", "Guest lectures and industrial visits", "Sponsor events, competitions and GRAASCON"] },
      { title: "Skill development that shows", icon: "handshake", items: ["Run training in your technology with GRAAS", "Programmes that can fit CSR and skill-development plans", "Certificates that name your company as a partner"] },
    ],
    needs: ["The company's name and website", "A contact person and designation", "GRAAS verifies the company before payment"],
    steps: ["Apply online", "GRAAS verifies the company", "Pay online", "Post jobs and challenges as they open"],
    cta: { label: "Apply as a company", href: "/join?plan=industry-annual" },
  },
  {
    key: "chapter",
    plan: null,
    name: "College chapter",
    short: "College chapters",
    who: "A branch of a college: a faculty coordinator and at least 10 students of that branch.",
    promise: "A GRAAS team in your department, with the first 15 student memberships free.",
    photo: "rovers",
    icon: "people",
    bar: 18,
    tone: "#067a2e",
    series: "CHAP",
    groups: [
      { title: "Free to start", icon: "rupee", items: ["The first 15 student memberships of the chapter are free", "More students join at the Student fee: the chapter pays in one go, or each student pays", "No fee to form the chapter"] },
      { title: "Its own console", icon: "key", items: ["The faculty coordinator gets a chapter login", "Add students one by one or upload an Excel sheet", "See who has signed in, completed their profile and earned certificates"] },
      { title: "Logins for every student", icon: "mail", items: ["Each student gets their own login ID and password by email", "Member ID and certificate in each student's account", "A chapter number and a chapter certificate"] },
      { title: "Activity that is noticed", icon: "trophy", items: ["Host workshops, talks and competitions", "Send teams to GRAAS events", "Chapters are ranked on real activity, not sign-up counts"] },
    ],
    needs: ["A faculty member of the branch as coordinator (preferred)", "A letter from the principal (template provided)", "At least 10 students of the branch"],
    steps: ["The coordinator creates a chapter account", "Fill in the details and upload the principal's letter", "Add at least 10 students", "GRAAS approves; logins go out by email"],
    cta: { label: "Start a college chapter", href: "/chapters/apply?kind=college" },
  },
];

export const MATRIX: { label: string; cells: (boolean | string)[] }[] = [
  // School, Student, Professional, Institution, Industry
  { label: "Verified member ID with QR", cells: [true, true, true, true, true] },
  { label: "Membership certificate and pledge certificate", cells: [true, true, true, true, true] },
  { label: "Career profile and one-click resume", cells: ["Portfolio", true, true, "Institution page", "Company page"] },
  { label: "Live sessions and webinars", cells: ["Free, school level", "Free or member price", "Free or member price", "For its students", "Member price"] },
  { label: "Industry-leader lectures", cells: [true, true, true, true, true] },
  { label: "Participation certificate for each event", cells: [true, true, true, true, true] },
  { label: "Workshops and competitions", cells: ["Inter-school", true, "Mentor or judge", "Host on campus", "Sponsor"] },
  { label: "College or school chapter", cells: ["Through school", "Join or start", "Mentor", "In every branch", false] },
  { label: "Jobs and internships", cells: [false, "Apply", "Apply", "Post", "Post"] },
  { label: "Projects, problem statements and challenges", cells: ["School challenges", "Apply", "Apply", "Post", "Post"] },
  { label: "Top 5 matching profiles for each post", cells: [false, false, false, true, true] },
  { label: "Host paid sessions as a GRAAS expert", cells: [false, false, true, true, true] },
  { label: "GRAASCON conference", cells: [false, "Student track", true, true, "Sponsor"] },
  { label: "Verified before payment", cells: ["Approved by GRAAS", false, false, true, true] },
];

export const CHAPTER_BENEFITS = {
  college: [
    { icon: "rupee", title: "15 student memberships free", text: "Every college chapter starts with its first 15 student memberships free of charge. Students beyond 15 join at the Student fee." },
    { icon: "certificate", title: "A chapter certificate", text: "The chapter gets its own number and a certificate of membership, verifiable by QR, for the department's notice board and files." },
    { icon: "key", title: "A console for the coordinator", text: "The faculty coordinator manages the chapter online: add students, upload Excel lists, pay for extra seats, follow every member." },
    { icon: "mail", title: "A login for every student", text: "Each student gets their own GRAAS login by email, with a member ID and certificate once their profile is complete." },
    { icon: "calendar", title: "Activity on campus", text: "Host GRAAS workshops, talks, build sessions and competitions. Send teams to inter-college challenges and GRAASCON." },
    { icon: "chart", title: "Records the department can use", text: "Lists of members, activities and certificates, useful for department reports and accreditation files." },
    { icon: "briefcase", title: "Closer to industry", text: "Industry problems, guest lectures and visits come to chapters first, so students meet companies before placements." },
    { icon: "star", title: "Recognition for the coordinator", text: "The coordinator is named on the chapter certificate and leads the department's link with the GRAAS network." },
  ],
  school: [
    { icon: "rupee", title: "Free for every student", text: "School chapter students up to Class 12 are GRAAS members free of charge, renewed each year while they are at school." },
    { icon: "shield", title: "Approved and supervised", text: "Only the school can add its students, GRAAS approves each one, and a parent's or guardian's details are kept for every student under 18." },
    { icon: "robot", title: "A real robotics club", text: "Sessions, kits-based activities and challenges designed for school students, led by the teacher coordinator." },
    { icon: "certificate", title: "Certificates for students and the school", text: "Every student gets a member ID and certificate; the school gets a chapter certificate with its own number." },
    { icon: "trophy", title: "Inter-school challenges", text: "School teams take part in GRAAS robot challenges and show their projects to engineers." },
    { icon: "sparkle", title: "A head start for college", text: "Students keep their member number when they move to Student membership in college." },
  ],
};
