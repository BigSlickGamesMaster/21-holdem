const { User } = require('../../models');
// const firebase = require('./firebase');

const operations = {};

operations.directPush = body => {
  const query = {
    eUserType: 'user',
    bPushEnabled: true,
    sPushToken: { $exists: true },
  };
  if (body.eUserType === 'all') query.eStatus = { $ne: 'd' };
  else if (body.eUserType === 'kycVerified') query['oKYC.eState'] = 'approved';
  else if (body.eUserType === 'todayRegister') {
    const currentDate = new Date();
    currentDate.setHours(0, 0, 0, 0);
    const endDate = new Date();
    endDate.setDate(endDate.getDate() + 1);
    query.eStatus = 'y';
    query.$and = [{ dCreatedDate: { $gte: currentDate } }, { dCreatedDate: { $lt: endDate } }];
  } else if (body.eUserType === 'kycNotVerified') {
    query.$or = [{ 'oKYC.eState': 'rejected' }, { oKYC: { $exists: false } }];
  }
  User.find(query, { _id: false, sPushToken: true }, (error, tokens) => {
    if (error) return log.red(error.toString());
    if (!tokens.length) return false;
    // eslint-disable-next-line no-shadow
    const notify = {
      sTitle: body.sTitle,
      sDescription: body.sDescription,
      data: {},
    };
    const _tokens = tokens.map(t => t.sPushToken);
    let i;
    let j;
    let tempArray;
    const chunk = 400;
    for (i = 0, j = _tokens.length; i < j; i += chunk) {
      tempArray = _tokens.slice(i, i + chunk);
      notify.tokens = tempArray;
      //   firebase.notify(notify, log.cyan);
    }
  }).lean();
};

operations.tournamentSchedule = () => {
  User.find({ eStatus: { $ne: 'd' }, sPushToken: { $exists: true } }, { sPushToken: true, _id: false }, (error, tokens) => {
    if (error) return log.red(error.toString());
    if (!tokens.length) return false;
    const notify = {
      sTitle: 'New tournament Schedule',
      sDescription: 'New Tournament Schedule by admin',
      data: {},
    };
    log.yellow(tokens);
    const _tokens = tokens.map(t => t.sPushToken);
    let i;
    let j;
    let tempArray;
    const chunk = 400;
    for (i = 0, j = _tokens.length; i < j; i += chunk) {
      tempArray = _tokens.slice(i, i + chunk);
      notify.tokens = tempArray;
      //   firebase.notify(notify, log.cyan);
    }
  });
};

module.exports = operations;
