const router = require('express').Router();

const controllers = require('./lib/controllers');
const middlewares = require('./lib/middlewares');

router.use(middlewares.isAuthenticated);

router.get('/', controllers.getUserCountAndAdminWin);
router.get('/analytics', controllers.gameAnalysis);

router.get('/depositoverall', controllers.depositOverallCounting);
router.get('/userswithdrawal', controllers.withdrawalCounting);
router.post('/revenue', controllers.totalRevenue);
router.get('/botRevenue', controllers.botRevenue);
router.post('/profit', controllers.profit);
router.post('/getTableTransaction', controllers.tableTransaction);
router.post('/getData', controllers.getList);

module.exports = router;
