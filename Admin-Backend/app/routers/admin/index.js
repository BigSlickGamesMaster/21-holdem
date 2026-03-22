const router = require('express').Router();
const authRoute = require('./auth');
const profileRoute = require('./profile');
const dashboardRoute = require('./dashboard');
const usersRoute = require('./users');
const tablesProtoRoute = require('./table-prototype');
const transactionRoute = require('./transaction');
const gameLogsRoute = require('./gameLogs');
const settingRoute = require('./setting');

router.use('/auth', authRoute);
router.use('/profile', profileRoute);
router.use('/dashboard', dashboardRoute);
router.use('/user', usersRoute);
router.use('/table-prototype', tablesProtoRoute);
router.use('/transaction', transactionRoute);
router.use('/game-logs', gameLogsRoute);
router.use('/setting', settingRoute);

module.exports = router;
