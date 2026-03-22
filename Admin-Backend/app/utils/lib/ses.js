const AWS = require('aws-sdk');
const fs = require('fs');
const ejs = require('ejs');
const path = require('path');
const mailchecker = require('./mailchecker');

AWS.config.region = process.env.AWS_SES_REGION;
AWS.config.update({
    accessKeyId: process.env.AWS_ACCESSKEYID,
    secretAccessKey: process.env.AWS_SECRETKEY,
});

const sesClient = new AWS.SES();

const getTemplate = (filename, body) => {
    body.dDate = _.formattedDate();
    const emailTemplatePath = path.join(__dirname, 'dir/email_templates', filename);
    const template = fs.readFileSync(emailTemplatePath, { encoding: 'utf-8' });
    // console.log('template', template);
    return ejs.render(template, body);
};

const collection = {
    verification: body => ({
        Subject: { Data: 'Please verify your email address' },
        Body: { Html: { Data: getTemplate('account_activation.html', body) } },
    }),
    forgotPassword: body => ({
        Subject: { Data: 'Request to reset your password' },
        Body: { Html: { Data: getTemplate('forgot_password.html', body) } },
    }),
    adminForgotPassword: body => ({
        Subject: { Data: 'Reset password instructions' },
        Body: { Html: { Data: getTemplate('admin_forgot_password.html', body) } },
    }),
    adminVerifyEmail: body => ({
        Subject: { Data: 'Please verify your email address' },
        Body: { Html: { Data: getTemplate('admin_verify_email.html', body) } },
    }),
    adminCreation: body => ({
        Subject: { Data: 'Subadmin' },
        Body: { Html: { Data: getTemplate('newUser.html', body) } },
    }),
};

const services = {};
// sesClient.createTemplate()
services.send = (type, body, callback) => {
    // if (process.env.NODE_ENV !== 'prod') return callback();
    const emailOption = {
        Source: process.env.SUPPORT_EMAIL,
        Destination: { ToAddresses: [body.sEmail] },
        Message: type(body),
    };
    // console.log('emailOption', emailOption);
    mailchecker.isReachable(body.sEmail, error => {
        if (error) return callback(error);
        sesClient.sendEmail(emailOption, (err, response) => {
            if (err) callback(err, err.stack);
            callback(null, response);
        });
    });
};

module.exports = { ...services, ...collection };
