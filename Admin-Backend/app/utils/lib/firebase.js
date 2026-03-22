const admin = require('firebase-admin');
// const config = require('../../../firebase.json');

admin.initializeApp({
  credential: admin.credential.cert(config),
});

const operations = {};

operations.notify = (notify, callback) => {
  if (!notify.tokens.length) return callback('Token not found');

  const payload = {
    notification: { title: notify.sTitle, body: notify.sDescription },
    data: notify.data,
    tokens: notify.tokens,
    android: {
      notification: {
        color: '#FFFFFF',
      },
    },
  };

  admin
    .messaging()
    .sendMulticast(payload)
    .then(response => {
      callback(null, response);
    })
    .catch(callback);
};

module.exports = operations;
