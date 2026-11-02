import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { InterviewSession } from '../types.ts';
import {
  Sparkles,
  Send,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  BookOpen,
  Award,
  ChevronRight,
  HelpCircle,
  Code2,
} from 'lucide-react';

interface AIInterviewPrepProps {
  openAuth: (mode?: 'login' | 'register', role?: 'student' | 'recruiter') => void;
}

const TOPICS = [
  'Python',
  'React',
  'JavaScript',
  'Java',
  'SQL',
  'Data Structures',
  'Machine Learning',
  'Artificial Intelligence',
  'Communication Skills',
  'HR Interview',
];

const ROLES = [
  'Software Engineer Intern',
  'Frontend Developer Intern',
  'Backend & Systems Intern',
  'Machine Learning Engineer Intern',
  'Data Science & Analytics Intern',
  'Full Stack Engineering Intern',
];

export const AIInterviewPrep: React.FC<AIInterviewPrepProps> = ({ openAuth }) => {
  const { user, token } = useAuth();

  // Configuration
  const [selectedTopic, setSelectedTopic] = useState('React');
  const [selectedRole, setSelectedRole] = useState('Frontend Developer Intern');
  const [difficulty, setDifficulty] = useState<'Beginner' | 'Intermediate' | 'Advanced'>('Intermediate');
  const [mode, setMode] = useState<'mock' | 'practice'>('mock');

  // Session state
  const [session, setSession] = useState<InterviewSession | null>(null);
  const [currentAnswer, setCurrentAnswer] = useState('');
  const [loading, setLoading] = useState(false);
  const [submittingAnswer, setSubmittingAnswer] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Latest evaluation feedback for the answered question
  const [latestEvaluation, setLatestEvaluation] = useState<any>(null);

  // Start Session
  const handleStartInterview = async () => {
    if (!user) {
      openAuth('login', 'student');
      return;
    }

    if (user.role !== 'student') {
      alert('AI Interview Studio is reserved for student preparation.');
      return;
    }

    setLoading(true);
    setError(null);
    setLatestEvaluation(null);
    setCurrentAnswer('');

    try {
      const res = await fetch('/api/ai/interview/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          role: selectedRole,
          topic: selectedTopic,
          difficulty,
          mode,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to start interview session');
      }

      setSession(data.session);
    } catch (err: any) {
      setError(err.message || 'Error initializing AI interview session');
    } finally {
      setLoading(false);
    }
  };

  // Submit Answer to current question
  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session || !currentAnswer.trim() || !token) return;

    setSubmittingAnswer(true);
    setError(null);

    try {
      const res = await fetch(`/api/ai/interview/${session.id}/submit-answer`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          answer: currentAnswer.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to submit answer');
      }

      setSession(data.session);
      setLatestEvaluation(data.currentEvaluation);
      setCurrentAnswer('');
    } catch (err: any) {
      setError(err.message || 'Failed to evaluate answer');
    } finally {
      setSubmittingAnswer(false);
    }
  };

  // Reset / Start another session
  const handleReset = () => {
    setSession(null);
    setLatestEvaluation(null);
    setCurrentAnswer('');
  };

  // Check if session has current active question
  const activeQuestionIndex = session?.currentQuestionIndex ?? 0;
  const isCompleted = session?.finalSummary !== undefined;
  const currentQuestion = session?.questions?.[activeQuestionIndex];

  return (
    <div className="space-y-8 py-6">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 rounded-3xl p-6 sm:p-10 text-white shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs uppercase tracking-wider text-indigo-400 font-semibold mb-1">
            <Sparkles className="w-4 h-4" />
            <span>Interactive Interview Studio</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
            AI-Powered Technical Mock Interview
          </h2>
          <p className="text-sm text-slate-300 mt-2 max-w-xl">
            Simulate realistic technical interview rounds powered by Gemini AI. Receive real-time evaluations, ideal answer models, and customized performance diagnostics.
          </p>
        </div>

        {session && (
          <button
            onClick={handleReset}
            className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center gap-1.5 cursor-pointer shrink-0"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>New Session</span>
          </button>
        )}
      </div>

      {/* Main Container */}
      {!session ? (
        /* Configuration Screen */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs max-w-3xl mx-auto space-y-8">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Configure Your Practice Round
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Select your technical subject area, desired internship role, and problem difficulty.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
              {error}
            </div>
          )}

          {/* Topic Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-3">
              1. Choose Technical Topic:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2">
              {TOPICS.map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setSelectedTopic(t)}
                  className={`p-3 rounded-xl border text-xs font-semibold text-center transition-all cursor-pointer ${
                    selectedTopic === t
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 shadow-xs ring-1 ring-indigo-500'
                      : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Role Picker */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                2. Target Internship Role:
              </label>
              <select
                value={selectedRole}
                onChange={(e) => setSelectedRole(e.target.value)}
                className="w-full px-3 py-2.5 text-xs rounded-xl border border-slate-300 bg-white font-medium focus:ring-2 focus:ring-indigo-500"
              >
                {ROLES.map((r) => (
                  <option key={r} value={r}>
                    {r}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold uppercase tracking-wider text-slate-700 mb-2">
                3. Difficulty Level:
              </label>
              <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl">
                {(['Beginner', 'Intermediate', 'Advanced'] as const).map((lvl) => (
                  <button
                    key={lvl}
                    type="button"
                    onClick={() => setDifficulty(lvl)}
                    className={`flex-1 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                      difficulty === lvl
                        ? 'bg-white text-indigo-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    {lvl}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Start CTA */}
          <div className="pt-4 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="text-xs text-slate-500">
              The AI will generate dynamic questions tailored to <strong>{selectedTopic}</strong> for <strong>{selectedRole}</strong>.
            </div>

            <button
              onClick={handleStartInterview}
              disabled={loading}
              className="w-full sm:w-auto px-6 py-3 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shrink-0"
            >
              {loading ? (
                <span>Generating Interview Session...</span>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Start Mock Interview</span>
                </>
              )}
            </button>
          </div>
        </div>
      ) : isCompleted && session.finalSummary ? (
        /* Final Performance Summary Screen */
        <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-10 shadow-xs max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center mx-auto mb-3">
              <Award className="w-7 h-7" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Mock Interview Completed
            </span>
            <h3 className="text-2xl font-bold text-slate-900">
              Final Performance Diagnostics
            </h3>
            <p className="text-xs text-slate-500">
              {session.topic} Assessment for {session.role} ({session.difficulty})
            </p>
          </div>

          {/* Overall Score */}
          <div className="p-6 bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div>
              <span className="text-xs text-indigo-300 font-semibold block">
                Comprehensive Readiness Score
              </span>
              <p className="text-sm text-slate-200 mt-1 max-w-md">
                {session.finalSummary.summary}
              </p>
            </div>
            <div className="text-center sm:text-right shrink-0">
              <div className="text-4xl sm:text-5xl font-extrabold font-mono text-emerald-400 tabular-nums">
                {session.finalSummary.overallScore}
                <span className="text-lg text-slate-400">/100</span>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses Split */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-5 bg-emerald-50/70 border border-emerald-200 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-emerald-900 flex items-center gap-1.5 uppercase tracking-wide">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>Key Strengths Observed</span>
              </div>
              <ul className="space-y-1.5 text-xs text-emerald-950 pt-1">
                {session.finalSummary.strongPoints.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-emerald-500 font-bold">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>

            <div className="p-5 bg-amber-50/70 border border-amber-200 rounded-2xl space-y-2">
              <div className="text-xs font-bold text-amber-900 flex items-center gap-1.5 uppercase tracking-wide">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Targeted Improvement Areas</span>
              </div>
              <ul className="space-y-1.5 text-xs text-amber-950 pt-1">
                {session.finalSummary.weakAreas.map((pt, idx) => (
                  <li key={idx} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{pt}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Actionable Advice */}
          <div className="p-5 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <div className="text-xs font-bold text-slate-900 uppercase tracking-wide">
              Actionable Recommendations Before Real Interviews:
            </div>
            <div className="space-y-2 text-xs text-slate-700">
              {session.finalSummary.actionableAdvice.map((adv, idx) => (
                <div key={idx} className="flex items-start gap-2">
                  <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {idx + 1}
                  </span>
                  <p className="leading-relaxed">{adv}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Questions Review Log */}
          <div className="space-y-4 pt-4 border-t border-slate-200">
            <h4 className="font-bold text-slate-900 text-sm">Review Questions & Evaluations:</h4>
            {session.questions.map((q, idx) => (
              <div key={idx} className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-2">
                <div className="flex justify-between items-start">
                  <span className="font-bold text-slate-900">
                    Q{idx + 1}: {q.question}
                  </span>
                  {q.evaluation && (
                    <span className="px-2 py-0.5 rounded bg-indigo-100 text-indigo-800 font-mono font-bold tabular-nums">
                      {q.evaluation.score}/10
                    </span>
                  )}
                </div>
                <div className="text-slate-600 italic">
                  <strong>Your Answer:</strong> "{q.studentAnswer}"
                </div>
                {q.evaluation && (
                  <div className="text-slate-700 pt-1 border-t border-slate-200">
                    <strong>Feedback:</strong> {q.evaluation.constructiveFeedback}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="text-center pt-4">
            <button
              onClick={handleReset}
              className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition-colors cursor-pointer"
            >
              Practice Another Topic Round
            </button>
          </div>
        </div>
      ) : (
        /* Question Answering Loop */
        <div className="max-w-3xl mx-auto space-y-6">
          {/* Progress Indicator */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-800">
                {session.topic} ({session.difficulty})
              </span>
              <span className="text-slate-400">·</span>
              <span className="text-slate-500">{session.role}</span>
            </div>
            <div className="font-mono font-bold text-indigo-600 tabular-nums">
              Question {activeQuestionIndex + 1} of {session.questions.length}
            </div>
          </div>

          {/* Current Question Card */}
          {currentQuestion && (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 sm:p-8 shadow-xs space-y-6">
              <div className="space-y-2">
                <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
                  Question {activeQuestionIndex + 1}
                </span>
                <h3 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
                  {currentQuestion.question}
                </h3>
              </div>

              {/* Answering Form */}
              <form onSubmit={handleSubmitAnswer} className="space-y-4">
                {error && (
                  <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Your Response:
                  </label>
                  <textarea
                    rows={5}
                    required
                    value={currentAnswer}
                    onChange={(e) => setCurrentAnswer(e.target.value)}
                    placeholder="Type your complete technical answer as you would explain it to an interviewer..."
                    className="w-full p-3.5 text-xs sm:text-sm rounded-xl border border-slate-300 focus:outline-hidden focus:ring-2 focus:ring-indigo-500 leading-relaxed font-sans"
                  />
                  <div className="flex justify-between items-center text-[11px] text-slate-400 mt-1">
                    <span>Explain concepts clearly, mention trade-offs, and provide examples.</span>
                    <span className="font-mono tabular-nums">{currentAnswer.length} chars</span>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-500 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Evaluated by Gemini AI</span>
                  </div>

                  <button
                    type="submit"
                    disabled={submittingAnswer || !currentAnswer.trim()}
                    className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    {submittingAnswer ? (
                      <span>Analyzing with Gemini...</span>
                    ) : (
                      <>
                        <span>Submit Answer</span>
                        <Send className="w-3.5 h-3.5" />
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Feedback from previous answer if just evaluated */}
          {latestEvaluation && (
            <div className="p-6 bg-slate-900 text-white rounded-2xl shadow-lg border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <h4 className="font-bold text-sm text-white">
                    Feedback on Previous Answer
                  </h4>
                </div>
                <div className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-600 text-white tabular-nums">
                  Score: {latestEvaluation.score}/10
                </div>
              </div>

              <p className="text-xs sm:text-sm text-slate-200 leading-relaxed">
                {latestEvaluation.constructiveFeedback}
              </p>

              {latestEvaluation.idealAnswerGuide && (
                <div className="p-4 bg-slate-800/80 rounded-xl border border-slate-700 text-xs text-slate-300 space-y-1">
                  <strong className="text-indigo-300 block">What a 10/10 Answer Includes:</strong>
                  <p className="leading-relaxed">{latestEvaluation.idealAnswerGuide}</p>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
