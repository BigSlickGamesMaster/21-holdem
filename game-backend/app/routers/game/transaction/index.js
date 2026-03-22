const router = require('express').Router();
const controllers = require('./lib/controllers');
const commonMiddleware = require('../../middleware');

router.post('/square/buyhook', controllers.squareBuyCallBackHook);
router.use(commonMiddleware.isAuthenticated);

router.get('/', controllers.getTransactionsList);
router.post('/square/buycash', controllers.squareBuyCash);
router.get('/square/checkstatus/:sSquareTransactionId', controllers.squareCheckStatus);

module.exports = router;
