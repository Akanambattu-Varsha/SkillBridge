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
    dataBase64?: string;
  } | null;
}

export interface User {
  id: string;
  role: 'student' | 'recruiter';
  email: string;
  name: string;
  createdAt: string;
  studentProfile?: StudentProfile;
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
  deadline: string;
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
    dataBase64?: string;
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
      score: number;
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

export interface SkillMatchResult {
  matchPercentage: number;
  matchedSkills: string[];
  missingSkills: string[];
  aiInsight: string;
  recommendation: string;
}
