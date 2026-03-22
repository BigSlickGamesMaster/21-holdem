const nodemailer = require('nodemailer');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');

const transporter = nodemailer.createTransport({
  service: 'gmail',
  port: 465,
  secure: false,
  secureConnection: false,
  auth: {
    user: process.env.SMTP_EMAIL,
    pass: process.env.SMTP_PASS,
  },
});

const getTemplate = (filename, body) => {
  body.dDate = _.formatedDate();
  const emailTemplatePath = path.join(__dirname, 'dir', 'email_templates', filename);
  const template = fs.readFileSync(emailTemplatePath, { encoding: 'utf-8' });
  return ejs.render(template, body);
};

const collection = {
  verification: body => ({
    subject: 'Email verification',
    html: getTemplate('verify_email.html', body),
  }),
  user_cred: body => ({
    subject: 'User credentials',
    html: getTemplate('user_cred.html', body),
  }),
  adminForgotPassword: body => ({
    subject: 'Forgot password',
    html: getTemplate('forgot_password.html', body),
  }),
};

const services = {};

services.send = function (type, body, callback) {
  // if (process.env.NODE_ENV !== 'prod') return callback();
  transporter.sendMail(
    {
      from: process.env.SMTP_EMAIL,
      to: body.sEmail,
      subject: type(body).subject,
      html: type(body).html,
    },
    error => {
      console.log(error);
      if (error) return callback(error);
      callback();
    }
  );
};

module.exports = { ...services, ...collection };
