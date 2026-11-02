import React, { useState, useEffect, useMemo } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Internship, Application, SkillMatchResult } from '../types.ts';
import {
  Search,
  Filter,
  MapPin,
  Clock,
  DollarSign,
  Calendar,
  Sparkles,
  Building2,
  CheckCircle2,
  XCircle,
  FileText,
  Upload,
  ArrowRight,
  Info,
  Briefcase,
} from 'lucide-react';

interface InternshipCatalogProps {
  onAppliedSuccess?: () => void;
  openAuth: (mode?: 'login' | 'register', role?: 'student' | 'recruiter') => void;
}

export const InternshipCatalog: React.FC<InternshipCatalogProps> = ({
  onAppliedSuccess,
  openAuth,
}) => {
  const { user, token, refreshUser } = useAuth();

  const [internships, setInternships] = useState<Internship[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters & Search
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSkill, setSelectedSkill] = useState<string>('all');
  const [remoteFilter, setRemoteFilter] = useState<'all' | 'remote' | 'onsite'>('all');
  const [locationFilter, setLocationFilter] = useState('');

  // Applications made by current student
  const [myApplications, setMyApplications] = useState<Application[]>([]);

  // Selected internship modal
  const [selectedInternship, setSelectedInternship] = useState<Internship | null>(null);

  // Gemini AI Match modal / state
  const [aiMatchResult, setAiMatchResult] = useState<{
    internshipId: string;
    loading: boolean;
    data: SkillMatchResult | null;
  } | null>(null);

  // Apply modal & quick resume upload
  const [isApplying, setIsApplying] = useState(false);
  const [applyModalInternship, setApplyModalInternship] = useState<Internship | null>(null);
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [applyError, setApplyError] = useState<string | null>(null);
  const [applySuccess, setApplySuccess] = useState<string | null>(null);

  // Fetch internships
  const fetchInternships = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/internships');
      const data = await res.json();
      if (res.ok) {
        setInternships(data.internships || []);
      } else {
        setError(data.error || 'Failed to load internships');
      }
    } catch (err: any) {
      setError(err.message || 'Network error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch student's existing applications
  const fetchMyApplications = async () => {
    if (!user || user.role !== 'student' || !token) return;
    try {
      const res = await fetch('/api/student/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data = await res.json();
        setMyApplications(data.applications || []);
      }
    } catch (err) {
      console.error('Error fetching applications:', err);
    }
  };

  useEffect(() => {
    fetchInternships();
  }, []);

  useEffect(() => {
    fetchMyApplications();
  }, [user, token]);

  // Extract unique skills from all internships for the filter bar
  const allAvailableSkills = useMemo(() => {
    const set = new Set<string>();
    internships.forEach((i) => {
      i.requiredSkills.forEach((s) => set.add(s.trim()));
    });
    return Array.from(set).sort();
  }, [internships]);

  // Student's skills for calculating match percentage
  const studentSkills = useMemo(() => {
    if (!user || user.role !== 'student' || !user.studentProfile) return [];
    return user.studentProfile.skills.map((s) => s.trim().toLowerCase());
  }, [user]);

  // Client-side quick algorithm calculation for each internship
  const calculateQuickMatch = (
    internship: Internship
  ): { percentage: number; matchedCount: number; totalCount: number } | null => {
    if (studentSkills.length === 0) return null;
    const reqs = internship.requiredSkills.map((s) => s.trim().toLowerCase());
    if (reqs.length === 0) {
      return { percentage: 100, matchedCount: 0, totalCount: 0 };
    }

    const matched = reqs.filter((req) =>
      studentSkills.some((st) => st === req || st.includes(req) || req.includes(st))
    );
    const score = Math.min(100, Math.round((matched.length / reqs.length) * 100));
    return {
      percentage: score,
      matchedCount: matched.length,
      totalCount: reqs.length,
    };
  };

  // Filtered internships list
  const filteredInternships = useMemo(() => {
    return internships.filter((internship) => {
      // Search query filter
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchesTitle = internship.title.toLowerCase().includes(q);
        const matchesComp = internship.company.toLowerCase().includes(q);
        const matchesDesc = internship.description.toLowerCase().includes(q);
        const matchesLoc = internship.location.toLowerCase().includes(q);
        const matchesSkills = internship.requiredSkills.some((s) => s.toLowerCase().includes(q));
        if (!matchesTitle && !matchesComp && !matchesDesc && !matchesLoc && !matchesSkills) {
          return false;
        }
      }

      // Skill filter
      if (selectedSkill !== 'all') {
        const hasSkill = internship.requiredSkills.some(
          (s) => s.toLowerCase() === selectedSkill.toLowerCase()
        );
        if (!hasSkill) return false;
      }

      // Remote filter
      if (remoteFilter === 'remote' && !internship.isRemote) return false;
      if (remoteFilter === 'onsite' && internship.isRemote) return false;

      // Location filter
      if (locationFilter.trim()) {
        if (!internship.location.toLowerCase().includes(locationFilter.toLowerCase())) {
          return false;
        }
      }

      return true;
    });
  }, [internships, searchQuery, selectedSkill, remoteFilter, locationFilter]);

  // Sorted by skill match if logged in as student
  const sortedInternships = useMemo(() => {
    if (!user || user.role !== 'student' || studentSkills.length === 0) {
      return filteredInternships;
    }
    return [...filteredInternships].sort((a, b) => {
      const matchA = calculateQuickMatch(a)?.percentage || 0;
      const matchB = calculateQuickMatch(b)?.percentage || 0;
      return matchB - matchA;
    });
  }, [filteredInternships, user, studentSkills]);

  // Trigger Gemini AI match analysis
  const handleAnalyzeWithAI = async (internship: Internship) => {
    if (!user || user.role !== 'student' || !token) {
      openAuth('login', 'student');
      return;
    }

    setAiMatchResult({
      internshipId: internship.id,
      loading: true,
      data: null,
    });

    try {
      const res = await fetch('/api/ai/match-analysis', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internshipId: internship.id,
          internshipSkills: internship.requiredSkills,
          internshipTitle: internship.title,
          internshipDescription: internship.description,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setAiMatchResult({
          internshipId: internship.id,
          loading: false,
          data: data.match,
        });
      } else {
        throw new Error(data.error || 'Failed to analyze match');
      }
    } catch (err: any) {
      console.error('AI match analysis error:', err);
      // Fallback result
      const q = calculateQuickMatch(internship);
      setAiMatchResult({
        internshipId: internship.id,
        loading: false,
        data: {
          matchPercentage: q?.percentage || 60,
          matchedSkills: internship.requiredSkills.filter((r) =>
            studentSkills.some((s) => s.includes(r.toLowerCase()))
          ),
          missingSkills: internship.requiredSkills.filter(
            (r) => !studentSkills.some((s) => s.includes(r.toLowerCase()))
          ),
          aiInsight: 'Calculated algorithmic skill compatibility.',
          recommendation: 'Highlight your coursework and personal project code in your application.',
        },
      });
    }
  };

  // Check if student has applied to this internship
  const getExistingApplication = (internshipId: string) => {
    return myApplications.find((a) => a.internshipId === internshipId);
  };

  // Submit application handler
  const handleApplyClick = (internship: Internship) => {
    if (!user) {
      openAuth('login', 'student');
      return;
    }

    if (user.role !== 'student') {
      alert('Only student accounts can submit internship applications.');
      return;
    }

    setApplyModalInternship(internship);
    setApplyError(null);
    setApplySuccess(null);
  };

  const handleConfirmSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!applyModalInternship || !token) return;

    setIsApplying(true);
    setApplyError(null);

    try {
      let customResume = undefined;

      // If user selected a new file during application modal
      if (resumeFile) {
        const base64 = await readFileAsBase64(resumeFile);
        customResume = {
          filename: resumeFile.name,
          fileType: resumeFile.type || 'application/pdf',
          fileSize: resumeFile.size,
          dataBase64: base64,
        };
      } else if (!user?.studentProfile?.resume?.dataBase64) {
        setApplyError('Please select a resume file (PDF or DOCX) to attach to your application.');
        setIsApplying(false);
        return;
      }

      const res = await fetch('/api/applications', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          internshipId: applyModalInternship.id,
          customResume,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setApplyError(data.error || 'Failed to submit application');
      } else {
        setApplySuccess('Application successfully submitted! Recruiter has been notified.');
        await fetchMyApplications();
        if (customResume) {
          await refreshUser();
        }
        setTimeout(() => {
          setApplyModalInternship(null);
          setResumeFile(null);
          if (onAppliedSuccess) onAppliedSuccess();
        }, 1800);
      }
    } catch (err: any) {
      setApplyError(err.message || 'Failed to submit application.');
    } finally {
      setIsApplying(false);
    }
  };

  const readFileAsBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Strip data prefix (e.g. "data:application/pdf;base64,")
        const base64 = result.split(',')[1] || result;
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="space-y-8 py-6">
      {/* Header and Live Filter Bar */}
      <div className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-xs space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
            Explore Skill-Matched Internships
          </h2>
          <p className="text-sm text-slate-600 mt-1">
            Browse verified tech internships. Filter by your target stack, workplace preference, and view exact skill match scores.
          </p>
        </div>

        {/* Search bar & Controls */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-6 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by job title, tech stack, company, or keyword..."
              className="w-full pl-10 pr-4 py-2.5 text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="md:col-span-3">
            <select
              value={selectedSkill}
              onChange={(e) => setSelectedSkill(e.target.value)}
              className="w-full px-3 py-2.5 text-sm rounded-xl border border-slate-300 bg-white text-slate-700 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
            >
              <option value="all">All Skills & Stacks</option>
              {allAvailableSkills.map((sk) => (
                <option key={sk} value={sk}>
                  {sk}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-3 flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setRemoteFilter('all')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                remoteFilter === 'all'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All
            </button>
            <button
              onClick={() => setRemoteFilter('remote')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                remoteFilter === 'remote'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Remote
            </button>
            <button
              onClick={() => setRemoteFilter('onsite')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                remoteFilter === 'onsite'
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Onsite
            </button>
          </div>
        </div>

        {/* Student Skill Match Guidance Banner */}
        {user?.role === 'student' && (
          <div className="p-3.5 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between gap-4 text-xs">
            <div className="flex items-center gap-2 text-indigo-900">
              <Sparkles className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                Matching against your profile skills:{' '}
                <strong className="font-semibold">
                  {user.studentProfile?.skills.length
                    ? user.studentProfile.skills.join(', ')
                    : 'No skills entered yet'}
                </strong>
              </span>
            </div>
            <span className="text-indigo-600 font-semibold whitespace-nowrap hidden sm:inline">
              Listings sorted by highest compatibility
            </span>
          </div>
        )}
      </div>

      {/* Internships Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200">
          <div className="animate-pulse flex flex-col items-center gap-2">
            <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
            <span className="text-sm">Loading active internships...</span>
          </div>
        </div>
      ) : sortedInternships.length === 0 ? (
        <div className="p-12 text-center text-slate-600 bg-white rounded-2xl border border-slate-200">
          <Briefcase className="w-10 h-10 text-slate-300 mx-auto mb-3" />
          <h3 className="text-base font-bold text-slate-800">No internships match your filters</h3>
          <p className="text-xs text-slate-500 mt-1">
            Try resetting your search query or skill filter to view all listings.
          </p>
          <button
            onClick={() => {
              setSearchQuery('');
              setSelectedSkill('all');
              setRemoteFilter('all');
            }}
            className="mt-4 px-4 py-2 text-xs font-semibold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
          >
            Clear All Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {sortedInternships.map((internship) => {
            const quickMatch = calculateQuickMatch(internship);
            const application = getExistingApplication(internship.id);
            const isDeadlinePassed =
              internship.deadline < new Date().toISOString().split('T')[0];

            return (
              <div
                key={internship.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all flex flex-col justify-between overflow-hidden"
              >
                {/* Top Section */}
                <div className="p-6">
                  {/* Company and Remote Badge */}
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <div>
                      <span className="text-xs font-semibold text-indigo-600 tracking-wide uppercase">
                        {internship.company}
                      </span>
                      <h3 className="text-base font-bold text-slate-900 mt-0.5 line-clamp-1">
                        {internship.title}
                      </h3>
                    </div>
                    {quickMatch !== null && (
                      <div className="text-right shrink-0">
                        <div
                          className={`text-xs font-mono font-bold px-2 py-0.5 rounded-md tabular-nums ${
                            quickMatch.percentage >= 80
                              ? 'bg-emerald-100 text-emerald-800'
                              : quickMatch.percentage >= 50
                              ? 'bg-indigo-100 text-indigo-800'
                              : 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {quickMatch.percentage}% Match
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Metadata line (Zero-pill text separators) */}
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mb-4">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>{internship.location}</span>
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>{internship.isRemote ? 'Remote' : 'Onsite'}</span>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono tabular-nums">{internship.stipend}</span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-3 mb-4 leading-relaxed">
                    {internship.description}
                  </p>

                  {/* Required Skills (Unboxed with subtle typography) */}
                  <div className="pt-3 border-t border-slate-100">
                    <div className="text-[11px] font-semibold text-slate-500 mb-2">
                      Required Skills:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {internship.requiredSkills.map((sk) => {
                        const isStudentSkill = studentSkills.includes(sk.toLowerCase());
                        return (
                          <span
                            key={sk}
                            className={`text-[11px] px-2 py-0.5 rounded-md font-medium transition-colors ${
                              isStudentSkill
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-semibold'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {sk}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                </div>

                {/* Footer Section */}
                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
                  <div className="text-[11px] text-slate-500 font-mono tabular-nums flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    <span>Due: {internship.deadline}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleAnalyzeWithAI(internship)}
                      title="Analyze match with Gemini AI"
                      className="p-1.5 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-4 h-4" />
                    </button>

                    <button
                      onClick={() => setSelectedInternship(internship)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
                    >
                      Details
                    </button>

                    {application ? (
                      <span className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>{application.status}</span>
                      </span>
                    ) : isDeadlinePassed ? (
                      <span className="px-3 py-1.5 text-xs font-medium text-slate-400 bg-slate-100 rounded-lg cursor-not-allowed">
                        Closed
                      </span>
                    ) : (
                      <button
                        onClick={() => handleApplyClick(internship)}
                        className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                      >
                        Apply Now
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Internship Details Modal */}
      {selectedInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="p-6 border-b border-slate-200 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                  {selectedInternship.company}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-0.5">
                  {selectedInternship.title}
                </h3>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500 mt-2">
                  <span>{selectedInternship.location}</span>
                  <span aria-hidden="true">·</span>
                  <span>{selectedInternship.isRemote ? 'Remote' : 'Onsite'}</span>
                  <span aria-hidden="true">·</span>
                  <span className="font-mono tabular-nums">{selectedInternship.stipend}</span>
                  <span aria-hidden="true">·</span>
                  <span>Duration: {selectedInternship.duration}</span>
                </div>
              </div>
              <button
                onClick={() => setSelectedInternship(null)}
                className="text-slate-400 hover:text-slate-700 p-1 rounded-lg cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[60vh] overflow-y-auto text-sm text-slate-700">
              <div>
                <h4 className="font-bold text-slate-900 mb-1">About the Role</h4>
                <p className="leading-relaxed whitespace-pre-line text-slate-600">
                  {selectedInternship.description}
                </p>
              </div>

              <div>
                <h4 className="font-bold text-slate-900 mb-2">Required Skills & Stack</h4>
                <div className="flex flex-wrap gap-1.5">
                  {selectedInternship.requiredSkills.map((s) => (
                    <span
                      key={s}
                      className="px-2.5 py-1 text-xs font-medium rounded-md bg-slate-100 text-slate-800"
                    >
                      {s}
                    </span>
                  ))}
                </div>
              </div>

              {selectedInternship.preferredQualifications && (
                <div>
                  <h4 className="font-bold text-slate-900 mb-1">Preferred Qualifications</h4>
                  <p className="leading-relaxed text-slate-600">
                    {selectedInternship.preferredQualifications}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4 p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs">
                <div>
                  <span className="text-slate-500 block">Openings</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {selectedInternship.openings} Positions
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Application Deadline</span>
                  <span className="font-bold text-slate-900 font-mono tabular-nums">
                    {selectedInternship.deadline}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Recruiter Contact</span>
                  <span className="font-medium text-slate-800">
                    {selectedInternship.contactEmail}
                  </span>
                </div>
                <div>
                  <span className="text-slate-500 block">Listing ID</span>
                  <span className="font-mono text-slate-600 text-[11px]">
                    {selectedInternship.id}
                  </span>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setSelectedInternship(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => {
                    handleAnalyzeWithAI(selectedInternship);
                    setSelectedInternship(null);
                  }}
                  className="px-4 py-2 text-xs font-semibold text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Analyze with Gemini AI</span>
                </button>

                <button
                  onClick={() => {
                    handleApplyClick(selectedInternship);
                    setSelectedInternship(null);
                  }}
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  Apply for this Role
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Skill Match Analysis Modal */}
      {aiMatchResult && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-indigo-400" />
                <h3 className="font-bold text-base">Gemini AI Skill Compatibility</h3>
              </div>
              <button
                onClick={() => setAiMatchResult(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-5">
              {aiMatchResult.loading ? (
                <div className="py-10 text-center space-y-3">
                  <div className="w-8 h-8 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin mx-auto" />
                  <p className="text-xs text-slate-600">
                    Gemini AI is analyzing your coursework, skills, and target role criteria...
                  </p>
                </div>
              ) : aiMatchResult.data ? (
                <>
                  <div className="flex items-center justify-between p-4 bg-indigo-50/70 border border-indigo-100 rounded-xl">
                    <div>
                      <span className="text-xs text-indigo-800 font-semibold block">
                        Estimated Readiness Match
                      </span>
                      <span className="text-xs text-slate-500">
                        Based on student profile & requirements
                      </span>
                    </div>
                    <div className="text-3xl font-extrabold font-mono text-indigo-600 tabular-nums">
                      {aiMatchResult.data.matchPercentage}%
                    </div>
                  </div>

                  <div>
                    <h4 className="text-xs font-bold uppercase text-slate-500 mb-1.5">
                      Matched Competencies
                    </h4>
                    <div className="flex flex-wrap gap-1.5">
                      {aiMatchResult.data.matchedSkills.length > 0 ? (
                        aiMatchResult.data.matchedSkills.map((s) => (
                          <span
                            key={s}
                            className="text-xs font-semibold px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-md"
                          >
                            ✓ {s}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-500">
                          No direct overlap detected with listed profile skills.
                        </span>
                      )}
                    </div>
                  </div>

                  {aiMatchResult.data.missingSkills.length > 0 && (
                    <div>
                      <h4 className="text-xs font-bold uppercase text-slate-500 mb-1.5">
                        Recommended Upskilling Areas
                      </h4>
                      <div className="flex flex-wrap gap-1.5">
                        {aiMatchResult.data.missingSkills.map((s) => (
                          <span
                            key={s}
                            className="text-xs px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium"
                          >
                            + {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                    <div>
                      <strong className="text-slate-900 block mb-0.5">AI Advisor Insight:</strong>
                      <p className="leading-relaxed">{aiMatchResult.data.aiInsight}</p>
                    </div>
                    <div>
                      <strong className="text-slate-900 block mb-0.5">Next Steps:</strong>
                      <p className="leading-relaxed">{aiMatchResult.data.recommendation}</p>
                    </div>
                  </div>
                </>
              ) : null}
            </div>

            <div className="p-4 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setAiMatchResult(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Close Analysis
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Application Submission Modal */}
      {applyModalInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Submit Internship Application</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  {applyModalInternship.title} at {applyModalInternship.company}
                </p>
              </div>
              <button
                onClick={() => setApplyModalInternship(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConfirmSubmitApplication} className="p-6 space-y-5">
              {applyError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {applyError}
                </div>
              )}

              {applySuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{applySuccess}</span>
                </div>
              )}

              {/* Candidate summary */}
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1.5">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-semibold text-slate-900">{user?.name}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{user?.email}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">College:</span>
                  <span className="text-slate-800">
                    {user?.studentProfile?.college || 'Not specified'}
                  </span>
                </div>
              </div>

              {/* Resume attachment picker */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-2">
                  Attached Resume <span className="text-red-500">*</span>
                </label>

                {user?.studentProfile?.resume ? (
                  <div className="p-3 bg-indigo-50/60 border border-indigo-200 rounded-xl flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <div>
                        <div className="text-xs font-semibold text-indigo-950">
                          {user.studentProfile.resume.filename}
                        </div>
                        <div className="text-[11px] text-indigo-600">
                          Profile default resume ({Math.round(user.studentProfile.resume.fileSize / 1024)} KB)
                        </div>
                      </div>
                    </div>
                    <span className="text-[11px] text-emerald-700 font-semibold bg-emerald-100 px-2 py-0.5 rounded-sm">
                      Ready
                    </span>
                  </div>
                ) : (
                  <p className="text-xs text-amber-600 mb-2">
                    No default resume uploaded in your profile yet. Please choose a resume file below:
                  </p>
                )}

                <div className="mt-2">
                  <label className="text-xs text-slate-600 block mb-1">
                    {user?.studentProfile?.resume ? 'Or upload a different resume for this position:' : 'Upload Resume (PDF, DOCX):'}
                  </label>
                  <input
                    type="file"
                    accept=".pdf,.docx,.doc"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setResumeFile(e.target.files[0]);
                      }
                    }}
                    className="block w-full text-xs text-slate-500 file:mr-3 file:py-2 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100 cursor-pointer"
                  />
                </div>
              </div>

              <div className="pt-2 text-xs text-slate-500 leading-relaxed">
                By applying, your profile details, skills, and resume will be securely transmitted to the hiring recruiter at <strong>{applyModalInternship.company}</strong>.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setApplyModalInternship(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={isApplying}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {isApplying ? (
                    <span>Submitting Application...</span>
                  ) : (
                    <>
                      <span>Confirm & Send Application</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
