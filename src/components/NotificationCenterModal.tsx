import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { EmailNotification } from '../types.ts';
import {
  Mail,
  CheckCircle2,
  Clock,
  AlertCircle,
  Inbox,
  Send,
  X,
  ExternalLink,
  ShieldCheck,
} from 'lucide-react';

export const NotificationCenterModal: React.FC = () => {
  const { user, notifications, smtpConfigured, refreshNotifications } = useAuth();
  const [selectedEmail, setSelectedEmail] = useState<EmailNotification | null>(null);

  return (
    <div className="space-y-6 py-6 max-w-4xl mx-auto">
      {/* Header */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Mail className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-900">
                Email Notifications & Communications
              </h2>
              <p className="text-xs text-slate-500">
                Dispatches for {user?.email} ({user?.role === 'recruiter' ? 'Recruiter' : 'Student'})
              </p>
            </div>
          </div>

          <button
            onClick={() => refreshNotifications()}
            className="px-3.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
          >
            Refresh Mailbox
          </button>
        </div>

        {/* SMTP Status banner */}
        <div
          className={`p-3.5 rounded-xl border text-xs flex items-start gap-2.5 ${
            smtpConfigured
              ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200 text-amber-900'
          }`}
        >
          {smtpConfigured ? (
            <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
          ) : (
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          )}
          <div className="leading-relaxed">
            {smtpConfigured ? (
              <span>
                <strong>SMTP Service Active:</strong> Real outbound emails are being sent to recipient mailboxes via your configured SMTP host.
              </span>
            ) : (
              <span>
                <strong>Email Service Status:</strong> SMTP credentials (<code>SMTP_HOST</code>, <code>SMTP_USER</code>) are not configured in environment variables. All application emails are transparently logged and available right here in your website Notification Center.
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Main Mailbox List */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        {notifications.length === 0 ? (
          <div className="py-14 text-center text-slate-500">
            <Inbox className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-800">Your inbox is clear</h4>
            <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
              You will receive email notifications when you submit applications, when recruiters update your status, or when interview sessions are scheduled.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {notifications.map((msg) => (
              <div
                key={msg.id}
                onClick={() => setSelectedEmail(msg)}
                className="p-5 hover:bg-slate-50 transition-colors cursor-pointer flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-slate-900">{msg.subject}</span>
                    <span
                      className={`text-[10px] font-mono px-2 py-0.2 rounded-sm uppercase ${
                        msg.transportStatus === 'sent_via_smtp'
                          ? 'bg-emerald-100 text-emerald-800 font-semibold'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {msg.transportStatus === 'sent_via_smtp' ? 'Dispatched' : 'In-App Log'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 line-clamp-1">
                    {msg.body.replace(/\n+/g, ' ')}
                  </p>

                  <div className="text-[11px] text-slate-400 font-mono tabular-nums">
                    To: {msg.recipientEmail} · From: {msg.sender}
                  </div>
                </div>

                <div className="text-[11px] text-slate-400 font-mono tabular-nums shrink-0">
                  {new Date(msg.timestamp).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Message Reader Modal */}
      {selectedEmail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="relative w-full max-w-xl bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Mail className="w-4 h-4 text-indigo-400" />
                <span className="text-xs font-semibold text-slate-300">Email Notification</span>
              </div>
              <button
                onClick={() => setSelectedEmail(null)}
                className="text-slate-400 hover:text-white p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-900">{selectedEmail.subject}</h3>
                <div className="text-xs text-slate-500 font-mono mt-1 space-y-0.5">
                  <div>From: {selectedEmail.sender}</div>
                  <div>To: {selectedEmail.recipientEmail}</div>
                  <div>Date: {new Date(selectedEmail.timestamp).toLocaleString()}</div>
                </div>
              </div>

              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                {selectedEmail.body}
              </div>

              {selectedEmail.error && (
                <div className="text-[11px] text-amber-700 bg-amber-50 p-3 rounded-lg border border-amber-200">
                  {selectedEmail.error}
                </div>
              )}
            </div>

            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 text-right">
              <button
                onClick={() => setSelectedEmail(null)}
                className="px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
