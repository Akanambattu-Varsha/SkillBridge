import nodemailer from 'nodemailer';
import { db, EmailNotification } from './db.js';
import crypto from 'crypto';

interface EmailPayload {
  toEmail: string;
  toName: string;
  recipientRole: 'student' | 'recruiter';
  recipientId: string;
  subject: string;
  body: string;
  event: EmailNotification['event'];
}

export function isSmtpConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);
}

export async function sendApplicationEmail(payload: EmailPayload): Promise<{
  delivered: boolean;
  transportStatus: 'sent_via_smtp' | 'simulated_in_app';
  message: string;
  logId: string;
}> {
  const fromAddress = process.env.FROM_EMAIL || 'SkillBridge AI <notifications@skillbridge.ai>';
  const logId = 'email-' + crypto.randomUUID();

  if (isSmtpConfigured()) {
    try {
      const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
        },
      });

      await transporter.sendMail({
        from: fromAddress,
        to: payload.toEmail,
        subject: payload.subject,
        text: payload.body,
        html: `<div style="font-family: Arial, sans-serif; line-height: 1.6; color: #1e293b; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
          <h2 style="color: #4f46e5; margin-top: 0;">SkillBridge AI</h2>
          <p style="white-space: pre-line;">${payload.body.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>
          <hr style="border: 0; border-top: 1px solid #e2e8f0; margin: 24px 0;" />
          <p style="font-size: 12px; color: #64748b;">SkillBridge AI – AI-Powered Internship & Career Platform</p>
        </div>`,
      });

      const log: EmailNotification = {
        id: logId,
        recipientEmail: payload.toEmail,
        recipientRole: payload.recipientRole,
        recipientId: payload.recipientId,
        sender: fromAddress,
        subject: payload.subject,
        body: payload.body,
        timestamp: new Date().toISOString(),
        event: payload.event,
        transportStatus: 'sent_via_smtp',
      };
      db.addEmailLog(log);

      return {
        delivered: true,
        transportStatus: 'sent_via_smtp',
        message: `Email dispatched successfully via SMTP to ${payload.toEmail}`,
        logId,
      };
    } catch (err: any) {
      console.error('SMTP Delivery error, recording in-app log:', err.message);
      const log: EmailNotification = {
        id: logId,
        recipientEmail: payload.toEmail,
        recipientRole: payload.recipientRole,
        recipientId: payload.recipientId,
        sender: fromAddress,
        subject: payload.subject,
        body: payload.body,
        timestamp: new Date().toISOString(),
        event: payload.event,
        transportStatus: 'simulated_in_app',
        error: `SMTP error: ${err.message}`,
      };
      db.addEmailLog(log);

      return {
        delivered: false,
        transportStatus: 'simulated_in_app',
        message: `SMTP attempt failed (${err.message}). Notification preserved in-app.`,
        logId,
      };
    }
  }

  // When SMTP is not configured: do not pretend an email was sent.
  // Record clearly as in-app notification with explicit status.
  const log: EmailNotification = {
    id: logId,
    recipientEmail: payload.toEmail,
    recipientRole: payload.recipientRole,
    recipientId: payload.recipientId,
    sender: fromAddress,
    subject: payload.subject,
    body: payload.body,
    timestamp: new Date().toISOString(),
    event: payload.event,
    transportStatus: 'simulated_in_app',
    error: 'SMTP credentials not configured in environment variables. Delivered to in-app notification center.',
  };
  db.addEmailLog(log);

  return {
    delivered: false,
    transportStatus: 'simulated_in_app',
    message: 'Email service is not configured (SMTP credentials unset). Notification recorded in website Notification Center.',
    logId,
  };
}
