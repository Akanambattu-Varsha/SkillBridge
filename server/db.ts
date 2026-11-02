import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';

export interface StudentProfile {
  college: string;
  department: string;
  graduationYear: number;
  skills: string[];
  careerInterests: string[];
  resume: {
    filename: string;
    fileType: string;
    fileSize: number;
    uploadedAt: string;
    dataBase64: string;
  } | null;
}

export interface User {
  id: string;
  role: 'student' | 'recruiter';
  email: string;
  passwordHash: string;
  name: string;
  createdAt: string;
  // Student-specific
  studentProfile?: StudentProfile;
  // Recruiter-specific
  companyName?: string;
}

export interface Internship {
  id: string;
  recruiterId: string;
  recruiterEmail: string;
  title: string;
  company: string;
  description: string;
  requiredSkills: string[];
  preferredQualifications: string;
  location: string;
  isRemote: boolean;
  duration: string;
  stipend: string;
  stipendAmount: number;
  openings: number;
  deadline: string; // YYYY-MM-DD
  contactEmail: string;
  createdAt: string;
}

export type ApplicationStatus =
  | 'Applied'
  | 'Under Review'
  | 'Shortlisted'
  | 'Interview Scheduled'
  | 'Accepted'
  | 'Rejected';

export interface Application {
  id: string;
  internshipId: string;
  internshipTitle: string;
  company: string;
  studentId: string;
  studentName: string;
  studentEmail: string;
  studentCollege: string;
  studentSkills: string[];
  resume: {
    filename: string;
    fileType: string;
    fileSize: number;
    dataBase64: string;
  };
  appliedAt: string;
  status: ApplicationStatus;
  statusHistory: Array<{
    status: ApplicationStatus;
    timestamp: string;
    note?: string;
  }>;
  recruiterFeedback?: string;
  interviewDetails?: {
    date: string;
    time: string;
    platform: string;
    meetingLinkOrLocation: string;
    notes?: string;
  };
}

export interface EmailNotification {
  id: string;
  recipientEmail: string;
  recipientRole: 'student' | 'recruiter';
  recipientId: string;
  sender: string;
  subject: string;
  body: string;
  timestamp: string;
  event: 'applied' | 'new_application' | 'shortlisted' | 'interview_scheduled' | 'accepted' | 'rejected' | 'welcome';
  transportStatus: 'sent_via_smtp' | 'simulated_in_app';
  error?: string;
}

export interface InterviewSession {
  id: string;
  studentId: string;
  role: string;
  topic: string;
  difficulty: 'Beginner' | 'Intermediate' | 'Advanced';
  mode: 'practice' | 'mock';
  questions: Array<{
    questionNumber: number;
    question: string;
    expectedConcepts?: string[];
    studentAnswer?: string;
    evaluation?: {
      score: number; // 1-10
      constructiveFeedback: string;
      idealAnswerGuide: string;
      keyStrengths: string[];
      improvementAreas: string[];
    };
  }>;
  currentQuestionIndex: number;
  finalSummary?: {
    overallScore: number;
    summary: string;
    strongPoints: string[];
    weakAreas: string[];
    actionableAdvice: string[];
  };
  createdAt: string;
  updatedAt: string;
}

export interface DatabaseSchema {
  users: User[];
  internships: Internship[];
  applications: Application[];
  emailLogs: EmailNotification[];
  interviewSessions: InterviewSession[];
}

const DATA_DIR = path.resolve(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'db.json');

// Ensure directory exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function getInitialData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const defaultPasswordHash = bcrypt.hashSync('Password123!', salt);

  const recruiterId = 'recruiter-nexus-1';
  const recruiterSarah: User = {
    id: recruiterId,
    role: 'recruiter',
    email: 'recruiter@nexuslabs.com',
    passwordHash: defaultPasswordHash,
    name: 'Sarah Jenkins',
    companyName: 'Nexus Technologies',
    createdAt: new Date().toISOString(),
  };

  const recruiterDavid: User = {
    id: 'recruiter-apex-2',
    role: 'recruiter',
    email: 'hiring@apexsystems.io',
    passwordHash: defaultPasswordHash,
    name: 'David Vance',
    companyName: 'Apex Systems',
    createdAt: new Date().toISOString(),
  };

  const sampleStudent: User = {
    id: 'student-seed-1',
    role: 'student',
    email: 'maya.patel@stanford.edu',
    passwordHash: defaultPasswordHash,
    name: 'Maya Patel',
    createdAt: new Date().toISOString(),
    studentProfile: {
      college: 'Stanford University',
      department: 'Computer Science',
      graduationYear: 2026,
      skills: ['Python', 'Machine Learning', 'SQL', 'FastAPI', 'PyTorch'],
      careerInterests: ['AI Research', 'Machine Learning Engineering', 'Data Science'],
      resume: {
        filename: 'Maya_Patel_Resume.pdf',
        fileType: 'application/pdf',
        fileSize: 142000,
        uploadedAt: new Date().toISOString(),
        dataBase64: 'JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKdHJhaWxlcgo8PCAvU2l6ZSA0IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoxNzMKJSVFT0Y=',
      },
    },
  };

  const sampleStudent2: User = {
    id: 'student-seed-2',
    role: 'student',
    email: 'marcus.lee@berkeley.edu',
    passwordHash: defaultPasswordHash,
    name: 'Marcus Lee',
    createdAt: new Date().toISOString(),
    studentProfile: {
      college: 'UC Berkeley',
      department: 'Electrical Engineering & CS',
      graduationYear: 2025,
      skills: ['React', 'JavaScript', 'TypeScript', 'Node.js', 'HTML', 'CSS', 'Tailwind CSS'],
      careerInterests: ['Frontend Development', 'Full Stack Engineering', 'Web Performance'],
      resume: {
        filename: 'Marcus_Lee_CV.pdf',
        fileType: 'application/pdf',
        fileSize: 128500,
        uploadedAt: new Date().toISOString(),
        dataBase64: 'JVBERi0xLjQKJcTl8uXrCjEgMCBvYmoKPDwgL1R5cGUgL0NhdGFsb2cgL1BhZ2VzIDIgMCBSID4+CmVuZG9iagoyIDAgb2JqCjw8IC9UeXBlIC9QYWdlcyAvS2lkcyBbMyAwIFJdIC9Db3VudCAxID4+CmVuZG9iagozIDAgb2JqCjw8IC9UeXBlIC9QYWdlIC9QYXJlbnQgMiAwIFIgPj4KZW5kb2JqCnhyZWYKMCA0CjAwMDAwMDAwMDAgNjU1MzUgZiAKdHJhaWxlcgo8PCAvU2l6ZSA0IC9Sb290IDEgMCBSID4+CnN0YXJ0eHJlZgoxNzMKJSVFT0Y=',
      },
    },
  };

  // 6 high-quality internships across tech domains
  const futureDate = (daysAhead: number) => {
    const d = new Date();
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().split('T')[0];
  };

  const internships: Internship[] = [
    {
      id: 'intern-ml-1',
      recruiterId: recruiterId,
      recruiterEmail: recruiterSarah.email,
      title: 'Machine Learning & AI Engineering Intern',
      company: 'Nexus Technologies',
      description: 'Join our applied generative intelligence team. You will build and benchmark transformer models, fine-tune LLMs, integrate vector databases, and deploy real-time ML inference APIs for enterprise clients.',
      requiredSkills: ['Python', 'Machine Learning', 'PyTorch', 'SQL', 'FastAPI'],
      preferredQualifications: 'Prior coursework or project experience in deep learning or NLP. Familiarity with Hugging Face and Docker.',
      location: 'San Francisco, CA',
      isRemote: true,
      duration: '3 Months (Summer 2026)',
      stipend: '$2,500/month',
      stipendAmount: 2500,
      openings: 3,
      deadline: futureDate(45),
      contactEmail: 'talent@nexuslabs.com',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'intern-frontend-2',
      recruiterId: recruiterId,
      recruiterEmail: recruiterSarah.email,
      title: 'Frontend React Developer Intern',
      company: 'Nexus Technologies',
      description: 'Design and develop responsive, accessible client interfaces for high-throughput enterprise SaaS applications. Work directly with design systems, Tailwind CSS, TypeScript, and state management.',
      requiredSkills: ['React', 'JavaScript', 'TypeScript', 'HTML', 'CSS', 'Tailwind CSS'],
      preferredQualifications: 'Experience with modern React 19/Vite or Next.js, and component library design principles.',
      location: 'Remote',
      isRemote: true,
      duration: '4 Months',
      stipend: '$2,000/month',
      stipendAmount: 2000,
      openings: 2,
      deadline: futureDate(30),
      contactEmail: 'careers@nexuslabs.com',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'intern-backend-3',
      recruiterId: 'recruiter-apex-2',
      recruiterEmail: recruiterDavid.email,
      title: 'Backend Systems & Cloud Engineering Intern',
      company: 'Apex Systems',
      description: 'Architect scalable microservices, manage PostgreSQL/SQL databases, and build fault-tolerant asynchronous queue processors handling over 10M daily events.',
      requiredSkills: ['Java', 'SQL', 'Spring Boot', 'Docker', 'REST APIs'],
      preferredQualifications: 'Familiarity with distributed systems concepts, ACID transactions, and container orchestration.',
      location: 'Austin, TX',
      isRemote: false,
      duration: '6 Months',
      stipend: '$2,400/month',
      stipendAmount: 2400,
      openings: 2,
      deadline: futureDate(50),
      contactEmail: 'engineering-interns@apexsystems.io',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'intern-data-4',
      recruiterId: recruiterId,
      recruiterEmail: recruiterSarah.email,
      title: 'Data Science & Analytics Intern',
      company: 'Nexus Technologies',
      description: 'Extract business insights from petabyte-scale data pipelines. Build dashboards, run statistical hypothesis testing, and translate analytical findings into strategic product recommendations.',
      requiredSkills: ['Python', 'SQL', 'Data Structures', 'Pandas', 'Data Analysis'],
      preferredQualifications: 'Strong foundation in probability, statistics, and visualization tools such as Tableau or Seaborn.',
      location: 'New York, NY',
      isRemote: true,
      duration: '3 Months',
      stipend: '$2,100/month',
      stipendAmount: 2100,
      openings: 1,
      deadline: futureDate(25),
      contactEmail: 'analytics-talent@nexuslabs.com',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'intern-software-5',
      recruiterId: 'recruiter-apex-2',
      recruiterEmail: recruiterDavid.email,
      title: 'Full Stack Software Engineer Intern',
      company: 'Apex Systems',
      description: 'Collaborate end-to-end across product development—from designing relational schema and backend controllers to implementing elegant React user interfaces.',
      requiredSkills: ['JavaScript', 'React', 'Node.js', 'SQL', 'Git'],
      preferredQualifications: 'Understanding of Git workflow, test-driven development, and RESTful API conventions.',
      location: 'Seattle, WA',
      isRemote: false,
      duration: '3 Months',
      stipend: '$2,300/month',
      stipendAmount: 2300,
      openings: 4,
      deadline: futureDate(60),
      contactEmail: 'jobs@apexsystems.io',
      createdAt: new Date().toISOString(),
    },
    {
      id: 'intern-python-6',
      recruiterId: recruiterId,
      recruiterEmail: recruiterSarah.email,
      title: 'Python Backend & Automation Intern',
      company: 'Nexus Technologies',
      description: 'Develop automated continuous testing infrastructure, web scrapers, and data ingestion services using asynchronous Python.',
      requiredSkills: ['Python', 'SQL', 'Data Structures', 'Git', 'Linux'],
      preferredQualifications: 'Experience with Asyncio, pytest, and command-line Linux tooling.',
      location: 'Remote',
      isRemote: true,
      duration: '3 Months',
      stipend: '$1,900/month',
      stipendAmount: 1900,
      openings: 2,
      deadline: futureDate(35),
      contactEmail: 'talent@nexuslabs.com',
      createdAt: new Date().toISOString(),
    },
  ];

  // Seed sample applications for Maya Patel to demonstrate tracking
  const sampleApplication: Application = {
    id: 'app-seed-1',
    internshipId: internships[0].id,
    internshipTitle: internships[0].title,
    company: internships[0].company,
    studentId: sampleStudent.id,
    studentName: sampleStudent.name,
    studentEmail: sampleStudent.email,
    studentCollege: sampleStudent.studentProfile!.college,
    studentSkills: sampleStudent.studentProfile!.skills,
    resume: sampleStudent.studentProfile!.resume!,
    appliedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Shortlisted',
    statusHistory: [
      {
        status: 'Applied',
        timestamp: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        status: 'Under Review',
        timestamp: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Resume passed initial engineering screening.',
      },
      {
        status: 'Shortlisted',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
        note: 'Selected for technical interview rounds.',
      },
    ],
    recruiterFeedback: 'Outstanding PyTorch and ML project portfolio. Moving forward to technical discussion.',
  };

  const sampleApplication2: Application = {
    id: 'app-seed-2',
    internshipId: internships[1].id,
    internshipTitle: internships[1].title,
    company: internships[1].company,
    studentId: sampleStudent2.id,
    studentName: sampleStudent2.name,
    studentEmail: sampleStudent2.email,
    studentCollege: sampleStudent2.studentProfile!.college,
    studentSkills: sampleStudent2.studentProfile!.skills,
    resume: sampleStudent2.studentProfile!.resume!,
    appliedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
    status: 'Interview Scheduled',
    statusHistory: [
      {
        status: 'Applied',
        timestamp: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        status: 'Shortlisted',
        timestamp: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      },
      {
        status: 'Interview Scheduled',
        timestamp: new Date().toISOString(),
        note: 'Technical code pairing session confirmed.',
      },
    ],
    recruiterFeedback: 'Excellent React and TypeScript GitHub samples.',
    interviewDetails: {
      date: '2026-11-10',
      time: '14:00 PST',
      platform: 'Google Meet',
      meetingLinkOrLocation: 'https://meet.google.com/skb-tech-demo',
      notes: 'Prepare a 15-minute walkthrough of a recent React component or project.',
    },
  };

  return {
    users: [recruiterSarah, recruiterDavid, sampleStudent, sampleStudent2],
    internships,
    applications: [sampleApplication, sampleApplication2],
    emailLogs: [],
    interviewSessions: [],
  };
}

class JsonDatabase {
  private data: DatabaseSchema;

  constructor() {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
      } catch (err) {
        console.error('Failed reading existing db.json, creating initial data:', err);
        this.data = getInitialData();
        this.save();
      }
    } else {
      this.data = getInitialData();
      this.save();
    }
  }

  private save() {
    try {
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('Error writing to db.json:', err);
    }
  }

  // Users
  getUsers(): User[] {
    return this.data.users;
  }

  findUserById(id: string): User | undefined {
    return this.data.users.find((u) => u.id === id);
  }

  findUserByEmail(email: string): User | undefined {
    return this.data.users.find((u) => u.email.toLowerCase() === email.toLowerCase());
  }

  addUser(user: User): User {
    this.data.users.push(user);
    this.save();
    return user;
  }

  updateUser(id: string, updates: Partial<User>): User | null {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return null;
    this.data.users[idx] = { ...this.data.users[idx], ...updates };
    this.save();
    return this.data.users[idx];
  }

  // Internships
  getInternships(): Internship[] {
    return this.data.internships;
  }

  findInternshipById(id: string): Internship | undefined {
    return this.data.internships.find((i) => i.id === id);
  }

  addInternship(internship: Internship): Internship {
    this.data.internships.unshift(internship);
    this.save();
    return internship;
  }

  updateInternship(id: string, updates: Partial<Internship>): Internship | null {
    const idx = this.data.internships.findIndex((i) => i.id === id);
    if (idx === -1) return null;
    this.data.internships[idx] = { ...this.data.internships[idx], ...updates };
    this.save();
    return this.data.internships[idx];
  }

  deleteInternship(id: string): boolean {
    const initialLen = this.data.internships.length;
    this.data.internships = this.data.internships.filter((i) => i.id !== id);
    if (this.data.internships.length !== initialLen) {
      this.save();
      return true;
    }
    return false;
  }

  // Applications
  getApplications(): Application[] {
    return this.data.applications;
  }

  findApplicationById(id: string): Application | undefined {
    return this.data.applications.find((a) => a.id === id);
  }

  findApplicationsByStudent(studentId: string): Application[] {
    return this.data.applications.filter((a) => a.studentId === studentId);
  }

  findApplicationsForRecruiter(recruiterId: string): Application[] {
    const recruiterInternshipIds = new Set(
      this.data.internships.filter((i) => i.recruiterId === recruiterId).map((i) => i.id)
    );
    return this.data.applications.filter((a) => recruiterInternshipIds.has(a.internshipId));
  }

  addApplication(application: Application): Application {
    this.data.applications.unshift(application);
    this.save();
    return application;
  }

  updateApplication(id: string, updates: Partial<Application>): Application | null {
    const idx = this.data.applications.findIndex((a) => a.id === id);
    if (idx === -1) return null;
    this.data.applications[idx] = { ...this.data.applications[idx], ...updates };
    this.save();
    return this.data.applications[idx];
  }

  // Email Notifications
  getEmailLogs(): EmailNotification[] {
    return this.data.emailLogs;
  }

  getEmailLogsForUser(email: string): EmailNotification[] {
    return this.data.emailLogs.filter(
      (log) => log.recipientEmail.toLowerCase() === email.toLowerCase()
    );
  }

  addEmailLog(log: EmailNotification): EmailNotification {
    this.data.emailLogs.unshift(log);
    this.save();
    return log;
  }

  // Interview Sessions
  getInterviewSessionsByStudent(studentId: string): InterviewSession[] {
    return this.data.interviewSessions.filter((s) => s.studentId === studentId);
  }

  findInterviewSessionById(id: string): InterviewSession | undefined {
    return this.data.interviewSessions.find((s) => s.id === id);
  }

  saveInterviewSession(session: InterviewSession): InterviewSession {
    const idx = this.data.interviewSessions.findIndex((s) => s.id === session.id);
    if (idx >= 0) {
      this.data.interviewSessions[idx] = session;
    } else {
      this.data.interviewSessions.unshift(session);
    }
    this.save();
    return session;
  }
}

export const db = new JsonDatabase();
