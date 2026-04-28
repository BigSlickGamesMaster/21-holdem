const router = require('express').Router();
const controllers = require('./lib/controllers');
const commonMiddleware = require('../../middleware');

router.get('/leaderboard', controllers.getLeaderboard);

router.use(commonMiddleware.isAuthenticated);

router.get('/profile', controllers.getProfile);
router.post('/run', controllers.saveRun);

module.exports = router;
