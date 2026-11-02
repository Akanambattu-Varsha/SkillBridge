import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { ArrowRight, Sparkles, Briefcase, GraduationCap, Building2, CheckCircle2 } from 'lucide-react';

interface HomeHeroProps {
  onNavigate: (tab: 'internships' | 'dashboard' | 'interview' | 'notifications') => void;
  openAuth: (mode?: 'login' | 'register', role?: 'student' | 'recruiter') => void;
}

export const HomeHero: React.FC<HomeHeroProps> = ({ onNavigate, openAuth }) => {
  const { user } = useAuth();

  return (
    <div className="space-y-16 py-8">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-slate-900 text-white border border-slate-800 shadow-xl">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch min-h-[520px]">
          {/* Left Text Zone */}
          <div className="lg:col-span-7 p-8 sm:p-12 lg:p-16 flex flex-col justify-center">
            <div className="inline-flex items-center gap-2 text-indigo-400 text-xs font-semibold tracking-wider uppercase mb-4">
              <Sparkles className="w-4 h-4" />
              <span>Next-Generation Career Platform</span>
            </div>

            <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-white leading-tight mb-5 [text-wrap:balance]">
              Connect Your Skills with Real Internships. Accelerate with AI.
            </h1>

            <p className="text-base sm:text-lg text-slate-300 mb-8 leading-relaxed max-w-xl">
              SkillBridge AI compares your actual technical skills with internship requirements, connects you directly with hiring recruiters, and coaches you through interactive AI mock interviews.
            </p>

            <div className="flex flex-wrap items-center gap-4">
              <button
                onClick={() => onNavigate('internships')}
                className="px-6 py-3.5 bg-indigo-600 hover:bg-indigo-500 text-white font-semibold text-sm rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer hover:gap-3"
              >
                <span>Explore Internships</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              <button
                onClick={() => onNavigate('interview')}
                className="px-6 py-3.5 bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm rounded-xl border border-slate-700 transition-all flex items-center gap-2 cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span>AI Mock Interview</span>
              </button>

              {!user && (
                <button
                  onClick={() => openAuth('register', 'recruiter')}
                  className="px-5 py-3.5 text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 rounded-xl transition-colors cursor-pointer"
                >
                  I'm a Recruiter
                </button>
              )}
            </div>

            {/* Micro stats strip */}
            <div className="mt-10 pt-8 border-t border-slate-800 grid grid-cols-3 gap-6 text-left">
              <div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">100%</div>
                <div className="text-xs text-slate-400 mt-1">Skill-Driven Matching</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">Real-Time</div>
                <div className="text-xs text-slate-400 mt-1">Application Tracking</div>
              </div>
              <div>
                <div className="text-2xl font-bold font-mono text-white tabular-nums">Gemini AI</div>
                <div className="text-xs text-slate-400 mt-1">Interview Coaching</div>
              </div>
            </div>
          </div>

          {/* Right Image Zone */}
          <div className="lg:col-span-5 relative min-h-[300px] lg:min-h-full">
            <img
              src="/src/assets/images/hero_internship_students_1793628073345.jpg"
              alt="Students collaborating on laptops in a modern tech incubator"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent lg:bg-gradient-to-r lg:from-slate-900 lg:via-transparent lg:to-transparent" />
            <div className="absolute bottom-6 left-6 right-6 p-4 rounded-xl bg-slate-900/80 backdrop-blur-md border border-slate-700/60 text-xs text-slate-200">
              <div className="font-semibold text-white mb-1 flex items-center gap-1.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Verified University-to-Tech Pipeline</span>
              </div>
              <span>Matching students based on verifiable coursework, GitHub repositories, and practical stack proficiency.</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Core Architecture Pillars */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center mb-5">
            <GraduationCap className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">
            Skill-Based Internship Matching
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Our recommendation algorithm and Gemini AI compare your skills directly with employer requirements, calculating accurate match percentages and missing gaps.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-5">
            <Building2 className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">
            Recruiter Console & Application Tracking
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Recruiters post positions, inspect verified resumes, shortlist candidates, update application stages, and schedule interviews with automated email dispatch.
          </p>
        </div>

        <div className="bg-white p-7 rounded-2xl border border-slate-200 shadow-xs hover:border-indigo-200 transition-all">
          <div className="w-10 h-10 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center mb-5">
            <Sparkles className="w-5 h-5" />
          </div>
          <h3 className="text-base font-bold text-slate-900 mb-2">
            AI Interview Preparation Studio
          </h3>
          <p className="text-sm text-slate-600 leading-relaxed">
            Practice one-on-one mock interviews with Gemini AI. Submit typed answers, receive instant scores (1-10), ideal answer breakdowns, and comprehensive readiness reports.
          </p>
        </div>
      </section>

      {/* Quick Test Callout for Platform Reviewers */}
      <section className="bg-gradient-to-r from-indigo-50 via-white to-indigo-50 border border-indigo-100 rounded-2xl p-6 sm:p-8 flex flex-col md:flex-row items-center justify-between gap-6">
        <div>
          <div className="text-xs font-bold uppercase tracking-wider text-indigo-700 mb-1">
            Testing & Verification Mode
          </div>
          <h4 className="text-lg font-bold text-slate-900">
            Want to test as a Student or Recruiter?
          </h4>
          <p className="text-xs sm:text-sm text-slate-600 mt-1 max-w-xl">
            You can register a brand new student or recruiter profile, or switch between pre-configured seed profiles in one click to inspect application workflows and resumes.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            onClick={() => openAuth('login')}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors cursor-pointer"
          >
            Open Test Personas
          </button>
          <button
            onClick={() => onNavigate('internships')}
            className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 transition-colors cursor-pointer"
          >
            Explore Active Listings
          </button>
        </div>
      </section>
    </div>
  );
};
