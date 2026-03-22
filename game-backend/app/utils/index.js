const redis = require('./lib/redis');
const mongodb = require('./lib/mongodb');
const requestLimiter = require('./lib/request-limiter');
const ip2location = require('./lib/ip2location');
const razorpay = require('./lib/razorpay');
const getIp = require('./lib/fetch_ip');
const redlock = require('./lib/redlockService');
const queue = require('./lib/queue');
const fakeUser = require('./lib/fake-user');
const awsServices = require('./lib/aws-sdk');
const socialAuth = require('./lib/socialAuth');
const firebase = require('./lib/firebase');
const deck = require('./lib/deck');
const square = require('./lib/square');

module.exports = {
  redis,
  mongodb,
  requestLimiter,
  ip2location,
  razorpay,
  getIp,
  redlock,
  queue,
  fakeUser,
  socialAuth,
  awsServices,
  firebase,
  deck,
  square,
};
