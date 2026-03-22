const express = require('express');

const Router = new express.Router();

const middlewares = require('./lib/middlewares');
const controllers = require('./lib/controllers');

Router.use(middlewares.isAuthenticated);
Router.get('/list', controllers.getBoardProto);
Router.post('/create', controllers.addBoardProto);
Router.get('/view/:iProtoId', controllers.getBoardProtoById);
Router.post('/update/:iProtoId', controllers.updateBoardProto);
Router.delete('/delete/:iProtoId', controllers.deleteBoardProto);

module.exports = Router;
