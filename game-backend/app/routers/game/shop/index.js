const router = require('express').Router();
const controllers = require('./lib/controllers');
const commonMiddleware = require('../../middleware');

router.use(commonMiddleware.isAuthenticated);

router.get('/', controllers.getShopList);
router.post('/buy', controllers.buyItem);

module.exports = router;
