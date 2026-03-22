const http = require('http');
const express = require('express');
const bodyParser = require('body-parser');
const helmet = require('helmet');
const cors = require('cors');
const compression = require('compression');
const morgan = require('morgan');
const adminRoute = require('./admin');

class Router {
  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.corsOptions = {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      exposedHeaders: ['Authorization'],
    };
  }
  initialize() {
    this.setupMiddleware();
    this.setupServer();
  }
  setupMiddleware() {
    this.app.use(cors(this.corsOptions));
    this.app.disable('etag');
    this.app.enable('trust proxy');
    this.app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            ...helmet.contentSecurityPolicy.getDefaultDirectives(),
            'img-src': ['self', 's3.amazonaws.com'],
          },
        },
      })
    );
    this.app.use(compression());
    this.app.use(bodyParser.json({ limit: '16mb' }));
    this.app.use(bodyParser.urlencoded({ limit: '16mb', extended: true, parameterLimit: 50000 }));

    if (process.env.NODE_ENV !== 'prod') this.app.use(morgan('dev', { skip: req => req.path === '/ping' || req.path === '/favicon.ico' }));
    this.app.use(express.static('./seed'));
    this.app.use(this.routeConfig);
    this.app.use('/api/v1/admin', adminRoute);
    this.app.use('*', this.routeHandler);
    this.app.use(this.logErrors);
    this.app.use(this.errorHandler);
  }
  setupServer() {
    const httpServer = http.Server(this.app);
    httpServer.timeout = 10000;
    httpServer.listen(process.env.PORT, '0.0.0.0', () => log.green(`Spinning on ${process.env.PORT}👂  \n --------------------------------`));
  }
  routeConfig(req, res, next) {
    req.sRemoteAddress = req.headers['x-forwarded-for'] || req.connection.remoteAddress;
    if (req.path === '/ping') return res.status(200).send({});
    res.reply = ({ code, message }, data, header = undefined) => {
      res.status(code).header(header).json({ message, data });
    };
    next();
  }
  routeHandler(req, res) {
    res.status(404);
    res.send({ message: 'Route not found' });
  }
  logErrors(err, req, res, next) {
    log.error(`${req.method} ${req.url}`);
    log.error('body -> ', req.body);
    log.error(err.stack);
    return next(err);
  }
  errorHandler(err, req, res, next) {
    res.status(500);
    res.send({ message: err });
  }
}

module.exports = new Router();
