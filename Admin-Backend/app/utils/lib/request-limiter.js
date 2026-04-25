const redis = require('./redis');

const operation = {};

operation.setLimit = async params => {
  const body = _.pick(params, ['path', 'remoteAddress', 'maxRequestTime']);
  const remoteAddress = String(body.remoteAddress || '127.0.0.1').split(',')[0].trim();
  const key = `${remoteAddress}:${body.path}`;
  const isExist = await redis.client.get(key);
  if (isExist) return 'Too many request';

  await redis.client.set(key, String(Date.now()), {
    EX: Math.max(1, Math.ceil((body.maxRequestTime || 1000) / 1000)),
  });

  return null;
};

module.exports = operation;
