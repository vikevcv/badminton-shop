import Handlebars from 'handlebars';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { sendMail } from '../config/mail.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const TEMPLATES_DIR = path.join(__dirname, '..', 'views', 'emails');

const renderWithLayout = async (templateName, data) => {
  const [layoutSource, contentSource] = await Promise.all([
    fs.readFile(path.join(TEMPLATES_DIR, 'layout.hbs'), 'utf8'),
    fs.readFile(path.join(TEMPLATES_DIR, `${templateName}.hbs`), 'utf8'),
  ]);

  const layoutTemplate = Handlebars.compile(layoutSource);
  const contentTemplate = Handlebars.compile(contentSource);

  const body = contentTemplate(data);
  return layoutTemplate({ body });
};

export const sendWelcome = async (email, fullName) => {
  try {
    const html = await renderWithLayout('welcome', {
      fullName,
      shopUrl: process.env.APP_URL || 'http://localhost:3000',
    });
    await sendMail({ to: email, subject: 'Chào mừng đến với Badminton Shop 🏸', html });
  } catch (_) {
    /* ignore email errors — don't break registration */
  }
};

export const sendForgotPassword = async (email, fullName, token) => {
  try {
    const resetUrl = `${process.env.APP_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    const html = await renderWithLayout('forgot-password', { fullName, resetUrl });
    await sendMail({ to: email, subject: 'Đặt lại mật khẩu - Badminton Shop', html });
  } catch (_) {
    /* ignore email errors — don't break password reset flow */
  }
};
