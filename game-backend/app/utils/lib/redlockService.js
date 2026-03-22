const Client = require('ioredis');
const { default: Redlock } = require('redlock');

class RedlockService {
  constructor() {
    this.lock = null;

    const host = process.env.BULL_HOST || process.env.REDIS_HOST;
    if (!host || process.env.NODE_ENV !== 'prod') return;

    const client = new Client({
      host,
      port: process.env.REDIS_PORT,
      password: process.env.REDIS_PASSWORD,
    });

    client.on('ready', () => {
      try {
        this.lock = new Redlock([client], {
          driftFactor: 0.01,
          retryCount: -1,
          retryDelay: 200,
          retryJitter: 200,
          automaticExtensionThreshold: 500,
        });
      } catch (error) {
        log.red(error);
      }
    });

    client.on('error', error => log.red(error));
  }
}

module.exports = new RedlockService();
