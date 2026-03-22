/* eslint-disable new-cap */
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { ensureLocalDevSeedData } = require('./local-dev-seed');

let MongoMemoryServer;
try {
  ({ MongoMemoryServer } = require('mongodb-memory-server-core'));
} catch (error) {
  MongoMemoryServer = null;
}

function MongoClient() {
  this.options = {
    connectTimeoutMS: 5000,
    serverSelectionTimeoutMS: 5000,
    socketTimeoutMS: 30000,
  };
  this.memoryServer = null;
}

MongoClient.prototype._getRuntimePaths = function () {
  const runtimeRoot = path.resolve(__dirname, '../../../../.codex-runtime/mongo');
  const downloadDir = path.join(runtimeRoot, 'binaries');
  const dbPath = path.join(runtimeRoot, 'data');

  fs.mkdirSync(downloadDir, { recursive: true });
  fs.mkdirSync(dbPath, { recursive: true });

  return { downloadDir, dbPath };
};

MongoClient.prototype._shouldUseMemoryMongo = function (error) {
  if (process.env.NODE_ENV === 'prod') return false;
  if (process.env.LOCAL_DEV_MONGO === 'memory') return true;

  const message = error?.message || '';
  return (
    message.includes('ECONNREFUSED') ||
    message.includes('Server selection timed out') ||
    message.includes('connection <monitor> to') ||
    message.includes('closed')
  );
};

MongoClient.prototype._startMemoryMongo = async function () {
  if (!MongoMemoryServer) {
    throw new Error('mongodb-memory-server-core is required for LOCAL_DEV_MONGO=memory.');
  }

  if (this.memoryServer) return this.memoryServer.getUri('holdem');

  const { downloadDir, dbPath } = this._getRuntimePaths();
  const port = Number(process.env.LOCAL_DEV_MONGO_PORT || 27018);

  this.memoryServer = await MongoMemoryServer.create({
    binary: {
      downloadDir,
    },
    instance: {
      dbName: 'holdem',
      dbPath,
      ip: '127.0.0.1',
      port,
    },
  });

  const uri = this.memoryServer.getUri('holdem');
  log.yellow(`Local MongoDB started at ${uri}`);
  return uri;
};

MongoClient.prototype._connect = async function (uri) {
  if (mongoose.connection.readyState) await mongoose.disconnect();
  await mongoose.connect(uri, this.options);
  log.yellow('Database connected');
};

MongoClient.prototype.initialize = async function () {
  try {
    let targetUri = process.env.DB_URL;

    if (process.env.LOCAL_DEV_MONGO === 'memory') {
      targetUri = await this._startMemoryMongo();
      process.env.DB_URL = targetUri;
    }

    await this._connect(targetUri);
  } catch (error) {
    if (!this._shouldUseMemoryMongo(error)) throw error;

    const memoryUri = await this._startMemoryMongo();
    process.env.DB_URL = memoryUri;
    await this._connect(memoryUri);
  }

  if (process.env.NODE_ENV !== 'prod') {
    await ensureLocalDevSeedData();
  }
};

MongoClient.prototype.mongify = function (id) {
  return new mongoose.Types.ObjectId(id);
};

module.exports = new MongoClient();
