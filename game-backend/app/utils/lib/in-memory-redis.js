const { EventEmitter } = require('events');
const { Types } = require('mongoose');

const cloneValue = value => {
  if (value === undefined) return undefined;
  if (value === null) return null;

  if (value?._bsontype === 'ObjectId' || value?.constructor?.name === 'ObjectId') {
    return new Types.ObjectId(value.toString());
  }

  if (Array.isArray(value)) return value.map(item => cloneValue(item));
  if (value instanceof Date) return new Date(value.getTime());
  if (value instanceof Uint8Array) return Uint8Array.from(value);

  if (value && typeof value === 'object' && value.constructor === Object) {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, cloneValue(item)]));
  }

  if (typeof globalThis.structuredClone === 'function') return globalThis.structuredClone(value);
  return JSON.parse(JSON.stringify(value));
};

const escapeRegex = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const patternToRegex = pattern => new RegExp(`^${escapeRegex(pattern).replace(/\\\*/g, '.*')}$`);

class MemoryStore {
  constructor() {
    this.values = new Map();
    this.expiry = new Map();
    this.lists = new Map();
    this.sortedSets = new Map();
    this.events = new EventEmitter();
  }

  hasKey(key) {
    return this.values.has(key) || this.lists.has(key) || this.sortedSets.has(key);
  }

  allKeys() {
    return [...new Set([...this.values.keys(), ...this.lists.keys(), ...this.sortedSets.keys()])];
  }

  clearExpiry(key) {
    const entry = this.expiry.get(key);
    if (entry) clearTimeout(entry.timeoutId);
    this.expiry.delete(key);
  }

  deleteKey(key) {
    this.clearExpiry(key);
    const deleted =
      (this.values.delete(key) ? 1 : 0) |
      (this.lists.delete(key) ? 1 : 0) |
      (this.sortedSets.delete(key) ? 1 : 0);
    return deleted ? 1 : 0;
  }

  scheduleExpiry(key, ttlMs) {
    this.clearExpiry(key);
    const expiresAt = Date.now() + ttlMs;
    const timeoutId = setTimeout(() => {
      if (!this.hasKey(key)) return;
      this.deleteKey(key);
      this.events.emit('__keyevent@0__:expired', key);
    }, ttlMs);

    if (typeof timeoutId.unref === 'function') timeoutId.unref();
    this.expiry.set(key, { expiresAt, timeoutId });
  }
}

const getPathKey = pathExpr => {
  if (!pathExpr || pathExpr === '.' || pathExpr === '$') return '';
  if (pathExpr.startsWith('$.')) return pathExpr.slice(2);
  if (pathExpr.startsWith('.')) return pathExpr.slice(1);
  if (pathExpr.startsWith('$')) return pathExpr.slice(1);
  return pathExpr;
};

const jsonGet = (value, pathExpr) => {
  if (value === null || value === undefined) return null;
  const key = getPathKey(pathExpr);
  if (!key) return cloneValue(value);
  return cloneValue(value[key] ?? null);
};

const jsonSet = (value, pathExpr, nextValue) => {
  const key = getPathKey(pathExpr);
  if (!key) return cloneValue(nextValue);
  const base = value && typeof value === 'object' ? cloneValue(value) : {};
  base[key] = cloneValue(nextValue);
  return base;
};

const jsonDel = (value, pathExpr) => {
  const key = getPathKey(pathExpr);
  if (!key) return { deleted: value === undefined ? 0 : 1, next: undefined };
  if (!value || typeof value !== 'object' || !(key in value)) return { deleted: 0, next: value };
  const base = cloneValue(value);
  delete base[key];
  return { deleted: 1, next: base };
};

class MemoryClient extends EventEmitter {
  constructor(store) {
    super();
    this.store = store;
    this.json = {
      set: async (key, pathExpr, value) => this._jsonSet(key, pathExpr, value),
      SET: async (key, pathExpr, value) => this._jsonSet(key, pathExpr, value),
      get: async (key, pathExpr) => this._jsonGet(key, pathExpr),
      GET: async (key, pathExpr) => this._jsonGet(key, pathExpr),
      del: async (key, pathExpr) => this._jsonDel(key, pathExpr),
      DEL: async (key, pathExpr) => this._jsonDel(key, pathExpr),
    };
  }

  async connect() {
    return this;
  }

  async quit() {
    return 'OK';
  }

  async ping() {
    return 'PONG';
  }

  async get(key) {
    return this.store.values.has(key) ? cloneValue(this.store.values.get(key)) : null;
  }

  async set(key, value) {
    this.store.values.set(key, cloneValue(value));
    return 'OK';
  }

  async del(keys) {
    const list = Array.isArray(keys) ? keys : [keys];
    return list.reduce((count, key) => count + this.store.deleteKey(key), 0);
  }

  async unlink(keys) {
    return this.del(keys);
  }

  async keys(pattern = '*') {
    const regex = patternToRegex(pattern);
    return this.store.allKeys().filter(key => regex.test(key));
  }

  async expire(key, ttlSeconds) {
    if (!this.store.hasKey(key)) return 0;
    this.store.scheduleExpiry(key, ttlSeconds * 1000);
    return 1;
  }

  async pSetEx(key, ttlMs, value) {
    await this.set(key, value);
    this.store.scheduleExpiry(key, ttlMs);
    return 'OK';
  }

  async pTTL(key) {
    if (!this.store.hasKey(key)) return -2;
    const expiry = this.store.expiry.get(key);
    if (!expiry) return -1;
    return Math.max(expiry.expiresAt - Date.now(), 0);
  }

  async lPush(key, value) {
    const list = this.store.lists.get(key) || [];
    list.unshift(cloneValue(value));
    this.store.lists.set(key, list);
    return list.length;
  }

  async rPop(key) {
    const list = this.store.lists.get(key) || [];
    if (!list.length) return null;
    const value = list.pop();
    if (!list.length) this.store.lists.delete(key);
    return cloneValue(value);
  }

  async zAdd(key, member) {
    const list = Array.isArray(member) ? member : [member];
    const set = this.store.sortedSets.get(key) || new Map();

    list.forEach(entry => {
      set.set(entry.value, Number(entry.score));
    });

    this.store.sortedSets.set(key, set);
    return list.length;
  }

  async zRangeByScore(key, min, max) {
    const set = this.store.sortedSets.get(key);
    if (!set) return [];

    const minScore = Number(min);
    const maxScore = Number(max);
    return [...set.entries()]
      .filter(([, score]) => score >= minScore && score <= maxScore)
      .sort((a, b) => a[1] - b[1])
      .map(([member]) => member);
  }

  async publish(channel, message) {
    this.store.events.emit(channel, message);
    return 1;
  }

  async subscribe(channels, listener) {
    const list = Array.isArray(channels) ? channels : [channels];
    list.forEach(channel => {
      this.store.events.on(channel, message => listener(message, channel));
    });
    return list.length;
  }

  async CONFIG_SET() {
    return 'OK';
  }

  async configSet() {
    return 'OK';
  }

  async _jsonSet(key, pathExpr, value) {
    const next = jsonSet(this.store.values.get(key), pathExpr, value);
    this.store.values.set(key, next);
    return 'OK';
  }

  async _jsonGet(key, pathExpr) {
    return jsonGet(this.store.values.get(key), pathExpr);
  }

  async _jsonDel(key, pathExpr) {
    if (!this.store.values.has(key)) return 0;
    const current = this.store.values.get(key);
    const { deleted, next } = jsonDel(current, pathExpr);
    if (!deleted) return 0;
    if (next === undefined) {
      this.store.values.delete(key);
      return 1;
    }
    this.store.values.set(key, next);
    return 1;
  }
}

class InMemoryRedis {
  constructor() {
    this.store = new MemoryStore();
    this.client = new MemoryClient(this.store);
    this.pubClient = new MemoryClient(this.store);
    this.subClient = new MemoryClient(this.store);
  }

  async initialize() {
    await Promise.all([this.client.connect(), this.pubClient.connect(), this.subClient.connect()]);
    await this.subClient.subscribe(['__keyevent@0__:expired', 'redisEvent'], this.onMessage.bind(this));
    if (global.log?.green) global.log.green('Using in-memory Redis compatibility layer for local development.');
  }

  async getAsync(key) {
    return this.client.get(key);
  }

  async setAsync(key, value) {
    return this.client.set(key, value);
  }

  async setDataWithExpiry(key, value, ttlSeconds) {
    await this.client.set(key, value);
    await this.client.expire(key, ttlSeconds);
    return 'OK';
  }

  async zaddAsync(key, score, member) {
    return this.client.zAdd(key, { score: Number(score), value: member });
  }

  async zrangebyscoreAsync(key, min, max) {
    return this.client.zRangeByScore(key, min, max);
  }

  async ttlAsync(key) {
    const ttl = await this.client.pTTL(key);
    if (ttl === -2) return -2;
    if (ttl === -1) return -1;
    return Math.ceil(ttl / 1000);
  }

  async expireAsync(key, seconds) {
    return this.client.expire(key, seconds);
  }

  getAdapter() {
    return undefined;
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

    if (!global.emitter?.asyncEmit) return false;
    await global.emitter.asyncEmit(nextChannel, payload);
    return true;
  }
}

module.exports = InMemoryRedis;
