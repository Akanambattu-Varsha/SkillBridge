import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.tsx';
import { Navbar } from './components/Navbar.tsx';
import { HomeHero } from './components/HomeHero.tsx';
import { InternshipCatalog } from './components/InternshipCatalog.tsx';
import { StudentDashboard } from './components/StudentDashboard.tsx';
import { RecruiterDashboard } from './components/RecruiterDashboard.tsx';
import { AIInterviewPrep } from './components/AIInterviewPrep.tsx';
import { NotificationCenterModal } from './components/NotificationCenterModal.tsx';
import { AuthModal } from './components/AuthModal.tsx';
import { Sparkles, Shield, Heart, GraduationCap } from 'lucide-react';

type Tab = 'home' | 'internships' | 'dashboard' | 'interview' | 'notifications';

function MainLayout() {
  const { user } = useAuth();
  const [currentTab, setCurrentTab] = useState<Tab>('home');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authModalMode, setAuthModalMode] = useState<'login' | 'register'>('login');
  const [authModalRole, setAuthModalRole] = useState<'student' | 'recruiter'>('student');

  const openAuthModal = (
    mode: 'login' | 'register' = 'login',
    role: 'student' | 'recruiter' = 'student'
  ) => {
    setAuthModalMode(mode);
    setAuthModalRole(role);
    setAuthModalOpen(true);
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-900 font-sans">
      <Navbar
        currentTab={currentTab}
        setCurrentTab={setCurrentTab}
        openAuthModal={openAuthModal}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8">
        {currentTab === 'home' && (
          <HomeHero
            onNavigate={(tab) => setCurrentTab(tab)}
            openAuth={openAuthModal}
          />
        )}

        {currentTab === 'internships' && (
          <InternshipCatalog
            onAppliedSuccess={() => setCurrentTab('dashboard')}
            openAuth={openAuthModal}
          />
        )}

        {currentTab === 'dashboard' && (
          <>
            {user ? (
              user.role === 'recruiter' ? (
                <RecruiterDashboard />
              ) : (
                <StudentDashboard onNavigate={(tab) => setCurrentTab(tab)} />
              )
            ) : (
              <div className="py-16 text-center max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="text-xl font-bold text-slate-900">Sign In to View Dashboard</h3>
                <p className="text-xs sm:text-sm text-slate-500 mt-2 mb-6">
                  Log in as a student to manage applications and resumes, or as a recruiter to post internships and evaluate candidates.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => openAuthModal('login', 'student')}
                    className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg shadow-xs cursor-pointer"
                  >
                    Student Login
                  </button>
                  <button
                    onClick={() => openAuthModal('login', 'recruiter')}
                    className="px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-300 text-xs font-semibold rounded-lg cursor-pointer"
                  >
                    Recruiter Login
                  </button>
                </div>
              </div>
            )}
          </>
        )}

        {currentTab === 'interview' && (
          <AIInterviewPrep openAuth={openAuthModal} />
        )}

        {currentTab === 'notifications' && (
          <NotificationCenterModal />
        )}
      </main>

      {/* Footer adhering strictly to Anti-Slop Discipline (No fake background worker engines or tickers) */}
      <footer className="bg-white border-t border-slate-200 mt-16 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
          <div className="flex items-center gap-2">
            <span className="w-5 h-5 rounded bg-indigo-600 text-white font-bold flex items-center justify-center text-[10px]">
              SB
            </span>
            <span className="font-semibold text-slate-800">SkillBridge AI</span>
            <span>·</span>
            <span>AI-Powered Internship & Career Platform</span>
          </div>

          <div className="flex items-center gap-6 text-slate-600">
            <button
              onClick={() => setCurrentTab('internships')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              Browse Roles
            </button>
            <button
              onClick={() => setCurrentTab('interview')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              Interview Studio
            </button>
            <button
              onClick={() => openAuthModal('login')}
              className="hover:text-indigo-600 cursor-pointer"
            >
              Account Login
            </button>
          </div>

          <div className="text-[11px] text-slate-400">
            © {new Date().getFullYear()} SkillBridge AI. All rights reserved.
          </div>
        </div>
      </footer>

      {/* Authentication Modal */}
      <AuthModal
        isOpen={authModalOpen}
        onClose={() => setAuthModalOpen(false)}
        initialMode={authModalMode}
        initialRole={authModalRole}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainLayout />
    </AuthProvider>
  );
}
