import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import {
  db,
  User,
  Internship,
  Application,
  ApplicationStatus,
  InterviewSession,
} from './server/db.js';
import { sendApplicationEmail, isSmtpConfigured } from './server/email.js';
import {
  analyzeSkillMatch,
  generateInterviewQuestions,
  evaluateInterviewAnswer,
  generateInterviewSummary,
} from './server/gemini.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3000;

// Body parser with 10MB limit for resume uploads (PDF/DOCX in base64)
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// In-memory token storage (token -> userId)
const activeTokens = new Map<string, string>();

// Pre-fill tokens for seed users so quick-login or testing works seamlessly
activeTokens.set('token-recruiter-sarah', 'recruiter-nexus-1');
activeTokens.set('token-student-maya', 'student-seed-1');
activeTokens.set('token-student-marcus', 'student-seed-2');

// Auth helper middleware
interface AuthenticatedRequest extends Request {
  user?: User;
}

function authenticateToken(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    res.status(401).json({ error: 'Authentication required. No token provided.' });
    return;
  }

  const userId = activeTokens.get(token);
  if (!userId) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in.' });
    return;
  }

  const user = db.findUserById(userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  req.user = user;
  next();
}

function requireStudent(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'student') {
    res.status(403).json({ error: 'Access denied. Student account required.' });
    return;
  }
  next();
}

function requireRecruiter(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  if (!req.user || req.user.role !== 'recruiter') {
    res.status(403).json({ error: 'Access denied. Recruiter account required.' });
    return;
  }
  next();
}

// -----------------------------------------------------------------------------
// Authentication Endpoints
// -----------------------------------------------------------------------------

app.post('/api/auth/register', (req: Request, res: Response) => {
  try {
    const { role, email, password, name, college, department, graduationYear, skills, careerInterests, companyName } = req.body;

    if (!role || !email || !password || !name) {
      res.status(400).json({ error: 'Role, email, password, and name are required.' });
      return;
    }

    if (role !== 'student' && role !== 'recruiter') {
      res.status(400).json({ error: 'Role must be student or recruiter.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    if (db.findUserByEmail(cleanEmail)) {
      res.status(409).json({ error: 'An account with this email address already exists. Please log in.' });
      return;
    }

    const salt = bcrypt.genSaltSync(10);
    const passwordHash = bcrypt.hashSync(password, salt);
    const userId = `${role}-${crypto.randomUUID()}`;

    const newUser: User = {
      id: userId,
      role,
      email: cleanEmail,
      passwordHash,
      name: name.trim(),
      createdAt: new Date().toISOString(),
    };

    if (role === 'student') {
      newUser.studentProfile = {
        college: (college || '').trim(),
        department: (department || '').trim(),
        graduationYear: graduationYear ? parseInt(graduationYear, 10) : new Date().getFullYear() + 2,
        skills: Array.isArray(skills) ? skills.map((s: string) => s.trim()).filter(Boolean) : [],
        careerInterests: Array.isArray(careerInterests)
          ? careerInterests.map((s: string) => s.trim()).filter(Boolean)
          : [],
        resume: null,
      };
    } else {
      newUser.companyName = (companyName || '').trim() || 'Innovative Ventures';
    }

    db.addUser(newUser);

    const token = 'token-' + crypto.randomUUID();
    activeTokens.set(token, newUser.id);

    // Send welcome notification
    sendApplicationEmail({
      toEmail: newUser.email,
      toName: newUser.name,
      recipientRole: newUser.role,
      recipientId: newUser.id,
      subject: `Welcome to SkillBridge AI, ${newUser.name}!`,
      body: `Hi ${newUser.name},\n\nYour ${newUser.role} account has been successfully created on SkillBridge AI.\n\n${
        newUser.role === 'student'
          ? 'Upload your resume and start matching with curated internships based on your skills.'
          : 'Create internship listings and discover top university talent matched for your team.'
      }\n\nBest regards,\nThe SkillBridge AI Team`,
      event: 'welcome',
    });

    const { passwordHash: _, ...userSafe } = newUser;
    res.status(201).json({ user: userSafe, token });
  } catch (err: any) {
    console.error('Registration error:', err);
    res.status(500).json({ error: 'Registration failed: ' + err.message });
  }
});

app.post('/api/auth/login', (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' });
      return;
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = db.findUserByEmail(cleanEmail);

    if (!user) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const isMatch = bcrypt.compareSync(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid email or password.' });
      return;
    }

    const token = 'token-' + crypto.randomUUID();
    activeTokens.set(token, user.id);

    const { passwordHash: _, ...userSafe } = user;
    res.json({ user: userSafe, token });
  } catch (err: any) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed: ' + err.message });
  }
});

app.get('/api/auth/me', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  if (!req.user) {
    res.status(401).json({ error: 'Not authenticated.' });
    return;
  }
  const { passwordHash: _, ...userSafe } = req.user;
  res.json({ user: userSafe });
});

app.post('/api/auth/logout', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (token) {
    activeTokens.delete(token);
  }
  res.json({ success: true, message: 'Logged out successfully.' });
});

// Update student profile
app.put('/api/student/profile', authenticateToken, requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { college, department, graduationYear, skills, careerInterests } = req.body;
    const user = req.user!;

    const currentProfile = user.studentProfile || {
      college: '',
      department: '',
      graduationYear: 2026,
      skills: [],
      careerInterests: [],
      resume: null,
    };

    const updatedProfile = {
      ...currentProfile,
      college: college !== undefined ? String(college).trim() : currentProfile.college,
      department: department !== undefined ? String(department).trim() : currentProfile.department,
      graduationYear: graduationYear ? parseInt(graduationYear, 10) : currentProfile.graduationYear,
      skills: Array.isArray(skills) ? skills.map((s: string) => s.trim()).filter(Boolean) : currentProfile.skills,
      careerInterests: Array.isArray(careerInterests)
        ? careerInterests.map((s: string) => s.trim()).filter(Boolean)
        : currentProfile.careerInterests,
    };

    const updatedUser = db.updateUser(user.id, { studentProfile: updatedProfile });
    if (!updatedUser) {
      res.status(404).json({ error: 'Student not found.' });
      return;
    }

    const { passwordHash: _, ...userSafe } = updatedUser;
    res.json({ user: userSafe });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update student profile: ' + err.message });
  }
});

// -----------------------------------------------------------------------------
// Resume Upload & Secure Download
// -----------------------------------------------------------------------------

app.post('/api/student/resume', authenticateToken, requireStudent, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { filename, fileType, fileSize, dataBase64 } = req.body;

    if (!filename || !dataBase64) {
      res.status(400).json({ error: 'Resume file data and filename are required.' });
      return;
    }

    // File validation: PDF or Word DOCX
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const hasValidExt = validExtensions.some((ext) => filename.toLowerCase().endsWith(ext));
    const validMimes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/msword',
      'application/octet-stream',
    ];
    const hasValidMime = fileType ? validMimes.includes(fileType) : true;

    if (!hasValidExt && !hasValidMime) {
      res.status(400).json({
        error: 'Invalid file format. Please upload a PDF (.pdf) or Word document (.docx).',
      });
      return;
    }

    // Size check (5MB max)
    const MAX_SIZE = 5 * 1024 * 1024;
    if (fileSize && fileSize > MAX_SIZE) {
      res.status(400).json({ error: 'File size exceeds 5MB limit. Please upload a smaller file.' });
      return;
    }

    const user = req.user!;
    const resumeObj = {
      filename: filename.trim(),
      fileType: fileType || 'application/pdf',
      fileSize: fileSize || Math.round((dataBase64.length * 3) / 4),
      uploadedAt: new Date().toISOString(),
      dataBase64,
    };

    const currentProfile = user.studentProfile || {
      college: '',
      department: '',
      graduationYear: 2026,
      skills: [],
      careerInterests: [],
      resume: null,
    };

    const updatedUser = db.updateUser(user.id, {
      studentProfile: {
        ...currentProfile,
        resume: resumeObj,
      },
    });

    res.json({
      success: true,
      resume: {
        filename: resumeObj.filename,
        fileType: resumeObj.fileType,
        fileSize: resumeObj.fileSize,
        uploadedAt: resumeObj.uploadedAt,
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to upload resume: ' + err.message });
  }
});

// Student download own resume
app.get('/api/student/resume/download', authenticateToken, requireStudent, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const resume = user.studentProfile?.resume;

  if (!resume || !resume.dataBase64) {
    res.status(404).json({ error: 'No resume uploaded for this student account.' });
    return;
  }

  res.json({
    filename: resume.filename,
    fileType: resume.fileType,
    dataBase64: resume.dataBase64,
  });
});

// Recruiter download applicant resume (strictly authorized for recruiter's applicants only)
app.get('/api/recruiter/applications/:applicationId/resume', authenticateToken, requireRecruiter, (req: AuthenticatedRequest, res: Response) => {
  const { applicationId } = req.params;
  const application = db.findApplicationById(applicationId);

  if (!application) {
    res.status(404).json({ error: 'Application not found.' });
    return;
  }

  const internship = db.findInternshipById(application.internshipId);
  if (!internship || internship.recruiterId !== req.user!.id) {
    res.status(403).json({ error: 'Unauthorized. You may only view resumes of students who applied to your internship listings.' });
    return;
  }

  if (!application.resume || !application.resume.dataBase64) {
    res.status(404).json({ error: 'Resume data not found for this applicant.' });
    return;
  }

  res.json({
    studentName: application.studentName,
    filename: application.resume.filename,
    fileType: application.resume.fileType,
    dataBase64: application.resume.dataBase64,
  });
});

// -----------------------------------------------------------------------------
// Internship Endpoints
// -----------------------------------------------------------------------------

app.get('/api/internships', (req: Request, res: Response) => {
  try {
    const { search, skill, remote, location } = req.query;
    let list = db.getInternships();

    if (search && typeof search === 'string') {
      const q = search.toLowerCase();
      list = list.filter(
        (i) =>
          i.title.toLowerCase().includes(q) ||
          i.company.toLowerCase().includes(q) ||
          i.description.toLowerCase().includes(q) ||
          i.location.toLowerCase().includes(q)
      );
    }

    if (skill && typeof skill === 'string') {
      const s = skill.toLowerCase();
      list = list.filter((i) => i.requiredSkills.some((sk) => sk.toLowerCase().includes(s)));
    }

    if (remote === 'true') {
      list = list.filter((i) => i.isRemote);
    } else if (remote === 'false') {
      list = list.filter((i) => !i.isRemote);
    }

    if (location && typeof location === 'string') {
      const loc = location.toLowerCase();
      list = list.filter((i) => i.location.toLowerCase().includes(loc));
    }

    res.json({ internships: list });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch internships: ' + err.message });
  }
});

app.post('/api/internships', authenticateToken, requireRecruiter, (req: AuthenticatedRequest, res: Response) => {
  try {
    const {
      title,
      company,
      description,
      requiredSkills,
      preferredQualifications,
      location,
      isRemote,
      duration,
      stipend,
      stipendAmount,
      openings,
      deadline,
      contactEmail,
    } = req.body;

    if (!title || !description || !deadline) {
      res.status(400).json({ error: 'Title, description, and application deadline are required.' });
      return;
    }

    const recruiter = req.user!;
    const newInternship: Internship = {
      id: 'intern-' + crypto.randomUUID(),
      recruiterId: recruiter.id,
      recruiterEmail: recruiter.email,
      title: title.trim(),
      company: (company || recruiter.companyName || 'SkillBridge Partner').trim(),
      description: description.trim(),
      requiredSkills: Array.isArray(requiredSkills)
        ? requiredSkills.map((s: string) => s.trim()).filter(Boolean)
        : [],
      preferredQualifications: (preferredQualifications || '').trim(),
      location: (location || 'Remote').trim(),
      isRemote: Boolean(isRemote),
      duration: (duration || '3 Months').trim(),
      stipend: (stipend || 'Competitive').trim(),
      stipendAmount: stipendAmount ? parseInt(stipendAmount, 10) : 0,
      openings: openings ? parseInt(openings, 10) : 1,
      deadline: deadline.trim(),
      contactEmail: (contactEmail || recruiter.email).trim(),
      createdAt: new Date().toISOString(),
    };

    db.addInternship(newInternship);
    res.status(201).json({ internship: newInternship });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to post internship: ' + err.message });
  }
});

app.put('/api/internships/:id', authenticateToken, requireRecruiter, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.findInternshipById(id);

    if (!existing) {
      res.status(404).json({ error: 'Internship listing not found.' });
      return;
    }

    if (existing.recruiterId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized. You can only edit your own internship listings.' });
      return;
    }

    const updates = req.body;
    const updated = db.updateInternship(id, updates);
    res.json({ internship: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update internship: ' + err.message });
  }
});

app.delete('/api/internships/:id', authenticateToken, requireRecruiter, (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const existing = db.findInternshipById(id);

    if (!existing) {
      res.status(404).json({ error: 'Internship listing not found.' });
      return;
    }

    if (existing.recruiterId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized. You can only delete your own internship listings.' });
      return;
    }

    db.deleteInternship(id);
    res.json({ success: true, message: 'Internship listing deleted.' });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to delete internship: ' + err.message });
  }
});

// -----------------------------------------------------------------------------
// Application System & Status Tracking
// -----------------------------------------------------------------------------

app.post('/api/applications', authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { internshipId, customResume } = req.body;
    const student = req.user!;

    if (!internshipId) {
      res.status(400).json({ error: 'Internship ID is required.' });
      return;
    }

    const internship = db.findInternshipById(internshipId);
    if (!internship) {
      res.status(404).json({ error: 'Internship listing not found.' });
      return;
    }

    // Check application deadline
    const todayStr = new Date().toISOString().split('T')[0];
    if (internship.deadline < todayStr) {
      res.status(400).json({ error: `The application deadline (${internship.deadline}) has passed for this internship.` });
      return;
    }

    // Check duplicate applications
    const existingApps = db.findApplicationsByStudent(student.id);
    const alreadyApplied = existingApps.some((a) => a.internshipId === internshipId);
    if (alreadyApplied) {
      res.status(409).json({ error: 'You have already submitted an application for this internship.' });
      return;
    }

    // Check resume
    const studentResume = customResume || student.studentProfile?.resume;
    if (!studentResume || !studentResume.dataBase64) {
      res.status(400).json({
        error: 'Please upload a resume in your profile before applying for internships.',
        needsResume: true,
      });
      return;
    }

    const newApplication: Application = {
      id: 'app-' + crypto.randomUUID(),
      internshipId: internship.id,
      internshipTitle: internship.title,
      company: internship.company,
      studentId: student.id,
      studentName: student.name,
      studentEmail: student.email,
      studentCollege: student.studentProfile?.college || 'University Partner',
      studentSkills: student.studentProfile?.skills || [],
      resume: {
        filename: studentResume.filename,
        fileType: studentResume.fileType,
        fileSize: studentResume.fileSize,
        dataBase64: studentResume.dataBase64,
      },
      appliedAt: new Date().toISOString(),
      status: 'Applied',
      statusHistory: [
        {
          status: 'Applied',
          timestamp: new Date().toISOString(),
          note: 'Application submitted successfully with attached resume.',
        },
      ],
    };

    db.addApplication(newApplication);

    // 1. Email to Student
    await sendApplicationEmail({
      toEmail: student.email,
      toName: student.name,
      recipientRole: 'student',
      recipientId: student.id,
      subject: `Application Confirmed: ${internship.title} at ${internship.company}`,
      body: `Hi ${student.name},\n\nYour application for "${internship.title}" at ${internship.company} has been received!\n\nApplication Details:\n- Role: ${internship.title}\n- Company: ${internship.company}\n- Applied On: ${new Date().toLocaleDateString()}\n- Status: Applied\n\nYou can track real-time progress and recruiter feedback from your SkillBridge student dashboard.\n\nBest regards,\nThe SkillBridge AI Team`,
      event: 'applied',
    });

    // 2. Email to Recruiter
    await sendApplicationEmail({
      toEmail: internship.contactEmail || internship.recruiterEmail,
      toName: internship.company,
      recipientRole: 'recruiter',
      recipientId: internship.recruiterId,
      subject: `New Candidate Application: ${student.name} for ${internship.title}`,
      body: `Hello,\n\nA new student candidate has applied for your internship opening:\n\nCandidate: ${student.name} (${student.email})\nCollege: ${newApplication.studentCollege}\nSkills: ${newApplication.studentSkills.join(', ')}\nRole: ${internship.title}\n\nLog in to your Recruiter Dashboard to review their full profile and attached resume.\n\nBest regards,\nSkillBridge AI Talent System`,
      event: 'new_application',
    });

    res.status(201).json({
      success: true,
      application: newApplication,
      message: 'Application submitted successfully! Notifications sent.',
    });
  } catch (err: any) {
    console.error('Application error:', err);
    res.status(500).json({ error: 'Failed to submit application: ' + err.message });
  }
});

// Student view own applications
app.get('/api/student/applications', authenticateToken, requireStudent, (req: AuthenticatedRequest, res: Response) => {
  const applications = db.findApplicationsByStudent(req.user!.id);
  res.json({ applications });
});

// Recruiter view applications for their listings
app.get('/api/recruiter/applications', authenticateToken, requireRecruiter, (req: AuthenticatedRequest, res: Response) => {
  const applications = db.findApplicationsForRecruiter(req.user!.id);
  res.json({ applications });
});

// Recruiter update application status & schedule interview
app.put('/api/recruiter/applications/:id/status', authenticateToken, requireRecruiter, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { id } = req.params;
    const { status, note, feedback, interviewDetails } = req.body;

    const application = db.findApplicationById(id);
    if (!application) {
      res.status(404).json({ error: 'Application not found.' });
      return;
    }

    const internship = db.findInternshipById(application.internshipId);
    if (!internship || internship.recruiterId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized. You can only manage applications to your own internships.' });
      return;
    }

    const validStatuses: ApplicationStatus[] = [
      'Applied',
      'Under Review',
      'Shortlisted',
      'Interview Scheduled',
      'Accepted',
      'Rejected',
    ];

    if (!validStatuses.includes(status)) {
      res.status(400).json({ error: 'Invalid application status.' });
      return;
    }

    const history = [...application.statusHistory];
    history.push({
      status,
      timestamp: new Date().toISOString(),
      note: note || undefined,
    });

    const updates: Partial<Application> = {
      status,
      statusHistory: history,
      recruiterFeedback: feedback !== undefined ? feedback : application.recruiterFeedback,
      interviewDetails: interviewDetails !== undefined ? interviewDetails : application.interviewDetails,
    };

    const updated = db.updateApplication(id, updates);

    // Event email notifications based on status update
    if (status === 'Shortlisted') {
      await sendApplicationEmail({
        toEmail: application.studentEmail,
        toName: application.studentName,
        recipientRole: 'student',
        recipientId: application.studentId,
        subject: `Exciting News: You've been Shortlisted for ${application.internshipTitle}!`,
        body: `Hi ${application.studentName},\n\nGreat news! The recruiting team at ${application.company} has reviewed your profile and shortlisted your application for "${application.internshipTitle}".\n\n${feedback ? `Recruiter Note: "${feedback}"\n\n` : ''}Next steps will be communicated shortly through your SkillBridge dashboard.\n\nBest regards,\n${application.company} Recruiting Team`,
        event: 'shortlisted',
      });
    } else if (status === 'Interview Scheduled' && interviewDetails) {
      await sendApplicationEmail({
        toEmail: application.studentEmail,
        toName: application.studentName,
        recipientRole: 'student',
        recipientId: application.studentId,
        subject: `Interview Scheduled: ${application.internshipTitle} at ${application.company}`,
        body: `Hi ${application.studentName},\n\nYour interview for "${application.internshipTitle}" at ${application.company} is confirmed.\n\nInterview Details:\n- Date: ${interviewDetails.date}\n- Time: ${interviewDetails.time}\n- Platform: ${interviewDetails.platform}\n- Meeting Link / Location: ${interviewDetails.meetingLinkOrLocation}\n${interviewDetails.notes ? `- Preparation Notes: ${interviewDetails.notes}\n` : ''}\nUse SkillBridge AI's interview prep tool to practice questions before your session!\n\nBest regards,\n${application.company} Recruiting Team`,
        event: 'interview_scheduled',
      });
    } else if (status === 'Accepted') {
      await sendApplicationEmail({
        toEmail: application.studentEmail,
        toName: application.studentName,
        recipientRole: 'student',
        recipientId: application.studentId,
        subject: `Offer Extended: Congratulations from ${application.company}!`,
        body: `Congratulations ${application.studentName}!\n\nWe are delighted to inform you that your application for "${application.internshipTitle}" has been accepted!\n\n${feedback ? `Message from Recruiter: "${feedback}"\n\n` : ''}The team will follow up directly regarding onboarding details.\n\nWarm regards,\n${application.company} & SkillBridge AI`,
        event: 'accepted',
      });
    } else if (status === 'Rejected') {
      await sendApplicationEmail({
        toEmail: application.studentEmail,
        toName: application.studentName,
        recipientRole: 'student',
        recipientId: application.studentId,
        subject: `Application Update: ${application.internshipTitle} at ${application.company}`,
        body: `Hi ${application.studentName},\n\nThank you for taking the time to apply for the "${application.internshipTitle}" position at ${application.company}.\n\nAfter careful consideration, we have chosen to move forward with candidates whose experience more closely matches our current openings.\n\n${feedback ? `Feedback: "${feedback}"\n\n` : ''}We encourage you to continue applying to other opportunities on SkillBridge AI and wish you the best in your career journey.\n\nBest regards,\n${application.company} Recruiting Team`,
        event: 'rejected',
      });
    }

    res.json({ application: updated });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to update application status: ' + err.message });
  }
});

// -----------------------------------------------------------------------------
// AI-Powered Endpoints (Gemini AI & Fallbacks)
// -----------------------------------------------------------------------------

// AI Skill Matching
app.post('/api/ai/match-analysis', authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { internshipId, internshipSkills, internshipTitle, internshipDescription } = req.body;
    const student = req.user!;
    const profile = student.studentProfile || {
      college: '',
      department: '',
      graduationYear: 2026,
      skills: [],
      careerInterests: [],
      resume: null,
    };

    let title = internshipTitle;
    let skills = internshipSkills;
    let desc = internshipDescription;

    if (internshipId) {
      const internship = db.findInternshipById(internshipId);
      if (internship) {
        title = internship.title;
        skills = internship.requiredSkills;
        desc = internship.description;
      }
    }

    if (!Array.isArray(skills)) {
      skills = [];
    }

    const match = await analyzeSkillMatch(
      profile.skills,
      profile.careerInterests,
      title || 'Internship Role',
      skills,
      desc || ''
    );

    res.json({ match });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to analyze skill match: ' + err.message });
  }
});

// AI Interview Prep: Start Session
app.post('/api/ai/interview/start', authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { role, topic, difficulty, mode } = req.body;
    const student = req.user!;

    if (!role || !topic) {
      res.status(400).json({ error: 'Role and topic are required to start interview prep.' });
      return;
    }

    const questions = await generateInterviewQuestions(
      role,
      topic,
      difficulty || 'Intermediate'
    );

    const session: InterviewSession = {
      id: 'session-' + crypto.randomUUID(),
      studentId: student.id,
      role: role.trim(),
      topic: topic.trim(),
      difficulty: difficulty || 'Intermediate',
      mode: mode || 'mock',
      questions,
      currentQuestionIndex: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    db.saveInterviewSession(session);
    res.status(201).json({ session });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to start interview prep: ' + err.message });
  }
});

// AI Interview Prep: Submit Answer
app.post('/api/ai/interview/:sessionId/submit-answer', authenticateToken, requireStudent, async (req: AuthenticatedRequest, res: Response) => {
  try {
    const { sessionId } = req.params;
    const { answer } = req.body;

    if (!answer || !answer.trim()) {
      res.status(400).json({ error: 'Answer cannot be empty.' });
      return;
    }

    const session = db.findInterviewSessionById(sessionId);
    if (!session) {
      res.status(404).json({ error: 'Interview session not found.' });
      return;
    }

    if (session.studentId !== req.user!.id) {
      res.status(403).json({ error: 'Unauthorized to access this session.' });
      return;
    }

    const currentIndex = session.currentQuestionIndex;
    const currentQ = session.questions[currentIndex];

    if (!currentQ) {
      res.status(400).json({ error: 'All questions in this session have already been completed.' });
      return;
    }

    // Evaluate answer via Gemini
    const evaluation = await evaluateInterviewAnswer(
      session.role,
      session.topic,
      currentQ.question,
      answer.trim()
    );

    currentQ.studentAnswer = answer.trim();
    currentQ.evaluation = evaluation;

    const nextIndex = currentIndex + 1;
    session.currentQuestionIndex = nextIndex;
    session.updatedAt = new Date().toISOString();

    // If all questions answered, generate comprehensive final report
    let isCompleted = nextIndex >= session.questions.length;
    if (isCompleted) {
      const summaryPayload = session.questions.map((q) => ({
        question: q.question,
        studentAnswer: q.studentAnswer || '',
        score: q.evaluation?.score || 6,
        feedback: q.evaluation?.constructiveFeedback || '',
      }));

      const finalSummary = await generateInterviewSummary(
        session.role,
        session.topic,
        summaryPayload
      );
      session.finalSummary = finalSummary;
    }

    db.saveInterviewSession(session);

    res.json({
      session,
      currentEvaluation: evaluation,
      isCompleted,
      nextQuestionNumber: isCompleted ? null : nextIndex + 1,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to evaluate answer: ' + err.message });
  }
});

// AI Interview Sessions History
app.get('/api/ai/interview/sessions', authenticateToken, requireStudent, (req: AuthenticatedRequest, res: Response) => {
  const sessions = db.getInterviewSessionsByStudent(req.user!.id);
  res.json({ sessions });
});

// -----------------------------------------------------------------------------
// Notifications & Email Center Endpoints
// -----------------------------------------------------------------------------

app.get('/api/notifications', authenticateToken, (req: AuthenticatedRequest, res: Response) => {
  const user = req.user!;
  const logs = db.getEmailLogsForUser(user.email);
  res.json({
    notifications: logs,
    smtpConfigured: isSmtpConfigured(),
  });
});

app.get('/api/system/status', (_req: Request, res: Response) => {
  res.json({
    status: 'online',
    smtpConfigured: isSmtpConfigured(),
    geminiConfigured: Boolean(process.env.GEMINI_API_KEY),
    timestamp: new Date().toISOString(),
  });
});

// -----------------------------------------------------------------------------
// Vite Middleware / Static Asset Mounting
// -----------------------------------------------------------------------------

async function startServer() {
  const isProd = process.env.NODE_ENV === 'production';

  if (!isProd) {
    // Development mode: mount Vite dev server middlewares
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    // Production mode: serve static build assets
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[SkillBridge AI] Server running at http://localhost:${PORT}`);
    console.log(`[SkillBridge AI] SMTP Status: ${isSmtpConfigured() ? 'Configured' : 'In-App Log Fallback'}`);
    console.log(`[SkillBridge AI] Gemini AI Status: ${process.env.GEMINI_API_KEY ? 'Active' : 'Algorithmic Fallback'}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
