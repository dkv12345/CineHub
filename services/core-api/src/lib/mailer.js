import nodemailer from 'nodemailer';
import { env } from '../config/env.js';
import { logger } from './logger.js';
import { getWelcomeEmail } from '../templates/welcomeEmail.js';
import { getResetPasswordEmail } from '../templates/resetPasswordEmail.js';
import { getVerifyEmail } from '../templates/verifyEmail.js';
import { getResetSuccessEmail } from '../templates/resetSuccessEmail.js';

let transporterInstance = null;

/**
 * Base URL of the web client used to build links inside emails.
 * The SPA uses hash-based routing, so page links must be prefixed with `/#`.
 *
 * @returns {string}
 */
export function getClientUrl() {
  return env.CORS_ORIGIN.split(',')[0].trim().replace(/\/+$/, '');
}

/**
 * Initializes or returns the cached Nodemailer SMTP transporter.
 *
 * @returns {import('nodemailer').Transporter}
 */
export function getTransporter() {
  if (!transporterInstance) {
    const hasAuth = Boolean(env.SMTP_USER && env.SMTP_PASS);

    transporterInstance = nodemailer.createTransport({
      host: env.SMTP_HOST,
      port: env.SMTP_PORT,
      secure: env.SMTP_PORT === 465, // true for port 465, false for 2525 / 587
      auth: hasAuth
        ? {
            user: env.SMTP_USER,
            pass: env.SMTP_PASS,
          }
        : undefined,
    });
  }
  return transporterInstance;
}

/**
 * Base method to dispatch an email via SMTP.
 *
 * Fallback Behavior:
 * If SMTP_USER or SMTP_PASS is missing in development, the email contents
 * are logged to the console/logger without throwing errors, enabling full offline development.
 *
 * @param {object} options
 * @param {string} options.to - Recipient email address.
 * @param {string} options.subject - Email subject line.
 * @param {string} options.html - Rich HTML content.
 * @param {string} [options.text] - Plaintext alternative.
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendEmail({ to, subject, html, text }) {
  const hasCredentials = Boolean(env.SMTP_USER && env.SMTP_PASS);

  if (!hasCredentials) {
    logger.warn(
      `[Mailer] Mailtrap credentials not configured in .env. Simulating email dispatch to: ${to} | Subject: "${subject}"`,
    );
    // Dev convenience: surface the plaintext body (OTP / reset link) so flows can be tested offline.
    if (env.NODE_ENV !== 'production' && text) {
      logger.info(`[Mailer] Simulated email body for ${to}:\n${text}`);
    }
    return { messageId: 'simulated-local-dispatch' };
  }

  try {
    const transporter = getTransporter();
    const info = await transporter.sendMail({
      from: env.SMTP_FROM,
      to,
      subject,
      html,
      text,
    });

    logger.info(`[Mailer] Email dispatched successfully to ${to} (Message ID: ${info.messageId})`);
    return info;
  } catch (error) {
    logger.error(`[Mailer] Failed to send email to ${to}: ${error.message}`);
    // Non-blocking in business transactions: do not crash critical operations if email fails
    return { messageId: null, error: error.message };
  }
}

/**
 * Sends a welcome email when a new customer account is created.
 *
 * @param {object} params
 * @param {string} params.to - Customer email.
 * @param {string} params.fullName - Customer name.
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendWelcomeNotification({ to, fullName }) {
  const { html, text } = getWelcomeEmail({ fullName, clientUrl: getClientUrl() });
  return sendEmail({
    to,
    subject: 'Chào mừng bạn gia nhập nền tảng điện ảnh CineHub',
    html,
    text,
  });
}

/**
 * Sends the 6-digit OTP used to verify a newly registered email address.
 *
 * @param {object} params
 * @param {string} params.to - Account email.
 * @param {string} params.fullName - Account name.
 * @param {string} params.otp - 6-digit one-time code.
 * @param {number} params.expiresInMinutes - OTP lifetime.
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendVerificationEmail({ to, fullName, otp, expiresInMinutes }) {
  const { html, text } = getVerifyEmail({ fullName, otp, expiresInMinutes });
  return sendEmail({
    to,
    subject: `[CineHub] Mã xác thực email của bạn: ${otp}`,
    html,
    text,
  });
}

/**
 * Sends a password reset email with verification token and link.
 *
 * @param {object} params
 * @param {string} params.to - Account email.
 * @param {string} params.fullName - Account name.
 * @param {string} params.resetToken - Raw reset token string.
 * @param {string} [params.resetUrl] - Custom reset link.
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendResetPasswordNotification({ to, fullName, resetToken, resetUrl }) {
  const targetUrl =
    resetUrl || `${getClientUrl()}/#/reset-password?token=${encodeURIComponent(resetToken)}`;
  const { html, text } = getResetPasswordEmail({
    fullName,
    resetToken,
    resetUrl: targetUrl,
  });

  return sendEmail({
    to,
    subject: '[CineHub] Yêu cầu khôi phục mật khẩu tài khoản',
    html,
    text,
  });
}

/**
 * Notifies the account owner that the password was changed through the reset flow.
 *
 * @param {object} params
 * @param {string} params.to - Account email.
 * @param {string} params.fullName - Account name.
 * @returns {Promise<{ messageId: string }>}
 */
export async function sendResetSuccessNotification({ to, fullName }) {
  const { html, text } = getResetSuccessEmail({
    fullName,
    loginUrl: `${getClientUrl()}/#/login`,
  });
  return sendEmail({
    to,
    subject: '[CineHub] Mật khẩu của bạn đã được đặt lại',
    html,
    text,
  });
}
