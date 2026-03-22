const router = require('express').Router();
const controllers = require('./lib/controllers');
const commonMiddleware = require('../../middleware');

router.use(commonMiddleware.isAuthenticated);

router.get('/', controllers.getDailyRewards);
router.post('/claim', controllers.claimDailyReward);

module.exports = router;
