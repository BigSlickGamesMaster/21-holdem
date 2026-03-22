const router = require('express').Router();

const authRoute = require('./auth');
const profileRoute = require('./profile');
const pokerRoute = require('./poker');
const dailyRewardsRoute = require('./daily_rewards');
const shopRoute = require('./shop');
const transactionRoute = require('./transaction');
const analyticsRoute = require('./analytics');

router.use('/auth', authRoute);
router.use('/profile', profileRoute);
router.use('/poker', pokerRoute);
router.use('/daily_rewards', dailyRewardsRoute);
router.use('/shop', shopRoute);
router.use('/transaction', transactionRoute);
router.use('/analytics', analyticsRoute);

module.exports = router;
