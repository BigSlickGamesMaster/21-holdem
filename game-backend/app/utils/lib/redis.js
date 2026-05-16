/* eslint-disable consistent-return */
/* eslint-disable no-underscore-dangle */
/* eslint-disable class-methods-use-this */
const { createClient } = require('redis');
const { createAdapter } = require('@socket.io/redis-adapter');
const InMemoryRedis = require('./in-memory-redis');

class RedisClient {
  constructor() {
    this.options = {
      url: `redis://${process.env.REDIS_HOST}:${process.env.REDIS_PORT}`,
      username: process.env.REDIS_USERNAME,
      password: process.env.REDIS_PASSWORD,
      legacyMode: false,
      lazyConnect: true,
      connectTimeout: 10000,
    };
    this.fallback = null;
  }

  async _enableFallback(reason) {
    log.yellow(`Redis unavailable (${reason}). Falling back to in-memory local store.`);
    this.fallback = new InMemoryRedis();
    await this.fallback.initialize();
    this.client = this.fallback.client;
    this.pubClient = this.fallback.pubClient;
    this.subClient = this.fallback.subClient;
  }

  _setJsonCompatLayer() {
    const parse = value => {
      if (value === null || value === undefined) return null;
      try {
        return JSON.parse(value);
      } catch (error) {
        return null;
      }
    };

    const getPathKey = pathExpr => {
      if (!pathExpr || pathExpr === '.' || pathExpr === '$') return '';
      if (pathExpr.startsWith('$.')) return pathExpr.slice(2);
      if (pathExpr.startsWith('.')) return pathExpr.slice(1);
      if (pathExpr.startsWith('$')) return pathExpr.slice(1);
      return pathExpr;
    };

    const setByPath = (obj, pathExpr, value) => {
      const key = getPathKey(pathExpr);
      if (!key) return value;
      const next = obj && typeof obj === 'object' ? obj : {};
      next[key] = value;
      return next;
    };

    const getByPath = (obj, pathExpr) => {
      if (obj === null || obj === undefined) return null;
      const key = getPathKey(pathExpr);
      if (!key) return obj;
      return obj[key];
    };

    const delByPath = (obj, pathExpr) => {
      if (!obj || typeof obj !== 'object') return { next: obj, deleted: 0 };
      const key = getPathKey(pathExpr);
      if (!key) return { next: null, deleted: 1 };
      if (!(key in obj)) return { next: obj, deleted: 0 };
      delete obj[key];
      return { next: obj, deleted: 1 };
    };

    const jsonCompat = {
      set: async (redisKey, pathExpr, value) => {
        const raw = await this.client.get(redisKey);
        const current = parse(raw);
        const next = setByPath(current, pathExpr, value);
        await this.client.set(redisKey, JSON.stringify(next));
        return 'OK';
      },
      SET: async (redisKey, pathExpr, value) => jsonCompat.set(redisKey, pathExpr, value),
      get: async (redisKey, pathExpr = undefined) => {
        const raw = await this.client.get(redisKey);
        const current = parse(raw);
        return getByPath(current, pathExpr);
      },
      GET: async (redisKey, pathExpr = undefined) => jsonCompat.get(redisKey, pathExpr),
      del: async (redisKey, pathExpr = undefined) => {
        if (!pathExpr || pathExpr === '.' || pathExpr === '$') return this.client.del(redisKey);
        const raw = await this.client.get(redisKey);
        const current = parse(raw);
        const { next, deleted } = delByPath(current, pathExpr);
        if (!deleted) return 0;
        if (next === null) return this.client.del(redisKey);
        await this.client.set(redisKey, JSON.stringify(next));
        return 1;
      },
      DEL: async (redisKey, pathExpr = undefined) => jsonCompat.del(redisKey, pathExpr),
    };

    this.client.json = jsonCompat;
  }

  async _ensureJsonSupport() {
    try {
      const probeKey = '__json_probe_key__';
      await this.client.json.set(probeKey, '.', { ok: true });
      await this.client.del(probeKey);
    } catch (error) {
      if ((error?.message || '').includes("unknown command 'JSON.SET'")) {
        log.yellow('RedisJSON module not found. Falling back to JSON compatibility layer.');
        this._setJsonCompatLayer();
        return;
      }
      throw error;
    }
  }

  async initialize() {
    try {
      this.client = createClient(this.options);
      this.subClient = createClient(this.options);
      this.pubClient = createClient(this.options);
      await Promise.all([this.client.connect(), this.pubClient.connect(), this.subClient.connect()]);
      await this._ensureJsonSupport();
      try {
        await this.subClient.CONFIG_SET('notify-keyspace-events', 'Ex');
      } catch (configError) {
        log.yellow(`Unable to enable Redis keyspace notifications automatically: ${configError.message}`);
      }
      await this.subClient.subscribe(['__keyevent@0__:expired', 'redisEvent'], this.onMessage, false);

      this.client.on('error', log.error);
      this.pubClient.on('error', log.error);
      this.subClient.on('error', log.error);
      log.green('Redis Connected Successfully!!!');
    } catch (error) {
      if (process.env.NODE_ENV !== 'prod') {
        await this._enableFallback(error.message);
        return;
      }
      throw error;
    }
  }

  async setupConfig() {
    log.cyan('Redis initialized \n---------------------------------');
  }

  getAdapter() {
    if (this.fallback) return this.fallback.getAdapter();
    return createAdapter(this.pubClient, this.subClient);
  }

  async getAsync(key) {
    if (this.fallback) return this.fallback.getAsync(key);
    return this.client.get(key);
  }

  async setAsync(key, value) {
    if (this.fallback) return this.fallback.setAsync(key, value);
    return this.client.set(key, value);
  }

  async setDataWithExpiry(key, value, ttlSeconds) {
    if (this.fallback) return this.fallback.setDataWithExpiry(key, value, ttlSeconds);
    await this.client.set(key, value);
    await this.client.expire(key, ttlSeconds);
    return 'OK';
  }

  async zaddAsync(key, score, member) {
    if (this.fallback) return this.fallback.zaddAsync(key, score, member);
    return this.client.zAdd(key, { score: Number(score), value: member });
  }

  async zrangebyscoreAsync(key, min, max) {
    if (this.fallback) return this.fallback.zrangebyscoreAsync(key, min, max);
    return this.client.zRangeByScore(key, min, max);
  }

  async ttlAsync(key) {
    if (this.fallback) return this.fallback.ttlAsync(key);
    return this.client.ttl(key);
  }

  async expireAsync(key, seconds) {
    if (this.fallback) return this.fallback.expireAsync(key, seconds);
    return this.client.expire(key, seconds);
  }

  async onMessage(message, channel) {
    let nextChannel;
    let payload;

    const [iBoardId, scheduler, sTaskName, iUserId, sGame, sHostIp] = String(message).split(':');
    if (channel === '__keyevent@0__:expired' && sGame === 'TwentyOneHoldem') {
      if (scheduler !== 'scheduler') return false;
      if (process.env.HOST && sHostIp !== process.env.HOST) return false;
      nextChannel = sTaskName;
      payload = { sTaskName, iBoardId, iUserId };
    } else {
      nextChannel = channel;
      payload = message;
    }

    let parsedMessage = '';
    try {
      parsedMessage = _.parse(payload);
    } catch (err) {
      log.red('err in onMessage!');
      console.log(err);
      parsedMessage = payload;
    }
    await emitter.asyncEmit(nextChannel, parsedMessage);
  }
}

module.exports = new RedisClient();
