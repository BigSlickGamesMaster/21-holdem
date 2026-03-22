const Router = require('express').Router();
const controllers = require('./lib/controllers');
const middlewares = require('./lib/middlewares');

Router.use(middlewares.isAuthenticated);

Router.get('/list', controllers.list);
Router.post('/create', controllers.create);
Router.get('/view/:iUserId', controllers.view);
Router.put('/edit/:iUserId', controllers.edit);
Router.post('/delete/:iUserId', controllers.delete);

module.exports = Router;
