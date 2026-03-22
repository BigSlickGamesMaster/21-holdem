const Router = require('express').Router();

const commonMiddlewares = require('../../middleware');
const controllers = require('./lib/controllers');

Router.use(commonMiddlewares.isAuthenticated);
Router.get('/list', controllers.getUserTransactionsList);
Router.get('/view/:iUserId', controllers.getUserTransactionView);

module.exports = Router;
