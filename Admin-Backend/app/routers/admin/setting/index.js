const express = require('express');

const router = new express.Router();

const middlewares = require('./lib/middlewares');
const controllers = require('./lib/controllers');

router.use(middlewares.isAuthenticated);

router.get('/', controllers.getSetting);
router.post('/edit', controllers.updateSetting);

module.exports = router;
