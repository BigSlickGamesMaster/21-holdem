const fs = require('fs');
const path = require('path');
const ejs = require('ejs');
const nodemailer = require('nodemailer');

let transporter;

const MAIL_PREVIEW_DIR = path.resolve(__dirname, '../../../.codex-mailbox');

const getTemplate = (filename, body) => {
  body.dDate = _.formatedDate();
  const emailTemplatePath = path.join(__dirname, 'dir', 'email_templates', filename);
  const template = fs.readFileSync(emailTemplatePath, { encoding: 'utf-8' });
  return ejs.render(template, body);
};

const collection = {
  verification: body => ({
    sTemplate: 'verification',
    subject: "Verify Your Email Address for 21 Hold'em",
    html: getTemplate('account_activation.html', body),
  }),
  forgotPassword: body => ({
    sTemplate: 'forgot-password',
    subject: "Reset Your Password for 21 Hold'em",
    html: getTemplate('forgot_password.html', body),
  }),
};

const sanitizeFileName = value => (value || 'mail').replace(/[^a-zA-Z0-9._-]+/g, '_');

const getTransportOptions = () => {
  if (!process.env.SMTP_EMAIL || !process.env.SMTP_PASS) return null;

  const nPort = Number(process.env.SMTP_PORT || 465);
  const bSecure = typeof process.env.SMTP_SECURE === 'string' ? process.env.SMTP_SECURE === 'true' : nPort === 465;

  if (process.env.SMTP_HOST) {
    return {
      host: process.env.SMTP_HOST,
      port: nPort,
      secure: bSecure,
      auth: {
        user: process.env.SMTP_EMAIL,
        pass: process.env.SMTP_PASS,
      },
    };
  }

  return {
    service: process.env.SMTP_SERVICE || 'gmail',
    port: nPort,
    secure: bSecure,
    auth: {
      user: process.env.SMTP_EMAIL,
      pass: process.env.SMTP_PASS,
    },
  };
};

const getTransporter = () => {
  const options = getTransportOptions();
  if (!options) return null;

  if (!transporter) {
    transporter = nodemailer.createTransport(options);
  }

  return transporter;
};

const createPreviewMail = ({ sTemplate, body, subject, html, error }) => {
  fs.mkdirSync(MAIL_PREVIEW_DIR, { recursive: true });

  const sTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const sBaseName = `${sTimestamp}-${sanitizeFileName(body.sEmail)}-${sanitizeFileName(sTemplate)}`;
  const sHtmlFilePath = path.join(MAIL_PREVIEW_DIR, `${sBaseName}.html`);
  const sJsonFilePath = path.join(MAIL_PREVIEW_DIR, `${sBaseName}.json`);

  const oPreview = {
    mode: 'preview',
    to: body.sEmail,
    subject,
    sLink: body.sLink || '',
    htmlFilePath: sHtmlFilePath,
    jsonFilePath: sJsonFilePath,
    createdAt: new Date().toISOString(),
    error: error || '',
  };

  fs.writeFileSync(sHtmlFilePath, html, 'utf8');
  fs.writeFileSync(
    sJsonFilePath,
    JSON.stringify(
      {
        ...oPreview,
        body,
      },
      null,
      2
    ),
    'utf8'
  );

  log.yellow(`Email preview saved to ${sJsonFilePath}`);
  if (oPreview.sLink) log.yellow(`Dev mail link: ${oPreview.sLink}`);
  return oPreview;
};

const services = {};

services.toPublicResult = result => {
  if (!result || result.mode !== 'preview') return null;
  return _.pick(result, ['mode', 'to', 'subject', 'sLink', 'htmlFilePath', 'jsonFilePath', 'createdAt', 'error']);
};

services.send = async function (type, body, callback = _.emptyCallback) {
  const oMail = type(body);

  try {
    const smtpTransporter = getTransporter();
    if (!smtpTransporter) {
      if (process.env.NODE_ENV === 'prod') {
        throw new Error('SMTP transport is not configured. Set SMTP_EMAIL and SMTP_PASS.');
      }

      const oPreview = createPreviewMail({
        sTemplate: oMail.sTemplate,
        body,
        subject: oMail.subject,
        html: oMail.html,
      });
      callback(null, oPreview);
      return oPreview;
    }

    const oInfo = await smtpTransporter.sendMail({
      from: process.env.SMTP_FROM_EMAIL || process.env.SMTP_EMAIL,
      to: body.sEmail,
      subject: oMail.subject,
      html: oMail.html,
    });

    const oResult = {
      mode: 'smtp',
      to: body.sEmail,
      subject: oMail.subject,
      messageId: oInfo.messageId,
    };
    callback(null, oResult);
    return oResult;
  } catch (error) {
    console.log(error);

    if (process.env.NODE_ENV !== 'prod') {
      const oPreview = createPreviewMail({
        sTemplate: oMail.sTemplate,
        body,
        subject: oMail.subject,
        html: oMail.html,
        error: error.message,
      });
      callback(null, oPreview);
      return oPreview;
    }

    callback(error);
    throw error;
  }
};

module.exports = { ...services, ...collection };
