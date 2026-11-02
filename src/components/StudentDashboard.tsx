import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Application, Internship } from '../types.ts';
import {
  FileText,
  Upload,
  Download,
  Trash2,
  Edit2,
  Check,
  CheckCircle2,
  Clock,
  Sparkles,
  ExternalLink,
  Calendar,
  Building2,
  AlertCircle,
  GraduationCap,
  Eye,
} from 'lucide-react';

interface StudentDashboardProps {
  onNavigate: (tab: 'internships' | 'interview' | 'notifications') => void;
}

export const StudentDashboard: React.FC<StudentDashboardProps> = ({ onNavigate }) => {
  const { user, token, updateStudentProfile, uploadResume, refreshUser } = useAuth();

  const [applications, setApplications] = useState<Application[]>([]);
  const [loadingApps, setLoadingApps] = useState(true);

  // Profile Edit State
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [collegeInput, setCollegeInput] = useState('');
  const [departmentInput, setDepartmentInput] = useState('');
  const [graduationYearInput, setGraduationYearInput] = useState('2026');
  const [skillsList, setSkillsList] = useState<string[]>([]);
  const [newSkillText, setNewSkillText] = useState('');
  const [interestsList, setInterestsList] = useState<string[]>([]);
  const [newInterestText, setNewInterestText] = useState('');
  const [saveProfileLoading, setSaveProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Resume Upload State
  const [uploadingResume, setUploadingResume] = useState(false);
  const [resumeMsg, setResumeMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [previewResume, setPreviewResume] = useState<boolean>(false);

  // Recommended Internships state
  const [recommended, setRecommended] = useState<Internship[]>([]);

  // Fetch applications for current student
  const fetchApplications = async () => {
    if (!token) return;
    try {
      setLoadingApps(true);
      const res = await fetch('/api/student/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Failed to load applications:', err);
    } finally {
      setLoadingApps(false);
    }
  };

  // Fetch recommended internships
  const fetchRecommended = async () => {
    try {
      const res = await fetch('/api/internships');
      if (res.ok) {
        const data = await res.json();
        const list: Internship[] = data.internships || [];
        const studentSkills = (user?.studentProfile?.skills || []).map((s) => s.toLowerCase());

        // Sort by skill match
        const scored = list.map((item) => {
          const reqs = item.requiredSkills.map((r) => r.toLowerCase());
          const matched = reqs.filter((r) => studentSkills.some((s) => s.includes(r)));
          const matchPercent = reqs.length ? Math.round((matched.length / reqs.length) * 100) : 60;
          return { item, matchPercent, matchedCount: matched.length };
        });

        scored.sort((a, b) => b.matchPercent - a.matchPercent);
        setRecommended(scored.slice(0, 3).map((s) => s.item));
      }
    } catch (err) {
      console.error('Failed to load recommended internships:', err);
    }
  };

  useEffect(() => {
    if (user && user.studentProfile) {
      setCollegeInput(user.studentProfile.college || '');
      setDepartmentInput(user.studentProfile.department || '');
      setGraduationYearInput(String(user.studentProfile.graduationYear || 2026));
      setSkillsList(user.studentProfile.skills || []);
      setInterestsList(user.studentProfile.careerInterests || []);
    }
    fetchApplications();
    fetchRecommended();
  }, [user]);

  if (!user || user.role !== 'student') {
    return (
      <div className="p-12 text-center text-slate-600 bg-white rounded-2xl border border-slate-200 my-8">
        <GraduationCap className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Student Account Required</h3>
        <p className="text-sm text-slate-500 mt-1">
          Please sign in with a student account to view this dashboard.
        </p>
      </div>
    );
  }

  // Handle Save Profile
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveProfileLoading(true);
    setProfileMsg(null);

    const res = await updateStudentProfile({
      college: collegeInput,
      department: departmentInput,
      graduationYear: parseInt(graduationYearInput, 10),
      skills: skillsList,
      careerInterests: interestsList,
    });

    setSaveProfileLoading(false);
    if (res.success) {
      setProfileMsg({ text: 'Profile updated successfully!', type: 'success' });
      setIsEditingProfile(false);
      fetchRecommended();
    } else {
      setProfileMsg({ text: res.error || 'Failed to update profile', type: 'error' });
    }
  };

  const handleAddSkill = () => {
    const trimmed = newSkillText.trim();
    if (trimmed && !skillsList.some((s) => s.toLowerCase() === trimmed.toLowerCase())) {
      setSkillsList([...skillsList, trimmed]);
      setNewSkillText('');
    }
  };

  const handleRemoveSkill = (skillToRemove: string) => {
    setSkillsList(skillsList.filter((s) => s !== skillToRemove));
  };

  const handleAddInterest = () => {
    const trimmed = newInterestText.trim();
    if (trimmed && !interestsList.some((i) => i.toLowerCase() === trimmed.toLowerCase())) {
      setInterestsList([...interestsList, trimmed]);
      setNewInterestText('');
    }
  };

  const handleRemoveInterest = (interestToRemove: string) => {
    setInterestsList(interestsList.filter((i) => i !== interestToRemove));
  };

  // Resume Upload Handler (PDF & DOCX validation)
  const handleResumeFileInput = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;

    setResumeMsg(null);

    // Validation
    const validExtensions = ['.pdf', '.docx', '.doc'];
    const hasValidExt = validExtensions.some((ext) => file.name.toLowerCase().endsWith(ext));
    if (!hasValidExt) {
      setResumeMsg({
        text: 'Invalid file format. Please upload a PDF (.pdf) or Word document (.docx).',
        type: 'error',
      });
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setResumeMsg({ text: 'File size must be under 5MB.', type: 'error' });
      return;
    }

    setUploadingResume(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const result = reader.result as string;
        const base64 = result.split(',')[1] || result;

        const res = await uploadResume({
          filename: file.name,
          fileType: file.type || 'application/pdf',
          fileSize: file.size,
          dataBase64: base64,
        });

        setUploadingResume(false);
        if (res.success) {
          setResumeMsg({ text: 'Resume uploaded successfully!', type: 'success' });
          await refreshUser();
        } else {
          setResumeMsg({ text: res.error || 'Failed to upload resume', type: 'error' });
        }
      };
      reader.onerror = () => {
        setUploadingResume(false);
        setResumeMsg({ text: 'Error reading file data', type: 'error' });
      };
      reader.readAsDataURL(file);
    } catch (err: any) {
      setUploadingResume(false);
      setResumeMsg({ text: err.message || 'Upload error', type: 'error' });
    }
  };

  // Download Resume
  const handleDownloadResume = () => {
    const resume = user.studentProfile?.resume;
    if (!resume || !resume.dataBase64) return;

    const link = document.createElement('a');
    link.href = `data:${resume.fileType};base64,${resume.dataBase64}`;
    link.download = resume.filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Status Badge Helper
  const getStatusBadge = (status: Application['status']) => {
    switch (status) {
      case 'Applied':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-blue-50 text-blue-700 border border-blue-200">
            Applied
          </span>
        );
      case 'Under Review':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-amber-50 text-amber-700 border border-amber-200">
            Under Review
          </span>
        );
      case 'Shortlisted':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200">
            Shortlisted
          </span>
        );
      case 'Interview Scheduled':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold">
            Interview Scheduled
          </span>
        );
      case 'Accepted':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-green-100 text-green-800 border border-green-300 font-bold">
            Accepted
          </span>
        );
      case 'Rejected':
        return (
          <span className="px-2.5 py-1 text-xs font-semibold rounded-md bg-red-50 text-red-700 border border-red-200">
            Rejected
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 py-6">
      {/* Welcome Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-1">
            Student Career Portal
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            Welcome back, {user.name}!
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            {user.studentProfile?.college
              ? `${user.studentProfile.department || 'Computer Science'} student at ${user.studentProfile.college} (Class of ${user.studentProfile.graduationYear})`
              : 'Complete your student profile to unlock customized internship matches.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => onNavigate('interview')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-indigo-200" />
            <span>AI Mock Interview</span>
          </button>
          <button
            onClick={() => onNavigate('internships')}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors cursor-pointer"
          >
            Find Internships
          </button>
        </div>
      </div>

      {/* Main Grid: Left Profile & Resume, Right Applications & Recommended */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column (5 Cols): Profile & Resume Card */}
        <div className="lg:col-span-5 space-y-6">
          {/* Profile Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <GraduationCap className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-slate-900 text-base">Student Profile</h3>
              </div>
              <button
                onClick={() => setIsEditingProfile(!isEditingProfile)}
                className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
              >
                {isEditingProfile ? (
                  'Cancel'
                ) : (
                  <>
                    <Edit2 className="w-3.5 h-3.5" />
                    <span>Edit Profile</span>
                  </>
                )}
              </button>
            </div>

            {profileMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs ${
                  profileMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {profileMsg.text}
              </div>
            )}

            {isEditingProfile ? (
              <form onSubmit={handleSaveProfile} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    College / University
                  </label>
                  <input
                    type="text"
                    value={collegeInput}
                    onChange={(e) => setCollegeInput(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={departmentInput}
                      onChange={(e) => setDepartmentInput(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Graduation Year
                    </label>
                    <select
                      value={graduationYearInput}
                      onChange={(e) => setGraduationYearInput(e.target.value)}
                      className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="2025">2025</option>
                      <option value="2026">2026</option>
                      <option value="2027">2027</option>
                      <option value="2028">2028</option>
                      <option value="2029">2029</option>
                    </select>
                  </div>
                </div>

                {/* Skills editor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Skills (Used for matching)
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newSkillText}
                      onChange={(e) => setNewSkillText(e.target.value)}
                      placeholder="Add a skill (e.g. React, SQL, Python)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddSkill();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddSkill}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {skillsList.map((skill) => (
                      <span
                        key={skill}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-indigo-50 text-indigo-700 rounded-md font-medium"
                      >
                        <span>{skill}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveSkill(skill)}
                          className="text-indigo-400 hover:text-indigo-700 ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Career Interests editor */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Career Interests
                  </label>
                  <div className="flex gap-2 mb-2">
                    <input
                      type="text"
                      value={newInterestText}
                      onChange={(e) => setNewInterestText(e.target.value)}
                      placeholder="Add interest (e.g. Machine Learning, Cloud)"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddInterest();
                        }
                      }}
                      className="flex-1 px-3 py-1.5 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                    />
                    <button
                      type="button"
                      onClick={handleAddInterest}
                      className="px-3 py-1.5 bg-slate-900 text-white text-xs font-semibold rounded-lg hover:bg-slate-800 cursor-pointer"
                    >
                      Add
                    </button>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {interestsList.map((interest) => (
                      <span
                        key={interest}
                        className="inline-flex items-center gap-1 text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium"
                      >
                        <span>{interest}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveInterest(interest)}
                          className="text-slate-400 hover:text-slate-700 ml-1 cursor-pointer"
                        >
                          ✕
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={saveProfileLoading}
                  className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {saveProfileLoading ? 'Saving...' : 'Save Profile Changes'}
                </button>
              </form>
            ) : (
              <div className="space-y-4 text-sm">
                <div>
                  <span className="text-xs text-slate-500 block">Registered Email</span>
                  <span className="font-mono text-xs text-slate-800">{user.email}</span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">University</span>
                    <span className="font-semibold text-slate-800">
                      {user.studentProfile?.college || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Department</span>
                    <span className="font-semibold text-slate-800">
                      {user.studentProfile?.department || 'Not set'}
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block">Graduation Year</span>
                    <span className="font-semibold text-slate-800 font-mono tabular-nums">
                      {user.studentProfile?.graduationYear || 2026}
                    </span>
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1.5">Skills for Matching</span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.studentProfile?.skills?.length ? (
                      user.studentProfile.skills.map((s) => (
                        <span
                          key={s}
                          className="text-xs px-2.5 py-0.5 rounded-md font-medium bg-indigo-50 text-indigo-700 border border-indigo-100"
                        >
                          {s}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No skills listed yet</span>
                    )}
                  </div>
                </div>

                <div>
                  <span className="text-xs text-slate-500 block mb-1.5">Career Interests</span>
                  <div className="flex flex-wrap gap-1.5">
                    {user.studentProfile?.careerInterests?.length ? (
                      user.studentProfile.careerInterests.map((int) => (
                        <span
                          key={int}
                          className="text-xs px-2 py-0.5 rounded-md font-medium bg-slate-100 text-slate-700"
                        >
                          {int}
                        </span>
                      ))
                    ) : (
                      <span className="text-xs text-slate-400 italic">No interests added</span>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Resume Upload & Management Card */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <FileText className="w-5 h-5 text-indigo-600" />
              <h3 className="font-bold text-slate-900 text-base">Resume Management</h3>
            </div>

            {resumeMsg && (
              <div
                className={`mb-4 p-3 rounded-lg text-xs ${
                  resumeMsg.type === 'success'
                    ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                    : 'bg-red-50 text-red-700 border border-red-200'
                }`}
              >
                {resumeMsg.text}
              </div>
            )}

            {user.studentProfile?.resume ? (
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900">
                        {user.studentProfile.resume.filename}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                        {Math.round(user.studentProfile.resume.fileSize / 1024)} KB · Uploaded{' '}
                        {new Date(user.studentProfile.resume.uploadedAt).toLocaleDateString()}
                      </div>
                      <div className="text-[11px] text-emerald-600 font-medium mt-1 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active for applications</span>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleDownloadResume}
                    className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <button
                    onClick={() => setPreviewResume(true)}
                    className="flex-1 py-2 px-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Preview</span>
                  </button>
                </div>

                {/* Replace Resume option */}
                <div className="pt-3 border-t border-slate-100">
                  <label className="text-xs font-semibold text-slate-700 block mb-1">
                    Replace Resume:
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    disabled={uploadingResume}
                    onChange={handleResumeFileInput}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                  />
                  <span className="text-[11px] text-slate-400 mt-1 block">
                    Supported: PDF, DOCX (Max 5MB)
                  </span>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="border-2 border-dashed border-slate-200 rounded-xl p-6 text-center">
                  <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <div className="text-xs font-semibold text-slate-800">
                    No resume uploaded yet
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1 mb-3">
                    Upload your PDF or DOCX resume to apply for internships with one click.
                  </p>
                  <label className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg cursor-pointer transition-colors shadow-xs">
                    <Upload className="w-3.5 h-3.5" />
                    <span>{uploadingResume ? 'Uploading...' : 'Choose Resume File'}</span>
                    <input
                      type="file"
                      accept=".pdf,.docx,.doc"
                      disabled={uploadingResume}
                      onChange={handleResumeFileInput}
                      className="hidden"
                    />
                  </label>
                  <div className="text-[10px] text-slate-400 mt-2">
                    PDF or Word DOCX · Maximum size 5MB
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (7 Cols): Applied Internships & Status Tracker */}
        <div className="lg:col-span-7 space-y-6">
          {/* Applications Tracking Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Application Tracking System
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Real-time status updates, recruiter notes, and interview schedules
                </p>
              </div>
              <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md tabular-nums">
                {applications.length} Submitted
              </span>
            </div>

            {loadingApps ? (
              <div className="py-8 text-center text-xs text-slate-500">
                Loading your applications...
              </div>
            ) : applications.length === 0 ? (
              <div className="py-10 text-center text-slate-500">
                <AlertCircle className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-600 font-medium">
                  You haven't submitted any internship applications yet.
                </p>
                <button
                  onClick={() => onNavigate('internships')}
                  className="mt-3 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Browse Open Positions
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {applications.map((app) => (
                  <div
                    key={app.id}
                    className="p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all space-y-3"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <span className="text-xs font-semibold text-indigo-600 uppercase tracking-wide">
                          {app.company}
                        </span>
                        <h4 className="text-sm font-bold text-slate-900 mt-0.5">
                          {app.internshipTitle}
                        </h4>
                        <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
                          Applied on {new Date(app.appliedAt).toLocaleDateString()}
                        </div>
                      </div>
                      <div>{getStatusBadge(app.status)}</div>
                    </div>

                    {/* Recruiter Feedback callout if provided */}
                    {app.recruiterFeedback && (
                      <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-lg text-xs text-slate-700">
                        <strong className="text-indigo-950 block mb-0.5">
                          Recruiter Feedback:
                        </strong>
                        <p className="italic">"{app.recruiterFeedback}"</p>
                      </div>
                    )}

                    {/* Interview Details callout if interview scheduled */}
                    {app.interviewDetails && app.status === 'Interview Scheduled' && (
                      <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-950 space-y-1.5">
                        <div className="font-bold flex items-center gap-1.5 text-emerald-900">
                          <Calendar className="w-4 h-4 text-emerald-600" />
                          <span>Interview Session Details</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                          <div>
                            <span className="text-emerald-700 block">Date & Time:</span>
                            <span className="font-semibold font-mono tabular-nums">
                              {app.interviewDetails.date} at {app.interviewDetails.time}
                            </span>
                          </div>
                          <div>
                            <span className="text-emerald-700 block">Platform:</span>
                            <span className="font-semibold">{app.interviewDetails.platform}</span>
                          </div>
                        </div>
                        {app.interviewDetails.meetingLinkOrLocation && (
                          <div className="text-[11px] pt-1">
                            <span className="text-emerald-700 block">Meeting Link / Location:</span>
                            <a
                              href={app.interviewDetails.meetingLinkOrLocation}
                              target="_blank"
                              rel="noreferrer"
                              className="text-indigo-600 underline font-mono break-all hover:text-indigo-800"
                            >
                              {app.interviewDetails.meetingLinkOrLocation}
                            </a>
                          </div>
                        )}
                        {app.interviewDetails.notes && (
                          <div className="text-[11px] pt-1 text-emerald-800">
                            <strong>Note:</strong> {app.interviewDetails.notes}
                          </div>
                        )}
                        <div className="pt-2">
                          <button
                            onClick={() => onNavigate('interview')}
                            className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[11px] rounded-md transition-colors cursor-pointer"
                          >
                            Practice Mock Interview for this Role →
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Timeline History */}
                    <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <div className="flex items-center gap-2">
                        <span>Stages:</span>
                        {app.statusHistory.map((h, i) => (
                          <span key={i} className="inline-flex items-center gap-1">
                            {i > 0 && <span className="text-slate-300">→</span>}
                            <span
                              className={`font-medium ${
                                i === app.statusHistory.length - 1
                                  ? 'text-indigo-700 font-semibold'
                                  : 'text-slate-500'
                              }`}
                            >
                              {h.status}
                            </span>
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Recommended Internships Section */}
          <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs">
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-100">
              <div>
                <h3 className="font-bold text-slate-900 text-base">
                  Recommended for Your Skills
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  High-compatibility internships matching your coursework and interests
                </p>
              </div>
              <button
                onClick={() => onNavigate('internships')}
                className="text-xs font-semibold text-indigo-600 hover:underline cursor-pointer"
              >
                View All
              </button>
            </div>

            <div className="space-y-3">
              {recommended.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-xl border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition-colors flex items-center justify-between gap-3"
                >
                  <div>
                    <span className="text-[11px] font-semibold text-indigo-600 uppercase">
                      {item.company}
                    </span>
                    <h4 className="text-xs font-bold text-slate-900">{item.title}</h4>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1">
                      <span>{item.location}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-mono tabular-nums">{item.stipend}</span>
                    </div>
                  </div>

                  <button
                    onClick={() => onNavigate('internships')}
                    className="px-3 py-1.5 bg-white text-indigo-600 border border-indigo-200 hover:bg-indigo-50 text-xs font-semibold rounded-lg shadow-xs transition-colors shrink-0 cursor-pointer"
                  >
                    View & Apply
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Resume Preview Modal */}
      {previewResume && user.studentProfile?.resume && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-600" />
                <h3 className="font-bold text-sm text-slate-900">
                  {user.studentProfile.resume.filename}
                </h3>
              </div>
              <button
                onClick={() => setPreviewResume(false)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Document Type:</span>
                  <span className="font-mono text-slate-800">
                    {user.studentProfile.resume.fileType}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Size:</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {Math.round(user.studentProfile.resume.fileSize / 1024)} KB
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Uploaded On:</span>
                  <span className="font-mono tabular-nums text-slate-800">
                    {new Date(user.studentProfile.resume.uploadedAt).toLocaleString()}
                  </span>
                </div>
              </div>

              <div className="p-4 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs text-indigo-900 leading-relaxed">
                This resume is securely linked to your student account and will be automatically delivered to recruiters whenever you submit an internship application.
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setPreviewResume(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={handleDownloadResume}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
