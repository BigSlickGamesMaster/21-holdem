const Router = require('express').Router();
const controllers = require('./lib/controllers');
const middlewares = require('./lib/middlewares');

Router.use(middlewares.isAuthenticated);

Router.get('/meta', controllers.meta);
Router.get('/list', controllers.list);
Router.get('/view/:id', controllers.view);
Router.post('/create', controllers.create);
Router.put('/status/:id', controllers.updateStatus);
Router.post('/delete/:id', controllers.remove);

module.exports = Router;
