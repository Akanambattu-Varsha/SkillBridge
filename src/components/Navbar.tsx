import React from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { Mail, LogOut, UserCircle } from 'lucide-react';

interface NavbarProps {
  currentTab: 'home' | 'internships' | 'dashboard' | 'interview' | 'notifications';
  setCurrentTab: (tab: 'home' | 'internships' | 'dashboard' | 'interview' | 'notifications') => void;
  openAuthModal: (mode?: 'login' | 'register', defaultRole?: 'student' | 'recruiter') => void;
}

export const Navbar: React.FC<NavbarProps> = ({ currentTab, setCurrentTab, openAuthModal }) => {
  const { user, logout, notifications } = useAuth();
  const unreadCount = notifications.length;

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        {/* Zone 1: Brand Wordmark (Single text element) */}
        <button
          onClick={() => setCurrentTab('home')}
          className="text-xl font-bold tracking-tight text-slate-900 whitespace-nowrap shrink-0 hover:text-indigo-600 transition-colors flex items-center gap-2 cursor-pointer"
        >
          <span className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
            SB
          </span>
          <span>SkillBridge AI</span>
        </button>

        {/* Zone 2: 4-5 Clean Nav Links */}
        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-slate-600">
          <button
            onClick={() => setCurrentTab('internships')}
            className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'internships'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'hover:text-slate-900'
            }`}
          >
            Find Internships
          </button>

          <button
            onClick={() => setCurrentTab('interview')}
            className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
              currentTab === 'interview'
                ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                : 'hover:text-slate-900'
            }`}
          >
            AI Interview Prep
          </button>

          {user && (
            <button
              onClick={() => setCurrentTab('dashboard')}
              className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 ${
                currentTab === 'dashboard'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'hover:text-slate-900'
              }`}
            >
              {user.role === 'recruiter' ? 'Recruiter Console' : 'My Dashboard'}
            </button>
          )}

          {user && (
            <button
              onClick={() => setCurrentTab('notifications')}
              className={`cursor-pointer whitespace-nowrap shrink-0 transition-colors py-1 flex items-center gap-1.5 ${
                currentTab === 'notifications'
                  ? 'text-indigo-600 font-semibold border-b-2 border-indigo-600'
                  : 'hover:text-slate-900'
              }`}
            >
              <Mail className="w-4 h-4" />
              <span>Email Logs</span>
              {unreadCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 text-[11px] font-mono font-semibold bg-indigo-100 text-indigo-700 rounded-sm">
                  {unreadCount}
                </span>
              )}
            </button>
          )}
        </nav>

        {/* Zone 3: Primary Action / User Profile */}
        <div className="flex items-center gap-3 shrink-0">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-xs font-semibold text-slate-900 leading-tight">
                  {user.name}
                </span>
                <span className="text-[11px] text-slate-500 capitalize">
                  {user.role === 'recruiter' ? (user.companyName || 'Recruiter') : 'Student'}
                </span>
              </div>
              <button
                onClick={() => setCurrentTab('dashboard')}
                title="Open Dashboard"
                className="w-9 h-9 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
              >
                <UserCircle className="w-5 h-5 text-indigo-600" />
              </button>
              <button
                onClick={logout}
                title="Sign out"
                className="px-3 py-1.5 text-xs font-medium text-slate-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <button
                onClick={() => openAuthModal('login')}
                className="px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer whitespace-nowrap"
              >
                Sign In
              </button>
              <button
                onClick={() => openAuthModal('register')}
                className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs transition-colors cursor-pointer whitespace-nowrap"
              >
                Get Started
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
