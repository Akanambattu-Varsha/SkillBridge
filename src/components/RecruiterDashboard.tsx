import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Internship, Application, ApplicationStatus } from '../types.ts';
import {
  Building2,
  Plus,
  Trash2,
  Edit2,
  Users,
  FileText,
  Download,
  Calendar,
  CheckCircle2,
  XCircle,
  Clock,
  Send,
  Sparkles,
  MapPin,
  ExternalLink,
} from 'lucide-react';

export const RecruiterDashboard: React.FC = () => {
  const { user, token } = useAuth();

  const [myInternships, setMyInternships] = useState<Internship[]>([]);
  const [myApplications, setMyApplications] = useState<Application[]>([]);
  const [loading, setLoading] = useState(true);

  // Active filter tab: 'applicants' | 'listings'
  const [activeTab, setActiveTab] = useState<'applicants' | 'listings'>('applicants');
  const [filterInternshipId, setFilterInternshipId] = useState<string>('all');

  // Create / Edit Internship Modal
  const [isPostingModalOpen, setIsPostingModalOpen] = useState(false);
  const [editingInternshipId, setEditingInternshipId] = useState<string | null>(null);

  // Form fields
  const [title, setTitle] = useState('');
  const [company, setCompany] = useState('');
  const [description, setDescription] = useState('');
  const [requiredSkillsInput, setRequiredSkillsInput] = useState('');
  const [preferredQualifications, setPreferredQualifications] = useState('');
  const [location, setLocation] = useState('');
  const [isRemote, setIsRemote] = useState(true);
  const [duration, setDuration] = useState('3 Months');
  const [stipend, setStipend] = useState('$2,000/month');
  const [stipendAmount, setStipendAmount] = useState('2000');
  const [openings, setOpenings] = useState('2');
  const [deadline, setDeadline] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [formLoading, setFormLoading] = useState(false);

  // Status Update & Interview Scheduling Modal
  const [statusModalApp, setStatusModalApp] = useState<Application | null>(null);
  const [newStatus, setNewStatus] = useState<ApplicationStatus>('Under Review');
  const [recruiterFeedback, setRecruiterFeedback] = useState('');
  const [interviewDate, setInterviewDate] = useState('');
  const [interviewTime, setInterviewTime] = useState('14:00 PST');
  const [interviewPlatform, setInterviewPlatform] = useState('Google Meet');
  const [interviewLink, setInterviewLink] = useState('https://meet.google.com/skb-recruiter-session');
  const [interviewNotes, setInterviewNotes] = useState('');
  const [statusUpdateLoading, setStatusUpdateLoading] = useState(false);

  // Resume inspection state
  const [viewingResumeApp, setViewingResumeApp] = useState<Application | null>(null);

  // Fetch recruiter listings & applications
  const fetchData = async () => {
    if (!token || !user) return;
    try {
      setLoading(true);

      // Fetch all internships, then filter by recruiterId
      const resI = await fetch('/api/internships');
      const dataI = await resI.json();
      const recruiterListings = (dataI.internships || []).filter(
        (i: Internship) => i.recruiterId === user.id
      );
      setMyInternships(recruiterListings);

      // Fetch applications belonging to this recruiter
      const resA = await fetch('/api/recruiter/applications', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const dataA = await resA.json();
      setMyApplications(dataA.applications || []);
    } catch (err) {
      console.error('Error fetching recruiter data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user, token]);

  if (!user || user.role !== 'recruiter') {
    return (
      <div className="p-12 text-center text-slate-600 bg-white rounded-2xl border border-slate-200 my-8">
        <Building2 className="w-12 h-12 text-indigo-500 mx-auto mb-3" />
        <h3 className="text-lg font-bold text-slate-800">Recruiter Account Required</h3>
        <p className="text-sm text-slate-500 mt-1">
          Please sign in with a recruiter account to access this console.
        </p>
      </div>
    );
  }

  // Open Create Modal
  const handleOpenCreateModal = () => {
    setEditingInternshipId(null);
    setTitle('');
    setCompany(user.companyName || '');
    setDescription('');
    setRequiredSkillsInput('');
    setPreferredQualifications('');
    setLocation('Remote');
    setIsRemote(true);
    setDuration('3 Months');
    setStipend('$2,000/month');
    setStipendAmount('2000');
    setOpenings('2');

    // Default deadline 30 days ahead
    const d = new Date();
    d.setDate(d.getDate() + 30);
    setDeadline(d.toISOString().split('T')[0]);
    setContactEmail(user.email);
    setFormError(null);
    setIsPostingModalOpen(true);
  };

  // Open Edit Modal
  const handleOpenEditModal = (item: Internship) => {
    setEditingInternshipId(item.id);
    setTitle(item.title);
    setCompany(item.company);
    setDescription(item.description);
    setRequiredSkillsInput(item.requiredSkills.join(', '));
    setPreferredQualifications(item.preferredQualifications || '');
    setLocation(item.location);
    setIsRemote(item.isRemote);
    setDuration(item.duration);
    setStipend(item.stipend);
    setStipendAmount(String(item.stipendAmount || 2000));
    setOpenings(String(item.openings || 1));
    setDeadline(item.deadline);
    setContactEmail(item.contactEmail || user.email);
    setFormError(null);
    setIsPostingModalOpen(true);
  };

  // Submit Create or Edit Internship
  const handleSubmitInternship = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setFormError(null);

    const skillsArray = requiredSkillsInput
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean);

    const payload = {
      title,
      company,
      description,
      requiredSkills: skillsArray,
      preferredQualifications,
      location,
      isRemote,
      duration,
      stipend,
      stipendAmount: parseInt(stipendAmount, 10),
      openings: parseInt(openings, 10),
      deadline,
      contactEmail,
    };

    try {
      const url = editingInternshipId
        ? `/api/internships/${editingInternshipId}`
        : '/api/internships';
      const method = editingInternshipId ? 'PUT' : 'POST';

      const res = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        setFormError(data.error || 'Failed to save internship');
      } else {
        setIsPostingModalOpen(false);
        await fetchData();
      }
    } catch (err: any) {
      setFormError(err.message || 'Network error');
    } finally {
      setFormLoading(false);
    }
  };

  // Delete Internship
  const handleDeleteInternship = async (id: string) => {
    if (!confirm('Are you sure you want to delete this internship listing?')) return;
    try {
      const res = await fetch(`/api/internships/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        await fetchData();
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete internship');
      }
    } catch (err) {
      console.error('Delete error:', err);
    }
  };

  // Open Status & Feedback Modal
  const handleOpenStatusModal = (app: Application) => {
    setStatusModalApp(app);
    setNewStatus(app.status);
    setRecruiterFeedback(app.recruiterFeedback || '');
    if (app.interviewDetails) {
      setInterviewDate(app.interviewDetails.date || '');
      setInterviewTime(app.interviewDetails.time || '14:00 PST');
      setInterviewPlatform(app.interviewDetails.platform || 'Google Meet');
      setInterviewLink(app.interviewDetails.meetingLinkOrLocation || '');
      setInterviewNotes(app.interviewDetails.notes || '');
    } else {
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setInterviewDate(nextWeek.toISOString().split('T')[0]);
      setInterviewTime('14:00 PST');
      setInterviewPlatform('Google Meet');
      setInterviewLink('https://meet.google.com/skb-recruiter-session');
      setInterviewNotes('Please prepare a short walkthrough of your technical projects.');
    }
  };

  // Submit Status Update
  const handleSaveStatus = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!statusModalApp || !token) return;

    setStatusUpdateLoading(true);
    try {
      const payload: any = {
        status: newStatus,
        feedback: recruiterFeedback.trim() || undefined,
        note: `Status updated to ${newStatus} by recruiter.`,
      };

      if (newStatus === 'Interview Scheduled') {
        payload.interviewDetails = {
          date: interviewDate,
          time: interviewTime,
          platform: interviewPlatform,
          meetingLinkOrLocation: interviewLink,
          notes: interviewNotes,
        };
      }

      const res = await fetch(`/api/recruiter/applications/${statusModalApp.id}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setStatusModalApp(null);
        await fetchData();
      } else {
        const d = await res.json();
        alert(d.error || 'Failed to update status');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating application status');
    } finally {
      setStatusUpdateLoading(false);
    }
  };

  // Download Applicant Resume
  const handleDownloadApplicantResume = (app: Application) => {
    if (!app.resume || !app.resume.dataBase64) {
      alert('Resume data not available for this applicant.');
      return;
    }
    const link = document.createElement('a');
    link.href = `data:${app.resume.fileType};base64,${app.resume.dataBase64}`;
    link.download = `${app.studentName.replace(/\s+/g, '_')}_Resume.${
      app.resume.filename.endsWith('.docx') ? 'docx' : 'pdf'
    }`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Filtered applicants
  const displayedApplications = myApplications.filter((a) => {
    if (filterInternshipId === 'all') return true;
    return a.internshipId === filterInternshipId;
  });

  return (
    <div className="space-y-8 py-6">
      {/* Top Banner */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-1">
            Recruiter Management Console
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            {user.companyName || 'Employer Hub'} – {user.name}
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Manage your company's active internship listings, evaluate student applicants, inspect attached resumes, and coordinate interview stages with automated email notifications.
          </p>
        </div>

        <button
          onClick={handleOpenCreateModal}
          className="px-5 py-3 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold rounded-xl shadow-xs transition-colors flex items-center gap-2 cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Post New Internship</span>
        </button>
      </div>

      {/* Metric Cards Strip */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Active Listings</div>
          <div className="text-2xl font-bold font-mono text-slate-900 mt-1 tabular-nums">
            {myInternships.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Total Applicants</div>
          <div className="text-2xl font-bold font-mono text-indigo-600 mt-1 tabular-nums">
            {myApplications.length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Shortlisted Students</div>
          <div className="text-2xl font-bold font-mono text-purple-600 mt-1 tabular-nums">
            {myApplications.filter((a) => a.status === 'Shortlisted').length}
          </div>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
          <div className="text-xs text-slate-500 font-medium">Interviews Scheduled</div>
          <div className="text-2xl font-bold font-mono text-emerald-600 mt-1 tabular-nums">
            {myApplications.filter((a) => a.status === 'Interview Scheduled').length}
          </div>
        </div>
      </div>

      {/* Tabs: Applicants vs Listings */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 sm:p-6 border-b border-slate-200 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl">
            <button
              onClick={() => setActiveTab('applicants')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'applicants'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4" />
              <span>Applicants ({myApplications.length})</span>
            </button>
            <button
              onClick={() => setActiveTab('listings')}
              className={`px-4 py-2 text-xs font-semibold rounded-lg transition-colors cursor-pointer flex items-center gap-2 ${
                activeTab === 'listings'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>My Internship Listings ({myInternships.length})</span>
            </button>
          </div>

          {activeTab === 'applicants' && myInternships.length > 0 && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-500 font-medium">Filter by Listing:</span>
              <select
                value={filterInternshipId}
                onChange={(e) => setFilterInternshipId(e.target.value)}
                className="px-3 py-1.5 text-xs rounded-lg border border-slate-300 bg-white text-slate-700"
              >
                <option value="all">All Listings</option>
                {myInternships.map((i) => (
                  <option key={i.id} value={i.id}>
                    {i.title}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Tab 1: Applicants List */}
        {activeTab === 'applicants' && (
          <div className="p-6">
            {displayedApplications.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No applicants yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  When students apply to your internship listings, their profiles and resumes will appear here.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider border-b border-slate-200">
                    <tr>
                      <th className="py-3 px-4">Candidate</th>
                      <th className="py-3 px-4">Internship Role</th>
                      <th className="py-3 px-4">Skills</th>
                      <th className="py-3 px-4">Resume</th>
                      <th className="py-3 px-4">Current Status</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {displayedApplications.map((app) => (
                      <tr key={app.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-slate-900">{app.studentName}</div>
                          <div className="text-[11px] font-mono text-slate-500">{app.studentEmail}</div>
                          <div className="text-[11px] text-slate-500">{app.studentCollege}</div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{app.internshipTitle}</div>
                          <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                            Applied {new Date(app.appliedAt).toLocaleDateString()}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <div className="flex flex-wrap gap-1">
                            {app.studentSkills.slice(0, 4).map((s) => (
                              <span
                                key={s}
                                className="px-1.5 py-0.5 text-[10px] rounded bg-slate-100 text-slate-700"
                              >
                                {s}
                              </span>
                            ))}
                            {app.studentSkills.length > 4 && (
                              <span className="text-[10px] text-slate-400">
                                +{app.studentSkills.length - 4} more
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            <button
                              onClick={() => handleDownloadApplicantResume(app)}
                              className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 rounded-md text-[11px] font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                            >
                              <Download className="w-3 h-3 text-indigo-600" />
                              <span>Download</span>
                            </button>
                            <button
                              onClick={() => setViewingResumeApp(app)}
                              className="p-1 hover:bg-slate-100 text-slate-400 hover:text-slate-700 rounded cursor-pointer"
                              title="Inspect Resume Details"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 text-[11px] font-semibold rounded-md ${
                              app.status === 'Applied'
                                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                                : app.status === 'Under Review'
                                ? 'bg-amber-50 text-amber-700 border border-amber-200'
                                : app.status === 'Shortlisted'
                                ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                : app.status === 'Interview Scheduled'
                                ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold'
                                : app.status === 'Accepted'
                                ? 'bg-green-100 text-green-800 border border-green-300 font-bold'
                                : 'bg-red-50 text-red-700 border border-red-200'
                            }`}
                          >
                            {app.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <button
                            onClick={() => handleOpenStatusModal(app)}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold text-[11px] transition-colors cursor-pointer"
                          >
                            Update Status / Schedule
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Tab 2: My Internship Listings */}
        {activeTab === 'listings' && (
          <div className="p-6">
            {myInternships.length === 0 ? (
              <div className="py-12 text-center text-slate-500">
                <Building2 className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <h4 className="text-sm font-bold text-slate-800">No internship postings yet</h4>
                <p className="text-xs text-slate-500 mt-1">
                  Create your first listing to start accepting university applicants.
                </p>
                <button
                  onClick={handleOpenCreateModal}
                  className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                >
                  Create Internship
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {myInternships.map((item) => {
                  const applicantCount = myApplications.filter(
                    (a) => a.internshipId === item.id
                  ).length;
                  return (
                    <div
                      key={item.id}
                      className="p-5 rounded-xl border border-slate-200 bg-white hover:border-indigo-200 transition-all flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                    >
                      <div className="space-y-1.5">
                        <div className="flex items-center gap-2">
                          <h4 className="text-base font-bold text-slate-900">{item.title}</h4>
                          <span className="text-[11px] px-2 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                            {item.isRemote ? 'Remote' : 'Onsite'}
                          </span>
                        </div>

                        <div className="flex flex-wrap items-center gap-2 text-xs text-slate-500">
                          <span>{item.location}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">{item.stipend}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.duration}</span>
                          <span aria-hidden="true">·</span>
                          <span className="font-mono tabular-nums">Deadline: {item.deadline}</span>
                        </div>

                        <div className="flex flex-wrap gap-1 pt-1">
                          {item.requiredSkills.map((sk) => (
                            <span
                              key={sk}
                              className="text-[10px] px-2 py-0.5 rounded bg-indigo-50 text-indigo-700 font-medium"
                            >
                              {sk}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 shrink-0">
                        <div className="text-right mr-2 hidden sm:block">
                          <div className="text-xs font-bold text-slate-900 font-mono tabular-nums">
                            {applicantCount}
                          </div>
                          <div className="text-[10px] text-slate-500">Applicants</div>
                        </div>

                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-2 hover:bg-slate-100 text-slate-600 hover:text-slate-900 rounded-lg transition-colors cursor-pointer"
                          title="Edit Listing"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>

                        <button
                          onClick={() => handleDeleteInternship(item.id)}
                          className="p-2 hover:bg-red-50 text-slate-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                          title="Delete Listing"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Create / Edit Internship Modal */}
      {isPostingModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-2xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">
                  {editingInternshipId ? 'Edit Internship Listing' : 'Post New Internship'}
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Published listings are immediately visible on the student internship search.
                </p>
              </div>
              <button
                onClick={() => setIsPostingModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitInternship} className="p-6 space-y-4 max-h-[75vh] overflow-y-auto">
              {formError && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Internship Title <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Full Stack React Developer Intern"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Company Name <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    value={company}
                    onChange={(e) => setCompany(e.target.value)}
                    placeholder="e.g. Nexus Technologies"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Internship Description <span className="text-red-500">*</span>
                </label>
                <textarea
                  rows={4}
                  required
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Detail responsibilities, project scope, and learning outcomes..."
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Required Skills (comma-separated) <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={requiredSkillsInput}
                  onChange={(e) => setRequiredSkillsInput(e.target.value)}
                  placeholder="e.g. React, TypeScript, Node.js, SQL"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Preferred Qualifications
                </label>
                <input
                  type="text"
                  value={preferredQualifications}
                  onChange={(e) => setPreferredQualifications(e.target.value)}
                  placeholder="e.g. Prior hackathon projects, knowledge of Docker, Git workflow"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Location
                  </label>
                  <input
                    type="text"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. San Francisco, CA"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Workplace Type
                  </label>
                  <select
                    value={isRemote ? 'true' : 'false'}
                    onChange={(e) => setIsRemote(e.target.value === 'true')}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300 bg-white"
                  >
                    <option value="true">Remote</option>
                    <option value="false">Onsite / Hybrid</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Duration
                  </label>
                  <input
                    type="text"
                    value={duration}
                    onChange={(e) => setDuration(e.target.value)}
                    placeholder="e.g. 3 Months"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Stipend
                  </label>
                  <input
                    type="text"
                    value={stipend}
                    onChange={(e) => setStipend(e.target.value)}
                    placeholder="e.g. $2,200/month"
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Openings
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={openings}
                    onChange={(e) => setOpenings(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Application Deadline <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="date"
                    required
                    value={deadline}
                    onChange={(e) => setDeadline(e.target.value)}
                    className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recruiter Contact Email
                </label>
                <input
                  type="email"
                  value={contactEmail}
                  onChange={(e) => setContactEmail(e.target.value)}
                  placeholder="e.g. talent@company.com"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-slate-300"
                />
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setIsPostingModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={formLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
                >
                  {formLoading
                    ? 'Saving...'
                    : editingInternshipId
                    ? 'Save Updates'
                    : 'Publish Internship'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Update Application Status & Schedule Interview Modal */}
      {statusModalApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden my-8">
            <div className="px-6 py-5 bg-gradient-to-r from-slate-900 to-indigo-950 text-white flex items-center justify-between">
              <div>
                <h3 className="font-bold text-base">Update Application Status</h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Candidate: {statusModalApp.studentName} ({statusModalApp.studentEmail})
                </p>
              </div>
              <button
                onClick={() => setStatusModalApp(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStatus} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Select New Application Status
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {[
                    'Under Review',
                    'Shortlisted',
                    'Interview Scheduled',
                    'Accepted',
                    'Rejected',
                  ].map((st) => (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setNewStatus(st as ApplicationStatus)}
                      className={`p-2.5 text-xs font-semibold rounded-xl border text-left transition-all cursor-pointer ${
                        newStatus === st
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-900 shadow-xs'
                          : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                      }`}
                    >
                      {st}
                    </button>
                  ))}
                </div>
              </div>

              {/* Recruiter Feedback */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Recruiter Feedback / Message to Candidate
                </label>
                <textarea
                  rows={3}
                  value={recruiterFeedback}
                  onChange={(e) => setRecruiterFeedback(e.target.value)}
                  placeholder="Provide constructive feedback or notes regarding their application..."
                  className="w-full px-3 py-2 text-xs rounded-lg border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              {/* If Interview Scheduled -> Show Date & Link inputs */}
              {newStatus === 'Interview Scheduled' && (
                <div className="p-4 bg-emerald-50/70 border border-emerald-200 rounded-xl space-y-3">
                  <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
                    <Calendar className="w-4 h-4 text-emerald-600" />
                    <span>Interview Logistics (Dispatched via Email)</span>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                        Interview Date
                      </label>
                      <input
                        type="date"
                        required
                        value={interviewDate}
                        onChange={(e) => setInterviewDate(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded border border-emerald-300"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                        Time & Timezone
                      </label>
                      <input
                        type="text"
                        required
                        value={interviewTime}
                        onChange={(e) => setInterviewTime(e.target.value)}
                        placeholder="e.g. 14:00 PST"
                        className="w-full px-2.5 py-1.5 text-xs bg-white rounded border border-emerald-300"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                      Platform & Meeting Link / Office Location
                    </label>
                    <input
                      type="text"
                      required
                      value={interviewLink}
                      onChange={(e) => setInterviewLink(e.target.value)}
                      placeholder="e.g. https://meet.google.com/xyz-abc or Building 4 Room 201"
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded border border-emerald-300"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-emerald-800 mb-1">
                      Preparation Instructions for Student
                    </label>
                    <input
                      type="text"
                      value={interviewNotes}
                      onChange={(e) => setInterviewNotes(e.target.value)}
                      placeholder="e.g. Please bring a laptop with your IDE ready."
                      className="w-full px-2.5 py-1.5 text-xs bg-white rounded border border-emerald-300"
                    />
                  </div>
                </div>
              )}

              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-[11px] text-slate-500">
                Updating this status immediately reflects on the student's dashboard and triggers an automated notification email to <strong>{statusModalApp.studentEmail}</strong>.
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => setStatusModalApp(null)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  disabled={statusUpdateLoading}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {statusUpdateLoading ? (
                    <span>Updating Status...</span>
                  ) : (
                    <>
                      <span>Save Status & Send Email</span>
                      <Send className="w-3.5 h-3.5" />
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Candidate Resume Details Modal */}
      {viewingResumeApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-sm text-slate-900">
                  {viewingResumeApp.studentName}'s Application Resume
                </h3>
                <span className="text-xs text-slate-500">{viewingResumeApp.internshipTitle}</span>
              </div>
              <button
                onClick={() => setViewingResumeApp(null)}
                className="text-slate-400 hover:text-slate-700 p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-500">Applicant:</span>
                  <span className="font-bold text-slate-900">{viewingResumeApp.studentName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Email:</span>
                  <span className="font-mono text-slate-800">{viewingResumeApp.studentEmail}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">College:</span>
                  <span className="text-slate-800">{viewingResumeApp.studentCollege}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Attached File:</span>
                  <span className="font-semibold text-slate-800">
                    {viewingResumeApp.resume.filename}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">File Type:</span>
                  <span className="font-mono text-slate-800">{viewingResumeApp.resume.fileType}</span>
                </div>
              </div>

              <div>
                <span className="text-xs font-bold text-slate-700 block mb-1.5">
                  Declared Profile Skills:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {viewingResumeApp.studentSkills.map((sk) => (
                    <span
                      key={sk}
                      className="px-2 py-0.5 text-xs bg-indigo-50 text-indigo-700 rounded-md font-medium"
                    >
                      {sk}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between">
              <button
                onClick={() => setViewingResumeApp(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadApplicantResume(viewingResumeApp)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Download Attached Document</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
