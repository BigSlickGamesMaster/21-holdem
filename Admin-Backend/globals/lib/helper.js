/* eslint-disable no-console */
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const queryString = require('querystring');
const shortid = require('shortid');
const axios = require('axios');
const https = require('https');
const http = require('http');
const log = require('./log');

const _ = {};

const config = {
  BASE_URL: process.env.BASE_URL,
  VERIFICATION_CODE_LENGTH: process.env.VERIFICATION_CODE_LENGTH,
  JWT_SECRET: process.env.JWT_SECRET,
};

const validation = {
  imageMimeTypes: ['image/png', 'image/jpeg'],
  imageExtensions: ['jpeg', 'jpg', 'png'],
  imageFormat: [
    { extension: 'jpeg', type: 'image/jpeg' },
    { extension: 'jpg', type: 'image/jpeg' },
    { extension: 'png', type: 'image/png' },
    { extension: 'heic', type: 'image/heic' },
    { extension: 'heif', type: 'image/heif' },
  ],
};

_.parse = function (data) {
  try {
    return JSON.parse(data);
  } catch (error) {
    return data;
  }
};

_.stringify = function (data, offset = 0) {
  return JSON.stringify(data, null, offset);
};

_.clone = function (data = {}) {
  const originalData = data.toObject ? data.toObject() : data; // for mongodb result operations
  const eType = originalData ? originalData.constructor : 'normal';
  if (eType === Object) return { ...originalData };
  if (eType === Array) return [...originalData];
  return data;
  // return JSON.parse(JSON.stringify(data));
};
_.formatedDate = function () {
  return new Date().toLocaleString('en-us', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' });
};

_.deepClone = function (data) {
  const originalData = !!data.toObject || !!data._doc ? data._doc : data;
  if (originalData.constructor === Object) return this.cloneObject(originalData);
  if (originalData.constructor === Array) return this.cloneArray(originalData);
  return originalData;
};

_.cloneObject = function (object) {
  const newData = {};
  const keys = Object.keys(object);
  for (let i = 0; i < keys.length; i += 1) {
    const eType = object[keys[i]] ? object[keys[i]].constructor : 'normal';
    switch (eType) {
      case 'normal':
        newData[keys[i]] = object[keys[i]];
        break;
      case Array:
        newData[keys[i]] = this.cloneArray(object[keys[i]]);
        break;
      case Object:
        newData[keys[i]] = this.cloneObject(object[keys[i]]);
        break;
      default:
        newData[keys[i]] = object[keys[i]];
        break;
    }
  }
  return newData;
};

_.cloneArray = function (array) {
  const newData = [];
  for (let i = 0; i < array.length; i += 1) {
    const eType = array[i] ? array[i].constructor : 'normal';
    switch (eType) {
      case 'normal':
        newData.push(array[i]);
        break;
      case Array:
        newData.push(this.cloneArray(array[i]));
        break;
      case Object:
        newData.push(this.cloneObject(array[i]));
        break;
      default:
        newData.push(array[i]);
        break;
    }
  }
  return newData;
};

_.pick = function (obj, array) {
  const clonedObj = this.clone(obj);
  return array.reduce((acc, elem) => {
    if (elem in clonedObj) acc[elem] = clonedObj[elem];
    return acc;
  }, {});
};

_.omit = function (obj, array, deepCloning = false) {
  const clonedObject = deepCloning ? this.deepClone(obj) : this.clone(obj);
  const objectKeys = Object.keys(clonedObject);
  return objectKeys.reduce((acc, elem) => {
    if (!array.includes(elem)) acc[elem] = clonedObject[elem];
    return acc;
  }, {});
};

_.isEmptyObject = function (obj = {}) {
  return !Object.keys(obj).length;
};

_.isEqual = function (id1, id2) {
  return (id1 ? id1.toString() : id1) === (id2 ? id2.toString() : id2);
};

_.formattedDate = function () {
  return new Date().toLocaleString('en-us', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: 'numeric' });
};

_.isoTimeString = function () {
  const today = new Date();
  return today;
};

_.currentDateTime = function (dateTime = undefined) {
  const _dateTime = dateTime ? new Date(dateTime) : new Date();
  return new Date(+_dateTime + 19800000);
};

_.getDate = function (_date = undefined) {
  const date = _date ? new Date(_date) : new Date();
  if (_date) date.setHours(0, 0, 0, 0);
  const timeOffset = date.getTimezoneOffset();
  // return new Date(date.toLocaleString('en-us', { day: 'numeric', month: 'short', year: 'numeric' }));
  return new Date(date - timeOffset * 60000);
};

_.getDateWithoutTime = function () {
  const date = new Date();
  // date.setHours(0, 0, 0, 0);
  const timeOffset = date.getTimezoneOffset();
  // return new Date(date.toLocaleString('en-us', { day: 'numeric', month: 'short', year: 'numeric' }));
  return new Date(date - timeOffset * 60000);
};

_.getLocalDate = function (date) {
  const _date = date ? new Date(date) : new Date();
  _date.setHours(0, 0, 0, 0);
  const timeOffset = _date.getTimezoneOffset();
  if (!timeOffset) return new Date(_date - 330 * 60000);
  // return new Date(date.toLocaleString('en-us', { day: 'numeric', month: 'short', year: 'numeric' }));
  return new Date(_date + 330 * 60000);
};

_.addDays = function (date, days) {
  const inputDate = new Date(date);
  return new Date(inputDate.setDate(inputDate.getDate() + days));
};

_.addMonth = function (date, month) {
  const inputDate = new Date(date);
  return new Date(inputDate.setMonth(inputDate.getMonth() + month));
};

_.addMilliseconds = function (date, milliseconds) {
  const inputDate = new Date(date);
  return new Date(inputDate.valueOf() + milliseconds);
};

_.encryptPassword = function (password) {
  return crypto.createHmac('sha256', config.JWT_SECRET).update(password).digest('hex');
};

_.salt = function (length, type) {
  if (process.env.NODE_ENV !== 'prod') return 1234;
  if (type === 'string') {
    return crypto
      .randomBytes(Math.ceil(length / 2))
      .toString('hex')
      .slice(0, length);
  }

  let min = 1;
  let max = 9;
  for (let i = 1; i < length; i += 1) {
    min += '0';
    max += '9';
  }
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

_.shortid = function () {
  return shortid.generate();
};

_.sortByKey = function name(array, key) {
  return _.clone(array).sort((a, b) => a[key] - b[key]);
};

_.randomCode = function (size) {
  // const code = Math.random().toString(32);
  const code = Date.now().toString(36);
  return code.slice(code.length - size);
};

_.randomProfilePic = function (gender) {
  const male = [1, 3, 4, 5, 7, 9];
  const female = [2, 6, 8];
  const eGender = gender === 'male' ? male : female;

  return `https://${process.env.S3_BUCKET}.s3.ap-south-1.amazonaws.com/${_.randomFromArray(eGender)}.png`;
};
_.randomProfile = function (gender) {
  if (!gender) return `${process.env.AVATAR_DEFAULT}Profile.png`;
  const index = gender === 'male' ? _.randomFromArray([1, 2, 3, 8, 9]) : _.randomFromArray([4, 5, 6, 7]);
  return `https://${process.env.S3_BUCKET}.s3.ap-south-1.amazonaws.com/${index}.png`;
};

_.randomizeNumericString = function (length, size) {
  let result = '';
  const output = new Set();
  const characters = '123456789'; // used 0-9 twice to reduce generating only chars string
  const charactersLength = characters.length;
  for (let j = 0; j < size; j += 1) {
    for (let i = 0; i < length; i += 1) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    output.add(result);
    result = '';
  }
  return [...output];
};

_.getRandomNumberKey = () => 'agentIds';

_.encodeToken = function (body, expTime) {
  try {
    return expTime ? jwt.sign(this.clone(body), config.JWT_SECRET, expTime) : jwt.sign(this.clone(body), config.JWT_SECRET);
  } catch (error) {
    return undefined;
  }
};

_.decodeToken = function (token) {
  try {
    return jwt.decode(token, config.JWT_SECRET);
  } catch (error) {
    return undefined;
  }
};

_.verifyToken = function (token) {
  try {
    return jwt.verify(token, config.JWT_SECRET, function (err, decoded) {
      return err ? err.message : decoded; // return true if token expired
    });
  } catch (error) {
    return error ? error.message : error;
  }
};

_.isOtpValid = function (createdAt) {
  const difference = new Date() - createdAt;
  return difference < process.env.OTP_VALIDITY;
};

_.request = function (body, options, callback) {
  const httpRequest = options.isSecure ? https : http;
  delete options.isSecure;
  const req = httpRequest.request(options, function (res) {
    const chunks = [];

    res.on('data', chunk => chunks.push(chunk));
    res.on('error', error => callback(error));
    res.on('end', () => callback(null, _.parse(Buffer.concat(chunks))));
  });

  const requestBody = options.headers['Content-Type'] === 'application/x-www-form-urlencoded' ? queryString.stringify(body) : _.stringify(body);
  req.write(requestBody);
  req.end();
};

_.axios = function (method, url, headers = {}, data) {
  const option = {
    method,
    url,
    headers: { 'Content-Type': 'application/json', ...headers },
    data,
  };
  return axios(option)
    .then(response => response.data)
    .catch(error => log.red('Error', error.message, option.url));
};

_.isEmail = function (email) {
  const regeX = /[a-z0-9._%+-]+@[a-z0-9-]+[.]+[a-z]{2,5}$/;
  return !regeX.test(email);
};

_.isUserName = function (name) {
  const regeX = /^[a-zA-Z ]+$/;
  return !regeX.test(name);
};
_.isIFSC = function (ifsc) {
  const regeX = /^[A-Z]{4}0[A-Z0-9]{6}$/;
  return !regeX.test(ifsc);
};

_.isPassword = function (password) {
  const regeX = /^(?=.*?[A-Z])(?=.*?[a-z])(?=.*?[0-9])(?=.*?[#?!@$%^&*-]).{8,15}$/;
  return !regeX.test(password);
};
_.isMobileNumber = function (mobileNumber) {
  const regeX = /^[0-9]{10}$/;
  return !regeX.test(mobileNumber);
};

_.randomizeArray = function (array = []) {
  const arrayLength = array.length;
  for (let i = 0; i < arrayLength; i += 1) {
    let randomNumber = Math.floor(Math.random() * arrayLength);
    [array[i], array[randomNumber]] = [array[randomNumber], array[i]];
    randomNumber = Math.floor(Math.random() * arrayLength);
    [array[i], array[randomNumber]] = [array[randomNumber], array[i]];
  }
  return array;
};

_.searchRegex = search => {
  if (!search) {
    return '';
  }
  return search
    .replace(/\\/g, '\\\\')
    .replace(/\$/g, '\\$')
    .replace(/\*/g, '\\*')
    .replace(/\+/g, '\\+')
    .replace(/\[/g, '\\[')
    .replace(/\]/g, '\\]')
    .replace(/\)/g, '\\)')
    .replace(/\(/g, '\\(')
    .replace(/'/g, "\\'")
    .replace(/"/g, '\\"');
};

_.ommit = function (obj, array, deepCloning = false) {
  const clonedObject = deepCloning ? this.deepClone(obj) : this.clone(obj);
  const objectKeys = Object.keys(clonedObject);
  return objectKeys.reduce((acc, elem) => {
    if (!array.includes(elem)) acc[elem] = clonedObject[elem];
    return acc;
  }, {});
};

_.randomBetween = function (min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
};

_.randomFromArray = function (array) {
  return array[Math.floor(Math.random() * array.length)];
};

_.appendZero = number => (number < 10 ? '0' : '') + number;

_.delay = ttl => new Promise(resolve => setTimeout(resolve, ttl));

_.roundDownToMultiple = function (number, multiple) {
  return number - (number % multiple);
};

_.emptyCallback = (error, response) => {};

_.errorCallback = (error, response) => {
  if (error) console.error(error);
};

_.JSONtoCSV = (rows = [], fields, arrayToUnwind) => {
  // eslint-disable-next-line global-require
  const {
    Parser,
    transforms: { unwind },
  } = require('json2csv'); // eslint-disable-line global-require
  try {
    const transforms = [unwind({ paths: [arrayToUnwind] })];
    const _parser = new Parser({ fields, transforms });
    return _parser.parse(rows);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(err);
  }
};

_.getUserKey = iUserId => `user:${iUserId}`;

_.getTableKey = iTableId => `${iTableId}:tbl`;

_.getTableCounterKey = id => `${id}:counter`;

_.getTournamentKey = iTableId => `tournament:${iTableId}`;

_.getTournamentCounterKey = id => `counter:${id}`;

_.getSchedulerKey = (sTask, iTableId = '', iUserId = '', host = process.env.HOST) => `${iTableId}:scheduler:${sTask}:${iUserId}:${host}`;
_.now = () => {
  const dt = new Date();
  return `[${`${dt}`.split(' ')[4]}:${dt.getMilliseconds()}]`;
};
_.checkValidImageType = (sFileName, sContentType) => {
  const extension = sFileName.split('.').pop().toLowerCase();
  const valid = validation.imageFormat.find(format => format.extension === extension && format.type === sContentType);
  return !!valid;
};

module.exports = _;
