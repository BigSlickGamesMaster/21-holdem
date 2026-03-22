const redis = require('./lib/redis');
const mongodb = require('./lib/mongodb');
const requestLimiter = require('./lib/request-limiter');
const ip2location = require('./lib/ip2location');
// const ses = require('./lib/ses');
// const multer = require('./lib/multer');
const botGenerator = require('./lib/users');
const admin = require('./lib/admin');
const msg91 = require('./lib/msg91');
const nodemailer = require('./lib/nodemailer');
const awsServices = require('./lib/aws-sdk');
const getIp = require('./lib/fetch_ip');

module.exports = {
  redis,
  mongodb,
  requestLimiter,
  ip2location,
  // ses,
  //   multer,
  botGenerator,
  admin,
  msg91,
  nodemailer,
  awsServices,
  getIp,
};
