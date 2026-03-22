const router = require('express').Router();
const controllers = require('./lib/controllers');
const middlewares = require('./lib/middlewares');

router.use(middlewares.isAuthenticated);

router.get('/list', controllers.listGameLogs);
router.get('/view/:iLogId', controllers.viewLog);

module.exports = router;
